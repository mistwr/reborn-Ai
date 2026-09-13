import { NextResponse } from "next/server"

export const runtime = "nodejs"

const SUPABASE_URL = process.env.NEXT_PUBLIC_LUMIN_SUPABASE_URL?.trim() || "https://yqninaripblwhcfcwwnr.supabase.co"
const SUPABASE_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_LUMIN_SUPABASE_PUBLISHABLE_KEY?.trim() || "sb_publishable_zlhSNpfeS3gjBDPsxOPiCQ_DYkKwgb_"

function headers(accessToken?: string) {
  return {
    apikey: SUPABASE_PUBLISHABLE_KEY,
    "Content-Type": "application/json",
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const action = String(body?.action || "")
    const email = String(body?.email || "").trim().toLowerCase()

    if (action === "send") {
      if (!email) return NextResponse.json({ error: "Email obrigatório." }, { status: 400 })

      const response = await fetch(`${SUPABASE_URL}/auth/v1/otp`, {
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
      if (!response.ok) {
        return NextResponse.json({ error: data?.msg || data?.error_description || data?.message || "Não foi possível enviar o código." }, { status: response.status })
      }
      return NextResponse.json({ ok: true })
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
        return NextResponse.json({ error: data?.msg || data?.error_description || data?.message || "Código inválido ou expirado." }, { status: response.status || 400 })
      }

      const accountResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/lumin_accounts?user_id=eq.${encodeURIComponent(data.user.id)}&select=user_id,display_name,account_type,active_organization_id,onboarding_completed&limit=1`,
        { headers: headers(data.access_token), cache: "no-store" },
      )
      const accounts = accountResponse.ok ? await accountResponse.json().catch(() => []) : []
      const account = Array.isArray(accounts) ? accounts[0] || null : null

      return NextResponse.json({
        ok: true,
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
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
