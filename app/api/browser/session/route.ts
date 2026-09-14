import { getToken } from "next-auth/jwt"
import {
  appendBrowserHistory,
  clearPendingBrowserAction,
  closeBrowserSession,
  createBrowserSession,
  getActiveBrowserSession,
  getBrowserSession,
  setPendingBrowserAction,
  updateBrowserSession,
} from "@/lib/lumin-browser-session"
import { executeApprovedBrowserHttpAction, type BrowserHttpAction } from "@/lib/lumin-browser-http-executor"
import { executeHeadlessBrowserAction, type HeadlessBrowserAction } from "@/lib/lumin-browser-headless"

export const maxDuration = 120

function json(data: unknown, status = 200) {
  return Response.json(data, { status, headers: { "Cache-Control": "no-store" } })
}

async function auth(req: Request) {
  const token = await getToken({ req: req as any, secret: process.env.NEXTAUTH_SECRET }).catch(() => null)
  if (!token?.sub) return null
  return {
    userId: String(token.sub),
    organizationId: token.organizationId ? String(token.organizationId) : null,
    accessToken: token.supabaseAccessToken ? String(token.supabaseAccessToken) : null,
  }
}

function isExecutableHttpAction(value: any): value is BrowserHttpAction {
  if (!value || typeof value !== "object") return false
  if (value.type !== "submit_form" && value.type !== "navigate") return false
  if (typeof value.url !== "string" || !/^https?:\/\//i.test(value.url)) return false
  return true
}

function isExecutableHeadlessAction(value: any): value is HeadlessBrowserAction {
  if (!value || typeof value !== "object") return false
  if (!["navigate", "click", "fill", "fill_and_click"].includes(value.type)) return false
  if (typeof value.url !== "string" || !/^https?:\/\//i.test(value.url)) return false
  if ((value.type === "click" || value.type === "fill_and_click") && typeof value.selector !== "string") return false
  if ((value.type === "fill" || value.type === "fill_and_click") && (!value.fields || typeof value.fields !== "object")) return false
  return true
}

async function saveHeadlessResult(input: {
  session: any
  user: { userId: string; accessToken: string | null }
  execution: any
  action: any
  approved?: boolean
}) {
  const updated = await updateBrowserSession(
    input.session.id,
    input.user.userId,
    {
      status: input.execution.ok ? "active" : "error",
      pending_action: null,
      current_url: input.execution.finalUrl || input.session.current_url || null,
      cookies: input.execution.cookies || input.session.cookies || [],
      last_result: {
        executor: "headless",
        ok: Boolean(input.execution.ok),
        url: input.execution.finalUrl,
        title: input.execution.title,
        text: input.execution.text,
        links: input.execution.links,
        buttons: input.execution.buttons,
        inputs: input.execution.inputs,
        error: input.execution.error,
      },
    },
    input.user.accessToken,
  )

  if (!updated) return null
  return appendBrowserHistory(
    updated,
    input.user.userId,
    {
      type: input.execution.ok ? "headless_action_executed" : "headless_action_failed",
      executor: "headless",
      approved: Boolean(input.approved),
      action: input.action,
      url: input.execution.finalUrl,
      error: input.execution.error,
    },
    input.user.accessToken,
  )
}

export async function GET(req: Request) {
  const user = await auth(req)
  if (!user) return json({ error: "Autenticação necessária" }, 401)

  const url = new URL(req.url)
  const id = url.searchParams.get("id")

  try {
    const session = id
      ? await getBrowserSession(id, user.userId, user.accessToken)
      : await getActiveBrowserSession(user.userId, user.accessToken)

    return json({ session })
  } catch (error) {
    console.error("[Lumin Browser API] GET failed", error)
    return json({ error: "Não foi possível carregar a sessão do Browser Agent" }, 503)
  }
}

export async function POST(req: Request) {
  const user = await auth(req)
  if (!user) return json({ error: "Autenticação necessária" }, 401)

  const body = await req.json().catch(() => ({}))
  const action = String(body?.action || "create")

  try {
    if (action === "create") {
      const task = String(body?.task || "").trim()
      if (!task) return json({ error: "Tarefa em falta" }, 400)

      const existing = await getActiveBrowserSession(user.userId, user.accessToken).catch(() => null)
      if (existing && body?.reuse !== false) {
        const updated = await appendBrowserHistory(
          existing,
          user.userId,
          { type: "task_continued", task: task.slice(0, 1000) },
          user.accessToken,
        )
        return json({ session: updated, reused: true })
      }

      const session = await createBrowserSession({
        userId: user.userId,
        organizationId: user.organizationId,
        task,
        currentUrl: body?.url ? String(body.url) : null,
        accessToken: user.accessToken,
      })
      return json({ session, reused: false }, 201)
    }

    const id = String(body?.id || "")
    if (!id) return json({ error: "ID da sessão em falta" }, 400)
    const session = await getBrowserSession(id, user.userId, user.accessToken)
    if (!session) return json({ error: "Sessão não encontrada" }, 404)

    if (action === "navigate") {
      const targetUrl = String(body?.url || "").trim()
      if (!/^https?:\/\//i.test(targetUrl)) return json({ error: "URL inválido" }, 400)
      const updated = await updateBrowserSession(
        session.id,
        user.userId,
        { current_url: targetUrl },
        user.accessToken,
      )
      const withHistory = updated
        ? await appendBrowserHistory(updated, user.userId, { type: "navigate", url: targetUrl }, user.accessToken)
        : updated
      return json({ session: withHistory })
    }

    if (action === "headless_navigate") {
      const targetUrl = String(body?.url || session.current_url || "").trim()
      if (!/^https?:\/\//i.test(targetUrl)) return json({ error: "URL inválido" }, 400)
      const headlessAction: HeadlessBrowserAction = { type: "navigate", url: targetUrl }
      const execution = await executeHeadlessBrowserAction({ action: headlessAction, cookies: session.cookies })
      const updated = await saveHeadlessResult({ session, user, execution, action: headlessAction, approved: false })
      return json({ session: updated, execution, executed: execution.ok, executor: "headless" }, execution.ok ? 200 : 422)
    }

    if (action === "request_approval") {
      const pending = body?.pendingAction
      if (!pending || typeof pending !== "object") return json({ error: "Ação pendente inválida" }, 400)
      const updated = await setPendingBrowserAction({
        session,
        userId: user.userId,
        action: pending,
        accessToken: user.accessToken,
      })
      return json({ session: updated, requiresApproval: true })
    }

    if (action === "approve") {
      if (session.status !== "waiting_approval" || !session.pending_action) {
        return json({ error: "Não existe uma ação pendente para aprovar" }, 409)
      }

      const approvedAction = session.pending_action
      const approved = await appendBrowserHistory(
        session,
        user.userId,
        { type: "action_approved", action: approvedAction },
        user.accessToken,
      )

      if (!approved) return json({ error: "Não foi possível atualizar a sessão" }, 503)

      const wantsHeadless = approvedAction?.executor === "headless" || ["click", "fill", "fill_and_click"].includes(String(approvedAction?.type || ""))
      if (wantsHeadless && isExecutableHeadlessAction(approvedAction)) {
        const execution = await executeHeadlessBrowserAction({ action: approvedAction, cookies: approved.cookies })
        const updated = await saveHeadlessResult({ session: approved, user, execution, action: approvedAction, approved: true })
        return json({ session: updated, execution, executed: execution.ok, executor: "headless" }, execution.ok ? 200 : 422)
      }

      if (!isExecutableHttpAction(approvedAction)) {
        const cleared = await clearPendingBrowserAction(approved, user.userId, user.accessToken)
        return json({ session: cleared, approvedAction, readyForExecution: false, error: "Ação não suportada pelos executores atuais" }, 422)
      }

      const execution = await executeApprovedBrowserHttpAction({
        action: approvedAction,
        cookies: approved.cookies,
      })

      if (!execution.ok) {
        const failed = await updateBrowserSession(
          approved.id,
          user.userId,
          {
            status: "error",
            pending_action: null,
            last_result: {
              executor: "http",
              ok: false,
              error: execution.error || "execution_failed",
              action: approvedAction,
            },
          },
          user.accessToken,
        )
        const withHistory = failed
          ? await appendBrowserHistory(
              failed,
              user.userId,
              { type: "action_execution_failed", executor: "http", error: execution.error, action: approvedAction },
              user.accessToken,
            )
          : failed
        return json({ session: withHistory, execution, executed: false }, 422)
      }

      const updated = await updateBrowserSession(
        approved.id,
        user.userId,
        {
          status: "active",
          pending_action: null,
          current_url: execution.finalUrl || approved.current_url || null,
          cookies: execution.cookies || approved.cookies || [],
          last_result: {
            executor: "http",
            ok: true,
            status: execution.status,
            url: execution.finalUrl,
            title: execution.title,
            text: execution.text,
          },
        },
        user.accessToken,
      )

      const withHistory = updated
        ? await appendBrowserHistory(
            updated,
            user.userId,
            {
              type: "action_executed",
              executor: "http",
              action: approvedAction,
              status: execution.status,
              url: execution.finalUrl,
            },
            user.accessToken,
          )
        : updated

      return json({ session: withHistory, execution, executed: true, executor: "http" })
    }

    if (action === "reject") {
      const rejectedAction = session.pending_action
      const cleared = await clearPendingBrowserAction(session, user.userId, user.accessToken)
      const updated = cleared
        ? await appendBrowserHistory(
            cleared,
            user.userId,
            { type: "action_rejected", action: rejectedAction },
            user.accessToken,
          )
        : cleared
      return json({ session: updated })
    }

    if (action === "complete" || action === "cancel") {
      const status = action === "complete" ? "completed" : "cancelled"
      const updated = await closeBrowserSession(session, user.userId, status, user.accessToken)
      return json({ session: updated })
    }

    return json({ error: "Ação desconhecida" }, 400)
  } catch (error: any) {
    console.error("[Lumin Browser API] POST failed", error)
    const notConfigured = String(error?.message || "").includes("not_configured")
    return json(
      { error: notConfigured ? "A persistência do Browser Agent ainda não está configurada" : "Falha na sessão do Browser Agent" },
      503,
    )
  }
}
