import "server-only"

export type OAuthProviderSetting = {
  provider: string
  client_id: string | null
  secret_id: string | null
  enabled: boolean
  notes: string | null
  configured_by: string | null
  created_at: string
  updated_at: string
}

const PROVIDERS = ["google","github","meta","canva","figma","netlify"] as const

const ENV_MAP: Record<string, { clientId: string[]; clientSecret: string[] }> = {
  google: {
    clientId: ["GOOGLE_CONNECTOR_CLIENT_ID","GOOGLE_CLIENT_ID"],
    clientSecret: ["GOOGLE_CONNECTOR_CLIENT_SECRET","GOOGLE_CLIENT_SECRET"],
  },
  github: {
    clientId: ["GITHUB_CONNECTOR_CLIENT_ID"],
    clientSecret: ["GITHUB_CONNECTOR_CLIENT_SECRET"],
  },
  meta: {
    clientId: ["META_CONNECTOR_APP_ID"],
    clientSecret: ["META_CONNECTOR_APP_SECRET"],
  },
  canva: {
    clientId: ["CANVA_CONNECTOR_CLIENT_ID"],
    clientSecret: ["CANVA_CONNECTOR_CLIENT_SECRET"],
  },
  figma: {
    clientId: ["FIGMA_CONNECTOR_CLIENT_ID"],
    clientSecret: ["FIGMA_CONNECTOR_CLIENT_SECRET"],
  },
  netlify: {
    clientId: ["NETLIFY_CONNECTOR_CLIENT_ID"],
    clientSecret: ["NETLIFY_CONNECTOR_CLIENT_SECRET"],
  },
}

function firstEnv(names: string[]) {
  for (const name of names) {
    const value = process.env[name]?.trim()
    if (value) return value
  }
  return ""
}

function config() {
  const url = process.env.REBORN_SUPABASE_URL?.replace(/\/$/, "")
  const serviceRoleKey = process.env.REBORN_SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceRoleKey) throw new Error("OAuth provider storage is not configured")
  return { url, serviceRoleKey }
}

async function request(path: string, init?: RequestInit) {
  const { url, serviceRoleKey } = config()
  const response = await fetch(`${url}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
    cache: "no-store",
  })
  if (!response.ok) {
    const body = await response.text()
    throw new Error(`OAuth provider storage error (${response.status}): ${body}`)
  }
  if (response.status === 204) return null
  return response.json()
}

function validProvider(provider: string) {
  return (PROVIDERS as readonly string[]).includes(provider)
}

export async function getOAuthProviderSetting(provider: string): Promise<OAuthProviderSetting | null> {
  if (!validProvider(provider)) return null
  const rows = await request(
    `lumin_oauth_provider_settings?provider=eq.${encodeURIComponent(provider)}&select=*&limit=1`,
  )
  return Array.isArray(rows) ? rows[0] || null : null
}

export async function getOAuthProviderSecret(provider: string) {
  const result = await request("rpc/lumin_oauth_provider_secret_get", {
    method: "POST",
    body: JSON.stringify({ p_provider: provider }),
  })
  if (typeof result === "string") return result
  if (Array.isArray(result)) return String(result[0] || "")
  return String(result || "")
}

export async function resolveOAuthAppCredentials(provider: string) {
  if (!validProvider(provider)) return { configured: false, clientId: "", clientSecret: "", source: "missing" as const }

  const row = await getOAuthProviderSetting(provider).catch(() => null)
  if (row?.enabled && row.client_id && row.secret_id) {
    const secret = await getOAuthProviderSecret(provider).catch(() => "")
    if (secret) {
      return {
        configured: true,
        clientId: String(row.client_id),
        clientSecret: secret,
        source: "vault" as const,
      }
    }
  }

  const mapping = ENV_MAP[provider]
  const clientId = mapping ? firstEnv(mapping.clientId) : ""
  const clientSecret = mapping ? firstEnv(mapping.clientSecret) : ""
  if (clientId && clientSecret) {
    return { configured: true, clientId, clientSecret, source: "env" as const }
  }

  return { configured: false, clientId: "", clientSecret: "", source: "missing" as const }
}

function preview(value: string) {
  if (!value) return ""
  if (value.length <= 10) return value.slice(0, 3) + "••••"
  return value.slice(0, 6) + "••••" + value.slice(-4)
}

export async function listOAuthProviderStatuses(origin?: string) {
  return Promise.all(PROVIDERS.map(async (provider) => {
    const creds = await resolveOAuthAppCredentials(provider)
    const row = await getOAuthProviderSetting(provider).catch(() => null)
    return {
      id: provider,
      configured: creds.configured,
      source: creds.source,
      clientIdPreview: preview(creds.clientId),
      hasVaultSecret: Boolean(row?.secret_id),
      enabled: row?.enabled ?? true,
      callbackPath: `/api/connectors/oauth/callback/${provider}`,
      callbackUrl: origin ? `${origin.replace(/\/$/, "")}/api/connectors/oauth/callback/${provider}` : null,
      updatedAt: row?.updated_at || null,
    }
  }))
}

export async function saveOAuthProviderSetting(params: {
  provider: string
  clientId: string
  clientSecret?: string
  enabled?: boolean
  notes?: string
  configuredBy: string
}) {
  if (!validProvider(params.provider)) throw new Error("Fornecedor OAuth inválido.")
  const clientId = params.clientId.trim()
  if (!clientId) throw new Error("Client ID obrigatório.")

  const rows = await request("lumin_oauth_provider_settings?on_conflict=provider", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=representation" },
    body: JSON.stringify({
      provider: params.provider,
      client_id: clientId,
      enabled: params.enabled !== false,
      notes: params.notes?.slice(0, 1000) || null,
      configured_by: params.configuredBy,
      updated_at: new Date().toISOString(),
    }),
  })

  const row = Array.isArray(rows) ? rows[0] : null
  if (!row) throw new Error("Não foi possível guardar a configuração OAuth.")

  const secret = params.clientSecret?.trim()
  if (secret) {
    await request("rpc/lumin_oauth_provider_secret_set", {
      method: "POST",
      body: JSON.stringify({ p_provider: params.provider, p_secret: secret }),
    })
  }

  const final = await getOAuthProviderSetting(params.provider)
  return final
}

export async function removeOAuthProviderSetting(provider: string) {
  if (!validProvider(provider)) throw new Error("Fornecedor OAuth inválido.")
  await request("rpc/lumin_oauth_provider_secret_delete", {
    method: "POST",
    body: JSON.stringify({ p_provider: provider }),
  }).catch(() => null)
  await request(`lumin_oauth_provider_settings?provider=eq.${encodeURIComponent(provider)}`, {
    method: "DELETE",
  })
  return true
}
