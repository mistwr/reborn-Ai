import { generateText } from "ai"
import { getAIModel } from "@/lib/ai-config"

export const maxDuration = 60

type Mode = "website" | "app"

type WebCraftRequest = {
  prompt?: string
  mode?: Mode
  currentHtml?: string
  refinement?: string
  language?: string
  businessName?: string
  businessEmail?: string
  referenceImages?: string[]
}

type ContextImage = {
  url: string
  thumbnail?: string
  title?: string
  creator?: string
  source?: string
  license?: string
  licenseUrl?: string
  query: string
}

const STOP_WORDS = new Set([
  "para", "com", "uma", "um", "uns", "umas", "de", "do", "da", "dos", "das", "e", "ou", "o", "a", "os", "as",
  "que", "cria", "criar", "faz", "fazer", "site", "website", "pagina", "landing", "page", "app", "aplicacao", "aplicação",
  "meu", "minha", "nosso", "nossa", "cliente", "negocio", "negócio", "empresa", "marca", "moderno", "moderna", "profissional",
  "completo", "completa", "responsive", "responsivo", "bonito", "bonita", "quero", "preciso", "tem", "ter", "sobre", "mais",
])

function stripCodeFence(value: string) {
  return value.replace(/^```html?\n?/i, "").replace(/\n?```$/i, "")
}

function sanitizeGeneratedTargets(value: string) {
  return value
    .replace(/\b(href|action)\s*=\s*(['"])(?:null|undefined|none|nan|about:blank|\s*)\2/gi, '$1="#"')
    .replace(/\b(href|action)\s*=\s*(?:null|undefined|none|nan)(?=\s|>)/gi, '$1="#"')
    .replace(/\bonclick\s*=\s*(['"])([^'"]*(?:location|window\.open)[^'"]*(?:null|undefined|none)[^'"]*)\1/gi, "")
}

function validateAndFixHtml(value: string) {
  const currentYear = new Date().getFullYear()
  let html = stripCodeFence(value.trim())

  if (!/^<!doctype html>/i.test(html)) html = `<!DOCTYPE html>\n${html}`

  if (/<head[\s>]/i.test(html) && !/name=["']viewport["']/i.test(html)) {
    html = html.replace(/<head(\s[^>]*)?>/i, (match) => `${match}\n<meta name="viewport" content="width=device-width, initial-scale=1" />`)
  }

  if (/<html[\s>]/i.test(html) && !/<html[^>]*\slang=/i.test(html)) {
    html = html.replace(/<html(\s[^>]*)?>/i, (_match, attrs = "") => `<html${attrs} lang="pt-PT">`)
  }

  html = sanitizeGeneratedTargets(html)
    .replace(/Powered by\s+Reborn AI/gi, "Powered by Lumin AI Studio")
    .replace(/Criado com\s+Reborn AI/gi, "Criado com Lumin AI Studio")
    .replace(/REBORN AI WebCraft/gi, "Lumin AI Studio")
    .replace(/(©|&copy;|copyright\s*)\s*(20(?:1\d|2[0-5]))/gi, (_m, prefix) => `${prefix} ${currentYear}`)

  return html
}

function cleanReferenceImages(input: unknown) {
  if (!Array.isArray(input)) return [] as string[]
  return input
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.trim())
    .filter((value) => /^https?:\/\//i.test(value))
    .slice(0, 12)
}

function extractVisualQueries(value: string) {
  const cleaned = value
    .toLocaleLowerCase("pt-PT")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, " ")

  const words = cleaned
    .split(/\s+/)
    .filter((word) => word.length >= 4 && !STOP_WORDS.has(word))

  const unique = Array.from(new Set(words)).slice(0, 8)
  const queries: string[] = []

  if (unique.length >= 2) queries.push(unique.slice(0, 3).join(" "))
  if (unique.length >= 4) queries.push(unique.slice(2, 5).join(" "))
  if (unique.length >= 6) queries.push(unique.slice(5, 8).join(" "))
  if (!queries.length && unique.length) queries.push(unique.join(" "))

  return Array.from(new Set(queries)).slice(0, 3)
}

async function searchOpenverse(query: string, limit = 4): Promise<ContextImage[]> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 4500)

  try {
    const url = new URL("https://api.openverse.org/v1/images/")
    url.searchParams.set("q", query)
    url.searchParams.set("page_size", String(Math.min(limit, 10)))
    url.searchParams.set("mature", "false")

    const response = await fetch(url, {
      headers: { "User-Agent": "Lumin-AI-Studio/1.0" },
      signal: controller.signal,
      cache: "no-store",
    })

    if (!response.ok) return []
    const data = await response.json().catch(() => null)
    const results = Array.isArray(data?.results) ? data.results : []

    return results
      .map((item: any): ContextImage | null => {
        const usableUrl = typeof item?.thumbnail === "string" && /^https?:\/\//i.test(item.thumbnail)
          ? item.thumbnail
          : typeof item?.url === "string" && /^https?:\/\//i.test(item.url)
            ? item.url
            : null

        if (!usableUrl) return null

        return {
          url: usableUrl,
          thumbnail: typeof item?.thumbnail === "string" ? item.thumbnail : undefined,
          title: typeof item?.title === "string" ? item.title : undefined,
          creator: typeof item?.creator === "string" ? item.creator : undefined,
          source: typeof item?.source === "string" ? item.source : undefined,
          license: typeof item?.license === "string" ? item.license : undefined,
          licenseUrl: typeof item?.license_url === "string" ? item.license_url : undefined,
          query,
        }
      })
      .filter((item: ContextImage | null): item is ContextImage => Boolean(item))
      .slice(0, limit)
  } catch {
    return []
  } finally {
    clearTimeout(timeout)
  }
}

async function resolveContextImages(prompt: string, businessName?: string) {
  const seed = `${businessName || ""} ${prompt}`.trim()
  const queries = extractVisualQueries(seed)
  if (!queries.length) return [] as ContextImage[]

  const groups = await Promise.all(queries.map((query) => searchOpenverse(query, 3)))
  const seen = new Set<string>()
  const output: ContextImage[] = []

  for (const image of groups.flat()) {
    if (seen.has(image.url)) continue
    seen.add(image.url)
    output.push(image)
    if (output.length >= 8) break
  }

  return output
}

function buildContextImageBlock(images: ContextImage[]) {
  if (!images.length) return ""

  return `\nIMAGENS CONTEXTUAIS PESQUISADAS AUTOMATICAMENTE PELO LUMIN:\n${images
    .map((image, index) => {
      const attribution = [image.creator, image.license].filter(Boolean).join(" · ")
      return `${index + 1}. ${image.url}\n   Tema pesquisado: ${image.query}${image.title ? `\n   Título: ${image.title}` : ""}${attribution ? `\n   Crédito/licença: ${attribution}` : ""}${image.licenseUrl ? `\n   Licença: ${image.licenseUrl}` : ""}`
    })
    .join("\n")}\nUsa estas imagens nas secções visualmente adequadas. Quando houver crédito/licença, preserva uma atribuição discreta no HTML (por exemplo no rodapé ou legenda) sem prejudicar o design.`
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as WebCraftRequest
    const mode: Mode = body.mode === "app" ? "app" : "website"
    const prompt = body.prompt?.trim()
    const refinement = body.refinement?.trim()
    const currentHtml = body.currentHtml?.trim()
    const language = body.language?.trim() || "Português de Portugal (PT-PT)"
    const currentYear = new Date().getFullYear()
    const referenceImages = cleanReferenceImages(body.referenceImages)

    if (!prompt && !refinement) {
      return Response.json({ error: "Indica o que queres criar ou alterar." }, { status: 400 })
    }

    const isRefinement = Boolean(currentHtml && refinement)
    const contextImages = !isRefinement && referenceImages.length === 0 && prompt
      ? await resolveContextImages(prompt, body.businessName)
      : []

    const referenceBlock = referenceImages.length
      ? `\nIMAGENS DE REFERÊNCIA FORNECIDAS PELO UTILIZADOR:\n${referenceImages.map((url, index) => `${index + 1}. ${url}`).join("\n")}\nUsa estas imagens prioritariamente nas secções onde fizerem sentido. Não as substituas por imagens genéricas salvo se o utilizador pedir.`
      : ""
    const contextImageBlock = buildContextImageBlock(contextImages)

    const system = `És o motor interno do Lumin AI Studio, um agente de criação de aplicações e websites prontos a usar.

OBJETIVO:
- Produzir uma experiência funcional, visualmente profissional e utilizável imediatamente no browser.
- Trabalhar como um construtor iterativo: criar, receber pedidos de alteração e devolver sempre o projeto completo atualizado.
- Nunca remover funcionalidades existentes quando o utilizador pede apenas uma alteração localizada, salvo se for explicitamente pedido.

CONTEXTO TEMPORAL:
- Ano atual: ${currentYear}.
- Nunca inventes datas históricas como 2023, 2024 ou 2025 em copyright quando a intenção for representar o presente.
- Para copyright, prefere JavaScript dinâmico com new Date().getFullYear() ou usa ${currentYear}.
- Não assumes que bibliotecas/APIs antigas continuam atuais quando a funcionalidade depender delas.

MODO ATUAL: ${mode === "app" ? "APLICAÇÃO WEB" : "WEBSITE"}
IDIOMA VISÍVEL: ${language}

REGRAS DE SAÍDA:
1. Devolve APENAS HTML completo, começando por <!DOCTYPE html>.
2. Um único ficheiro executável no browser, sem markdown nem explicações.
3. Tailwind via CDN é permitido: <script src="https://cdn.tailwindcss.com"></script>.
4. Podes usar JavaScript vanilla no próprio HTML para estado, formulários, modais, filtros, tabelas, dashboards, navegação e interações.
5. Não uses lorem ipsum. Usa conteúdo realista.
6. Design responsivo, mobile-first e acessível.
7. O produto visível é Lumin AI Studio. Nunca exponhas REBORN AI ou o fornecedor/modelo de IA no conteúdo do cliente.
8. Se fizer sentido assinar o projeto, usa discretamente "Powered by Lumin AI Studio".
9. Não inventes integrações externas como se estivessem ligadas. Quando uma função depender de backend real, cria a interface e comportamento local/demonstração claramente funcional no preview.
10. Se pedirem login, CRM, dashboard, e-commerce, reservas, pipeline, etc., cria fluxos navegáveis e dados demo coerentes.
11. Para aplicações, privilegia layout de produto SaaS: sidebar/topbar, estados, cards, tabelas e ações funcionais.
12. Para websites, privilegia SEO, navegação, CTA, formulários e secções comerciais.
13. Todo o código deve estar pronto a abrir/publicar sem passos adicionais.
14. NUNCA uses href="null", href="undefined", action="null", URLs vazios ou destinos inventados. Para navegação interna num website de uma só página usa âncoras reais como #servicos, #contacto e garante que o id correspondente existe. Para links externos usa apenas https://, mailto: ou tel: válidos.
15. Se um CTA ainda não tiver destino real, usa um botão com comportamento local/demonstrativo ou uma âncora interna válida; nunca uses "null", "undefined", "/null" ou JavaScript que navegue para valores inexistentes.

IMAGENS E CONTEXTO VISUAL — OBRIGATÓRIO:
16. Antes de desenhar, infere do pedido entre 3 e 8 conceitos visuais concretos.
17. Nunca uses imagens sem relação com o tema, placeholders cinzentos, gradientes a fingir fotografias ou URLs vazias quando o pedido pede um website visual/comercial.
18. Se receberes IMAGENS CONTEXTUAIS PESQUISADAS AUTOMATICAMENTE PELO LUMIN, usa-as prioritariamente e associa cada uma a uma secção coerente com o respetivo tema pesquisado.
19. Só quando não houver imagens fornecidas nem imagens pesquisadas disponíveis, usa fallback temático através de https://loremflickr.com/LARGURA/ALTURA/PALAVRA1,PALAVRA2?lock=NUMERO.
20. Hero, secções editoriais, cartões de produto/serviço, testemunhos com fotografia e galerias devem ter imagens coerentes quando visualmente apropriado.
21. Usa sempre alt text descritivo e object-fit: cover. Garante contraste de texto sobre imagens com overlay quando necessário.
22. Se existirem IMAGENS DE REFERÊNCIA fornecidas pelo utilizador, dá-lhes prioridade absoluta e reutiliza-as fielmente.
23. Não uses imagens de celebridades, marcas protegidas ou pessoas identificáveis como se fossem o cliente, salvo se o utilizador tiver fornecido essas imagens.
24. Quando uma imagem pesquisada trouxer crédito/licença, mantém atribuição discreta e legível no HTML.

PRESERVAÇÃO:
- Em refinamentos, parte obrigatoriamente do HTML atual.
- Mantém as funcionalidades, estilos e conteúdo que não tenham sido pedidos para alterar.
- Faz a menor alteração necessária para cumprir o pedido e devolve novamente o HTML COMPLETO.`

    const userPrompt = isRefinement
      ? `HTML ATUAL:\n${stripCodeFence(currentHtml!)}\n\nALTERAÇÃO PEDIDA:\n${refinement}${referenceBlock}\n\nDevolve o HTML completo atualizado.`
      : `Cria ${mode === "app" ? "uma aplicação web" : "um website"} completo para este pedido:\n${prompt}\n\n${body.businessName ? `Nome do negócio/projeto: ${body.businessName}\n` : ""}${body.businessEmail ? `Contacto: ${body.businessEmail}\n` : ""}${referenceBlock}${contextImageBlock}\nDevolve o HTML completo.`

    const result = await generateText({
      model: getAIModel(),
      system,
      prompt: userPrompt,
    })

    const fixedHtml = validateAndFixHtml(result.text)
    return new Response(fixedHtml, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "X-Lumin-Context-Images": String(contextImages.length),
      },
    })
  } catch (error: any) {
    console.error("[lumin-studio] generation error:", error)
    return Response.json({ error: error?.message || "Erro ao gerar projeto" }, { status: 500 })
  }
}
