import { NextRequest, NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"
import {
  exchangeAuthorizationCode,
  oauthProvider,
  openOAuthState,
} from "@/lib/connectors/oauth"
import { resolveOAuthAppCredentials } from "@/lib/connectors/provider-settings"
import {
  getConnection,
  getConnectionSecret,
  scopeFromToken,
  setConnectionSecret,
  upsertConnection,
} from "@/lib/connectors/store"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function back(req: NextRequest, params: Record<string, string>) {
  const url = new URL("/connectors", req.nextUrl.origin)
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value)
  return NextResponse.redirect(url)
}

function capabilities(provider: string) {
  const map: Record<string, string[]> = {
    google: ["identity.read", "gmail.read", "calendar.read", "drive.read"],
    github: ["profile.read", "repos.public.read"],
    meta: ["profile.read", "pages.read", "instagram.read"],
    canva: ["profile.read", "design.read", "asset.read"],
    figma: ["profile.read", "files.read"],
    netlify: ["profile.read", "sites.read"],
  }
  return map[provider] || ["read"]
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ provider: string }> },
) {
  const { provider: providerId } = await context.params
  const provider = oauthProvider(providerId)
  if (!provider) return back(req, { oauth: "unsupported" })

  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET }).catch(() => null)
    const scope = scopeFromToken(token)
    if (!scope) return back(req, { oauth: "session_expired", provider: provider.id })

    const error = req.nextUrl.searchParams.get("error")
    if (error) {
      return back(req, {
        oauth: "denied",
        provider: provider.id,
        reason: req.nextUrl.searchParams.get("error_description") || error,
      })
    }

    const code = req.nextUrl.searchParams.get("code") || ""
    const returnedState = req.nextUrl.searchParams.get("state") || ""
    if (!code || !returnedState) throw new Error("Fluxo OAuth incompleto ou expirado.")

    const saved = openOAuthState(returnedState)
    if (saved.provider !== provider.id) {
      throw new Error("Validação de segurança OAuth falhou.")
    }
    if (String(saved.userId) !== String(token?.sub || "")) {
      throw new Error("A autorização pertence a outra sessão. Tenta novamente.")
    }
    const tokenOrganizationId = token?.organizationId ? String(token.organizationId) : null
    const savedOrganizationId = saved.organizationId ? String(saved.organizationId) : null
    if (savedOrganizationId !== tokenOrganizationId) {
      throw new Error("O contexto da empresa mudou durante a autorização. Tenta novamente.")
    }
    if (Date.now() - Number(saved.createdAt || 0) > 10 * 60 * 1000) {
      throw new Error("A autorização expirou. Tenta novamente.")
    }

    const credentials = await resolveOAuthAppCredentials(provider.id)
    if (!credentials.configured) throw new Error("A app OAuth deste fornecedor deixou de estar configurada.")

    const redirectUri = saved.redirectUri
      ? String(saved.redirectUri)
      : new URL(`/api/connectors/oauth/callback/${provider.id}`, req.nextUrl.origin).toString()
    const tokenData = await exchangeAuthorizationCode({
      provider,
      code,
      redirectUri,
      verifier: saved.verifier || undefined,
      clientId: credentials.clientId,
      clientSecret: credentials.clientSecret,
    })

    const profile = await provider.profile(String(tokenData.access_token))
    const existing = await getConnection(scope, provider.id)
    let previous: any = {}
    if (existing?.secret_id) {
      try {
        previous = JSON.parse(await getConnectionSecret(existing.id))
      } catch {}
    }

    const expiresAt = tokenData.expires_in
      ? Date.now() + Number(tokenData.expires_in) * 1000
      : previous?.expires_at || null

    const secretPayload = {
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token || previous?.refresh_token || null,
      token_type: tokenData.token_type || previous?.token_type || "Bearer",
      scope: tokenData.scope || previous?.scope || provider.scopes.join(" "),
      expires_at: expiresAt,
      provider: provider.id,
    }

    const row = await upsertConnection({
      scope,
      provider: provider.id,
      label: [provider.label, profile.email || profile.username || profile.name].filter(Boolean).join(" · "),
      authType: "oauth",
      config: {
        accountId: profile.id || null,
        accountName: profile.name || null,
        accountEmail: profile.email || null,
        username: profile.username || null,
        scopes: String(secretPayload.scope || "").split(/[ ,]+/).filter(Boolean),
        expiresAt,
      },
      capabilities: capabilities(provider.id),
      status: "connected",
    })
    if (!row?.id) throw new Error("Não foi possível guardar a ligação OAuth.")

    await setConnectionSecret(row.id, JSON.stringify(secretPayload))

    return back(req, { oauth: "success", provider: provider.id })
  } catch (error: any) {
    console.error("[Lumin OAuth] callback failed", provider.id, error)
    return back(req, {
      oauth: "error",
      provider: provider.id,
      reason: String(error?.message || "OAuth falhou").slice(0, 300),
    })
  }
}
