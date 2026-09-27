import { NextRequest, NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"
import { connectorDefinition, LUMIN_CONNECTOR_CATALOG } from "@/lib/connectors/catalog"
import { listOAuthProviderStatuses } from "@/lib/connectors/provider-settings"
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

async function fetchTest(url: string, init?: RequestInit) {
  const response = await fetch(url, {
    ...init,
    cache: "no-store",
    signal: AbortSignal.timeout(10000),
  })
  const text = await response.text().catch(() => "")
  if (!response.ok) throw new Error(`HTTP ${response.status}: ${text.slice(0, 260) || response.statusText}`)
  let data: any = text
  try { data = JSON.parse(text) } catch {}
  return { response, data, text }
}

async function testMetricool(row: any, secret: string) {
  const userId = String(row.config?.userId || "").trim()
  if (!userId) throw new Error("Indica o userId do Metricool.")
  const url = new URL("https://app.metricool.com/api/admin/simpleProfiles")
  url.searchParams.set("userId", userId)
  const { data } = await fetchTest(url.toString(), {
    headers: { "X-Mc-Auth": secret, "Content-Type": "application/json" },
  })
  const count = Array.isArray(data) ? data.length : Array.isArray(data?.data) ? data.data.length : null
  return { ok: true, detail: count === null ? "Metricool ligado" : `Metricool ligado · ${count} marcas acessíveis` }
}

async function testVercel(secret: string) {
  const { data } = await fetchTest("https://api.vercel.com/v2/user", {
    headers: { Authorization: `Bearer ${secret}` },
  })
  return { ok: true, detail: `Vercel · ${data?.user?.username || data?.user?.email || "conta validada"}` }
}

async function testSupabase(secret: string) {
  const { data } = await fetchTest("https://api.supabase.com/v1/projects", {
    headers: { Authorization: `Bearer ${secret}` },
  })
  return { ok: true, detail: `Supabase · ${Array.isArray(data) ? data.length : 0} projetos acessíveis` }
}

async function testStripe(secret: string) {
  const { data } = await fetchTest("https://api.stripe.com/v1/account", {
    headers: { Authorization: `Bearer ${secret}` },
  })
  return { ok: true, detail: `Stripe · ${data?.business_profile?.name || data?.settings?.dashboard?.display_name || data?.id || "conta validada"}` }
}

async function testTwilio(row: any, secret: string) {
  const accountSid = String(row.config?.accountSid || "").trim()
  if (!/^AC[0-9a-fA-F]{32}$/.test(accountSid)) throw new Error("Account SID Twilio inválido.")
  const { data } = await fetchTest(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}.json`, {
    headers: { Authorization: `Basic ${Buffer.from(`${accountSid}:${secret}`).toString("base64")}` },
  })
  return { ok: true, detail: `Twilio · ${data?.friendly_name || data?.friendlyName || accountSid}` }
}

async function testClose(secret: string) {
  const { data } = await fetchTest("https://api.close.com/api/v1/me/", {
    headers: { Authorization: `Basic ${Buffer.from(`${secret}:`).toString("base64")}` },
  })
  return { ok: true, detail: `Close · ${data?.first_name || data?.email || data?.id || "conta validada"}` }
}

async function testResend(secret: string) {
  const { data } = await fetchTest("https://api.resend.com/domains", {
    headers: { Authorization: `Bearer ${secret}` },
  })
  const domains = Array.isArray(data?.data) ? data.data.length : null
  return { ok: true, detail: domains === null ? "Resend ligado" : `Resend · ${domains} domínios` }
}

async function testWhatsApp(row: any, secret: string) {
  const phoneNumberId = String(row.config?.phoneNumberId || "").trim()
  if (!phoneNumberId) throw new Error("Indica o Phone Number ID do WhatsApp Business.")
  const url = new URL(`https://graph.facebook.com/${encodeURIComponent(phoneNumberId)}`)
  url.searchParams.set("fields", "display_phone_number,verified_name,quality_rating")
  const { data } = await fetchTest(url.toString(), {
    headers: { Authorization: `Bearer ${secret}` },
  })
  return { ok: true, detail: `WhatsApp · ${data?.verified_name || data?.display_phone_number || phoneNumberId}` }
}

async function testRailway(secret: string) {
  const { data } = await fetchTest("https://backboard.railway.com/graphql/v2", {
    method: "POST",
    headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query: "query { me { name email } }" }),
  })
  if (data?.errors?.length) throw new Error(String(data.errors[0]?.message || "Railway recusou o token."))
  return { ok: true, detail: `Railway · ${data?.data?.me?.name || data?.data?.me?.email || "conta validada"}` }
}

async function testConnection(row: any) {
  const root = String(row.provider).split(":")[0]
  if (row.auth_type === "oauth") return testOAuthConnection(row)
  const secret = row.secret_id ? await getConnectionSecret(row.id) : ""
  if (root === "rest") return testRest(row, secret)
  if (root === "openapi") return testOpenApi(row, secret)
  if (root === "mcp") return testMcp(row, secret)
  if (!secret) throw new Error("Falta a credencial deste conector.")
  if (root === "metricool") return testMetricool(row, secret)
  if (root === "vercel") return testVercel(secret)
  if (root === "supabase") return testSupabase(secret)
  if (root === "stripe") return testStripe(secret)
  if (root === "twilio") return testTwilio(row, secret)
  if (root === "close") return testClose(secret)
  if (root === "resend") return testResend(secret)
  if (root === "railway") return testRailway(secret)
  if (root === "whatsapp") return testWhatsApp(row, secret)
  throw new Error("Ainda não existe um teste nativo para este conector. Usa MCP, OpenAPI ou REST.")
}

export async function GET(req: NextRequest) {
  try {
    const token = await tokenFor(req)
    const scope = scopeFromToken(token)
    if (!scope) return NextResponse.json({ authenticated: false }, { status: 401 })

    const [rows, oauthProviders] = await Promise.all([
      listConnections(scope),
      listOAuthProviderStatuses(req.nextUrl.origin),
    ])
    return NextResponse.json({
      authenticated: true,
      scope: scope.type,
      isOwner: Boolean((token as any)?.isFounder || (token as any)?.role === "owner"),
      catalog: LUMIN_CONNECTOR_CATALOG,
      oauthProviders,
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

    const defaultAuth: Record<string, string> = {
      metricool: "api_key",
      vercel: "bearer",
      supabase: "bearer",
      stripe: "bearer",
      twilio: "basic",
      close: "api_key",
      resend: "bearer",
      railway: "bearer",
      whatsapp: "bearer",
    }
    const authType = ["none","api_key","bearer","basic","oauth","mcp"].includes(String(body?.authType))
      ? String(body.authType)
      : root === "mcp" ? "mcp" : defaultAuth[root] || "none"

    const cleanConfig = sanitizeConfig(body?.config)
    if (root === "rest" && cleanConfig.baseUrl) safeExternalUrl(String(cleanConfig.baseUrl))
    if (root === "openapi" && (cleanConfig.schemaUrl || cleanConfig.baseUrl)) {
      safeExternalUrl(String(cleanConfig.schemaUrl || cleanConfig.baseUrl))
    }
    if (root === "mcp" && (cleanConfig.serverUrl || cleanConfig.baseUrl)) {
      safeExternalUrl(String(cleanConfig.serverUrl || cleanConfig.baseUrl))
    }
    if (root === "metricool" && !String(cleanConfig.userId || "").trim()) {
      throw new Error("Indica o userId do Metricool.")
    }
    if (root === "twilio" && !String(cleanConfig.accountSid || "").trim()) {
      throw new Error("Indica o Account SID da Twilio.")
    }
    if (root === "whatsapp" && !String(cleanConfig.phoneNumberId || "").trim()) {
      throw new Error("Indica o Phone Number ID do WhatsApp Business.")
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
