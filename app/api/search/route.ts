/**
 * API de Pesquisa Web - Reborn AI
 * Usa DuckDuckGo HTML como fonte principal e Wikipedia como fallback.
 */

import { NextResponse } from "next/server"

export const maxDuration = 30

interface SearchResult {
  title: string
  link: string
  snippet: string
  source: string
}

export async function POST(req: Request) {
  let query = ""
  let numResults = 5

  try {
    const body = await req.json()
    query = typeof body?.query === "string" ? body.query.trim() : ""
    numResults = Math.min(Math.max(Number(body?.numResults) || 5, 1), 10)

    if (!query) {
      return NextResponse.json({ error: "Query é obrigatório" }, { status: 400 })
    }

    const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`

    const response = await fetch(searchUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "pt-PT,pt;q=0.9,en;q=0.8",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(12000),
    })

    if (!response.ok) {
      throw new Error(`DuckDuckGo respondeu ${response.status}`)
    }

    const html = await response.text()
    const results: SearchResult[] = []
    const resultRegex = /<a[^>]*class="result__a"[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/g

    let match
    const links: string[] = []
    const titles: string[] = []

    while ((match = resultRegex.exec(html)) !== null && links.length < numResults) {
      const href = match[1]
      const title = decodeHtml(match[2].replace(/<[^>]*>/g, "").trim())
      const urlMatch = href.match(/uddg=([^&]+)/)
      const realUrl = urlMatch ? safeDecodeURIComponent(urlMatch[1]) : href

      if (isHttpUrl(realUrl) && title && !realUrl.includes("duckduckgo.com")) {
        links.push(realUrl)
        titles.push(title)
      }
    }

    const snippets: string[] = []
    const snippetMatches = html.match(/<a[^>]*class="result__snippet"[^>]*>([\s\S]*?)<\/a>/g) || []

    snippetMatches.forEach((s) => {
      const text = decodeHtml(s.replace(/<[^>]*>/g, "").trim())
      if (text) snippets.push(text)
    })

    for (let i = 0; i < Math.min(links.length, numResults); i++) {
      results.push({
        title: titles[i] || "Sem título",
        link: links[i],
        snippet: snippets[i] || "Sem descrição disponível",
        source: new URL(links[i]).hostname.replace(/^www\./, ""),
      })
    }

    if (results.length === 0) {
      const fallbackResults = await fetchFallbackResults(query, numResults)
      return NextResponse.json({
        results: fallbackResults,
        source: "wikipedia",
        query,
        timestamp: new Date().toISOString(),
      })
    }

    return NextResponse.json({
      results,
      source: "duckduckgo",
      query,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Search error:", error)

    if (query) {
      const fallbackResults = await fetchFallbackResults(query, numResults)
      if (fallbackResults.length > 0) {
        return NextResponse.json({
          results: fallbackResults,
          source: "wikipedia",
          query,
          timestamp: new Date().toISOString(),
        })
      }
    }

    return NextResponse.json(
      {
        error: "Erro na pesquisa",
        results: [],
        query,
      },
      { status: 502 },
    )
  }
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === "http:" || url.protocol === "https:"
  } catch {
    return false
  }
}

function safeDecodeURIComponent(value: string): string {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

function decodeHtml(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
}

async function fetchFallbackResults(query: string, numResults: number): Promise<SearchResult[]> {
  try {
    const wikiUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json&origin=*&srlimit=${numResults}`

    const response = await fetch(wikiUrl, {
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
    })
    if (!response.ok) return []

    const data = await response.json()

    if (data.query?.search) {
      return data.query.search.map((item: any) => ({
        title: item.title,
        link: `https://en.wikipedia.org/wiki/${encodeURIComponent(item.title.replace(/ /g, "_"))}`,
        snippet: decodeHtml(String(item.snippet || "").replace(/<[^>]*>/g, "")),
        source: "wikipedia.org",
      }))
    }

    return []
  } catch {
    return []
  }
}
