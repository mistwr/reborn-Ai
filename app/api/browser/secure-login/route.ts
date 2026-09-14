import { getToken } from "next-auth/jwt"
import { executeSecureLogin } from "@/lib/lumin-browser-secure-login"
import {
  appendBrowserHistory,
  getActiveBrowserSession,
  getBrowserSession,
  updateBrowserSession,
} from "@/lib/lumin-browser-session"

export const maxDuration = 120

function json(data: unknown, status = 200) {
  return Response.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate",
      Pragma: "no-cache",
    },
  })
}

async function auth(req: Request) {
  const token = await getToken({ req: req as any, secret: process.env.NEXTAUTH_SECRET }).catch(() => null)
  if (!token?.sub) return null
  return {
    userId: String(token.sub),
    accessToken: token.supabaseAccessToken ? String(token.supabaseAccessToken) : null,
  }
}

export async function POST(req: Request) {
  const user = await auth(req)
  if (!user) return json({ error: "Autenticação necessária" }, 401)

  // Não fazer console.log do body: pode conter password/OTP.
  const body = await req.json().catch(() => ({}))
  const sessionId = typeof body?.sessionId === "string" ? body.sessionId : ""

  try {
    const session = sessionId
      ? await getBrowserSession(sessionId, user.userId, user.accessToken)
      : await getActiveBrowserSession(user.userId, user.accessToken)

    if (!session) return json({ error: "Sessão Browser Agent não encontrada" }, 404)

    const username = typeof body?.username === "string" ? body.username : undefined
    const password = typeof body?.password === "string" ? body.password : undefined
    const otp = typeof body?.otp === "string" ? body.otp : undefined

    if (!username && !password && !otp) {
      return json({ error: "Dados de autenticação em falta" }, 400)
    }

    const result = await executeSecureLogin({
      session,
      secrets: { username, password, otp },
    })

    // Reduzir referências o mais cedo possível. Não persistimos nem devolvemos segredos.
    body.username = undefined
    body.password = undefined
    body.otp = undefined

    if (!result.ok) {
      const patch = {
        last_result: {
          executor: "secure_login",
          ok: false,
          error: result.error || "secure_login_failed",
          needsOtp: Boolean(result.needsOtp),
          needsCaptcha: Boolean(result.needsCaptcha),
        },
      }
      const updated = await updateBrowserSession(session.id, user.userId, patch, user.accessToken)
      return json(
        {
          ok: false,
          sessionId: session.id,
          needsOtp: Boolean(result.needsOtp),
          needsCaptcha: Boolean(result.needsCaptcha),
          error: result.error || "Falha no login seguro",
          session: updated,
        },
        result.needsCaptcha ? 409 : 422,
      )
    }

    const updated = await updateBrowserSession(
      session.id,
      user.userId,
      {
        status: "active",
        pending_action: null,
        current_url: result.finalUrl || session.current_url || null,
        cookies: Array.isArray(result.cookies) ? result.cookies : session.cookies,
        last_result: {
          executor: "secure_login",
          ok: true,
          url: result.finalUrl,
          title: result.title,
          text: result.text,
          links: result.links || [],
          buttons: result.buttons || [],
          inputs: result.inputs || [],
          needsOtp: Boolean(result.needsOtp),
          needsCaptcha: Boolean(result.needsCaptcha),
        },
      },
      user.accessToken,
    )

    const withHistory = updated
      ? await appendBrowserHistory(
          updated,
          user.userId,
          {
            type: "secure_login_attempt",
            ok: true,
            url: result.finalUrl,
            needsOtp: Boolean(result.needsOtp),
            needsCaptcha: Boolean(result.needsCaptcha),
          },
          user.accessToken,
        )
      : updated

    return json({
      ok: true,
      sessionId: session.id,
      authenticated: !result.needsOtp && !result.needsCaptcha,
      needsOtp: Boolean(result.needsOtp),
      needsCaptcha: Boolean(result.needsCaptcha),
      session: withHistory || updated,
    })
  } catch (error) {
    console.error("[Lumin Secure Login] failed without credential logging", error)
    return json({ error: "Não foi possível concluir o login seguro" }, 503)
  }
}
