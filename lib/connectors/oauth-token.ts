import "server-only"
import { oauthProvider } from "@/lib/connectors/oauth"
import { resolveOAuthAppCredentials } from "@/lib/connectors/provider-settings"
import {
  ConnectorRow,
  getConnectionSecret,
  setConnectionSecret,
  updateConnection,
} from "@/lib/connectors/store"

function parseSecret(raw: string) {
  try { return JSON.parse(raw) } catch { return { access_token: raw } }
}

async function refreshOAuthToken(row: ConnectorRow, data: any) {
  const provider = oauthProvider(row.provider)
  if (!provider || !data?.refresh_token) return data

  const credentials = await resolveOAuthAppCredentials(row.provider)
  if (!credentials.configured) throw new Error("A app OAuth deste fornecedor não está configurada.")

  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: String(data.refresh_token),
  })

  const headers: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/x-www-form-urlencoded",
  }

  if (provider.tokenAuth === "basic") {
    headers.Authorization = `Basic ${Buffer.from(`${credentials.clientId}:${credentials.clientSecret}`).toString("base64")}`
  } else {
    body.set("client_id", credentials.clientId)
    body.set("client_secret", credentials.clientSecret)
  }

  const response = await fetch(provider.tokenUrl, {
    method: "POST",
    headers,
    body,
    cache: "no-store",
    signal: AbortSignal.timeout(15000),
  })

  const raw = await response.text()
  let next: any = {}
  try { next = JSON.parse(raw) } catch {
    next = Object.fromEntries(new URLSearchParams(raw))
  }

  if (!response.ok || !next?.access_token) {
    throw new Error(String(next?.error_description || next?.error || `OAuth refresh HTTP ${response.status}`))
  }

  const merged = {
    ...data,
    ...next,
    refresh_token: next.refresh_token || data.refresh_token,
    expires_at: next.expires_in ? Date.now() + Number(next.expires_in) * 1000 : data.expires_at || null,
  }

  await setConnectionSecret(row.id, JSON.stringify(merged))
  await updateConnection(row.id, {
    config: {
      ...(row.config || {}),
      expiresAt: merged.expires_at || null,
    },
    status: "connected",
    last_error: null,
    last_tested_at: new Date().toISOString(),
  }).catch(() => null)

  return merged
}

export async function oauthAccessToken(row: ConnectorRow) {
  if (!row.secret_id) throw new Error("O conector OAuth não tem credencial guardada.")
  let data = parseSecret(await getConnectionSecret(row.id))
  if (!data?.access_token) throw new Error("Token OAuth inválido.")

  const expiresAt = Number(data.expires_at || row.config?.expiresAt || 0)
  if (expiresAt && expiresAt <= Date.now() + 60_000) {
    if (!data.refresh_token) throw new Error("A sessão OAuth expirou. Liga novamente esta conta.")
    data = await refreshOAuthToken(row, data)
  }

  return String(data.access_token)
}

export async function testOAuthConnection(row: ConnectorRow) {
  const provider = oauthProvider(row.provider)
  if (!provider) throw new Error("Fornecedor OAuth não suportado pelo runtime.")
  const accessToken = await oauthAccessToken(row)
  const profile = await provider.profile(accessToken)
  await updateConnection(row.id, {
    status: "connected",
    last_tested_at: new Date().toISOString(),
    last_error: null,
  }).catch(() => null)
  return {
    ok: true,
    detail: [provider.label, profile.email || profile.username || profile.name].filter(Boolean).join(" · "),
  }
}
