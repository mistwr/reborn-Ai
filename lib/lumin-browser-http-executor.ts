import { lookup } from "node:dns/promises"
import net from "node:net"

export type BrowserHttpAction = {
  type: "submit_form" | "navigate"
  url: string
  method?: "GET" | "POST"
  fields?: Record<string, string | number | boolean>
}

export type BrowserHttpResult = {
  ok: boolean
  status?: number
  finalUrl?: string
  title?: string
  text?: string
  cookies?: Array<{ name: string; value: string; domain?: string; path?: string }>
  error?: string
}

const MAX_BODY_BYTES = 300_000
const MAX_TEXT = 14_000
const MAX_REDIRECTS = 3
const REQUEST_TIMEOUT_MS = 12_000

function isBlockedIPv4(ip: string) {
  const parts = ip.split(".").map(Number)
  if (parts.length !== 4 || parts.some((p) => !Number.isInteger(p) || p < 0 || p > 255)) return true
  const [a, b] = parts
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    a >= 224 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 0) ||
    (a === 192 && b === 168) ||
    (a === 198 && (b === 18 || b === 19))
  )
}

function isBlockedIPv6(ip: string) {
  const normalized = ip.toLowerCase()
  return (
    normalized === "::" ||
    normalized === "::1" ||
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") ||
    normalized.startsWith("fe8") ||
    normalized.startsWith("fe9") ||
    normalized.startsWith("fea") ||
    normalized.startsWith("feb") ||
    normalized.startsWith("ff")
  )
}

async function assertPublicUrl(value: string) {
  const url = new URL(value)
  if (!/^https?:$/.test(url.protocol)) throw new Error("unsupported_protocol")
  if (url.username || url.password) throw new Error("credentials_in_url_blocked")

  const host = url.hostname.toLowerCase().replace(/\.$/, "")
  if (!host || host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local")) {
    throw new Error("private_host_blocked")
  }

  if (net.isIP(host)) {
    if ((net.isIPv4(host) && isBlockedIPv4(host)) || (net.isIPv6(host) && isBlockedIPv6(host))) {
      throw new Error("private_address_blocked")
    }
    return url
  }

  const addresses = await lookup(host, { all: true, verbatim: true })
  if (!addresses.length) throw new Error("host_not_resolved")
  for (const entry of addresses) {
    if (
      (entry.family === 4 && isBlockedIPv4(entry.address)) ||
      (entry.family === 6 && isBlockedIPv6(entry.address))
    ) {
      throw new Error("private_address_blocked")
    }
  }

  return url
}

function sensitiveField(name: string) {
  return /(^|[_-])(password|passwd|passcode|pin|otp|cvv|cvc|card|credit|iban|token|secret|api[_-]?key|private[_-]?key|ssn)([_-]|$)/i.test(name)
}

function dangerousEndpoint(url: URL) {
  return /\b(delete|remove|destroy|unsubscribe|cancel-subscription|checkout|purchase|buy|pay|payment|transfer|withdraw|wire)\b/i.test(
    `${url.pathname} ${url.search}`,
  )
}

function decodeHtml(value: string) {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
}

function htmlToText(html: string) {
  const title = decodeHtml((html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim())
  const text = decodeHtml(
    html
      .replace(/<!--([\s\S]*?)-->/g, " ")
      .replace(/<(script|style|noscript|svg|canvas|template|iframe)[^>]*>[\s\S]*?<\/\1>/gi, " ")
      .replace(/<br\s*\/?\s*>/gi, "\n")
      .replace(/<\/p\s*>/gi, "\n")
      .replace(/<\/h[1-6]\s*>/gi, "\n")
      .replace(/<\/li\s*>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
      .replace(/[\t ]+/g, " ")
      .replace(/\n\s+/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim(),
  )
  return { title, text: text.slice(0, MAX_TEXT) }
}

async function readLimitedBody(response: Response) {
  if (!response.body) return ""
  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let total = 0
  let text = ""

  try {
    while (total < MAX_BODY_BYTES) {
      const { done, value } = await reader.read()
      if (done) break
      if (!value) continue
      const remaining = MAX_BODY_BYTES - total
      const chunk = value.byteLength > remaining ? value.slice(0, remaining) : value
      total += chunk.byteLength
      text += decoder.decode(chunk, { stream: true })
      if (chunk.byteLength < value.byteLength) break
    }
    text += decoder.decode()
  } finally {
    reader.cancel().catch(() => undefined)
  }
  return text
}

function cookieHeader(cookies: unknown[], url: URL) {
  if (!Array.isArray(cookies)) return ""
  return cookies
    .filter((cookie: any) => {
      if (!cookie?.name || typeof cookie?.value !== "string") return false
      if (cookie.domain) {
        const domain = String(cookie.domain).replace(/^\./, "").toLowerCase()
        const host = url.hostname.toLowerCase()
        if (host !== domain && !host.endsWith(`.${domain}`)) return false
      }
      if (cookie.path && !url.pathname.startsWith(String(cookie.path))) return false
      return true
    })
    .map((cookie: any) => `${encodeURIComponent(String(cookie.name))}=${encodeURIComponent(String(cookie.value))}`)
    .join("; ")
}

function parseSetCookie(response: Response, finalUrl: URL) {
  const getter = (response.headers as any).getSetCookie
  const raw: string[] = typeof getter === "function" ? getter.call(response.headers) : []
  return raw
    .map((line) => {
      const parts = String(line).split(";").map((part) => part.trim())
      const first = parts.shift() || ""
      const eq = first.indexOf("=")
      if (eq <= 0) return null
      const item: any = {
        name: decodeURIComponent(first.slice(0, eq)),
        value: decodeURIComponent(first.slice(eq + 1)),
        domain: finalUrl.hostname,
        path: "/",
      }
      for (const part of parts) {
        const [k, ...rest] = part.split("=")
        const key = k.toLowerCase()
        const value = rest.join("=")
        if (key === "domain" && value) item.domain = value.replace(/^\./, "")
        if (key === "path" && value) item.path = value
      }
      return item
    })
    .filter(Boolean)
}

function mergeCookies(existing: unknown[], next: any[]) {
  const map = new Map<string, any>()
  for (const cookie of Array.isArray(existing) ? existing : []) {
    const c: any = cookie
    if (!c?.name) continue
    map.set(`${c.name}|${c.domain || ""}|${c.path || "/"}`, c)
  }
  for (const c of next) {
    map.set(`${c.name}|${c.domain || ""}|${c.path || "/"}`, c)
  }
  return Array.from(map.values()).slice(-80)
}

export async function executeApprovedBrowserHttpAction(input: {
  action: BrowserHttpAction
  cookies?: unknown[]
}): Promise<BrowserHttpResult> {
  try {
    const action = input.action
    if (!action || !["submit_form", "navigate"].includes(action.type)) throw new Error("unsupported_action")

    let current = await assertPublicUrl(action.url)
    if (dangerousEndpoint(current)) throw new Error("high_risk_endpoint_requires_headless_confirmation")

    const fields = action.fields && typeof action.fields === "object" ? action.fields : {}
    for (const key of Object.keys(fields)) {
      if (sensitiveField(key)) throw new Error("sensitive_form_fields_not_supported")
    }

    const method = action.type === "navigate" ? "GET" : action.method === "GET" ? "GET" : "POST"
    const params = new URLSearchParams()
    for (const [key, value] of Object.entries(fields)) {
      if (value === undefined || value === null) continue
      params.set(key, typeof value === "boolean" ? (value ? "true" : "false") : String(value))
    }

    if (method === "GET" && params.size) {
      for (const [key, value] of params.entries()) current.searchParams.set(key, value)
    }

    let response: Response | null = null
    let cookieState = Array.isArray(input.cookies) ? input.cookies : []

    for (let redirects = 0; redirects <= MAX_REDIRECTS; redirects++) {
      const cookies = cookieHeader(cookieState, current)
      response = await fetch(current, {
        method,
        redirect: "manual",
        cache: "no-store",
        headers: {
          Accept: "text/html,application/xhtml+xml,text/plain,application/json;q=0.8,*/*;q=0.2",
          "Accept-Language": "pt-PT,pt;q=0.9,en;q=0.7",
          "User-Agent": "LuminAI-Browser/1.0 (+https://rebornaaqi.vercel.app)",
          ...(cookies ? { Cookie: cookies } : {}),
          ...(method === "POST" ? { "Content-Type": "application/x-www-form-urlencoded" } : {}),
        },
        body: method === "POST" ? params.toString() : undefined,
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      })

      cookieState = mergeCookies(cookieState, parseSetCookie(response, current))

      if ([301, 302, 303, 307, 308].includes(response.status)) {
        const location = response.headers.get("location")
        if (!location || redirects === MAX_REDIRECTS) throw new Error("redirect_limit")
        current = await assertPublicUrl(new URL(location, current).toString())
        if (dangerousEndpoint(current)) throw new Error("unsafe_redirect_blocked")
        continue
      }
      break
    }

    if (!response) throw new Error("no_response")
    const raw = await readLimitedBody(response)
    const contentType = (response.headers.get("content-type") || "").toLowerCase()
    let title = current.hostname
    let text = raw.slice(0, MAX_TEXT)
    if (contentType.includes("html") || contentType.includes("xhtml")) {
      const parsed = htmlToText(raw)
      title = parsed.title || title
      text = parsed.text
    }

    return {
      ok: response.ok,
      status: response.status,
      finalUrl: current.toString(),
      title,
      text,
      cookies: cookieState as any[],
      error: response.ok ? undefined : `HTTP ${response.status}`,
    }
  } catch (error: any) {
    return { ok: false, error: String(error?.message || "browser_http_execution_failed") }
  }
}
