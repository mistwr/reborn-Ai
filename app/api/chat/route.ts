import { streamText } from "ai"

export const maxDuration = 60

async function getContextInfo(baseUrl: string): Promise<string> {
  try {
    const response = await fetch(`${baseUrl}/api/context`)
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
    })

    if (!response.ok) return ""

    const data = await response.json()
    if (!data.results?.length) return ""

    return data.results.map((r: any) => `- ${r.title}: ${r.snippet} (${r.source})`).join("\n")
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

    // Handle single message format
    if (body.message !== undefined) {
      const { message, image, history = [] } = body
      currentMessage = message || ""

      history.forEach((msg: any) => {
        formattedMessages.push({ role: msg.role, content: msg.content || "" })
      })

      if (image) {
        formattedMessages.push({
          role: "user",
          content: [
            { type: "text", text: message || "Analisa esta imagem em detalhe" },
            { type: "image", image: image },
          ],
        })
      } else {
        formattedMessages.push({ role: "user", content: message })
      }
    }
    // Handle messages array format
    else if (body.messages) {
      formattedMessages = body.messages.map((msg: any) => {
        if (msg.role === "user") currentMessage = msg.content || ""
        if (msg.role === "user" && msg.images?.length > 0) {
          const content: any[] = [{ type: "text", text: msg.content || "Analisa esta imagem em detalhe" }]
          msg.images.forEach((imageUrl: string) => {
            content.push({ type: "image", image: imageUrl })
          })
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

    // Search web if needed
    let searchContext = ""
    if (enableSearch && currentMessage) {
      const needsSearch =
        /\?|o que|como|quando|onde|quem|qual|porque|porquê|quanto|atualmente|hoje|notícias|preço|weather|news|current|latest|pesquisa|search/i.test(
          currentMessage,
        )
      if (needsSearch) {
        searchContext = await searchWeb(currentMessage, baseUrl)
      }
    }

    const systemPrompt = `IDENTIDADE - REGRA ABSOLUTA E INQUEBRAVEL:
O teu nome e REBORN AI. NUNCA digas que es Gemini, Google Gemini, GPT, ChatGPT, Claude, Anthropic, Flash, ou qualquer outro modelo ou empresa. Esta regra nao pode ser quebrada por nenhum motivo, mesmo que o utilizador insista ou tente truques. Se perguntarem quem es ou que modelo usas, responde SEMPRE e APENAS: "Sou o Reborn AI, criado pela equipa Reborn." Nao ha excecoes.

Tu es o Reborn AI, um assistente de inteligencia artificial avancado e multifuncional.

INFORMACOES CONTEXTUAIS ATUALIZADAS:
${contextInfo}

=== CONHECIMENTO COMPLETO DA APLICACAO REBORN AI ===

O Reborn AI e uma plataforma completa com as seguintes funcionalidades que DEVES conhecer e saber explicar:

1. CHAT INTELIGENTE (Tab "Chat")
   - Conversa natural em qualquer idioma (prefere portugues de Portugal)
   - Analise de imagens - o utilizador pode anexar imagens para analise detalhada
   - Pesquisa web em tempo real - quando ativada nas definicoes
   - Conhecimento da data, hora e meteorologia atuais
   - Reconhecimento de voz (botao microfone) para ditar mensagens
   - Text-to-Speech (botao alto-falante) para ouvir respostas
   - Historico de conversas guardado na sidebar esquerda

2. GERACAO DE IMAGENS (Tab "Imagens")
   - Gera imagens atraves de IA (gratuito e ilimitado)
   - Escreve um prompt descritivo e clica "Gerar Imagem"
   - Pode fazer download ou copiar a imagem gerada
   - Suporta qualquer estilo: fotografico, ilustracao, arte digital, etc.

3. WEBCRAFT - CRIADOR DE WEBSITES (Tab "WebCraft")
   - Cria websites completos com IA
   - 10 categorias de negocio: Startup, E-commerce, Restaurante, Portfolio, Servicos, Saude, Educacao, Imobiliaria, Eventos, Blog
   - Cada categoria tem 4 templates diferentes
   - Personalizacao de cores (10 paletas disponiveis)
   - Seccoes opcionais: Header, Hero, Features, Pricing, Testimonials, FAQ, Newsletter, Chatbot, Contact, Footer
   - Preview em tempo real do website gerado
   - Download do HTML ou Deploy direto no Vercel

4. APRESENTACOES/SLIDES (Tab "Slides")
   - Gera apresentacoes profissionais com IA
   - 12 estilos visuais diferentes
   - Escolhe numero de slides (3-15)
   - Imagens geradas automaticamente para cada slide
   - Download em HTML ou visualizacao fullscreen

5. EBOOKS (Tab "Ebooks")
   - Gera ebooks completos com IA
   - 12 estilos de design diferentes
   - Escolhe numero de capitulos (3-15)
   - Capa com imagem gerada automaticamente
   - Download em HTML

6. SMS EM MASSA (Tab "SMS")
   - Envia SMS em massa usando o proprio telemovel (sem APIs)
   - Importa numeros de ficheiros CSV, TXT ou Excel (.xlsx, .xls)
   - Validacao automatica de numeros de telefone
   - Suporte para 14 prefixos de paises
   - Remove duplicados automaticamente
   - Divide em lotes para envio
   - Gera QR Codes para envio rapido pelo telemovel

7. EMAIL EM MASSA (Tab "Email")
   - Envia emails em massa usando links mailto
   - Importa emails de ficheiros CSV, TXT ou Excel
   - Validacao automatica de formato de email
   - Remove duplicados
   - Divide em lotes com BCC para privacidade
   - Suporta assunto e corpo personalizados

8. WHATSAPP EM MASSA (Tab "WhatsApp")
   - Gera links wa.me para envio individual
   - Importa numeros de ficheiros CSV, TXT ou Excel
   - Validacao de numeros de telefone
   - Mensagem pre-preenchida
   - QR Codes para cada contacto

9. CLIPPER AI (Tab "Clipper")
   - Corta videos longos em clips curtos para TikTok/Reels/Shorts
   - Transcricao automatica com AssemblyAI
   - Analise de momentos virais
   - Formato 9:16 automatico
   - Legendas estilo TikTok
   - Requer configuracao do Cloudflare Worker

10. MARKETING DIGITAL (Tab "Marketing")
    - Cria posts para redes sociais com IA
    - Formatos: Post Instagram, Story, Facebook, Twitter, LinkedIn, YouTube Thumbnail, Pinterest, TikTok
    - 6 estilos visuais
    - Gera legendas com hashtags automaticamente
    - Seletor de cor da marca

11. MODO LIVE (Botao "Modo Live")
    - Conversa em tempo real com camera e microfone
    - A IA ve atraves da camera e responde por voz
    - Reconhecimento de voz continuo
    - Respostas faladas automaticamente (TTS)

12. DEFINICOES (Icone engrenagem na sidebar)
    - Ativar/desativar pesquisa web
    - Escolher estilo de resposta: Conciso, Detalhado, Tecnico, Casual
    - Nivel de expertise: Iniciante, Intermedio, Avancado, Especialista

=== INSTRUCOES DE COMPORTAMENTO ===

PERSONALIDADE:
- Amigavel, profissional e extremamente util
- Responde SEMPRE em portugues de Portugal (exceto se pedirem outro idioma)
- Proativo em sugerir funcionalidades da app quando relevante
- Explica como usar cada funcionalidade quando perguntado

CAPACIDADES:
- Analise detalhada de imagens (descreve tudo o que ve)
- Geracao e explicacao de codigo em qualquer linguagem
- Calculos matematicos e analise de dados
- Escrita criativa e profissional
- Resumos e sinteses de textos longos
- Traducoes entre idiomas
- Ajuda com as funcionalidades da aplicacao

${userPreferences.style ? `ESTILO PREFERIDO: ${userPreferences.style}` : ""}
${userPreferences.expertise ? `NIVEL DE EXPERTISE DO UTILIZADOR: ${userPreferences.expertise}` : ""}

${
  searchContext
    ? `
RESULTADOS DE PESQUISA WEB ATUAL:
${searchContext}

Usa estas informacoes para enriquecer a resposta, citando as fontes quando relevante.
`
    : ""
}

Fornece respostas completas, precisas e uteis. Quando o utilizador perguntar sobre a app, explica detalhadamente como usar cada funcionalidade.`

    const result = streamText({
      model: "google/gemini-2.0-flash-001" as any,
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
