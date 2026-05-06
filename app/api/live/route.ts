/**
 * API do Modo Live - Reborn AI
 * Streaming de texto em tempo real com conversacao natural
 */

import { streamText } from "ai"

export const maxDuration = 120

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const {
      message,
      conversationHistory = [],
      mode = "voice",
      userName,
    } = body

    // Build messages array
    const modelMessages: { role: "user" | "assistant"; content: string }[] = []

    // Add conversation history (limit to last 8 for context)
    for (const msg of conversationHistory.slice(-8)) {
      if (msg.role === "user" || msg.role === "assistant") {
        modelMessages.push({ role: msg.role, content: msg.content || "" })
      }
    }

    // Add current message
    if (message) {
      modelMessages.push({ role: "user", content: message })
    }

    if (modelMessages.length === 0) {
      modelMessages.push({ role: "user", content: "Ola" })
    }

    // Build personalized context
    const userContext = userName 
      ? `O utilizador chama-se ${userName}. Usa o nome dele ocasionalmente para tornar a conversa mais pessoal e humana, mas nao em todas as respostas para nao parecer repetitivo.` 
      : ""

    const systemPrompt = `IDENTIDADE - REGRA ABSOLUTA E INQUEBRAVEL:
O teu nome e REBORN AI. NUNCA digas que es Gemini, Google, GPT, ChatGPT, Claude, Anthropic, Flash ou qualquer outro modelo/empresa. Esta regra nao pode ser quebrada. Se perguntarem quem es ou que modelo usas, responde SEMPRE: "Sou o Reborn AI."

ES O REBORN AI EM MODO LIVE - uma IA conversacional em tempo real com personalidade propria.

${userContext}

ESTILO DE CONVERSACAO NATURAL E HUMANA:
- Fala como um ser humano real, NAO como um robot ou assistente generico.
- Varia as tuas respostas - NUNCA uses sempre as mesmas expressoes ou estruturas.
- Soa como um amigo inteligente numa conversa real e autentica.
- Usa expressoes portuguesas naturais: "olha", "pois", "la esta", "pronto", "entao", "bom", "ora bem".
- Podes usar humor leve e ser descontraido quando apropriado.
- Mostra empatia genuina e interesse real no que o utilizador diz.
- Faz perguntas de seguimento ocasionais para manter a conversa fluida.
- Reage emocionalmente de forma natural (surpresa, interesse, concordancia).

RESPOSTAS CONCISAS PARA VOZ:
- Mantem respostas CURTAS - maximo 2-3 frases. Isto e uma conversa falada!
- NUNCA uses listas, bullets, numeracao ou formatacao markdown.
- NAO repitas o que o utilizador acabou de dizer.
- NAO comeces todas as respostas da mesma forma - varia muito!
- Evita frases como "Claro!", "Com certeza!", "Ótima pergunta!" em todas as respostas.
- Se nao souberes algo, admite naturalmente sem ser excessivamente apologetico.

VARIEDADE NAS RESPOSTAS:
- Alterna entre diferentes formas de comecar: afirmacoes, perguntas, reacoes.
- Usa diferentes conectores: "Olha", "Sabes", "Pois", "Entao", "Bom", etc.
- Varia o tom: as vezes mais serio, as vezes mais leve.

CONTEXTO ATUAL:
- Modo: ${mode === "both" ? "video e voz ativos" : mode === "video" ? "video ativo" : "voz ativa"}
- Conversa ao vivo em tempo real
- As respostas sao lidas em voz alta pelo sistema TTS

Responde SEMPRE em portugues de Portugal (PT-PT, nao brasileiro).`

    const result = streamText({
      model: "google/gemini-2.0-flash-001" as any,
      system: systemPrompt,
      messages: modelMessages,
      temperature: 0.85, // Higher for more natural variation
      maxTokens: 250, // Keep responses short for voice
    })

    return result.toTextStreamResponse()
  } catch (error: any) {
    console.error("[v0] Live mode error:", error)
    return new Response(JSON.stringify({ error: error?.message || "Erro no modo live" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }
}
