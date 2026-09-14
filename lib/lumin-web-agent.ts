import { lookup } from "node:dns/promises"
import net from "node:net"

export type LuminWebLink = {
  text: string
  href: string
}

export type LuminWebForm = {
  action: string
  method: string
  fields: string[]
}

export type LuminWebSource = {
  title: string
  link: string
  snippet: string
  source: string
  content?: string
  opened?: boolean
  depth?: number
  links?: LuminWebLink[]
  forms?: LuminWebForm[]
}

export type LuminWebResearch = {
  query: string
  context: string
  sources: LuminWebSource[]
  openedPages: number
  followedLinks: number
  detectedForms: number
}

const MAX_SEARCH_RESULTS = 6
const MAX_OPEN_PAGES = 5
const MAX_INITIAL_PAGES = 3
const MAX_FOLLOW_LINKS = 2
const MAX_LINKS_PER_PAGE = 24
const MAX_FORMS_PER_PAGE = 8
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

function cleanText(value: string) {
  return decodeHtml(value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim())
}

function htmlToText(html: string) {
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
  const title = cleanText(titleMatch?.[1] || "")

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

function extractAttribute(tag: string, name: string) {
  const pattern = new RegExp(`${name}\\s*=\\s*(?:\"([^\"]*)\"|'([^']*)'|([^\\s>]+))`, "i")
  const match = tag.match(pattern)
  return (match?.[1] || match?.[2] || match?.[3] || "").trim()
}

function extractLinks(html: string, baseUrl: string): LuminWebLink[] {
  const links: LuminWebLink[] = []
  const seen = new Set<string>()
  const anchorPattern = /<a\b([^>]*)>([\s\S]*?)<\/a>/gi
  let match: RegExpExecArray | null

  while ((match = anchorPattern.exec(html)) && links.length < MAX_LINKS_PER_PAGE) {
    const hrefRaw = extractAttribute(match[1] || "", "href")
    const text = cleanText(match[2] || "")
    if (!hrefRaw || hrefRaw.startsWith("#") || /^(mailto:|tel:|javascript:)/i.test(hrefRaw)) continue

    try {
      const url = new URL(hrefRaw, baseUrl)
      if (!/^https?:$/.test(url.protocol)) continue
      url.hash = ""
      const href = url.toString()
      if (seen.has(href)) continue
      seen.add(href)
      links.push({ text: text.slice(0, 180), href })
    } catch {
      continue
    }
  }

  return links
}

function extractForms(html: string, baseUrl: string): LuminWebForm[] {
  const forms: LuminWebForm[] = []
  const formPattern = /<form\b([^>]*)>([\s\S]*?)<\/form>/gi
  let match: RegExpExecArray | null

  while ((match = formPattern.exec(html)) && forms.length < MAX_FORMS_PER_PAGE) {
    const attrs = match[1] || ""
    const body = match[2] || ""
    const actionRaw = extractAttribute(attrs, "action") || baseUrl
    const method = (extractAttribute(attrs, "method") || "get").toLowerCase()
    const fields = Array.from(body.matchAll(/<(?:input|textarea|select)\b([^>]*)>/gi))
      .map((m) => extractAttribute(m[1] || "", "name"))
      .filter(Boolean)
      .slice(0, 20)

    let action = actionRaw
    try {
      action = new URL(actionRaw, baseUrl).toString()
    } catch {
      // Keep raw action for visibility only.
    }

    forms.push({ action, method, fields })
  }

  return forms
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
        "User-Agent": "LuminAI-Browser/1.0 (+https://rebornaaqi.vercel.app)",
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
      return {
        title: current.hostname,
        text: raw.slice(0, MAX_PAGE_TEXT),
        finalUrl: current.toString(),
        links: [] as LuminWebLink[],
        forms: [] as LuminWebForm[],
      }
    }

    const parsed = htmlToText(raw)
    return {
      ...parsed,
      finalUrl: current.toString(),
      links: extractLinks(raw, current.toString()),
      forms: extractForms(raw, current.toString()),
    }
  }

  throw new Error("unable to fetch page")
}

async function search(query: string, baseUrl: string): Promise<LuminWebSource[]> {
  const response = await fetch(`${baseUrl}/api/search`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, numResults: MAX_SEARCH_RESULTS }),
    signal: AbortSignal.timeout(15_000),
  })
  if (!response.ok) return []
  const data = await response.json().catch(() => ({}))
  return Array.isArray(data?.results) ? data.results.slice(0, MAX_SEARCH_RESULTS) : []
}

function queryTokens(query: string) {
  return Array.from(
    new Set(
      query
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .split(/[^a-z0-9]+/)
        .filter((token) => token.length >= 3)
        .filter((token) => !["para", "como", "mais", "sobre", "qual", "quais", "site", "web", "com", "dos", "das"].includes(token)),
    ),
  )
}

function scoreLink(link: LuminWebLink, query: string, originHost: string) {
  try {
    const url = new URL(link.href)
    if (url.hostname !== originHost) return -100
    if (/\b(logout|signout|delete|remove|unsubscribe|cancel|checkout|cart|basket|login|signin|register|signup)\b/i.test(`${link.text} ${url.pathname}`)) {
      return -100
    }

    const haystack = `${link.text} ${url.pathname} ${url.search}`
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
    let score = link.text ? 1 : 0
    for (const token of queryTokens(query)) {
      if (haystack.includes(token)) score += 3
    }
    if (/pricing|precos|price|product|produto|service|servico|about|sobre|docs|features|funcionalidades|contact|contacto/i.test(haystack)) score += 1
    return score
  } catch {
    return -100
  }
}

function formatSource(source: LuminWebSource, index: number) {
  const body = source.content?.trim() || source.snippet || "Sem conteúdo legível."
  const formNote = source.forms?.length
    ? `\nFormulários detetados: ${source.forms.length}. O Lumin NÃO submeteu nenhum formulário.`
    : ""
  const navNote = source.depth && source.depth > 0 ? `\nPágina seguida por navegação interna (profundidade ${source.depth}).` : ""

  return `[${index + 1}] ${source.title}\nFonte: ${source.source}\nURL: ${source.link}\n${source.opened ? "Conteúdo aberto pelo Lumin" : "Resumo do motor de busca"}:\n${body}${navNote}${formNote}`
}

export async function researchWeb(query: string, baseUrl: string): Promise<LuminWebResearch> {
  try {
    const results = await search(query, baseUrl)
    if (!results.length) return { query, context: "", sources: [], openedPages: 0, followedLinks: 0, detectedForms: 0 }

    const openedInitial = await Promise.all(
      results.slice(0, MAX_INITIAL_PAGES).map(async (source) => {
        try {
          const page = await fetchPublicPage(source.link)
          return {
            ...source,
            link: page.finalUrl || source.link,
            title: page.title || source.title,
            content: page.text,
            opened: Boolean(page.text),
            depth: 0,
            links: page.links,
            forms: page.forms,
          } satisfies LuminWebSource
        } catch {
          return { ...source, opened: false, depth: 0 } satisfies LuminWebSource
        }
      }),
    )

    const followed: LuminWebSource[] = []
    const visited = new Set(openedInitial.map((item) => item.link))

    for (const parent of openedInitial) {
      if (followed.length >= MAX_FOLLOW_LINKS || openedInitial.length + followed.length >= MAX_OPEN_PAGES) break
      if (!parent.opened || !parent.links?.length) continue

      let originHost = ""
      try {
        originHost = new URL(parent.link).hostname
      } catch {
        continue
      }

      const candidates = parent.links
        .map((link) => ({ link, score: scoreLink(link, query, originHost) }))
        .filter((item) => item.score > 0 && !visited.has(item.link.href))
        .sort((a, b) => b.score - a.score)

      for (const candidate of candidates) {
        if (followed.length >= MAX_FOLLOW_LINKS || openedInitial.length + followed.length >= MAX_OPEN_PAGES) break
        visited.add(candidate.link.href)
        try {
          const page = await fetchPublicPage(candidate.link.href)
          followed.push({
            title: page.title || candidate.link.text || parent.title,
            link: page.finalUrl,
            snippet: "",
            source: originHost,
            content: page.text,
            opened: Boolean(page.text),
            depth: 1,
            links: page.links,
            forms: page.forms,
          })
          break
        } catch {
          continue
        }
      }
    }

    const openedByOriginal = new Map(openedInitial.map((item, index) => [results[index]?.link, item]))
    const remaining = results.slice(MAX_INITIAL_PAGES).map((source) => ({ ...source, opened: false, depth: 0 }))
    const sources = [
      ...results.slice(0, MAX_INITIAL_PAGES).map((source) => openedByOriginal.get(source.link) || source),
      ...followed,
      ...remaining,
    ]

    const context = sources.map(formatSource).join("\n\n---\n\n")
    const openedPages = sources.filter((source) => source.opened).length
    const detectedForms = sources.reduce((total, source) => total + (source.forms?.length || 0), 0)

    return {
      query,
      context,
      sources,
      openedPages,
      followedLinks: followed.length,
      detectedForms,
    }
  } catch (error) {
    console.warn("[Lumin Web Agent] research failed:", error)
    return { query, context: "", sources: [], openedPages: 0, followedLinks: 0, detectedForms: 0 }
  }
}
