import { generateLuminText } from "@/lib/lumin-ai-runtime"
import { executeHeadlessBrowserAction, type HeadlessBrowserAction } from "@/lib/lumin-browser-headless"
import {
  appendBrowserHistory,
  clearPendingBrowserAction,
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
  executed?: boolean
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
  return /\b(abre|abrir|navega|navegar|entra no site|vai ao site|visita|website|página|pagina|clica|clicar|carrega em|preenche|preencher|formulário|formulario|submete|submeter|faz login|inicia sessão|inicia sessao|browser|chrome|chromium|site em javascript|spa|aprova|aprovar|executa|faz isso|sim faz|sim, faz|rejeita|rejeitar|cancela|cancelar)\b/i.test(message)
}

function isApproval(message: string) {
  return /^\s*(sim[, ]*)?(aprova|aprovar|executa|executar|faz|faz isso|podes fazer|segue|siga|confirmo|confirmado)\b/i.test(message)
}

function isRejection(message: string) {
  return /^\s*(não|nao)?\s*(rejeita|rejeitar|cancela|cancelar|não faças|nao facas|não executar|nao executar)\b/i.test(message)
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

function isHeadlessAction(value: any): value is HeadlessBrowserAction {
  if (!value || typeof value !== "object") return false
  if (!["navigate", "click", "fill", "fill_and_click"].includes(value.type)) return false
  return typeof value.url === "string" && /^https?:\/\//i.test(value.url)
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

async function executeApprovedHeadlessAction(input: {
  session: BrowserSessionRow
  action: HeadlessBrowserAction
  userId: string
  accessToken?: string | null
}) {
  const execution = await executeHeadlessBrowserAction({
    action: input.action,
    cookies: Array.isArray(input.session.cookies) ? input.session.cookies : [],
  })

  if (!execution.ok) {
    const failed = await updateBrowserSession(
      input.session.id,
      input.userId,
      {
        status: "active",
        pending_action: null,
        last_result: { executor: "headless", ok: false, error: execution.error || "browser_failed" },
      },
      input.accessToken,
    )
    const withHistory = failed
      ? await appendBrowserHistory(
          failed,
          input.userId,
          { type: "headless_action_failed", action: input.action, error: execution.error || "browser_failed" },
          input.accessToken,
        )
      : failed
    return {
      session: withHistory || failed || input.session,
      execution,
      ok: false,
    }
  }

  const updated = await updateBrowserSession(
    input.session.id,
    input.userId,
    {
      status: "active",
      pending_action: null,
      current_url: execution.finalUrl || input.action.url,
      cookies: execution.cookies || input.session.cookies || [],
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
        { type: "headless_action_executed", action: input.action, url: execution.finalUrl || input.action.url },
        input.accessToken,
      )
    : updated

  return {
    session: withHistory || updated || input.session,
    execution,
    ok: true,
  }
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
      if (isRejection(input.message)) {
        const rejected = session.pending_action
        const cleared = await clearPendingBrowserAction(session, input.userId, input.accessToken)
        const updated = cleared
          ? await appendBrowserHistory(
              cleared,
              input.userId,
              { type: "chat_action_rejected", action: rejected },
              input.accessToken,
            )
          : cleared
        return {
          used: true,
          sessionId: updated?.id || session.id,
          status: updated?.status || "active",
          context: `${summarizeSession(updated || cleared || session)}\n\nA ação pendente foi rejeitada pelo utilizador e NÃO foi executada.`,
          requiresApproval: false,
          pendingAction: null,
          executor: "none",
          executed: false,
        }
      }

      if (isApproval(input.message) && isHeadlessAction(session.pending_action)) {
        const approved = await appendBrowserHistory(
          session,
          input.userId,
          { type: "chat_action_approved", action: session.pending_action },
          input.accessToken,
        )
        const baseSession = approved || session
        const result = await executeApprovedHeadlessAction({
          session: baseSession,
          action: session.pending_action,
          userId: input.userId,
          accessToken: input.accessToken,
        })
        return {
          used: true,
          sessionId: result.session.id,
          status: result.session.status,
          context: `${summarizeSession(result.session)}\n\n${result.ok ? "A ação aprovada foi executada com sucesso." : `A ação aprovada falhou: ${result.execution.error || "erro desconhecido"}.`}`,
          requiresApproval: false,
          pendingAction: null,
          executor: "headless",
          executed: result.ok,
        }
      }

      return {
        used: true,
        sessionId: session.id,
        status: session.status,
        context: `${summarizeSession(session)}\n\nAÇÃO PENDENTE DE APROVAÇÃO:\n${JSON.stringify(session.pending_action)}\nO utilizador tem de aprovar ou rejeitar esta ação antes de continuar.`,
        requiresApproval: true,
        pendingAction: session.pending_action,
        executor: "none",
        executed: false,
      }
    }

    const plan = await planBrowserStep(input.message, session)
    if (!plan?.use || !plan?.action || typeof plan.action !== "object" || !isHeadlessAction(plan.action)) {
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
        currentUrl: action.url,
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
        executed: false,
      }
    }

    const result = await executeApprovedHeadlessAction({
      session,
      action,
      userId: input.userId,
      accessToken: input.accessToken,
    })

    return {
      used: true,
      sessionId: result.session.id,
      status: result.session.status,
      context: `${summarizeSession(result.session)}${result.ok ? "" : `\n\nO Chromium não conseguiu concluir a navegação: ${result.execution.error || "erro desconhecido"}.`}`,
      requiresApproval: false,
      executor: "headless",
      executed: result.ok,
    }
  } catch (error) {
    console.warn("[Lumin Browser Orchestrator] skipped:", error)
    return { used: false, context: "", requiresApproval: false, executor: "none" }
  }
}
