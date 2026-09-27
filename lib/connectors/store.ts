import "server-only"

export type ConnectorScope = { type: "user" | "organization"; id: string; userId: string }
export type ConnectorRow = {
  id: string
  scope_type: "user" | "organization"
  scope_id: string
  provider: string
  label: string | null
  status: "disconnected" | "connected" | "error" | "pending"
  auth_type: "none" | "api_key" | "bearer" | "basic" | "oauth" | "mcp"
  config: Record<string, any>
  capabilities: any[]
  secret_id?: string | null
  last_tested_at?: string | null
  last_error?: string | null
  created_at?: string
  updated_at?: string
}

function config() {
  const url = process.env.REBORN_SUPABASE_URL?.replace(/\/$/, "")
  const serviceRoleKey = process.env.REBORN_SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceRoleKey) throw new Error("Lumin connector storage is not configured")
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
    throw new Error(`Connector storage error (${response.status}): ${body}`)
  }
  if (response.status === 204) return null
  return response.json()
}

export function scopeFromToken(token: any): ConnectorScope | null {
  const userId = String(token?.sub || "").trim()
  if (!userId) return null
  const organizationId = String(token?.organizationId || "").trim()
  return organizationId
    ? { type: "organization", id: organizationId, userId }
    : { type: "user", id: userId, userId }
}

export async function listConnections(scope: ConnectorScope): Promise<ConnectorRow[]> {
  const rows = await request(
    `lumin_connector_connections?scope_type=eq.${scope.type}&scope_id=eq.${encodeURIComponent(scope.id)}&select=*&order=updated_at.desc`,
  )
  return Array.isArray(rows) ? rows : []
}

export async function getConnection(scope: ConnectorScope, provider: string): Promise<ConnectorRow | null> {
  const rows = await request(
    `lumin_connector_connections?scope_type=eq.${scope.type}&scope_id=eq.${encodeURIComponent(scope.id)}&provider=eq.${encodeURIComponent(provider)}&select=*&limit=1`,
  )
  return Array.isArray(rows) ? rows[0] || null : null
}

export async function upsertConnection(params: {
  scope: ConnectorScope
  provider: string
  label?: string | null
  authType: ConnectorRow["auth_type"]
  config?: Record<string, any>
  capabilities?: any[]
  status?: ConnectorRow["status"]
}) {
  const rows = await request("lumin_connector_connections?on_conflict=scope_type,scope_id,provider", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=representation" },
    body: JSON.stringify({
      scope_type: params.scope.type,
      scope_id: params.scope.id,
      provider: params.provider,
      label: params.label || null,
      status: params.status || "pending",
      auth_type: params.authType,
      config: params.config || {},
      capabilities: params.capabilities || [],
      created_by: params.scope.userId,
      updated_at: new Date().toISOString(),
    }),
  })
  return Array.isArray(rows) ? rows[0] || null : null
}

export async function updateConnection(id: string, patch: Record<string, any>) {
  const rows = await request(`lumin_connector_connections?id=eq.${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({ ...patch, updated_at: new Date().toISOString() }),
  })
  return Array.isArray(rows) ? rows[0] || null : null
}

export async function removeConnection(scope: ConnectorScope, provider: string) {
  const row = await getConnection(scope, provider)
  if (!row) return false
  if (row.secret_id) {
    await request("rpc/lumin_connector_secret_delete", {
      method: "POST",
      body: JSON.stringify({ p_connection_id: row.id }),
    }).catch(() => null)
  }
  await request(
    `lumin_connector_connections?id=eq.${encodeURIComponent(row.id)}&scope_type=eq.${scope.type}&scope_id=eq.${encodeURIComponent(scope.id)}`,
    { method: "DELETE" },
  )
  return true
}

export async function setConnectionSecret(connectionId: string, secret: string) {
  const result = await request("rpc/lumin_connector_secret_set", {
    method: "POST",
    body: JSON.stringify({ p_connection_id: connectionId, p_secret: secret }),
  })
  return result
}

export async function getConnectionSecret(connectionId: string): Promise<string> {
  const result = await request("rpc/lumin_connector_secret_get", {
    method: "POST",
    body: JSON.stringify({ p_connection_id: connectionId }),
  })
  if (typeof result === "string") return result
  if (Array.isArray(result)) return String(result[0] || "")
  return String(result || "")
}

export function publicConnection(row: ConnectorRow) {
  return {
    id: row.id,
    provider: row.provider,
    label: row.label,
    status: row.status,
    authType: row.auth_type,
    config: row.config || {},
    capabilities: row.capabilities || [],
    hasSecret: Boolean(row.secret_id),
    lastTestedAt: row.last_tested_at || null,
    lastError: row.last_error || null,
    updatedAt: row.updated_at || null,
  }
}

export function validateProviderId(value: string) {
  return /^[a-z0-9][a-z0-9:_-]{0,79}$/.test(value)
}

export function safeExternalUrl(value: string) {
  const url = new URL(value)
  if (url.protocol !== "https:") throw new Error("Só são permitidos endpoints HTTPS.")
  const host = url.hostname.toLowerCase()
  const blocked =
    host === "localhost" ||
    host === "::1" ||
    host.endsWith(".local") ||
    /^127\./.test(host) ||
    /^10\./.test(host) ||
    /^192\.168\./.test(host) ||
    /^169\.254\./.test(host) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(host)
  if (blocked) throw new Error("Esse endereço de rede não é permitido.")
  return url
}

export function connectorAuthHeaders(row: ConnectorRow, secret: string) {
  const headers: Record<string, string> = {}
  if (!secret) return headers
  if (row.auth_type === "bearer" || row.auth_type === "mcp") {
    headers.Authorization = `Bearer ${secret}`
  } else if (row.auth_type === "api_key") {
    const headerName = String(row.config?.headerName || "x-api-key").trim()
    if (!/^[A-Za-z0-9-]{1,80}$/.test(headerName)) throw new Error("Nome do header inválido")
    headers[headerName] = secret
  } else if (row.auth_type === "basic") {
    headers.Authorization = `Basic ${Buffer.from(secret).toString("base64")}`
  }
  return headers
}
