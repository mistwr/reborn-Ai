import { NextResponse } from "next/server"

export const runtime = "nodejs"

const SUPABASE_URL = process.env.NEXT_PUBLIC_LUMIN_SUPABASE_URL?.trim() || "https://yqninaripblwhcfcwwnr.supabase.co"
const SUPABASE_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_LUMIN_SUPABASE_PUBLISHABLE_KEY?.trim() || "sb_publishable_zlhSNpfeS3gjBDPsxOPiCQ_DYkKwgb_"

function headers(accessToken: string, prefer?: string) {
  return {
    apikey: SUPABASE_PUBLISHABLE_KEY,
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
    ...(prefer ? { Prefer: prefer } : {}),
  }
}

async function getUser(accessToken: string) {
  const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: headers(accessToken),
    cache: "no-store",
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok || !data?.id) throw new Error("Sessão Supabase inválida")
  return data
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const accessToken = String(body?.accessToken || "").trim()
    const displayName = String(body?.displayName || "").trim().slice(0, 120)
    const accountType = body?.accountType === "business" ? "business" : "personal"
    const companyName = String(body?.companyName || "").trim().slice(0, 160)
    const sector = String(body?.sector || "").trim().slice(0, 120)
    const website = String(body?.website || "").trim().slice(0, 300)

    if (!accessToken || !displayName) {
      return NextResponse.json({ error: "Sessão e nome são obrigatórios." }, { status: 400 })
    }
    if (accountType === "business" && !companyName) {
      return NextResponse.json({ error: "Indica o nome da empresa." }, { status: 400 })
    }

    const user = await getUser(accessToken)
    let organizationId: string | null = null

    if (accountType === "business") {
      const orgResponse = await fetch(`${SUPABASE_URL}/rest/v1/lumin_organizations`, {
        method: "POST",
        headers: headers(accessToken, "return=representation"),
        body: JSON.stringify({
          owner_user_id: user.id,
          name: companyName,
          sector: sector || null,
          website: website || null,
          plan: "business_free",
        }),
        cache: "no-store",
      })
      const orgData = await orgResponse.json().catch(() => [])
      if (!orgResponse.ok || !Array.isArray(orgData) || !orgData[0]?.id) {
        throw new Error(orgData?.message || "Não foi possível criar a empresa")
      }
      organizationId = orgData[0].id

      const memberResponse = await fetch(`${SUPABASE_URL}/rest/v1/lumin_organization_members`, {
        method: "POST",
        headers: headers(accessToken),
        body: JSON.stringify({ organization_id: organizationId, user_id: user.id, role: "owner" }),
        cache: "no-store",
      })
      if (!memberResponse.ok) throw new Error("Não foi possível associar o proprietário à empresa")

      const contextResponse = await fetch(`${SUPABASE_URL}/rest/v1/lumin_organization_context`, {
        method: "POST",
        headers: headers(accessToken),
        body: JSON.stringify({ organization_id: organizationId }),
        cache: "no-store",
      })
      if (!contextResponse.ok) throw new Error("Não foi possível preparar o contexto da empresa")
    }

    const accountResponse = await fetch(`${SUPABASE_URL}/rest/v1/lumin_accounts?on_conflict=user_id`, {
      method: "POST",
      headers: headers(accessToken, "resolution=merge-duplicates,return=representation"),
      body: JSON.stringify({
        user_id: user.id,
        email: user.email || null,
        display_name: displayName,
        account_type: accountType,
        active_organization_id: organizationId,
        onboarding_completed: true,
        updated_at: new Date().toISOString(),
      }),
      cache: "no-store",
    })
    const accountData = await accountResponse.json().catch(() => [])
    if (!accountResponse.ok) throw new Error(accountData?.message || "Não foi possível guardar o perfil Lumin")

    return NextResponse.json({
      ok: true,
      account: Array.isArray(accountData) ? accountData[0] || null : null,
      organizationId,
    })
  } catch (error: any) {
    console.error("[Lumin Auth] onboarding error", error)
    return NextResponse.json({ error: error?.message || "Erro ao concluir o registo." }, { status: 500 })
  }
}
