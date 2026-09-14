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

export const maxDuration = 30

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
      const cleared = await clearPendingBrowserAction(session, user.userId, user.accessToken)
      const updated = cleared
        ? await appendBrowserHistory(
            cleared,
            user.userId,
            { type: "action_approved", action: approvedAction },
            user.accessToken,
          )
        : cleared
      return json({ session: updated, approvedAction, readyForExecution: true })
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
