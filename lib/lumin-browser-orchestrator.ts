import { generateLuminText } from "@/lib/lumin-ai-runtime"
import { executeHeadlessBrowserAction, type HeadlessBrowserAction } from "@/lib/lumin-browser-headless"
import {
  appendBrowserHistory,
  createBrowserSession,
  getActiveBrowserSession,
  setPendingBrowserAction,
  updateBrowserSession,
  type BrowserSessionRow,
} from "@/lib/lumin-browser-session"

export type LuminBrowserOrchestration = {
  used: boolean
  sessionId?: string
  status?: string
  context: string
  requiresApproval?: boolean
  pendingAction?: Record<string, unknown> | null
  executor?: "headless" | "none"
}

function extractJsonObject(text: string) {
  const start = text.indexOf("{")
  const end = text.lastIndexOf("}")
  if (start < 0 || end <= start) return null
  try {
    return JSON.parse(text.slice(start, end + 1))
  } catch {
    return null
  }
}

export function shouldUseBrowserAgent(message: string, authenticated: boolean) {
  if (!authenticated || !message.trim()) return false
  return /\b(abre|abrir|navega|navegar|entra no site|vai ao site|visita|website|página|pagina|clica|clicar|carrega em|preenche|preencher|formulário|formulario|submete|submeter|faz login|inicia sessão|inicia sessao|browser|chrome|chromium|site em javascript|spa)\b/i.test(message)
}

function summarizeSession(session: BrowserSessionRow) {
  const last = session.last_result && typeof session.last_result === "object" ? session.last_result : {}
  const text = typeof (last as any).text === "string" ? (last as any).text.slice(0, 5000) : ""
  const title = typeof (last as any).title === "string" ? (last as any).title : ""
  const url = session.current_url || (last as any).url || ""
  const buttons = Array.isArray((last as any).buttons) ? (last as any).buttons.slice(0, 20) : []
  const inputs = Array.isArray((last as any).inputs) ? (last as any).inputs.slice(0, 20) : []
  const links = Array.isArray((last as any).links) ? (last as any).links.slice(0, 20) : []

  return [
    `Sessão Browser Agent: ${session.id}`,
    `Estado: ${session.status}`,
    url ? `URL atual: ${url}` : "",
    title ? `Título: ${title}` : "",
    text ? `Texto visível:\n${text}` : "",
    buttons.length ? `Botões disponíveis:\n${JSON.stringify(buttons)}` : "",
    inputs.length ? `Campos disponíveis:\n${JSON.stringify(inputs)}` : "",
    links.length ? `Links disponíveis:\n${JSON.stringify(links)}` : "",
  ]
    .filter(Boolean)
    .join("\n")
}

async function planBrowserStep(message: string, session: BrowserSessionRow | null) {
  const state = session ? summarizeSession(session) : "Não existe sessão ativa."
  const result = await generateLuminText({
    system: `És o planeador do Lumin Browser Agent. Decide APENAS o próximo passo seguro para cumprir o pedido do utilizador.
Responde APENAS JSON válido neste formato:
{"use":boolean,"action":{"type":"navigate"|"click"|"fill"|"fill_and_click","url":"https://...","selector":"...","fields":{}},"reason":"..."}
Regras:
- Para apenas abrir/ler uma página, usa navigate.
- Para clicar ou preencher, usa apenas seletores presentes no estado da página quando existirem.
- Nunca peças nem uses passwords, OTP/2FA, cartões, CVV/CVC, IBAN, API keys, tokens ou segredos.
- Nunca planeies pagamento, compra, transferência, delete, remoção, cancelamento de conta ou outra ação irreversível.
- Se faltar URL/selector/dados suficientes, responde {"use":false,"action":null,"reason":"..."}.
- Uma ação de click/fill/fill_and_click requer aprovação humana antes de execução. navigate pode executar automaticamente.
- Não inventes que uma ação foi executada.`,
    prompt: `PEDIDO:\n${message}\n\nESTADO ATUAL:\n${state}`,
    maxOutputTokens: 1400,
    temperature: 0,
  })
  return extractJsonObject(result.text)
}

export async function orchestrateBrowserAgent(input: {
  message: string
  userId: string
  organizationId?: string | null
  accessToken?: string | null
}): Promise<LuminBrowserOrchestration> {
  try {
    let session = await getActiveBrowserSession(input.userId, input.accessToken).catch(() => null)

    if (session?.status === "waiting_approval" && session.pending_action) {
      return {
        used: true,
        sessionId: session.id,
        status: session.status,
        context: `${summarizeSession(session)}\n\nAÇÃO PENDENTE DE APROVAÇÃO:\n${JSON.stringify(session.pending_action)}\nO utilizador tem de aprovar ou rejeitar esta ação antes de continuar.`,
        requiresApproval: true,
        pendingAction: session.pending_action,
        executor: "none",
      }
    }

    const plan = await planBrowserStep(input.message, session)
    if (!plan?.use || !plan?.action || typeof plan.action !== "object") {
      return {
        used: Boolean(session),
        sessionId: session?.id,
        status: session?.status,
        context: session ? summarizeSession(session) : "",
        requiresApproval: false,
        executor: "none",
      }
    }

    const action = plan.action as HeadlessBrowserAction
    if (!session) {
      session = await createBrowserSession({
        userId: input.userId,
        organizationId: input.organizationId || null,
        task: input.message,
        currentUrl: typeof (action as any).url === "string" ? (action as any).url : null,
        accessToken: input.accessToken,
      })
    } else {
      const continued = await appendBrowserHistory(
        session,
        input.userId,
        { type: "chat_browser_plan", request: input.message.slice(0, 1000), plan },
        input.accessToken,
      )
      if (continued) session = continued
    }

    if (action.type !== "navigate") {
      const pending = await setPendingBrowserAction({
        session,
        userId: input.userId,
        action: { ...action, reason: plan.reason || "Ação interativa preparada pelo Lumin" },
        accessToken: input.accessToken,
      })
      return {
        used: true,
        sessionId: pending?.id || session.id,
        status: pending?.status || "waiting_approval",
        context: `${summarizeSession(pending || session)}\n\nAÇÃO PREPARADA, NÃO EXECUTADA:\n${JSON.stringify(action)}\nPrecisa de aprovação explícita do utilizador.`,
        requiresApproval: true,
        pendingAction: action as any,
        executor: "none",
      }
    }

    const execution = await executeHeadlessBrowserAction({
      action,
      cookies: Array.isArray(session.cookies) ? session.cookies : [],
    })

    if (!execution.ok) {
      const failed = await updateBrowserSession(
        session.id,
        input.userId,
        {
          last_result: { executor: "headless", ok: false, error: execution.error || "browser_failed" },
        },
        input.accessToken,
      )
      return {
        used: true,
        sessionId: failed?.id || session.id,
        status: failed?.status || session.status,
        context: `${summarizeSession(failed || session)}\n\nO Chromium não conseguiu concluir a navegação: ${execution.error || "erro desconhecido"}.`,
        requiresApproval: false,
        executor: "headless",
      }
    }

    const updated = await updateBrowserSession(
      session.id,
      input.userId,
      {
        status: "active",
        current_url: execution.finalUrl || (action as any).url,
        cookies: execution.cookies || session.cookies || [],
        last_result: {
          executor: "headless",
          ok: true,
          url: execution.finalUrl,
          title: execution.title,
          text: execution.text,
          links: execution.links || [],
          buttons: execution.buttons || [],
          inputs: execution.inputs || [],
        },
      },
      input.accessToken,
    )

    const withHistory = updated
      ? await appendBrowserHistory(
          updated,
          input.userId,
          { type: "headless_navigate", url: execution.finalUrl || (action as any).url },
          input.accessToken,
        )
      : updated

    return {
      used: true,
      sessionId: withHistory?.id || session.id,
      status: withHistory?.status || "active",
      context: summarizeSession(withHistory || updated || session),
      requiresApproval: false,
      executor: "headless",
    }
  } catch (error) {
    console.warn("[Lumin Browser Orchestrator] skipped:", error)
    return { used: false, context: "", requiresApproval: false, executor: "none" }
  }
}
