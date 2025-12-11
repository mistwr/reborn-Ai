/**
 * API de Pesquisa Web - Reborn AI
 * Usa DuckDuckGo (gratuito, sem API key) para pesquisas na web
 * Permite ao Reborn AI ter acesso a informações atualizadas da internet
 */

import { NextResponse } from "next/server"

export const maxDuration = 30

// Interface para resultados de pesquisa
interface SearchResult {
  title: string
  link: string
  snippet: string
  source: string
}

export async function POST(req: Request) {
  try {
    const { query, numResults = 5 } = await req.json()

    if (!query) {
      return NextResponse.json({ error: "Query é obrigatório" }, { status: 400 })
    }

    // Usar DuckDuckGo HTML (gratuito, sem API key)
    const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`

    const response = await fetch(searchUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "pt-PT,pt;q=0.9,en;q=0.8",
      },
    })

    if (!response.ok) {
      throw new Error("Falha na pesquisa")
    }

    const html = await response.text()

    // Parse dos resultados do HTML do DuckDuckGo
    const results: SearchResult[] = []

    // Regex para extrair resultados
    const resultRegex = /<a[^>]*class="result__a"[^>]*href="([^"]*)"[^>]*>([^<]*)<\/a>/g
    const snippetRegex = /<a[^>]*class="result__snippet"[^>]*>([^<]*(?:<[^>]*>[^<]*)*)<\/a>/g

    let match
    const links: string[] = []
    const titles: string[] = []

    while ((match = resultRegex.exec(html)) !== null && links.length < numResults) {
      // DuckDuckGo usa redirecionamento, extrair URL real
      const href = match[1]
      const title = match[2].replace(/<[^>]*>/g, "").trim()

      // Extrair URL real do redirecionamento
      const urlMatch = href.match(/uddg=([^&]+)/)
      const realUrl = urlMatch ? decodeURIComponent(urlMatch[1]) : href

      if (realUrl && title && !realUrl.includes("duckduckgo.com")) {
        links.push(realUrl)
        titles.push(title)
      }
    }

    // Extrair snippets
    const snippets: string[] = []
    const snippetMatches = html.match(/<a[^>]*class="result__snippet"[^>]*>([\s\S]*?)<\/a>/g) || []

    snippetMatches.forEach((s) => {
      const text = s.replace(/<[^>]*>/g, "").trim()
      if (text) snippets.push(text)
    })

    // Combinar resultados
    for (let i = 0; i < Math.min(links.length, numResults); i++) {
      results.push({
        title: titles[i] || "Sem título",
        link: links[i],
        snippet: snippets[i] || "Sem descrição disponível",
        source: new URL(links[i]).hostname.replace("www.", ""),
      })
    }

    // Se não encontrou resultados via regex, tentar método alternativo
    if (results.length === 0) {
      // Fallback: usar API alternativa gratuita
      const fallbackResults = await fetchFallbackResults(query, numResults)
      return NextResponse.json({
        results: fallbackResults,
        source: "fallback",
        query,
      })
    }

    return NextResponse.json({
      results,
      source: "duckduckgo",
      query,
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    console.error("Search error:", error)

    // Tentar fallback
    try {
      const { query, numResults = 5 } = await req.json()
      const fallbackResults = await fetchFallbackResults(query, numResults)
      return NextResponse.json({
        results: fallbackResults,
        source: "fallback",
        query,
      })
    } catch {
      return NextResponse.json(
        {
          error: "Erro na pesquisa",
          results: [],
        },
        { status: 500 },
      )
    }
  }
}

// Fallback usando Wikipedia API (sempre funciona, gratuito)
async function fetchFallbackResults(query: string, numResults: number): Promise<SearchResult[]> {
  try {
    const wikiUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json&origin=*&srlimit=${numResults}`

    const response = await fetch(wikiUrl)
    const data = await response.json()

    if (data.query?.search) {
      return data.query.search.map((item: any) => ({
        title: item.title,
        link: `https://en.wikipedia.org/wiki/${encodeURIComponent(item.title.replace(/ /g, "_"))}`,
        snippet: item.snippet.replace(/<[^>]*>/g, ""),
        source: "wikipedia.org",
      }))
    }

    return []
  } catch {
    return []
  }
}
