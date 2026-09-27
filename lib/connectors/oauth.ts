import "server-only"
import crypto from "node:crypto"

export type OAuthProviderId = "google" | "github" | "meta" | "canva" | "figma" | "netlify"

export type OAuthProviderConfig = {
  id: OAuthProviderId
  label: string
  authorizationUrl: string
  tokenUrl: string
  scopes: string[]
  clientId: () => string
  clientSecret: () => string
  pkce?: boolean
  tokenAuth?: "body" | "basic"
  extraAuthorizationParams?: Record<string, string>
  profile: (accessToken: string) => Promise<{ id?: string; name?: string; email?: string; username?: string }>
}

function firstEnv(...names: string[]) {
  for (const name of names) {
    const value = process.env[name]?.trim()
    if (value) return value
  }
  return ""
}

const googleProfile = async (accessToken: string) => {
  const response = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
    signal: AbortSignal.timeout(10000),
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data?.error_description || data?.error || "Não foi possível ler a conta Google.")
  return { id: data.sub, name: data.name, email: data.email }
}

const githubProfile = async (accessToken: string) => {
  const response = await fetch("https://api.github.com/user", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2026-03-10",
      "User-Agent": "LuminAI",
    },
    cache: "no-store",
    signal: AbortSignal.timeout(10000),
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data?.message || "Não foi possível ler a conta GitHub.")
  return { id: String(data.id || ""), name: data.name || data.login, username: data.login, email: data.email }
}

const metaProfile = async (accessToken: string) => {
  const url = new URL("https://graph.facebook.com/me")
  url.searchParams.set("fields", "id,name,email")
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
    signal: AbortSignal.timeout(10000),
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data?.error?.message || "Não foi possível ler a conta Meta.")
  return { id: data.id, name: data.name, email: data.email }
}

const canvaProfile = async (accessToken: string) => {
  const response = await fetch("https://api.canva.com/rest/v1/users/me/profile", {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
    signal: AbortSignal.timeout(10000),
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data?.message || "Não foi possível ler a conta Canva.")
  return { id: data?.profile?.user_id || data?.user_id, name: data?.profile?.display_name || data?.display_name }
}

const figmaProfile = async (accessToken: string) => {
  const response = await fetch("https://api.figma.com/v1/me", {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
    signal: AbortSignal.timeout(10000),
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data?.message || "Não foi possível ler a conta Figma.")
  return { id: data.id, name: data.handle, email: data.email }
}

const netlifyProfile = async (accessToken: string) => {
  const response = await fetch("https://api.netlify.com/api/v1/user", {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
    signal: AbortSignal.timeout(10000),
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data?.message || "Não foi possível ler a conta Netlify.")
  return { id: data.id, name: data.full_name || data.name, email: data.email }
}

export const OAUTH_PROVIDERS: Record<OAuthProviderId, OAuthProviderConfig> = {
  google: {
    id: "google",
    label: "Google",
    authorizationUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    scopes: [
      "openid",
      "email",
      "profile",
      "https://www.googleapis.com/auth/gmail.readonly",
      "https://www.googleapis.com/auth/calendar.readonly",
      "https://www.googleapis.com/auth/drive.metadata.readonly",
    ],
    clientId: () => firstEnv("GOOGLE_CONNECTOR_CLIENT_ID", "GOOGLE_CLIENT_ID"),
    clientSecret: () => firstEnv("GOOGLE_CONNECTOR_CLIENT_SECRET", "GOOGLE_CLIENT_SECRET"),
    pkce: true,
    tokenAuth: "body",
    extraAuthorizationParams: {
      access_type: "offline",
      include_granted_scopes: "true",
      prompt: "consent",
    },
    profile: googleProfile,
  },
  github: {
    id: "github",
    label: "GitHub",
    authorizationUrl: "https://github.com/login/oauth/authorize",
    tokenUrl: "https://github.com/login/oauth/access_token",
    scopes: ["read:user", "user:email"],
    clientId: () => firstEnv("GITHUB_CONNECTOR_CLIENT_ID"),
    clientSecret: () => firstEnv("GITHUB_CONNECTOR_CLIENT_SECRET"),
    tokenAuth: "body",
    profile: githubProfile,
  },
  meta: {
    id: "meta",
    label: "Meta",
    authorizationUrl: "https://www.facebook.com/dialog/oauth",
    tokenUrl: "https://graph.facebook.com/oauth/access_token",
    scopes: [
      "public_profile",
      "email",
      "pages_show_list",
      "pages_read_engagement",
      "instagram_basic",
    ],
    clientId: () => firstEnv("META_CONNECTOR_APP_ID"),
    clientSecret: () => firstEnv("META_CONNECTOR_APP_SECRET"),
    tokenAuth: "body",
    profile: metaProfile,
  },
  canva: {
    id: "canva",
    label: "Canva",
    authorizationUrl: "https://www.canva.com/api/oauth/authorize",
    tokenUrl: "https://api.canva.com/rest/v1/oauth/token",
    scopes: ["profile:read", "design:meta:read", "design:content:read", "asset:read"],
    clientId: () => firstEnv("CANVA_CONNECTOR_CLIENT_ID"),
    clientSecret: () => firstEnv("CANVA_CONNECTOR_CLIENT_SECRET"),
    pkce: true,
    tokenAuth: "basic",
    profile: canvaProfile,
  },
  figma: {
    id: "figma",
    label: "Figma",
    authorizationUrl: "https://www.figma.com/oauth",
    tokenUrl: "https://api.figma.com/v1/oauth/token",
    scopes: ["current_user:read", "file_content:read", "file_metadata:read"],
    clientId: () => firstEnv("FIGMA_CONNECTOR_CLIENT_ID"),
    clientSecret: () => firstEnv("FIGMA_CONNECTOR_CLIENT_SECRET"),
    pkce: true,
    tokenAuth: "basic",
    profile: figmaProfile,
  },
  netlify: {
    id: "netlify",
    label: "Netlify",
    authorizationUrl: "https://app.netlify.com/authorize",
    tokenUrl: "https://api.netlify.com/oauth/token",
    scopes: [],
    clientId: () => firstEnv("NETLIFY_CONNECTOR_CLIENT_ID"),
    clientSecret: () => firstEnv("NETLIFY_CONNECTOR_CLIENT_SECRET"),
    tokenAuth: "body",
    profile: netlifyProfile,
  },
}

export function oauthProvider(id: string) {
  return OAUTH_PROVIDERS[id as OAuthProviderId] || null
}

export function oauthProviderStatus() {
  return Object.values(OAUTH_PROVIDERS).map((provider) => ({
    id: provider.id,
    label: provider.label,
    configured: Boolean(provider.clientId() && provider.clientSecret()),
    callbackPath: `/api/connectors/oauth/callback/${provider.id}`,
  }))
}

export function randomState() {
  return crypto.randomBytes(24).toString("base64url")
}

export function randomVerifier() {
  return crypto.randomBytes(48).toString("base64url")
}

function oauthStateKey() {
  const secret = process.env.NEXTAUTH_SECRET?.trim()
  if (!secret) throw new Error("NEXTAUTH_SECRET não configurado.")
  return crypto.createHash("sha256").update(secret).digest()
}

export function sealOAuthState(payload: {
  provider: string
  userId: string
  organizationId?: string | null
  verifier?: string
  createdAt: number
}) {
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv("aes-256-gcm", oauthStateKey(), iv)
  const plaintext = Buffer.from(JSON.stringify(payload), "utf8")
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()])
  const tag = cipher.getAuthTag()
  return [iv.toString("base64url"), tag.toString("base64url"), ciphertext.toString("base64url")].join(".")
}

export function openOAuthState(value: string) {
  const parts = value.split(".")
  if (parts.length !== 3) throw new Error("Estado OAuth inválido.")
  const [ivPart, tagPart, bodyPart] = parts
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    oauthStateKey(),
    Buffer.from(ivPart, "base64url"),
  )
  decipher.setAuthTag(Buffer.from(tagPart, "base64url"))
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(bodyPart, "base64url")),
    decipher.final(),
  ]).toString("utf8")
  const parsed = JSON.parse(plaintext)
  if (!parsed?.provider || !parsed?.userId || !parsed?.createdAt) {
    throw new Error("Estado OAuth incompleto.")
  }
  return parsed as {
    provider: string
    userId: string
    organizationId?: string | null
    verifier?: string
    createdAt: number
  }
}

export function challengeFor(verifier: string) {
  return crypto.createHash("sha256").update(verifier).digest("base64url")
}

export function oauthCookieName(provider: string) {
  return `lumin_oauth_${provider}`
}

export function buildAuthorizationUrl(params: {
  provider: OAuthProviderConfig
  redirectUri: string
  state: string
  verifier?: string
}) {
  const url = new URL(params.provider.authorizationUrl)
  url.searchParams.set("client_id", params.provider.clientId())
  url.searchParams.set("redirect_uri", params.redirectUri)
  url.searchParams.set("response_type", "code")
  url.searchParams.set("state", params.state)
  if (params.provider.scopes.length) url.searchParams.set("scope", params.provider.scopes.join(" "))
  if (params.provider.pkce && params.verifier) {
    url.searchParams.set("code_challenge", challengeFor(params.verifier))
    url.searchParams.set("code_challenge_method", "S256")
  }
  for (const [key, value] of Object.entries(params.provider.extraAuthorizationParams || {})) {
    url.searchParams.set(key, value)
  }
  return url
}

export async function exchangeAuthorizationCode(params: {
  provider: OAuthProviderConfig
  code: string
  redirectUri: string
  verifier?: string
}) {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code: params.code,
    redirect_uri: params.redirectUri,
  })
  if (params.provider.tokenAuth !== "basic") {
    body.set("client_id", params.provider.clientId())
    body.set("client_secret", params.provider.clientSecret())
  }
  if (params.verifier) body.set("code_verifier", params.verifier)

  const headers: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/x-www-form-urlencoded",
  }
  if (params.provider.tokenAuth === "basic") {
    headers.Authorization = `Basic ${Buffer.from(`${params.provider.clientId()}:${params.provider.clientSecret()}`).toString("base64")}`
  }

  const response = await fetch(params.provider.tokenUrl, {
    method: "POST",
    headers,
    body,
    cache: "no-store",
    signal: AbortSignal.timeout(15000),
  })

  const raw = await response.text()
  let data: any = {}
  try { data = JSON.parse(raw) } catch {
    data = Object.fromEntries(new URLSearchParams(raw))
  }

  if (!response.ok || !data?.access_token) {
    throw new Error(String(data?.error_description || data?.error?.message || data?.error || `OAuth HTTP ${response.status}`))
  }

  return data
}
