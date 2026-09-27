import { NextRequest, NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"
import { connectorDefinition, LUMIN_CONNECTOR_CATALOG } from "@/lib/connectors/catalog"
import { oauthProviderStatus } from "@/lib/connectors/oauth"
import { testOAuthConnection } from "@/lib/connectors/oauth-token"
import {
  connectorAuthHeaders,
  getConnection,
  getConnectionSecret,
  listConnections,
  publicConnection,
  removeConnection,
  safeExternalUrl,
  scopeFromToken,
  setConnectionSecret,
  updateConnection,
  upsertConnection,
  validateProviderId,
} from "@/lib/connectors/store"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

async function tokenFor(req: NextRequest) {
  return getToken({ req, secret: process.env.NEXTAUTH_SECRET }).catch(() => null)
}

function sanitizeConfig(config: any) {
  const source = config && typeof config === "object" ? config : {}
  const clean: Record<string, any> = {}
  for (const [key, value] of Object.entries(source)) {
    if (["secret", "token", "password", "apiKey", "api_key"].includes(key)) continue
    if (typeof value === "string") clean[key] = value.slice(0, 2000)
    else if (typeof value === "boolean" || typeof value === "number") clean[key] = value
    else if (Array.isArray(value)) clean[key] = value.slice(0, 100)
  }
  return clean
}

function normalizeProvider(body: any) {
  const root = String(body?.provider || "").trim().toLowerCase()
  if (!root) throw new Error("Escolhe um conector.")
  if (!validateProviderId(root)) throw new Error("Identificador de conector inválido.")
  return root
}

async function testRest(row: any, secret: string) {
  const base = safeExternalUrl(String(row.config?.baseUrl || ""))
  const testPath = String(row.config?.testPath || "").trim()
  const target = testPath ? new URL(testPath, base) : base
  safeExternalUrl(target.toString())

  const response = await fetch(target, {
    method: "GET",
    headers: {
      Accept: "application/json,text/plain;q=0.9,*/*;q=0.5",
      ...connectorAuthHeaders(row, secret),
    },
    signal: AbortSignal.timeout(9000),
    cache: "no-store",
  })

  const text = await response.text().catch(() => "")
  if (!response.ok) throw new Error(`HTTP ${response.status}: ${text.slice(0, 220) || response.statusText}`)
  return { ok: true, detail: `HTTP ${response.status}`, preview: text.slice(0, 400) }
}

async function testOpenApi(row: any, secret: string) {
  const url = safeExternalUrl(String(row.config?.schemaUrl || row.config?.baseUrl || ""))
  const response = await fetch(url, {
    headers: {
      Accept: "application/json,application/yaml,text/yaml,text/plain",
      ...connectorAuthHeaders(row, secret),
    },
    signal: AbortSignal.timeout(9000),
    cache: "no-store",
  })
  const text = await response.text()
  if (!response.ok) throw new Error(`HTTP ${response.status}`)

  let title = "OpenAPI"
  let paths = 0
  try {
    const spec = JSON.parse(text)
    title = String(spec?.info?.title || title)
    paths = spec?.paths && typeof spec.paths === "object" ? Object.keys(spec.paths).length : 0
  } catch {
    paths = (text.match(/^\s*\/[^:]+:/gm) || []).length
  }
  if (!/openapi|swagger/i.test(text.slice(0, 6000))) {
    throw new Error("O endpoint respondeu, mas não parece um documento OpenAPI/Swagger.")
  }
  return { ok: true, detail: `${title} · ${paths} endpoints` }
}

async function testMcp(row: any, secret: string) {
  const url = safeExternalUrl(String(row.config?.serverUrl || row.config?.baseUrl || ""))
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json, text/event-stream",
    ...connectorAuthHeaders(row, secret),
  }

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2025-06-18",
        capabilities: {},
        clientInfo: { name: "lumin-ai", version: "1.0.0" },
      },
    }),
    signal: AbortSignal.timeout(10000),
    cache: "no-store",
  })

  const text = await response.text()
  if (!response.ok) throw new Error(`MCP HTTP ${response.status}: ${text.slice(0, 220)}`)
  if (!/jsonrpc|event:|result/i.test(text)) throw new Error("O servidor respondeu, mas o handshake MCP não foi reconhecido.")
  return {
    ok: true,
    detail: "Handshake MCP aceite",
    sessionId: response.headers.get("mcp-session-id") || null,
  }
}

async function testConnection(row: any) {
  const root = String(row.provider).split(":")[0]
  if (row.auth_type === "oauth") return testOAuthConnection(row)
  const secret = row.secret_id ? await getConnectionSecret(row.id) : ""
  if (root === "rest") return testRest(row, secret)
  if (root === "openapi") return testOpenApi(row, secret)
  if (root === "mcp") return testMcp(row, secret)
  throw new Error("Este conector usa OAuth nativo e ainda precisa da configuração do fornecedor.")
}

export async function GET(req: NextRequest) {
  try {
    const token = await tokenFor(req)
    const scope = scopeFromToken(token)
    if (!scope) return NextResponse.json({ authenticated: false }, { status: 401 })

    const rows = await listConnections(scope)
    return NextResponse.json({
      authenticated: true,
      scope: scope.type,
      catalog: LUMIN_CONNECTOR_CATALOG,
      oauthProviders: oauthProviderStatus(),
      connections: rows.map(publicConnection),
    })
  } catch (error: any) {
    console.error("[Lumin Connectors] list failed", error)
    return NextResponse.json({ error: error?.message || "Não foi possível carregar os conectores." }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const token = await tokenFor(req)
    const scope = scopeFromToken(token)
    if (!scope) return NextResponse.json({ authenticated: false }, { status: 401 })

    const body = await req.json().catch(() => ({}))
    const action = String(body?.action || "save")

    if (action === "disconnect") {
      const provider = normalizeProvider(body)
      await removeConnection(scope, provider)
      return NextResponse.json({ ok: true, disconnected: provider })
    }

    if (action === "test") {
      const provider = normalizeProvider(body)
      const row = await getConnection(scope, provider)
      if (!row) return NextResponse.json({ error: "Conector ainda não configurado." }, { status: 404 })
      try {
        const result = await testConnection(row)
        await updateConnection(row.id, {
          status: "connected",
          last_tested_at: new Date().toISOString(),
          last_error: null,
        })
        return NextResponse.json({ ok: true, result })
      } catch (error: any) {
        const message = String(error?.message || "Falha no teste").slice(0, 600)
        await updateConnection(row.id, {
          status: "error",
          last_tested_at: new Date().toISOString(),
          last_error: message,
        }).catch(() => null)
        return NextResponse.json({ error: message }, { status: 400 })
      }
    }

    const provider = normalizeProvider(body)
    const definition = connectorDefinition(provider)
    const root = provider.split(":")[0]
    if (!definition && !["rest", "openapi", "mcp"].includes(root)) {
      return NextResponse.json({ error: "Conector desconhecido." }, { status: 400 })
    }

    if (definition && definition.mode === "oauth" && !body?.allowPlaceholder) {
      return NextResponse.json(
        { error: "Este conector usa OAuth. O botão de autorização será ativado quando as credenciais do fornecedor estiverem configuradas." },
        { status: 409 },
      )
    }

    const authType = ["none","api_key","bearer","basic","oauth","mcp"].includes(String(body?.authType))
      ? String(body.authType)
      : root === "mcp" ? "mcp" : "none"

    const cleanConfig = sanitizeConfig(body?.config)
    if (root === "rest" && cleanConfig.baseUrl) safeExternalUrl(String(cleanConfig.baseUrl))
    if (root === "openapi" && (cleanConfig.schemaUrl || cleanConfig.baseUrl)) {
      safeExternalUrl(String(cleanConfig.schemaUrl || cleanConfig.baseUrl))
    }
    if (root === "mcp" && (cleanConfig.serverUrl || cleanConfig.baseUrl)) {
      safeExternalUrl(String(cleanConfig.serverUrl || cleanConfig.baseUrl))
    }

    const row = await upsertConnection({
      scope,
      provider,
      label: String(body?.label || definition?.name || provider).slice(0, 120),
      authType: authType as any,
      config: cleanConfig,
      capabilities: definition?.capabilities || [],
      status: "pending",
    })

    if (!row?.id) throw new Error("Não foi possível guardar o conector.")
    const secret = typeof body?.secret === "string" ? body.secret.trim() : ""
    if (secret) await setConnectionSecret(row.id, secret)

    return NextResponse.json({ ok: true, connection: publicConnection({ ...row, secret_id: secret ? "vault" : row.secret_id }) })
  } catch (error: any) {
    console.error("[Lumin Connectors] save failed", error)
    return NextResponse.json({ error: error?.message || "Não foi possível guardar o conector." }, { status: 400 })
  }
}
