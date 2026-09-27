import { NextRequest, NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"
import {
  buildAuthorizationUrl,
  oauthProvider,
  randomVerifier,
  sealOAuthState,
} from "@/lib/connectors/oauth"
import { resolveOAuthAppCredentials } from "@/lib/connectors/provider-settings"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ provider: string }> },
) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET }).catch(() => null)
  if (!token?.sub) {
    return NextResponse.redirect(new URL("/?auth=required", req.nextUrl.origin))
  }

  const { provider: providerId } = await context.params
  const provider = oauthProvider(providerId)
  if (!provider) {
    return NextResponse.redirect(new URL("/connectors?oauth=unsupported", req.nextUrl.origin))
  }

  const credentials = await resolveOAuthAppCredentials(provider.id)
  if (!credentials.configured) {
    const url = new URL("/connectors", req.nextUrl.origin)
    url.searchParams.set("oauth", "not_configured")
    url.searchParams.set("provider", provider.id)
    return NextResponse.redirect(url)
  }

  const redirectUri = new URL(
    provider.id === "google"
      ? "/api/auth/callback/google"
      : `/api/connectors/oauth/callback/${provider.id}`,
    req.nextUrl.origin,
  ).toString()
  const verifier = provider.pkce ? randomVerifier() : ""
  const state = sealOAuthState({
    provider: provider.id,
    userId: String(token.sub),
    organizationId: token.organizationId ? String(token.organizationId) : null,
    verifier: verifier || undefined,
    redirectUri,
    createdAt: Date.now(),
  })

  const authorizationUrl = buildAuthorizationUrl({
    provider,
    redirectUri,
    state,
    verifier: verifier || undefined,
    clientId: credentials.clientId,
  })

  return NextResponse.redirect(authorizationUrl)
}
