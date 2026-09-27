import "server-only"
import { generateLuminText } from "@/lib/lumin-ai-runtime"
import {
  connectorAuthHeaders,
  ConnectorRow,
  ConnectorScope,
  getConnectionSecret,
  listConnections,
  safeExternalUrl,
} from "@/lib/connectors/store"

function rootProvider(provider: string) {
  return provider.split(":")[0].toLowerCase()
}

function trimResult(value: unknown, max = 14000) {
  const text = typeof value === "string" ? value : JSON.stringify(value, null, 2)
  return String(text || "").slice(0, max)
}

function extractJsonObject(text: string) {
  const start = text.indexOf("{")
  const end = text.lastIndexOf("}")
  if (start < 0 || end <= start) return null
  try { return JSON.parse(text.slice(start, end + 1)) } catch { return null }
}

function matchesConnection(message: string, row: ConnectorRow) {
  const hay = message.toLowerCase()
  const values = [
    row.provider,
    rootProvider(row.provider),
    row.label || "",
  ]
    .map((v) => String(v).trim().toLowerCase())
    .filter((v) => v.length >= 3)
  return values.some((value) => hay.includes(value))
}

export async function connectorSummary(scope: ConnectorScope) {
  const rows = await listConnections(scope).catch(() => [])
  const active = rows.filter((row) => row.status === "connected")
  if (!active.length) return ""
  return active
    .map((row) => {
      const root = rootProvider(row.provider)
      const label = row.label || row.provider
      const caps = Array.isArray(row.capabilities) ? row.capabilities.join(", ") : ""
      return `- ${label} [${root}]${caps ? `: ${caps}` : ""}`
    })
    .join("\n")
}

async function planJson(system: string, prompt: string) {
  const result = await generateLuminText({
    system: system + "\nResponde APENAS JSON válido. Não uses markdown.",
    prompt,
    maxOutputTokens: 1200,
    temperature: 0,
  })
  return extractJsonObject(result.text)
}

async function fetchReadOnly(row: ConnectorRow, url: URL, secret: string) {
  safeExternalUrl(url.toString())
  const response = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json,text/plain;q=0.9,*/*;q=0.5",
      ...connectorAuthHeaders(row, secret),
    },
    signal: AbortSignal.timeout(12000),
    cache: "no-store",
  })
  const text = await response.text()
  if (!response.ok) throw new Error(`Connector HTTP ${response.status}: ${text.slice(0, 240)}`)
  return text
}

async function runRest(row: ConnectorRow, message: string, secret: string) {
  const base = safeExternalUrl(String(row.config?.baseUrl || ""))
  const configuredPaths = Array.isArray(row.config?.paths)
    ? row.config.paths.map((x: any) => String(x)).filter(Boolean).slice(0, 40)
    : []
  const defaultPath = String(row.config?.defaultPath || row.config?.testPath || "").trim()

  let selectedPath = defaultPath
  if (configuredPaths.length > 1) {
    const plan = await planJson(
      "Escolhe apenas um endpoint GET de uma API REST já autorizada pelo utilizador. Nunca escolhas escrita, POST, PUT, PATCH ou DELETE.",
      `Pedido: ${message}\nEndpoints GET permitidos: ${JSON.stringify(configuredPaths)}\nJSON: {"use":true,"path":"..."}`,
    )
    if (plan?.use && configuredPaths.includes(String(plan.path))) selectedPath = String(plan.path)
  }

  const target = selectedPath ? new URL(selectedPath, base) : base
  const text = await fetchReadOnly(row, target, secret)
  return `Conector REST: ${row.label || row.provider}\nGET ${target.pathname}\nResultado:\n${trimResult(text)}`
}

async function runOpenApi(row: ConnectorRow, message: string, secret: string) {
  const schemaUrl = safeExternalUrl(String(row.config?.schemaUrl || ""))
  const schemaResponse = await fetch(schemaUrl, {
    headers: {
      Accept: "application/json",
      ...connectorAuthHeaders(row, secret),
    },
    signal: AbortSignal.timeout(12000),
    cache: "no-store",
  })
  if (!schemaResponse.ok) throw new Error(`OpenAPI HTTP ${schemaResponse.status}`)
  const spec = await schemaResponse.json().catch(() => null)
  if (!spec?.paths || typeof spec.paths !== "object") throw new Error("O runtime precisa de um documento OpenAPI JSON válido.")

  const endpoints = Object.entries(spec.paths)
    .flatMap(([path, methods]: any) => {
      const get = methods?.get
      if (!get) return []
      return [{
        path,
        summary: String(get.summary || get.description || "").slice(0, 240),
        parameters: Array.isArray(get.parameters)
          ? get.parameters
              .filter((p: any) => p?.in === "query")
              .map((p: any) => ({ name: p.name, required: Boolean(p.required), type: p.schema?.type || "string" }))
          : [],
      }]
    })
    .slice(0, 80)

  if (!endpoints.length) throw new Error("Não encontrei endpoints GET no OpenAPI.")

  const plan = await planJson(
    "Escolhe um endpoint GET que responda ao pedido. Usa apenas paths fornecidos. Query params devem ser valores simples. Se nenhum endpoint servir, usa false.",
    `Pedido: ${message}\nEndpoints: ${JSON.stringify(endpoints)}\nJSON: {"use":boolean,"path":"...","query":{"param":"valor"}}`,
  )
  const endpoint = endpoints.find((x) => x.path === String(plan?.path || ""))
  if (!plan?.use || !endpoint) return ""

  const serverUrl = String(row.config?.baseUrl || spec?.servers?.[0]?.url || "")
  if (!serverUrl) throw new Error("O OpenAPI não define server URL e não foi indicada Base URL.")
  let path = endpoint.path
  if (/[{}]/.test(path)) {
    throw new Error("Este endpoint exige parâmetros no path; configura um endpoint sem parâmetros de path nesta primeira versão.")
  }

  const target = new URL(path, safeExternalUrl(serverUrl))
  const query = plan?.query && typeof plan.query === "object" ? plan.query : {}
  const allowedQuery = new Set(endpoint.parameters.map((p: any) => p.name))
  for (const [key, value] of Object.entries(query)) {
    if (!allowedQuery.has(key)) continue
    if (["string","number","boolean"].includes(typeof value)) target.searchParams.set(key, String(value).slice(0, 300))
  }

  const text = await fetchReadOnly(row, target, secret)
  return `Conector OpenAPI: ${row.label || row.provider}\nGET ${target.pathname}${target.search}\nResultado:\n${trimResult(text)}`
}

function parseMcpBody(text: string) {
  try { return JSON.parse(text) } catch {}
  const dataLines = text.split("\n").filter((line) => line.startsWith("data:"))
  for (let i = dataLines.length - 1; i >= 0; i--) {
    const value = dataLines[i].slice(5).trim()
    try { return JSON.parse(value) } catch {}
  }
  return null
}

async function mcpPost(url: URL, headers: Record<string, string>, payload: any, sessionId?: string | null) {
  const requestHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json, text/event-stream",
    ...headers,
  }
  if (sessionId) requestHeaders["mcp-session-id"] = sessionId

  const response = await fetch(url, {
    method: "POST",
    headers: requestHeaders,
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(15000),
    cache: "no-store",
  })
  const text = await response.text()
  if (!response.ok && response.status !== 202) throw new Error(`MCP HTTP ${response.status}: ${text.slice(0, 240)}`)
  return { data: parseMcpBody(text), sessionId: response.headers.get("mcp-session-id") || sessionId || null }
}

function safeMcpTool(tool: any) {
  const name = String(tool?.name || "").toLowerCase()
  const description = String(tool?.description || "").toLowerCase()
  const combined = `${name} ${description}`
  if (/\b(create|update|delete|remove|send|publish|post|write|execute|run|trigger|deploy|purchase|pay|book|cancel|invite|upload)\b/.test(combined)) return false
  return /\b(get|list|search|find|fetch|read|query|lookup|inspect|status|analytics|metrics|report|view)\b/.test(combined)
}

async function runMcp(row: ConnectorRow, message: string, secret: string) {
  const url = safeExternalUrl(String(row.config?.serverUrl || ""))
  const auth = connectorAuthHeaders(row, secret)

  const init = await mcpPost(url, auth, {
    jsonrpc: "2.0",
    id: 1,
    method: "initialize",
    params: {
      protocolVersion: "2025-06-18",
      capabilities: {},
      clientInfo: { name: "lumin-ai", version: "1.0.0" },
    },
  })

  await mcpPost(url, auth, {
    jsonrpc: "2.0",
    method: "notifications/initialized",
    params: {},
  }, init.sessionId).catch(() => null)

  const listed = await mcpPost(url, auth, {
    jsonrpc: "2.0",
    id: 2,
    method: "tools/list",
    params: {},
  }, init.sessionId)

  const tools = (listed.data?.result?.tools || []).filter(safeMcpTool).slice(0, 60)
  if (!tools.length) throw new Error("O MCP ligou, mas não expôs ferramentas de leitura seguras.")

  const compact = tools.map((tool: any) => ({
    name: tool.name,
    description: String(tool.description || "").slice(0, 300),
    inputSchema: tool.inputSchema || {},
  }))

  const plan = await planJson(
    "Escolhe uma ferramenta MCP de leitura para responder ao pedido. Nunca inventes argumentos fora do schema. Se não houver ferramenta adequada, use=false.",
    `Pedido: ${message}\nFerramentas: ${JSON.stringify(compact)}\nJSON: {"use":boolean,"tool":"nome","arguments":{}}`,
  )
  const tool = tools.find((x: any) => x.name === String(plan?.tool || ""))
  if (!plan?.use || !tool) return ""

  const called = await mcpPost(url, auth, {
    jsonrpc: "2.0",
    id: 3,
    method: "tools/call",
    params: {
      name: tool.name,
      arguments: plan.arguments && typeof plan.arguments === "object" ? plan.arguments : {},
    },
  }, listed.sessionId || init.sessionId)

  return `Conector MCP: ${row.label || row.provider}\nFerramenta: ${tool.name}\nResultado:\n${trimResult(called.data?.result || called.data)}`
}

export async function maybeRunConnectorRead(params: {
  message: string
  scope: ConnectorScope
}) {
  const message = params.message.trim()
  if (!message) return { used: false, context: "", connector: "" }

  const rows = await listConnections(params.scope).catch(() => [])
  const connected = rows.filter((row) => row.status === "connected")
  if (!connected.length) return { used: false, context: "", connector: "" }

  const explicitConnectorLanguage = /\b(conector|api|mcp|integração|integracao|ligado|ligada)\b/i.test(message)
  let row = connected.find((candidate) => matchesConnection(message, candidate))
  if (!row && explicitConnectorLanguage && connected.length === 1) row = connected[0]
  if (!row) return { used: false, context: "", connector: "" }

  const root = rootProvider(row.provider)
  if (!["rest","openapi","mcp"].includes(root)) {
    return { used: false, context: "", connector: row.label || row.provider }
  }

  const secret = row.secret_id ? await getConnectionSecret(row.id) : ""
  let context = ""
  if (root === "rest") context = await runRest(row, message, secret)
  if (root === "openapi") context = await runOpenApi(row, message, secret)
  if (root === "mcp") context = await runMcp(row, message, secret)

  return {
    used: Boolean(context),
    context,
    connector: row.label || row.provider,
  }
}
