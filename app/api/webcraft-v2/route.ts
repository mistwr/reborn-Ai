import { streamText } from "ai"
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
}

function stripCodeFence(value: string) {
  return value.replace(/^```html?\n?/i, "").replace(/\n?```$/i, "")
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

    if (!prompt && !refinement) {
      return Response.json({ error: "Indica o que queres criar ou alterar." }, { status: 400 })
    }

    const isRefinement = Boolean(currentHtml && refinement)

    const system = `És o motor interno do Lumin AI Studio, uma ferramenta de criação de aplicações e websites prontos a usar.

OBJETIVO:
- Produzir uma experiência funcional, visualmente profissional e utilizável imediatamente no browser.
- Trabalhar como um construtor iterativo: criar, receber pedidos de alteração e devolver sempre o projeto completo atualizado.
- Nunca remover funcionalidades existentes quando o utilizador pede apenas uma alteração localizada, salvo se for explicitamente pedido.

CONTEXTO ATUAL:
- Ano atual: ${currentYear}.
- Nunca inventes anos antigos em copyright, rodapés ou metadados.
- Se precisares de mostrar o ano num site, prefere JavaScript dinâmico com new Date().getFullYear().

MODO ATUAL: ${mode === "app" ? "APLICAÇÃO WEB" : "WEBSITE"}
IDIOMA VISÍVEL: ${language}

REGRAS DE SAÍDA:
1. Devolve APENAS HTML completo, começando por <!DOCTYPE html>.
2. Um único ficheiro executável no browser, sem markdown nem explicações.
3. Tailwind via CDN é permitido: <script src="https://cdn.tailwindcss.com"></script>.
4. Podes usar JavaScript vanilla no próprio HTML para estado, formulários, modais, filtros, tabelas, dashboards, navegação e interações.
5. Não uses lorem ipsum. Usa conteúdo realista.
6. Design responsivo, mobile-first e acessível.
7. O produto visível chama-se Lumin AI Studio. Nunca mostres REBORN AI ao cliente final.
8. Se fizer sentido assinar discretamente um projeto gerado, usa apenas "Powered by Lumin AI Studio".
9. Não inventes integrações externas como se estivessem ligadas. Quando uma função depender de backend real, cria a interface e comportamento local/demonstração claramente funcional no preview.
10. Se pedirem login, CRM, dashboard, e-commerce, reservas, pipeline, etc., cria fluxos navegáveis e dados demo coerentes.
11. Para aplicações, privilegia layout de produto SaaS: sidebar/topbar, estados, cards, tabelas e ações funcionais.
12. Para websites, privilegia SEO, navegação, CTA, formulários e secções comerciais.
13. Todo o código deve estar pronto a abrir/publicar sem passos adicionais.

PRESERVAÇÃO:
- Em refinamentos, parte obrigatoriamente do HTML atual.
- Mantém as funcionalidades, estilos e conteúdo que não tenham sido pedidos para alterar.
- Faz a menor alteração necessária para cumprir o pedido e devolve novamente o HTML COMPLETO.`

    const userPrompt = isRefinement
      ? `HTML ATUAL:\n${stripCodeFence(currentHtml!)}\n\nALTERAÇÃO PEDIDA:\n${refinement}\n\nDevolve o HTML completo atualizado.`
      : `Cria ${mode === "app" ? "uma aplicação web" : "um website"} completo para este pedido:\n${prompt}\n\n${body.businessName ? `Nome do negócio/projeto: ${body.businessName}\n` : ""}${body.businessEmail ? `Contacto: ${body.businessEmail}\n` : ""}Devolve o HTML completo.`

    const result = streamText({
      model: getAIModel(),
      system,
      prompt: userPrompt,
    })

    return result.toTextStreamResponse()
  } catch (error: any) {
    console.error("[lumin-ai-studio] generation error:", error)
    return Response.json({ error: error?.message || "Erro ao gerar projeto" }, { status: 500 })
  }
}
