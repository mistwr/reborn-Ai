/**
 * API do Modo Live - Lumin AI
 * Multimodal em tempo real com voz + camera e fallback automatico de modelos.
 */

import { getVisionModel } from "@/lib/ai-config"
import { generateLuminText, getLuminModelCandidates } from "@/lib/lumin-ai-runtime"

export const maxDuration = 120

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const {
      message,
      conversationHistory = [],
      mode = "voice",
      userName,
      imageDataUrl,
      cameraFrameCapturedAt,
    } = body

    const hasVision =
      typeof imageDataUrl === "string" &&
      imageDataUrl.startsWith("data:image/") &&
      imageDataUrl.length < 4_500_000

    const modelMessages: any[] = []

    for (const msg of conversationHistory.slice(-8)) {
      if (msg?.role === "user" || msg?.role === "assistant") {
        const text = typeof msg.content === "string" ? msg.content : ""
        if (text) modelMessages.push({ role: msg.role, content: text })
      }
    }

    const currentMessage = typeof message === "string" && message.trim() ? message.trim() : "Ola"
    const last = modelMessages[modelMessages.length - 1]
    const duplicatedCurrent = last?.role === "user" && last?.content === currentMessage

    if (hasVision) {
      if (duplicatedCurrent) modelMessages.pop()
      modelMessages.push({
        role: "user",
        content: [
          { type: "text", text: currentMessage },
          { type: "image", image: imageDataUrl },
        ],
      })
    } else if (!duplicatedCurrent) {
      modelMessages.push({ role: "user", content: currentMessage })
    }

    const userContext = userName
      ? `O utilizador chama-se ${userName}. Usa o nome ocasionalmente, sem repeticao artificial.`
      : ""

    const visionContext = hasVision
      ? `CAMARA ATIVA E FRAME REAL DISPONIVEL:\n- Consegues ver o frame atual enviado pela camara neste pedido.\n- Se o utilizador perguntar o que ves, descreve apenas o que esta realmente visivel.\n- Nao digas que nao tens olhos ou que nao consegues ver: neste pedido tens acesso visual real ao frame.\n- Se algo estiver fora do enquadramento, desfocado ou incerto, diz isso naturalmente.\n- O frame foi capturado ${cameraFrameCapturedAt ? `em ${cameraFrameCapturedAt}` : "agora"}.`
      : `CAMARA SEM FRAME DISPONIVEL:\n- Nao afirmes que estas a ver algo que nao recebeste.\n- Se o utilizador pedir visao, diz de forma curta que precisa de ativar a camara/aguardar um frame.`

    const systemPrompt = `IDENTIDADE - REGRA ABSOLUTA:\nO teu nome e LUMIN AI. Se perguntarem quem es, responde: "Sou o Lumin AI."\n\nES O LUMIN AI EM MODO LIVE - conversa em tempo real com voz e, quando disponivel, visao da camara.\n\n${userContext}\n\n${visionContext}\n\nESTILO:\n- Portugues de Portugal quando o utilizador fala portugues.\n- Respostas curtas, naturais e faladas: normalmente 1 a 3 frases.\n- Sem listas, markdown ou explicacoes longas.\n- Nao repitas o utilizador.\n- Nao inventes capacidades: usa visao apenas quando existe frame neste pedido.\n- Se houver imagem, integra o que ves diretamente na resposta.\n- Se o utilizador perguntar "ves-me?", responde com base no frame real, nao com uma resposta generica sobre seres IA.\n- Se o utilizador estiver a falar de trabalho, vendas ou negocio, ajuda de forma pratica e orientada ao proximo passo, sem transformar tudo num pitch.\n\nCONTEXTO ATUAL:\n- Modo pedido: ${mode}\n- Visao real neste pedido: ${hasVision ? "sim" : "nao"}\n- Resposta sera lida em voz alta pelo TTS.`

    const fallbackModels = getLuminModelCandidates()
    const models = hasVision
      ? [getVisionModel(), ...fallbackModels]
      : fallbackModels

    const result = await generateLuminText({
      system: systemPrompt,
      messages: modelMessages,
      temperature: 0.72,
      maxOutputTokens: 220,
      models,
    })

    return new Response(result.text, {
      status: 200,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Lumin-Live-Vision": hasVision ? "frame" : "none",
        "X-Lumin-Model": result.model,
        "X-Lumin-Fallbacks": String(result.failures.length),
      },
    })
  } catch (error: any) {
    console.error("[lumin] Live mode error:", error)
    return new Response(JSON.stringify({ error: error?.message || "Erro no modo live" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }
}
