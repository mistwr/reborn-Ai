/**
 * API do Modo Live - Reborn AI
 * Streaming bidirectional em tempo real
 * Suporta áudio, vídeo e texto simultaneamente
 */

import { streamText } from "ai"

export const maxDuration = 120

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const {
      message,
      audioTranscript,
      frameDescription,
      conversationHistory = [],
      mode = "voice", // voice, video, or both
    } = body

    // Construir contexto baseado no modo
    const contextParts: string[] = []

    if (audioTranscript) {
      contextParts.push(`[ÁUDIO DO UTILIZADOR]: ${audioTranscript}`)
    }

    if (frameDescription) {
      contextParts.push(`[VISÃO EM TEMPO REAL]: ${frameDescription}`)
    }

    if (message) {
      contextParts.push(`[MENSAGEM]: ${message}`)
    }

    const fullContext = contextParts.join("\n")

    // Formatar histórico
    const formattedHistory = conversationHistory.map((msg: any) => ({
      role: msg.role,
      content: msg.content,
    }))

    // Adicionar mensagem atual
    formattedHistory.push({
      role: "user",
      content: fullContext || "Olá",
    })

    const result = streamText({
      model: "google/gemini-2.0-flash-001" as any,
      system: `Você é o Reborn AI em MODO LIVE - uma IA conversacional em tempo real.

COMPORTAMENTO NO MODO LIVE:
- Respostas CURTAS e DIRETAS (máximo 2-3 frases)
- Tom conversacional natural, como uma chamada de voz
- Reage imediatamente ao que vê/ouve
- Mantém contexto da conversa
- Pode interromper educadamente se necessário

CAPACIDADES ATIVAS:
${mode === "voice" || mode === "both" ? "- Escuta e responde em tempo real (áudio)" : ""}
${mode === "video" || mode === "both" ? "- Vê e analisa o que está na câmara" : ""}
- Conversa natural e fluida

REGRAS:
- Nunca use formatação markdown no modo live
- Seja conciso - isto é uma conversa, não um artigo
- Responda como se estivesse a falar, não a escrever
- Use pontuação natural para pausas de fala

Responda de forma natural e conversacional.`,
      messages: formattedHistory,
      maxTokens: 150, // Limitar para respostas curtas
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
