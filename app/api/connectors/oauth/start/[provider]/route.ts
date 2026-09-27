import { NextRequest, NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"
import {
  buildAuthorizationUrl,
  oauthCookieName,
  oauthProvider,
  randomState,
  randomVerifier,
} from "@/lib/connectors/oauth"

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

  const clientId = provider.clientId()
  const clientSecret = provider.clientSecret()
  if (!clientId || !clientSecret) {
    const url = new URL("/connectors", req.nextUrl.origin)
    url.searchParams.set("oauth", "not_configured")
    url.searchParams.set("provider", provider.id)
    return NextResponse.redirect(url)
  }

  const redirectUri = new URL(`/api/connectors/oauth/callback/${provider.id}`, req.nextUrl.origin).toString()
  const state = randomState()
  const verifier = provider.pkce ? randomVerifier() : ""

  const authorizationUrl = buildAuthorizationUrl({
    provider,
    redirectUri,
    state,
    verifier: verifier || undefined,
  })

  const response = NextResponse.redirect(authorizationUrl)
  response.cookies.set(
    oauthCookieName(provider.id),
    Buffer.from(JSON.stringify({ state, verifier, createdAt: Date.now() })).toString("base64url"),
    {
      httpOnly: true,
      secure: req.nextUrl.protocol === "https:",
      sameSite: "lax",
      path: `/api/connectors/oauth/callback/${provider.id}`,
      maxAge: 10 * 60,
    },
  )
  return response
}
