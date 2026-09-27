import "server-only"
import { generateLuminText } from "@/lib/lumin-ai-runtime"
import { oauthAccessToken } from "@/lib/connectors/oauth-token"
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
  const aliases: Record<string, string[]> = {
    google: ["gmail", "email", "emails", "correio", "calendar", "calendário", "calendario", "agenda", "drive", "google drive"],
    github: ["github", "repo", "repos", "repositório", "repositorio", "issues"],
    meta: ["meta", "instagram", "facebook", "página", "pagina"],
    canva: ["canva", "design", "designs"],
    figma: ["figma"],
    netlify: ["netlify", "site", "sites", "deploy"],
    metricool: ["metricool", "redes", "social"],
    vercel: ["vercel", "deploy", "deployment", "projeto"],
    supabase: ["supabase", "database", "base de dados"],
    stripe: ["stripe", "pagamento", "pagamentos", "cliente", "clientes"],
    twilio: ["twilio", "chamada", "chamadas", "sms"],
    close: ["close", "crm", "lead", "leads"],
    resend: ["resend", "email transacional", "domínio", "dominio"],
    railway: ["railway", "deploy", "serviço", "servico", "projeto"],
  }
  const values = [
    row.provider,
    rootProvider(row.provider),
    row.label || "",
    ...(aliases[rootProvider(row.provider)] || []),
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

async function bearerJson(url: string, accessToken: string, init?: RequestInit) {
  const response = await fetch(url, {
    ...init,
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${accessToken}`,
      ...(init?.headers || {}),
    },
    cache: "no-store",
    signal: AbortSignal.timeout(15000),
  })
  const text = await response.text()
  let data: any = text
  try { data = JSON.parse(text) } catch {}
  if (!response.ok) throw new Error(`Connector HTTP ${response.status}: ${String(data?.error?.message || data?.message || text).slice(0, 260)}`)
  return data
}

function safeText(value: unknown, max = 300) {
  return String(value ?? "").replace(/[\u0000-\u001F]+/g, " ").trim().slice(0, max)
}

async function runGoogle(row: ConnectorRow, message: string) {
  const accessToken = await oauthAccessToken(row)
  const plan = await planJson(
    "Escolhe a área Google de leitura que melhor responde ao pedido. Gmail pesquisa mensagens; Calendar lista eventos; Drive pesquisa ficheiros. Não peças nem executes escrita.",
    `Pedido: ${message}\nJSON: {"use":boolean,"area":"gmail"|"calendar"|"drive","query":"texto de pesquisa opcional","days":number opcional}`,
  )
  if (!plan?.use) return ""

  if (plan.area === "gmail") {
    const url = new URL("https://gmail.googleapis.com/gmail/v1/users/me/messages")
    url.searchParams.set("maxResults", "8")
    if (safeText(plan.query, 300)) url.searchParams.set("q", safeText(plan.query, 300))
    const list = await bearerJson(url.toString(), accessToken)
    const ids = (list?.messages || []).slice(0, 8).map((x: any) => x.id).filter(Boolean)
    const messages = await Promise.all(ids.map(async (id: string) => {
      const detailUrl = new URL(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${encodeURIComponent(id)}`)
      detailUrl.searchParams.set("format", "metadata")
      detailUrl.searchParams.append("metadataHeaders", "From")
      detailUrl.searchParams.append("metadataHeaders", "Subject")
      detailUrl.searchParams.append("metadataHeaders", "Date")
      const item = await bearerJson(detailUrl.toString(), accessToken)
      const headers = Object.fromEntries((item?.payload?.headers || []).map((h: any) => [String(h.name || "").toLowerCase(), h.value]))
      return {
        id: item.id,
        threadId: item.threadId,
        from: safeText(headers.from),
        subject: safeText(headers.subject),
        date: safeText(headers.date),
        snippet: safeText(item.snippet, 500),
      }
    }))
    return `Google Gmail (leitura real):\n${trimResult(messages)}`
  }

  if (plan.area === "calendar") {
    const days = Math.max(1, Math.min(90, Number(plan.days || 14)))
    const url = new URL("https://www.googleapis.com/calendar/v3/calendars/primary/events")
    url.searchParams.set("singleEvents", "true")
    url.searchParams.set("orderBy", "startTime")
    url.searchParams.set("maxResults", "20")
    url.searchParams.set("timeMin", new Date().toISOString())
    url.searchParams.set("timeMax", new Date(Date.now() + days * 86400000).toISOString())
    if (safeText(plan.query, 120)) url.searchParams.set("q", safeText(plan.query, 120))
    const data = await bearerJson(url.toString(), accessToken)
    const events = (data?.items || []).slice(0, 20).map((event: any) => ({
      id: event.id,
      summary: event.summary,
      start: event.start?.dateTime || event.start?.date,
      end: event.end?.dateTime || event.end?.date,
      location: event.location,
      htmlLink: event.htmlLink,
    }))
    return `Google Calendar (leitura real):\n${trimResult(events)}`
  }

  if (plan.area === "drive") {
    const url = new URL("https://www.googleapis.com/drive/v3/files")
    url.searchParams.set("pageSize", "20")
    url.searchParams.set("orderBy", "modifiedTime desc")
    url.searchParams.set("fields", "files(id,name,mimeType,modifiedTime,webViewLink,owners(displayName,emailAddress))")
    const term = safeText(plan.query, 100).replace(/'/g, "\\'")
    url.searchParams.set("q", term ? `trashed=false and name contains '${term}'` : "trashed=false")
    const data = await bearerJson(url.toString(), accessToken)
    return `Google Drive (leitura real):\n${trimResult((data?.files || []).slice(0, 20))}`
  }

  return ""
}

async function runGitHub(row: ConnectorRow, message: string) {
  const accessToken = await oauthAccessToken(row)
  const plan = await planJson(
    "Escolhe uma consulta GitHub de leitura. Repos lista repositórios acessíveis ao token; issues lista issues atribuídas/visíveis ao utilizador.",
    `Pedido: ${message}\nJSON: {"use":boolean,"area":"repos"|"issues"}`,
  )
  if (!plan?.use) return ""
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2026-03-10",
    "User-Agent": "LuminAI",
  }
  const url = plan.area === "issues"
    ? "https://api.github.com/issues?filter=all&state=open&per_page=20"
    : "https://api.github.com/user/repos?sort=updated&per_page=20"
  const response = await fetch(url, { headers, cache: "no-store", signal: AbortSignal.timeout(15000) })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data?.message || `GitHub HTTP ${response.status}`)
  const compact = Array.isArray(data) ? data.slice(0,20).map((item: any) => (
    plan.area === "issues"
      ? { title:item.title, state:item.state, repository:item.repository?.full_name, html_url:item.html_url, updated_at:item.updated_at }
      : { full_name:item.full_name, private:item.private, html_url:item.html_url, language:item.language, updated_at:item.updated_at, description:item.description }
  )) : data
  return `GitHub (leitura real):\n${trimResult(compact)}`
}

async function runMeta(row: ConnectorRow) {
  const accessToken = await oauthAccessToken(row)
  const url = new URL("https://graph.facebook.com/me/accounts")
  url.searchParams.set("fields", "id,name,category,instagram_business_account")
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache:"no-store",
    signal:AbortSignal.timeout(15000),
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data?.error?.message || `Meta HTTP ${response.status}`)
  const pages = (data?.data || []).slice(0,30).map((page: any) => ({
    id: page.id,
    name: page.name,
    category: page.category,
    instagramBusinessAccountId: page.instagram_business_account?.id || null,
  }))
  return `Meta / Facebook / Instagram (contas autorizadas):\n${trimResult(pages)}`
}

async function runNetlify(row: ConnectorRow) {
  const accessToken = await oauthAccessToken(row)
  const data = await bearerJson("https://api.netlify.com/api/v1/sites?per_page=20", accessToken)
  const sites = (Array.isArray(data) ? data : []).slice(0,20).map((site: any) => ({
    id: site.id, name: site.name, url: site.url, ssl_url: site.ssl_url, updated_at: site.updated_at,
  }))
  return `Netlify (leitura real):\n${trimResult(sites)}`
}

async function runCanva(row: ConnectorRow) {
  const accessToken = await oauthAccessToken(row)
  const data = await bearerJson("https://api.canva.com/rest/v1/users/me/profile", accessToken)
  return `Canva (conta ligada):\n${trimResult(data)}`
}

async function runFigma(row: ConnectorRow) {
  const accessToken = await oauthAccessToken(row)
  const data = await bearerJson("https://api.figma.com/v1/me", accessToken)
  return `Figma (conta ligada):\n${trimResult({ id:data?.id, handle:data?.handle, email:data?.email })}`
}

async function runCredentialProvider(row: ConnectorRow, message: string, secret: string) {
  const root = rootProvider(row.provider)

  if (root === "metricool") {
    const userId = String(row.config?.userId || "")
    const url = new URL("https://app.metricool.com/api/admin/simpleProfiles")
    url.searchParams.set("userId", userId)
    const response = await fetch(url, {
      headers: { "X-Mc-Auth": secret, "Content-Type": "application/json" },
      cache:"no-store", signal:AbortSignal.timeout(15000),
    })
    const data = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(`Metricool HTTP ${response.status}`)
    return `Metricool (marcas reais):\n${trimResult(data)}`
  }

  if (root === "vercel") {
    const data = await bearerJson("https://api.vercel.com/v9/projects?limit=20", secret)
    return `Vercel (projetos reais):\n${trimResult((data?.projects || []).map((x:any)=>({id:x.id,name:x.name,framework:x.framework,updatedAt:x.updatedAt})))}`
  }

  if (root === "supabase") {
    const data = await bearerJson("https://api.supabase.com/v1/projects", secret)
    return `Supabase (projetos reais):\n${trimResult((Array.isArray(data)?data:[]).map((x:any)=>({id:x.id,name:x.name,region:x.region,status:x.status})))}`
  }

  if (root === "railway") {
    const response = await fetch("https://backboard.railway.com/graphql/v2", {
      method:"POST",
      headers:{ Authorization:`Bearer ${secret}`, "Content-Type":"application/json" },
      body:JSON.stringify({query:"query { me { name email } projects { edges { node { id name } } } }"}),
      cache:"no-store", signal:AbortSignal.timeout(15000),
    })
    const data=await response.json().catch(()=>({}))
    if(!response.ok||data?.errors?.length) throw new Error(data?.errors?.[0]?.message||`Railway HTTP ${response.status}`)
    return `Railway (leitura real):\n${trimResult(data?.data)}`
  }

  if (root === "close") {
    const response=await fetch("https://api.close.com/api/v1/lead/?_limit=20&_fields=id,display_name,status_label,date_updated",{
      headers:{Authorization:`Basic ${Buffer.from(`${secret}:`).toString("base64")}`},
      cache:"no-store",signal:AbortSignal.timeout(15000),
    })
    const data=await response.json().catch(()=>({}))
    if(!response.ok) throw new Error(data?.error||`Close HTTP ${response.status}`)
    return `Close CRM (leads reais):\n${trimResult(data?.data||data)}`
  }

  if (root === "resend") {
    const data = await bearerJson("https://api.resend.com/domains", secret)
    return `Resend (domínios reais):\n${trimResult(data?.data||data)}`
  }

  if (root === "stripe") {
    const plan = await planJson(
      "Escolhe apenas uma leitura Stripe. balance lê saldo; customers lista clientes; payments lista pagamentos. Nunca cries ou alteres nada.",
      `Pedido: ${message}\nJSON: {"use":boolean,"area":"balance"|"customers"|"payments"}`,
    )
    if(!plan?.use) return ""
    const endpoint = plan.area==="balance"
      ? "https://api.stripe.com/v1/balance"
      : plan.area==="payments"
        ? "https://api.stripe.com/v1/payment_intents?limit=20"
        : "https://api.stripe.com/v1/customers?limit=20"
    const data = await bearerJson(endpoint, secret)
    return `Stripe (leitura real):\n${trimResult(data)}`
  }

  if (root === "whatsapp") {
    const phoneNumberId=String(row.config?.phoneNumberId||"")
    const url=new URL(`https://graph.facebook.com/${encodeURIComponent(phoneNumberId)}`)
    url.searchParams.set("fields","display_phone_number,verified_name,quality_rating")
    const response=await fetch(url,{
      headers:{Authorization:`Bearer ${secret}`},
      cache:"no-store",signal:AbortSignal.timeout(15000),
    })
    const data=await response.json().catch(()=>({}))
    if(!response.ok) throw new Error(data?.error?.message||`WhatsApp HTTP ${response.status}`)
    return `WhatsApp Business (conta real):\n${trimResult(data)}`
  }

  if (root === "twilio") {
    const accountSid=String(row.config?.accountSid||"")
    const response=await fetch(`https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(accountSid)}.json`,{
      headers:{Authorization:`Basic ${Buffer.from(`${accountSid}:${secret}`).toString("base64")}`},
      cache:"no-store",signal:AbortSignal.timeout(15000),
    })
    const data=await response.json().catch(()=>({}))
    if(!response.ok) throw new Error(data?.message||`Twilio HTTP ${response.status}`)
    return `Twilio (conta real):\n${trimResult({sid:data.sid,friendly_name:data.friendly_name,status:data.status,type:data.type})}`
  }

  return ""
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
  let context = ""

  if (row.auth_type === "oauth") {
    if (root === "google") context = await runGoogle(row, message)
    if (root === "github") context = await runGitHub(row, message)
    if (root === "meta") context = await runMeta(row)
    if (root === "canva") context = await runCanva(row)
    if (root === "figma") context = await runFigma(row)
    if (root === "netlify") context = await runNetlify(row)
  } else {
    const secret = row.secret_id ? await getConnectionSecret(row.id) : ""
    if (root === "rest") context = await runRest(row, message, secret)
    if (root === "openapi") context = await runOpenApi(row, message, secret)
    if (root === "mcp") context = await runMcp(row, message, secret)
    if (!["rest","openapi","mcp"].includes(root)) context = await runCredentialProvider(row, message, secret)
  }

  return {
    used: Boolean(context),
    context,
    connector: row.label || row.provider,
  }
}
