"use client"

import { useEffect, useMemo, useState } from "react"
import { useSession } from "next-auth/react"
import { KeyRound, Loader2, LockKeyhole, ShieldCheck, X } from "lucide-react"

const POLL_MS = 2500

type BrowserInput = {
  name?: string
  type?: string
  placeholder?: string
  selector?: string
}

type BrowserSession = {
  id: string
  status?: string
  current_url?: string | null
  last_result?: any
}

function classifyLogin(session: BrowserSession | null) {
  const last = session?.last_result || {}
  const inputs: BrowserInput[] = Array.isArray(last.inputs) ? last.inputs : []
  const text = `${last.title || ""} ${last.text || ""}`.toLowerCase()

  const hasPassword = inputs.some((item) => {
    const hay = `${item.name || ""} ${item.placeholder || ""} ${item.type || ""}`.toLowerCase()
    return String(item.type || "").toLowerCase() === "password" || /password|senha|passwd/.test(hay)
  })
  const hasOtp = inputs.some((item) => {
    const hay = `${item.name || ""} ${item.placeholder || ""}`.toLowerCase()
    return /otp|2fa|totp|verification|verify|code|codigo|código|pin/.test(hay)
  }) || /código de verificação|codigo de verificacao|verification code|two-factor|2fa|autenticação de dois fatores|autenticacao de dois fatores/.test(text)

  const hasCaptcha = /captcha|recaptcha|hcaptcha|não sou um robô|nao sou um robo|i am not a robot/.test(text)
  const looksLikeLogin = /\b(login|log in|sign in|entrar|iniciar sessão|iniciar sessao|autenticação|autenticacao)\b/.test(text)
  const hasIdentity = inputs.some((item) => {
    const hay = `${item.name || ""} ${item.placeholder || ""} ${item.type || ""}`.toLowerCase()
    return /email|e-mail|user|username|utilizador|usuario|login/.test(hay) || String(item.type || "").toLowerCase() === "email"
  })

  return {
    show: Boolean(session?.id && (hasPassword || hasOtp || hasCaptcha || (looksLikeLogin && hasIdentity))),
    hasPassword,
    hasOtp,
    hasCaptcha,
    hasIdentity,
  }
}

export function LuminSecureLoginPanel() {
  const { status: authStatus } = useSession()
  const [session, setSession] = useState<BrowserSession | null>(null)
  const [dismissedSession, setDismissedSession] = useState<string | null>(null)
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [otp, setOtp] = useState("")
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState("")

  useEffect(() => {
    if (authStatus !== "authenticated") {
      setSession(null)
      return
    }

    let active = true
    let timer: ReturnType<typeof setInterval> | null = null

    const poll = async () => {
      try {
        const response = await fetch("/api/browser/session", { cache: "no-store", credentials: "include" })
        if (!active || response.status === 401) return
        if (!response.ok) return
        const data = await response.json().catch(() => ({}))
        if (!active) return
        const next = data?.session || null
        setSession(next)
        if (next?.id && next.id !== dismissedSession) setMessage("")
      } catch {
        // O painel é auxiliar; falhas de polling não devem afetar o resto da app.
      }
    }

    poll()
    timer = setInterval(poll, POLL_MS)
    return () => {
      active = false
      if (timer) clearInterval(timer)
    }
  }, [dismissedSession, authStatus])

  const state = useMemo(() => classifyLogin(session), [session])
  const visible = state.show && session?.id !== dismissedSession

  useEffect(() => {
    if (!visible) {
      setUsername("")
      setPassword("")
      setOtp("")
      setBusy(false)
    }
  }, [visible])

  if (!visible || !session) return null

  const submit = async () => {
    if (state.hasCaptcha) {
      setMessage("Este site apresentou CAPTCHA. O Lumin não tenta contorná-lo; esta etapa precisa de intervenção manual.")
      return
    }

    if (state.hasPassword && !password) {
      setMessage("Introduz a password para continuar.")
      return
    }
    if (state.hasOtp && !otp && !state.hasPassword) {
      setMessage("Introduz o código de verificação para continuar.")
      return
    }

    setBusy(true)
    setMessage("")
    try {
      const response = await fetch("/api/browser/secure-login", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: session.id,
          username: username || undefined,
          password: password || undefined,
          otp: otp || undefined,
        }),
      })
      const data = await response.json().catch(() => ({}))

      // Apagar segredos da memória do componente logo após a resposta.
      setPassword("")
      setOtp("")

      if (!response.ok || !data?.ok) {
        if (data?.needsCaptcha) setMessage("O site pediu CAPTCHA. Esta etapa tem de ser feita manualmente.")
        else if (data?.needsOtp) setMessage("O site está a pedir um código de verificação. Introduz o OTP recebido.")
        else setMessage(data?.error || "Não foi possível concluir o login.")
        return
      }

      if (data?.needsOtp) {
        setMessage("Primeira etapa aceite. Introduz agora o código de verificação recebido.")
        if (data?.session) setSession(data.session)
        return
      }

      setMessage("Sessão autenticada. O Lumin pode continuar a tarefa.")
      if (data?.session) setSession(data.session)
      setTimeout(() => setDismissedSession(session.id), 900)
    } catch {
      setMessage("Falha temporária no login seguro. Tenta novamente.")
    } finally {
      setBusy(false)
    }
  }

  let host = "site"
  try {
    if (session.current_url) host = new URL(session.current_url).hostname
  } catch {}

  return (
    <div className="fixed inset-0 z-[10050] flex items-end justify-center bg-black/55 p-3 backdrop-blur-sm sm:items-center">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0b0b0d] p-5 text-white shadow-2xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="rounded-xl border border-amber-400/20 bg-amber-400/10 p-2.5">
              <LockKeyhole className="h-5 w-5 text-amber-300" />
            </div>
            <div>
              <h2 className="text-base font-semibold">Autenticação necessária</h2>
              <p className="mt-1 text-xs leading-5 text-white/55">{host}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setDismissedSession(session.id)}
            className="rounded-lg p-2 text-white/50 hover:bg-white/5 hover:text-white"
            aria-label="Fechar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mb-4 rounded-xl border border-emerald-400/15 bg-emerald-400/5 p-3 text-xs leading-5 text-white/65">
          <div className="mb-1 flex items-center gap-2 font-medium text-emerald-300">
            <ShieldCheck className="h-4 w-4" /> Login seguro do Browser Agent
          </div>
          Password e OTP vão diretamente para o browser isolado. Não entram na conversa nem ficam guardados no histórico do Lumin.
        </div>

        {state.hasCaptcha ? (
          <div className="rounded-xl border border-amber-400/20 bg-amber-400/10 p-3 text-sm text-amber-100">
            Este site apresentou CAPTCHA. O Lumin não o contorna automaticamente.
          </div>
        ) : (
          <div className="space-y-3">
            {state.hasIdentity && !state.hasOtp && (
              <label className="block">
                <span className="mb-1.5 block text-xs text-white/55">Email ou utilizador</span>
                <input
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  autoComplete="username"
                  className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-3 text-sm outline-none transition focus:border-amber-300/50"
                />
              </label>
            )}

            {state.hasPassword && (
              <label className="block">
                <span className="mb-1.5 block text-xs text-white/55">Password</span>
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="current-password"
                  className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-3 text-sm outline-none transition focus:border-amber-300/50"
                />
              </label>
            )}

            {state.hasOtp && (
              <label className="block">
                <span className="mb-1.5 block text-xs text-white/55">Código de verificação</span>
                <input
                  inputMode="numeric"
                  value={otp}
                  onChange={(event) => setOtp(event.target.value)}
                  autoComplete="one-time-code"
                  className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-3 text-sm tracking-widest outline-none transition focus:border-amber-300/50"
                />
              </label>
            )}

            <button
              type="button"
              onClick={submit}
              disabled={busy}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-300 px-4 py-3 text-sm font-semibold text-black transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
              {busy ? "A autenticar…" : state.hasOtp ? "Verificar código" : "Entrar em segurança"}
            </button>
          </div>
        )}

        {message && <p className="mt-3 text-xs leading-5 text-white/65">{message}</p>}
      </div>
    </div>
  )
}
