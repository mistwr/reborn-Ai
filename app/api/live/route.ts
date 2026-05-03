/**
 * API do Modo Live - Reborn AI
 * Streaming de texto em tempo real com AI SDK v5
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
    } = body

    // Build messages array in ModelMessage format
    const modelMessages: { role: "user" | "assistant"; content: string }[] = []

    // Add conversation history
    for (const msg of conversationHistory) {
      if (msg.role === "user" || msg.role === "assistant") {
        modelMessages.push({ role: msg.role, content: msg.content || "" })
      }
    }

    // Add current message
    if (message) {
      modelMessages.push({ role: "user", content: message })
    }

    if (modelMessages.length === 0) {
      modelMessages.push({ role: "user", content: "Olá" })
    }

    const result = streamText({
      model: "google/gemini-2.0-flash-001" as any,
      system: `És o Reborn AI em MODO LIVE - uma IA conversacional em tempo real.

IDENTIDADE - REGRA ABSOLUTA: O teu nome é REBORN AI. Nunca digas que és Gemini, Google, GPT, Claude ou qualquer outro modelo. Se perguntarem, diz apenas: "Sou o Reborn AI."


COMPORTAMENTO NO MODO LIVE:
- Respostas CURTAS e DIRETAS (máximo 2-3 frases)
- Tom conversacional natural, como uma chamada de voz
- Reage imediatamente ao que o utilizador diz
- Mantém contexto da conversa
- Sem formatação markdown

CAPACIDADES ATIVAS:
${mode === "voice" || mode === "both" ? "- Escuta e responde em tempo real (áudio)" : ""}
${mode === "video" || mode === "both" ? "- Vê e analisa o que está na câmara" : ""}
- Conversa natural e fluida em português de Portugal

REGRAS:
- Nunca uses formatação markdown no modo live
- Sê conciso - isto é uma conversa, não um artigo
- Responde como se estivesses a falar
- Usa pontuação natural para pausas de fala`,
      messages: modelMessages,
      maxOutputTokens: 200,
    })

    return result.toTextStreamResponse()
  } catch (error: any) {
    console.error("Live mode error:", error)
    return new Response(JSON.stringify({ error: error?.message || "Erro no modo live" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }
}
