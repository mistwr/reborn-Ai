import { lookup } from "node:dns/promises"
import net from "node:net"

export type LuminWebSource = {
  title: string
  link: string
  snippet: string
  source: string
  content?: string
  opened?: boolean
}

export type LuminWebResearch = {
  query: string
  context: string
  sources: LuminWebSource[]
  openedPages: number
}

const MAX_OPEN_PAGES = 3
const MAX_PAGE_BYTES = 260_000
const MAX_PAGE_TEXT = 12_000
const FETCH_TIMEOUT_MS = 9_000
const MAX_REDIRECTS = 3

function decodeHtml(value: string) {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
}

function htmlToText(html: string) {
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
  const title = decodeHtml((titleMatch?.[1] || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim())

  const text = decodeHtml(
    html
      .replace(/<!--([\s\S]*?)-->/g, " ")
      .replace(/<(script|style|noscript|svg|canvas|template|iframe)[^>]*>[\s\S]*?<\/\1>/gi, " ")
      .replace(/<(nav|footer|header|aside)[^>]*>[\s\S]*?<\/\1>/gi, " ")
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

  return { title, text: text.slice(0, MAX_PAGE_TEXT) }
}

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
  if (url.protocol !== "https:" && url.protocol !== "http:") throw new Error("unsupported protocol")
  if (url.username || url.password) throw new Error("credentials in URL are not allowed")

  const host = url.hostname.toLowerCase().replace(/\.$/, "")
  if (!host || host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local")) {
    throw new Error("local host blocked")
  }

  if (net.isIP(host)) {
    if ((net.isIPv4(host) && isBlockedIPv4(host)) || (net.isIPv6(host) && isBlockedIPv6(host))) {
      throw new Error("private address blocked")
    }
    return url
  }

  const addresses = await lookup(host, { all: true, verbatim: true })
  if (!addresses.length) throw new Error("host did not resolve")
  for (const entry of addresses) {
    if (
      (entry.family === 4 && isBlockedIPv4(entry.address)) ||
      (entry.family === 6 && isBlockedIPv6(entry.address))
    ) {
      throw new Error("private address blocked")
    }
  }
  return url
}

async function readLimitedBody(response: Response) {
  if (!response.body) return ""
  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let total = 0
  let text = ""

  try {
    while (total < MAX_PAGE_BYTES) {
      const { done, value } = await reader.read()
      if (done) break
      if (!value) continue
      const remaining = MAX_PAGE_BYTES - total
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

async function fetchPublicPage(inputUrl: string) {
  let current = await assertPublicUrl(inputUrl)

  for (let redirects = 0; redirects <= MAX_REDIRECTS; redirects++) {
    const response = await fetch(current, {
      redirect: "manual",
      cache: "no-store",
      headers: {
        "User-Agent": "LuminAI-Research/1.0 (+https://rebornaaqi.vercel.app)",
        Accept: "text/html,application/xhtml+xml,text/plain,application/json;q=0.8,*/*;q=0.2",
        "Accept-Language": "pt-PT,pt;q=0.9,en;q=0.7",
      },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    })

    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get("location")
      if (!location || redirects === MAX_REDIRECTS) throw new Error("redirect limit")
      current = await assertPublicUrl(new URL(location, current).toString())
      continue
    }

    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const contentType = (response.headers.get("content-type") || "").toLowerCase()
    if (
      !contentType.includes("text/html") &&
      !contentType.includes("application/xhtml+xml") &&
      !contentType.includes("text/plain") &&
      !contentType.includes("application/json")
    ) {
      throw new Error("unsupported content type")
    }

    const raw = await readLimitedBody(response)
    if (contentType.includes("json")) {
      return { title: current.hostname, text: raw.slice(0, MAX_PAGE_TEXT), finalUrl: current.toString() }
    }
    const parsed = htmlToText(raw)
    return { ...parsed, finalUrl: current.toString() }
  }

  throw new Error("unable to fetch page")
}

async function search(query: string, baseUrl: string): Promise<LuminWebSource[]> {
  const response = await fetch(`${baseUrl}/api/search`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, numResults: 6 }),
    signal: AbortSignal.timeout(15_000),
  })
  if (!response.ok) return []
  const data = await response.json().catch(() => ({}))
  return Array.isArray(data?.results) ? data.results.slice(0, 6) : []
}

export async function researchWeb(query: string, baseUrl: string): Promise<LuminWebResearch> {
  try {
    const results = await search(query, baseUrl)
    if (!results.length) return { query, context: "", sources: [], openedPages: 0 }

    const opened = await Promise.all(
      results.slice(0, MAX_OPEN_PAGES).map(async (source) => {
        try {
          const page = await fetchPublicPage(source.link)
          return {
            ...source,
            link: page.finalUrl || source.link,
            title: page.title || source.title,
            content: page.text,
            opened: Boolean(page.text),
          } satisfies LuminWebSource
        } catch {
          return { ...source, opened: false } satisfies LuminWebSource
        }
      }),
    )

    const byLink = new Map(opened.map((item) => [item.link, item]))
    const sources = results.map((source) => {
      const direct = byLink.get(source.link)
      if (direct) return direct
      const sameHost = opened.find((item) => {
        try {
          return new URL(item.link).hostname === new URL(source.link).hostname
        } catch {
          return false
        }
      })
      return sameHost?.opened ? { ...source, content: sameHost.content, opened: true } : source
    })

    const context = sources
      .map((source, index) => {
        const body = source.content?.trim() || source.snippet || "Sem conteúdo legível."
        return `[${index + 1}] ${source.title}\nFonte: ${source.source}\nURL: ${source.link}\n${source.opened ? "Conteúdo aberto pelo Lumin" : "Resumo do motor de busca"}:\n${body}`
      })
      .join("\n\n---\n\n")

    return {
      query,
      context,
      sources,
      openedPages: sources.filter((source) => source.opened).length,
    }
  } catch (error) {
    console.warn("[Lumin Web Agent] research failed:", error)
    return { query, context: "", sources: [], openedPages: 0 }
  }
}
