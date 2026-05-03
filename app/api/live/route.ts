/**
 * API do Modo Live - Reborn AI
 * Streaming em tempo real com suporte a UIMessageStream (AI SDK 6)
 */

import { streamText, convertToModelMessages } from "ai"

export const maxDuration = 120

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { messages = [], mode = "voice" } = body

    // Convert UIMessage format to ModelMessage format for streamText
    let modelMessages: any[]
    try {
      modelMessages = await convertToModelMessages(messages)
    } catch {
      // Fallback: messages already in model format or empty
      modelMessages = messages.map((m: any) => ({
        role: m.role,
        content: m.content || (m.parts ? m.parts.filter((p: any) => p.type === "text").map((p: any) => p.text).join("") : ""),
      }))
    }

    if (modelMessages.length === 0) {
      modelMessages = [{ role: "user", content: "Olá" }]
    }

    const result = streamText({
      model: "google/gemini-2.0-flash-001" as any,
      system: `És o Reborn AI em MODO LIVE - uma IA conversacional em tempo real.

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

    return result.toUIMessageStreamResponse()
  } catch (error: any) {
    console.error("Live mode error:", error)
    return new Response(JSON.stringify({ error: error?.message || "Erro no modo live" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }
}
