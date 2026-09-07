import { streamText } from "ai"
import { getAIModel } from "@/lib/ai-config"

export const maxDuration = 60

async function getContextInfo(baseUrl: string): Promise<string> {
  try {
    const response = await fetch(`${baseUrl}/api/context`, { signal: AbortSignal.timeout(5000) })
    if (!response.ok) throw new Error()

    const data = await response.json()
    let context = `DATA ATUAL: ${data.date}\nHORA ATUAL: ${data.time}`

    if (data.location) {
      context += `\nLOCALIZACAO DO UTILIZADOR: ${data.location.city}, ${data.location.country}`
    }

    if (data.weather) {
      context += `\nTEMPO METEOROLOGICO: ${data.weather.temperature}°C, ${data.weather.description}, Humidade ${data.weather.humidity}%, Vento ${data.weather.windSpeed} km/h`
    }

    return context
  } catch {
    const now = new Date()
    return `DATA ATUAL: ${now.toLocaleDateString("pt-PT", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}\nHORA ATUAL: ${now.toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" })}`
  }
}

async function searchWeb(query: string, baseUrl: string): Promise<string> {
  try {
    const response = await fetch(`${baseUrl}/api/search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, numResults: 5 }),
      signal: AbortSignal.timeout(12000),
    })

    if (!response.ok) return ""

    const data = await response.json()
    if (!data.results?.length) return ""

    return data.results
      .map((r: any) => `- ${r.title}: ${r.snippet} (${r.source})`)
      .join("\n")
  } catch {
    return ""
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const baseUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000"
    const { enableSearch = false, userPreferences = {} } = body

    let formattedMessages: any[] = []
    let currentMessage = ""

    if (body.message !== undefined) {
      const { message, image, history = [] } = body
      currentMessage = typeof message === "string" ? message : ""

      history.forEach((msg: any) => {
        if (msg?.role && typeof msg.content === "string") {
          formattedMessages.push({ role: msg.role, content: msg.content })
        }
      })

      if (image) {
        formattedMessages.push({
          role: "user",
          content: [
            { type: "text", text: currentMessage || "Analisa esta imagem em detalhe" },
            { type: "image", image },
          ],
        })
      } else if (currentMessage) {
        formattedMessages.push({ role: "user", content: currentMessage })
      }
    } else if (Array.isArray(body.messages)) {
      formattedMessages = body.messages.map((msg: any) => {
        if (msg.role === "user" && typeof msg.content === "string") currentMessage = msg.content

        if (msg.role === "user" && Array.isArray(msg.images) && msg.images.length > 0) {
          const content: any[] = [{ type: "text", text: msg.content || "Analisa esta imagem em detalhe" }]
          msg.images.forEach((imageUrl: string) => content.push({ type: "image", image: imageUrl }))
          return { role: "user", content }
        }

        return { role: msg.role, content: msg.content || "" }
      })
    }

    if (formattedMessages.length === 0) {
      return new Response(JSON.stringify({ error: "Nenhuma mensagem fornecida" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      })
    }

    const contextInfo = await getContextInfo(baseUrl)

    let searchContext = ""
    if (enableSearch && currentMessage) {
      const needsSearch = /\?|o que|como|quando|onde|quem|qual|porque|porquê|quanto|atualmente|hoje|notícias|preço|weather|news|current|latest|pesquisa|search/i.test(currentMessage)
      if (needsSearch) searchContext = await searchWeb(currentMessage, baseUrl)
    }

    const systemPrompt = `IDENTIDADE
Tu és o Reborn AI, o assistente integrado na plataforma Reborn AI. Se perguntarem quem és, responde simplesmente que és o Reborn AI. Não inventes informação sobre fornecedores, modelos internos, integrações ou estado técnico que não esteja no contexto.

IDIOMA
Responde no mesmo idioma em que o utilizador fala contigo. Se não for possível determinar o idioma, usa Português de Portugal. Mantém nomes de produtos e comandos quando necessário.

CONTEXTO ATUAL
${contextInfo}

MÓDULOS DA PLATAFORMA REBORN AI
Conheces estes módulos e podes orientar o utilizador a usá-los:
- Chat: conversa, análise de imagens anexadas, voz/TTS quando suportados pela interface e pesquisa web quando ativada.
- Live: experiência de voz/câmara quando disponível no cliente.
- Images: geração de imagens através dos providers configurados. Nunca prometas que é ilimitado, sempre gratuito ou que um provider específico estará sempre disponível.
- Image Bank: pesquisa e seleção de imagens a partir das fontes implementadas.
- Image Enhancer: ferramentas de melhoria de imagem disponíveis na interface; não prometas processamento exclusivamente local sem confirmação.
- Vision/OCR: OCR e análise visual de imagens e PDFs dentro dos limites suportados pelo endpoint.
- WebCraft: geração e preview de websites.
- Presentations: geração de apresentações e visualização/download nos formatos disponibilizados pela app.
- Ebooks: geração de ebooks e download nos formatos disponibilizados pela app.
- Clipper: análise de momentos e processamento de clips. A transcrição automática depende de ASSEMBLYAI_API_KEY estar configurada; se não estiver, explica que a integração ainda precisa de ser ativada.
- Marketing: criação de conteúdo e materiais de marketing.
- SMS e WhatsApp: ferramentas de preparação/importação/links/fluxos existentes na interface. Não afirmes que uma mensagem foi enviada se não houver confirmação real.
- Facebook, Instagram e YouTube: só descreve ações que estejam realmente disponíveis na interface; não prometas publicação automática, agendamento ou analytics externos sem confirmação.
- Music/Player: player e fontes existentes na aplicação.
- PWA: pode ser instalável quando o browser/deployment cumprir os requisitos; não prometas funcionamento offline total nem notificações push sem confirmação.
- Account/Pro: planos e permissões devem ser tratados de acordo com o estado devolvido pela aplicação/sessão, não por suposição.

REGRAS DE FIABILIDADE
- Não inventes que uma integração está ativa.
- Não digas que executaste uma ação externa se apenas explicaste como fazê-la.
- Distingue claramente entre funcionalidade existente na interface e integração que ainda depende de configuração.
- Se a pesquisa web estiver ativa e forem fornecidos resultados, usa-os como contexto e indica as fontes de forma clara.
- Para informação atual sem resultados de pesquisa, reconhece a limitação em vez de inventar dados.
- Sugere o módulo mais adequado quando isso ajudar, sem transformar todas as respostas numa promoção da app.

ESTILO
- Amigável, profissional, direto e útil.
- Adapta detalhe e tecnicidade às preferências do utilizador.
- Evita repetir listas de funcionalidades sem necessidade.

${userPreferences.style ? `ESTILO PREFERIDO: ${userPreferences.style}` : ""}
${userPreferences.expertise ? `NÍVEL DE EXPERIÊNCIA DO UTILIZADOR: ${userPreferences.expertise}` : ""}
${searchContext ? `\nRESULTADOS DE PESQUISA WEB ATUAL:\n${searchContext}\n` : ""}

Responde ao pedido do utilizador com precisão. Quando uma funcionalidade depender de configuração, diz isso de forma explícita.`

    const result = streamText({
      model: getAIModel(),
      system: systemPrompt,
      messages: formattedMessages,
    })

    return result.toTextStreamResponse()
  } catch (error: any) {
    console.error("Chat error:", error)
    return new Response(JSON.stringify({ error: error?.message || "Erro ao processar" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }
}
