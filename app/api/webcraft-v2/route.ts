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
    const referenceBlock = referenceImages.length
      ? `\nIMAGENS DE REFERÊNCIA FORNECIDAS PELO UTILIZADOR:\n${referenceImages.map((url, index) => `${index + 1}. ${url}`).join("\n")}\nUsa estas imagens prioritariamente nas secções onde fizerem sentido. Não as substituas por imagens genéricas salvo se o utilizador pedir.`
      : ""

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
16. Antes de desenhar, infere do pedido entre 3 e 8 conceitos visuais concretos (ex.: fitness, treino funcional, halteres, personal trainer; stand automóvel, carros premium, showroom; solário, bronzeamento, cabine, wellness).
17. Nunca uses imagens sem relação com o tema, placeholders cinzentos, gradientes a fingir fotografias ou URLs vazias quando o pedido pede um website visual/comercial.
18. Quando não forem fornecidas imagens pelo utilizador, usa imagens remotas temáticas através de URLs contextuais no formato https://loremflickr.com/LARGURA/ALTURA/PALAVRA1,PALAVRA2?lock=NUMERO. Escolhe palavras-chave em inglês diretamente relacionadas com o pedido para melhorar os resultados. Usa valores lock diferentes para evitar repetir a mesma imagem.
19. Hero, secções editoriais, cartões de produto/serviço, testemunhos com fotografia e galerias devem ter imagens coerentes quando visualmente apropriado.
20. Usa sempre alt text descritivo e object-fit: cover. Garante contraste de texto sobre imagens com overlay quando necessário.
21. Se existirem IMAGENS DE REFERÊNCIA fornecidas pelo utilizador, dá-lhes prioridade e reutiliza-as fielmente; não inventes outras para substituir imagens explicitamente fornecidas.
22. Não uses imagens de celebridades, marcas protegidas ou pessoas identificáveis como se fossem o cliente, salvo se o utilizador tiver fornecido essas imagens.

PRESERVAÇÃO:
- Em refinamentos, parte obrigatoriamente do HTML atual.
- Mantém as funcionalidades, estilos e conteúdo que não tenham sido pedidos para alterar.
- Faz a menor alteração necessária para cumprir o pedido e devolve novamente o HTML COMPLETO.`

    const userPrompt = isRefinement
      ? `HTML ATUAL:\n${stripCodeFence(currentHtml!)}\n\nALTERAÇÃO PEDIDA:\n${refinement}${referenceBlock}\n\nDevolve o HTML completo atualizado.`
      : `Cria ${mode === "app" ? "uma aplicação web" : "um website"} completo para este pedido:\n${prompt}\n\n${body.businessName ? `Nome do negócio/projeto: ${body.businessName}\n` : ""}${body.businessEmail ? `Contacto: ${body.businessEmail}\n` : ""}${referenceBlock}\nDevolve o HTML completo.`

    const result = await generateText({
      model: getAIModel(),
      system,
      prompt: userPrompt,
    })

    const fixedHtml = validateAndFixHtml(result.text)
    return new Response(fixedHtml, { headers: { "Content-Type": "text/html; charset=utf-8" } })
  } catch (error: any) {
    console.error("[lumin-studio] generation error:", error)
    return Response.json({ error: error?.message || "Erro ao gerar projeto" }, { status: 500 })
  }
}
