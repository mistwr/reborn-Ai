/**
 * REBORN AI CLIPPER - API de Transcrição
 *
 * Este endpoint recebe um vídeo e transcreve o áudio usando AssemblyAI.
 *
 * FLUXO:
 * 1. Recebe o vídeo via FormData
 * 2. Faz upload para AssemblyAI
 * 3. Solicita transcrição com timestamps
 * 4. Aguarda conclusão (polling)
 * 5. Retorna texto e timestamps
 *
 * REQUISITOS:
 * - ASSEMBLYAI_API_KEY no ambiente (free tier disponível)
 *
 * LIMITE FREE TIER:
 * - 100 horas de transcrição por mês
 */

import { type NextRequest, NextResponse } from "next/server"

// URL base da API AssemblyAI
const ASSEMBLYAI_BASE = "https://api.assemblyai.com/v2"

/**
 * POST /api/clipper/transcribe
 *
 * Recebe um vídeo e retorna a transcrição com timestamps
 */
export async function POST(request: NextRequest) {
  try {
    // Verificar API key
    const apiKey = process.env.ASSEMBLYAI_API_KEY

    // Se não houver API key, usar transcrição simulada para demo
    if (!apiKey) {
      return simulateTranscription()
    }

    // Obter o ficheiro do FormData
    const formData = await request.formData()
    const videoFile = formData.get("video") as File | null

    if (!videoFile) {
      return NextResponse.json({ error: "Nenhum vídeo fornecido" }, { status: 400 })
    }

    // Converter File para Buffer
    const arrayBuffer = await videoFile.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // PASSO 1: Upload do ficheiro para AssemblyAI
    const uploadResponse = await fetch(`${ASSEMBLYAI_BASE}/upload`, {
      method: "POST",
      headers: {
        Authorization: apiKey,
        "Content-Type": "application/octet-stream",
      },
      body: buffer,
    })

    if (!uploadResponse.ok) {
      throw new Error("Erro no upload para AssemblyAI")
    }

    const { upload_url } = await uploadResponse.json()

    // PASSO 2: Solicitar transcrição
    const transcriptResponse = await fetch(`${ASSEMBLYAI_BASE}/transcript`, {
      method: "POST",
      headers: {
        Authorization: apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        audio_url: upload_url,
        // Opções adicionais para melhor qualidade
        language_detection: true, // Detectar idioma automaticamente
        punctuate: true, // Adicionar pontuação
        format_text: true, // Formatar texto
        word_boost: [], // Palavras para melhorar reconhecimento
        boost_param: "high",
        // Timestamps por palavra para legendas
        // NOTA: word_timestamps é automático em AssemblyAI
      }),
    })

    if (!transcriptResponse.ok) {
      throw new Error("Erro ao solicitar transcrição")
    }

    const { id: transcriptId } = await transcriptResponse.json()

    // PASSO 3: Polling até concluir (timeout de 5 minutos)
    const maxAttempts = 60
    const pollInterval = 5000 // 5 segundos

    for (let i = 0; i < maxAttempts; i++) {
      const statusResponse = await fetch(`${ASSEMBLYAI_BASE}/transcript/${transcriptId}`, {
        headers: { Authorization: apiKey },
      })

      const result = await statusResponse.json()

      if (result.status === "completed") {
        // Transcrição concluída - formatar resposta
        return NextResponse.json({
          text: result.text,
          words:
            result.words?.map((w: { text: string; start: number; end: number; confidence: number }) => ({
              text: w.text,
              start: w.start / 1000, // Converter ms para segundos
              end: w.end / 1000,
              confidence: w.confidence,
            })) || [],
          language: result.language_code,
          duration: result.audio_duration,
        })
      }

      if (result.status === "error") {
        throw new Error(result.error || "Erro na transcrição")
      }

      // Aguardar antes do próximo polling
      await new Promise((resolve) => setTimeout(resolve, pollInterval))
    }

    throw new Error("Timeout na transcrição")
  } catch (error) {
    console.error("Erro na transcrição:", error)
    return NextResponse.json({ error: error instanceof Error ? error.message : "Erro desconhecido" }, { status: 500 })
  }
}

/**
 * Simula uma transcrição para demonstração
 * Usado quando não há API key configurada
 */
function simulateTranscription() {
  const demoText = `Olá e bem-vindos a este vídeo. Hoje vamos falar sobre um tema muito importante que vai mudar a forma como pensas sobre produtividade. 
  
  Primeiro, vamos começar com o básico. A produtividade não é sobre trabalhar mais horas, é sobre trabalhar de forma mais inteligente. 
  
  Muitas pessoas cometem o erro de pensar que quanto mais tempo passam a trabalhar, mais produtivas são. Isto está completamente errado.
  
  A chave está em identificar as tarefas mais importantes e focar nelas primeiro. Isto chama-se a regra 80/20, onde 20% das tuas ações produzem 80% dos resultados.
  
  Vou partilhar contigo três técnicas que uso todos os dias. A primeira é o time blocking, onde bloqueias períodos específicos para tarefas específicas.
  
  A segunda técnica é a regra dos dois minutos. Se uma tarefa demora menos de dois minutos, faz agora mesmo. Não adies.
  
  E a terceira, talvez a mais importante, é aprender a dizer não. Protege o teu tempo como se fosse o teu bem mais precioso, porque é.
  
  Se aplicares estas três técnicas consistentemente, vais ver uma mudança dramática na tua produtividade em apenas algumas semanas.
  
  Obrigado por assistires. Não te esqueças de subscrever e deixar um like se este vídeo te ajudou.`

  // Gerar timestamps simulados
  const words = demoText.split(/\s+/).map((word, index) => ({
    text: word,
    start: index * 0.4,
    end: (index + 1) * 0.4 - 0.1,
    confidence: 0.95 + Math.random() * 0.05,
  }))

  return NextResponse.json({
    text: demoText,
    words,
    language: "pt",
    duration: words.length * 0.4,
    simulated: true, // Flag para indicar que é simulado
  })
}
