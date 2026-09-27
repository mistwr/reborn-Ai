import { NextRequest, NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"
import {
  getOAuthProviderSetting,
  resolveOAuthAppCredentials,
  saveOAuthProviderSetting,
} from "@/lib/connectors/provider-settings"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

async function ownerToken(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET }).catch(() => null)
  const isOwner = Boolean((token as any)?.isFounder || (token as any)?.role === "owner")
  return isOwner ? token : null
}

function preview(value: string) {
  if (!value) return ""
  if (value.length <= 10) return value.slice(0, 3) + "••••"
  return value.slice(0, 6) + "••••" + value.slice(-4)
}

export async function GET(req: NextRequest) {
  const token = await ownerToken(req)
  if (!token) return NextResponse.json({ error: "Apenas o administrador do Lumin pode configurar o WhatsApp." }, { status: 403 })

  const [creds, row] = await Promise.all([
    resolveOAuthAppCredentials("twilio"),
    getOAuthProviderSetting("twilio").catch(() => null),
  ])

  return NextResponse.json({
    ok: true,
    configured: creds.configured,
    source: creds.source,
    accountSidPreview: preview(creds.clientId),
    hasVaultSecret: Boolean(row?.secret_id),
    webhookUrl: `${req.nextUrl.origin}/api/whatsapp`,
  })
}

export async function POST(req: NextRequest) {
  try {
    const token = await ownerToken(req)
    if (!token) return NextResponse.json({ error: "Apenas o administrador do Lumin pode configurar o WhatsApp." }, { status: 403 })

    const body = await req.json().catch(() => ({}))
    const accountSid = String(body?.accountSid || "").trim()
    const authToken = typeof body?.authToken === "string" ? body.authToken.trim() : ""

    if (!/^AC[0-9a-fA-F]{32}$/.test(accountSid)) {
      return NextResponse.json({ error: "Account SID Twilio inválido." }, { status: 400 })
    }

    const existing = await resolveOAuthAppCredentials("twilio")
    if (!authToken && !existing.configured) {
      return NextResponse.json({ error: "Indica o Auth Token da Twilio." }, { status: 400 })
    }

    await saveOAuthProviderSetting({
      provider: "twilio",
      clientId: accountSid,
      clientSecret: authToken || undefined,
      enabled: true,
      notes: "Credencial de sistema usada pelo webhook WhatsApp do Lumin.",
      configuredBy: String((token as any)?.email || (token as any)?.sub || "owner"),
    })

    const creds = await resolveOAuthAppCredentials("twilio")
    return NextResponse.json({
      ok: true,
      configured: creds.configured,
      source: creds.source,
      accountSidPreview: preview(creds.clientId),
      webhookUrl: `${req.nextUrl.origin}/api/whatsapp`,
    })
  } catch (error: any) {
    console.error("[Lumin WhatsApp Settings] save failed", error)
    return NextResponse.json({ error: String(error?.message || "Não foi possível guardar a configuração Twilio.") }, { status: 400 })
  }
}
