import { executeHeadlessBrowserAction } from "@/lib/lumin-browser-headless"
import type { BrowserSessionRow } from "@/lib/lumin-browser-session"

export type SecureLoginSecrets = {
  username?: string
  password?: string
  otp?: string
}

export type SecureLoginResult = {
  ok: boolean
  finalUrl?: string
  title?: string
  text?: string
  links?: Array<{ text: string; href: string }>
  buttons?: Array<{ text: string; selector: string }>
  inputs?: Array<{ name: string; type: string; placeholder: string; selector: string }>
  cookies?: any[]
  needsOtp?: boolean
  needsCaptcha?: boolean
  error?: string
}

type InputSnapshot = { name?: string; type?: string; placeholder?: string; selector?: string }
type ButtonSnapshot = { text?: string; selector?: string }

function inputLike(item: InputSnapshot) {
  const type = String(item.type || "").toLowerCase()
  return type !== "textarea" && type !== "select"
}

function positionalInputSelector(inputs: InputSnapshot[], targetIndex: number) {
  let ordinal = 0
  for (let i = 0; i <= targetIndex; i++) {
    if (inputLike(inputs[i] || {})) ordinal += 1
  }
  return `input:nth-of-type(${Math.max(1, ordinal)})`
}

function scoreUsername(item: InputSnapshot) {
  const hay = `${item.name || ""} ${item.placeholder || ""} ${item.type || ""}`.toLowerCase()
  let score = 0
  if (/email|e-mail|utilizador|usuario|user|login|username/.test(hay)) score += 6
  if (/email/.test(String(item.type || "").toLowerCase())) score += 4
  if (/text/.test(String(item.type || "").toLowerCase())) score += 1
  if (/password|otp|token|code|codigo|código|pin/.test(hay)) score -= 20
  return score
}

function scoreOtp(item: InputSnapshot) {
  const hay = `${item.name || ""} ${item.placeholder || ""} ${item.type || ""}`.toLowerCase()
  let score = 0
  if (/otp|2fa|totp|verification|verify|code|codigo|código|pin/.test(hay)) score += 10
  if (/tel|number|text/.test(String(item.type || "").toLowerCase())) score += 1
  if (/password/.test(hay)) score -= 20
  return score
}

function chooseInput(inputs: InputSnapshot[], kind: "username" | "password" | "otp") {
  if (!inputs.length) return ""

  let index = -1
  if (kind === "password") {
    index = inputs.findIndex((item) => {
      const hay = `${item.name || ""} ${item.placeholder || ""} ${item.type || ""}`.toLowerCase()
      return String(item.type || "").toLowerCase() === "password" || /password|senha|passwd/.test(hay)
    })
  } else {
    const scorer = kind === "username" ? scoreUsername : scoreOtp
    const ranked = inputs
      .map((item, i) => ({ i, score: scorer(item) }))
      .sort((a, b) => b.score - a.score)
    if (ranked[0] && ranked[0].score > 0) index = ranked[0].i
  }

  if (index < 0) return ""
  return positionalInputSelector(inputs, index)
}

function chooseSubmit(buttons: ButtonSnapshot[]) {
  const ranked = buttons
    .map((button, index) => {
      const text = String(button.text || "").toLowerCase()
      let score = 0
      if (/entrar|login|log in|sign in|iniciar|continuar|continue|seguinte|next|verificar|verify|confirmar|submit/.test(text)) score += 10
      if (/registar|register|criar conta|sign up|cancelar|cancel/.test(text)) score -= 10
      return { index, score, selector: String(button.selector || "") }
    })
    .filter((item) => item.selector)
    .sort((a, b) => b.score - a.score)

  return ranked[0]?.score > 0 ? ranked[0].selector : ""
}

function detectCaptcha(text: string) {
  return /captcha|recaptcha|hcaptcha|não sou um robô|nao sou um robo|i am not a robot/i.test(text)
}

function detectOtp(inputs: InputSnapshot[], text: string) {
  return inputs.some((item) => scoreOtp(item) >= 10) || /código de verificação|codigo de verificacao|verification code|2fa|two-factor|autenticação de dois fatores|autenticacao de dois fatores/i.test(text)
}

export function detectSecureLoginRequirement(session: BrowserSessionRow) {
  const last: any = session.last_result || {}
  const inputs: InputSnapshot[] = Array.isArray(last.inputs) ? last.inputs : []
  const text = String(last.text || "")
  const hasPassword = inputs.some((item) => {
    const hay = `${item.name || ""} ${item.placeholder || ""} ${item.type || ""}`.toLowerCase()
    return String(item.type || "").toLowerCase() === "password" || /password|senha|passwd/.test(hay)
  })
  const needsOtp = detectOtp(inputs, text)
  const needsCaptcha = detectCaptcha(text)

  return {
    required: hasPassword || needsOtp || needsCaptcha,
    hasPassword,
    needsOtp,
    needsCaptcha,
    usernameSelector: chooseInput(inputs, "username"),
    passwordSelector: chooseInput(inputs, "password"),
    otpSelector: chooseInput(inputs, "otp"),
    submitSelector: chooseSubmit(Array.isArray(last.buttons) ? last.buttons : []),
  }
}

export async function executeSecureLogin(input: {
  session: BrowserSessionRow
  secrets: SecureLoginSecrets
}): Promise<SecureLoginResult> {
  const currentUrl = String(input.session.current_url || "")
  if (!/^https?:\/\//i.test(currentUrl)) return { ok: false, error: "Sessão sem URL de login válida" }

  const requirement = detectSecureLoginRequirement(input.session)
  if (requirement.needsCaptcha) {
    return { ok: false, needsCaptcha: true, error: "CAPTCHA requer intervenção manual" }
  }

  const fields: Record<string, string> = {}
  if (input.secrets.username && requirement.usernameSelector) fields[requirement.usernameSelector] = input.secrets.username
  if (input.secrets.password && requirement.passwordSelector) fields[requirement.passwordSelector] = input.secrets.password
  if (input.secrets.otp && requirement.otpSelector) fields[requirement.otpSelector] = input.secrets.otp

  if (!Object.keys(fields).length) {
    return { ok: false, needsOtp: requirement.needsOtp, error: "Não encontrei campos seguros compatíveis nesta página" }
  }

  const action = requirement.submitSelector
    ? ({ type: "fill_and_click", url: currentUrl, fields, selector: requirement.submitSelector } as const)
    : ({ type: "fill", url: currentUrl, fields } as const)

  // Os valores sensíveis são enviados diretamente para a microVM e nunca são devolvidos.
  const result = await executeHeadlessBrowserAction({
    action,
    cookies: Array.isArray(input.session.cookies) ? input.session.cookies : [],
  })

  if (!result.ok) return { ok: false, error: result.error || "Falha no login seguro" }

  const text = String(result.text || "")
  const inputs = Array.isArray(result.inputs) ? result.inputs : []
  return {
    ...result,
    needsOtp: detectOtp(inputs, text),
    needsCaptcha: detectCaptcha(text),
  }
}
