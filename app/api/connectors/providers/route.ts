import { NextRequest, NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"
import {
  listOAuthProviderStatuses,
  removeOAuthProviderSetting,
  saveOAuthProviderSetting,
} from "@/lib/connectors/provider-settings"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

async function ownerToken(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET }).catch(() => null)
  const isOwner = Boolean((token as any)?.isFounder || (token as any)?.role === "owner")
  return isOwner ? token : null
}

export async function GET(req: NextRequest) {
  const token = await ownerToken(req)
  if (!token) return NextResponse.json({ error: "Apenas o administrador do Lumin pode configurar apps OAuth." }, { status: 403 })

  const providers = await listOAuthProviderStatuses(req.nextUrl.origin)
  return NextResponse.json({ ok: true, providers })
}

export async function POST(req: NextRequest) {
  try {
    const token = await ownerToken(req)
    if (!token) return NextResponse.json({ error: "Apenas o administrador do Lumin pode configurar apps OAuth." }, { status: 403 })

    const body = await req.json().catch(() => ({}))
    const provider = String(body?.provider || "").trim().toLowerCase()
    const clientId = String(body?.clientId || "").trim()
    const clientSecret = typeof body?.clientSecret === "string" ? body.clientSecret.trim() : ""
    const enabled = body?.enabled !== false
    const notes = String(body?.notes || "").trim()

    if (!provider || !clientId) {
      return NextResponse.json({ error: "Provider e Client ID são obrigatórios." }, { status: 400 })
    }

    await saveOAuthProviderSetting({
      provider,
      clientId,
      clientSecret: clientSecret || undefined,
      enabled,
      notes,
      configuredBy: String((token as any)?.email || (token as any)?.sub || "owner"),
    })

    const providers = await listOAuthProviderStatuses(req.nextUrl.origin)
    return NextResponse.json({ ok: true, providers })
  } catch (error: any) {
    console.error("[Lumin OAuth Providers] save failed", error)
    return NextResponse.json({ error: String(error?.message || "Não foi possível guardar a app OAuth.") }, { status: 400 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const token = await ownerToken(req)
    if (!token) return NextResponse.json({ error: "Apenas o administrador do Lumin pode configurar apps OAuth." }, { status: 403 })

    const body = await req.json().catch(() => ({}))
    const provider = String(body?.provider || "").trim().toLowerCase()
    if (!provider) return NextResponse.json({ error: "Provider obrigatório." }, { status: 400 })

    await removeOAuthProviderSetting(provider)
    const providers = await listOAuthProviderStatuses(req.nextUrl.origin)
    return NextResponse.json({ ok: true, providers })
  } catch (error: any) {
    console.error("[Lumin OAuth Providers] delete failed", error)
    return NextResponse.json({ error: String(error?.message || "Não foi possível remover a configuração OAuth.") }, { status: 400 })
  }
}
