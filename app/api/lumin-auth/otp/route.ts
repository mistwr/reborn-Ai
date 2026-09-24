import { NextResponse } from "next/server"

export const runtime = "nodejs"

const SUPABASE_URL = process.env.NEXT_PUBLIC_LUMIN_SUPABASE_URL?.trim() || "https://yqninaripblwhcfcwwnr.supabase.co"
const SUPABASE_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_LUMIN_SUPABASE_PUBLISHABLE_KEY?.trim() || "sb_publishable_zlhSNpfeS3gjBDPsxOPiCQ_DYkKwgb_"
const CANONICAL_LUMIN_URL = "https://rebornaaqi.vercel.app"

function headers(accessToken?: string) {
  return {
    apikey: SUPABASE_PUBLISHABLE_KEY,
    "Content-Type": "application/json",
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
  }
}

function normalizeHttpsUrl(value?: string | null) {
  if (!value) return null
  try {
    const url = new URL(value.trim())
    if (url.protocol !== "https:") return null
    const host = url.hostname.toLowerCase()
    if (!host || host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local")) return null
    url.hash = ""
    return url.toString().replace(/\/$/, "")
  } catch {
    return null
  }
}

function safeRedirectUrl(req: Request) {
  if (process.env.NODE_ENV === "production") {
    return (
      normalizeHttpsUrl(process.env.LUMIN_AUTH_REDIRECT_URL) ||
      normalizeHttpsUrl(process.env.NEXT_PUBLIC_SITE_URL) ||
      CANONICAL_LUMIN_URL
    )
  }

  const explicit = process.env.LUMIN_AUTH_REDIRECT_URL?.trim() || process.env.NEXTAUTH_URL?.trim()
  if (explicit) {
    try {
      const url = new URL(explicit)
      if (url.protocol === "https:" || (url.protocol === "http:" && url.hostname === "localhost")) {
        url.hash = ""
        return url.toString().replace(/\/$/, "")
      }
    } catch {}
  }

  try {
    const origin = new URL(req.url).origin
    if (origin.startsWith("http://localhost")) return origin
  } catch {}

  return CANONICAL_LUMIN_URL
}

async function loadAccount(userId: string, accessToken: string) {
  const accountResponse = await fetch(
    `${SUPABASE_URL}/rest/v1/lumin_accounts?user_id=eq.${encodeURIComponent(userId)}&select=user_id,display_name,account_type,active_organization_id,onboarding_completed&limit=1`,
    { headers: headers(accessToken), cache: "no-store" },
  )
  const accounts = accountResponse.ok ? await accountResponse.json().catch(() => []) : []
  return Array.isArray(accounts) ? accounts[0] || null : null
}

async function inspectAccessToken(accessToken: string) {
  const userResponse = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: headers(accessToken),
    cache: "no-store",
  })
  const user = await userResponse.json().catch(() => null)
  if (!userResponse.ok || !user?.id) return null

  const account = await loadAccount(user.id, accessToken)
  return {
    user: {
      id: user.id,
      email: user.email || "",
      name: user.user_metadata?.name || user.user_metadata?.full_name || "",
    },
    account,
    needsOnboarding: !account?.onboarding_completed,
  }
}

function authSendError(response: Response, data: any) {
  const raw = String(data?.msg || data?.error_description || data?.message || "").toLowerCase()
  const retryAfter = Number(response.headers.get("retry-after") || "0") || null

  if (response.status === 429 || raw.includes("rate limit") || raw.includes("too many")) {
    return NextResponse.json(
      {
        error: "Já pediste vários acessos em pouco tempo. Usa o último email que recebeste; se já expirou, espera um pouco antes de pedir outro.",
        code: "EMAIL_RATE_LIMIT",
        retryAfter,
      },
      { status: 429 },
    )
  }

  if (raw.includes("not authorized") || raw.includes("email address not authorized")) {
    return NextResponse.json(
      {
        error: "Este email ainda não pode receber acessos. O envio de autenticação precisa de SMTP próprio para produção.",
        code: "EMAIL_NOT_AUTHORIZED",
      },
      { status: 503 },
    )
  }

  return NextResponse.json(
    { error: data?.msg || data?.error_description || data?.message || "Não foi possível enviar o acesso." },
    { status: response.status },
  )
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const action = String(body?.action || "")
    const email = String(body?.email || "").trim().toLowerCase()

    if (action === "send") {
      if (!email) return NextResponse.json({ error: "Email obrigatório." }, { status: 400 })

      const redirectTo = safeRedirectUrl(req)
      const response = await fetch(`${SUPABASE_URL}/auth/v1/otp?redirect_to=${encodeURIComponent(redirectTo)}`, {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({
          email,
          create_user: true,
          data: { product: "lumin-ai" },
        }),
        cache: "no-store",
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) return authSendError(response, data)

      return NextResponse.json({ ok: true, mode: "email_passwordless", redirectTo })
    }

    if (action === "inspect") {
      const accessToken = String(body?.accessToken || "").trim()
      if (!accessToken) return NextResponse.json({ error: "Sessão de acesso em falta." }, { status: 400 })

      const inspected = await inspectAccessToken(accessToken)
      if (!inspected) return NextResponse.json({ error: "Link inválido ou expirado." }, { status: 401 })
      return NextResponse.json({ ok: true, ...inspected })
    }

    if (action === "verify") {
      const token = String(body?.token || "").trim()
      if (!email || !token) return NextResponse.json({ error: "Email e código são obrigatórios." }, { status: 400 })

      const response = await fetch(`${SUPABASE_URL}/auth/v1/verify`, {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({ email, token, type: "email" }),
        cache: "no-store",
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok || !data?.access_token || !data?.user?.id) {
        return NextResponse.json(
          { error: data?.msg || data?.error_description || data?.message || "Código inválido ou expirado." },
          { status: response.status || 400 },
        )
      }

      const account = await loadAccount(data.user.id, data.access_token)

      return NextResponse.json({
        ok: true,
        accessToken: data.access_token,
        refreshToken: data.refresh_token || null,
        user: {
          id: data.user.id,
          email: data.user.email || email,
          name: data.user.user_metadata?.name || data.user.user_metadata?.full_name || "",
        },
        account,
        needsOnboarding: !account?.onboarding_completed,
      })
    }

    return NextResponse.json({ error: "Ação inválida." }, { status: 400 })
  } catch (error) {
    console.error("[Lumin Auth] OTP bridge error", error)
    return NextResponse.json({ error: "Erro interno de autenticação." }, { status: 500 })
  }
}
