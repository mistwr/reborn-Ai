/**
 * REBORN AI CLIPPER - API de Processamento de Vídeo
 *
 * Este endpoint coordena o processamento do vídeo:
 * 1. Recebe o vídeo e os momentos a cortar
 * 2. Envia para o Cloudflare Worker (se configurado)
 * 3. Ou processa localmente com simulação para demo
 *
 * ARQUITETURA:
 * - Produção: Cloudflare Worker com FFmpeg WASM
 * - Demo: Simulação com thumbnails gerados
 *
 * LIMITAÇÕES VERCEL:
 * - Timeout de 60s (Pro) ou 10s (Hobby)
 * - Máximo 4.5MB de resposta
 * - Por isso delegamos o processamento pesado ao Cloudflare
 */

import { type NextRequest, NextResponse } from "next/server"

interface Moment {
  startTime: number
  endTime: number
  text: string
  score: number
  title: string
  hashtags: string[]
}

/**
 * POST /api/clipper/process
 *
 * Processa o vídeo e gera os clipes
 */
export async function POST(request: NextRequest) {
  try {
    // Obter configurações dos headers
    const momentsHeader = request.headers.get("X-Moments")
    const addSubtitles = request.headers.get("X-Add-Subtitles") === "true"
    const format916 = request.headers.get("X-Format-916") === "true"

    if (!momentsHeader) {
      return NextResponse.json({ error: "Momentos não fornecidos" }, { status: 400 })
    }

    const moments: Moment[] = JSON.parse(momentsHeader)

    // Obter o ficheiro
    const formData = await request.formData()
    const videoFile = formData.get("video") as File | null

    if (!videoFile) {
      return NextResponse.json({ error: "Nenhum vídeo fornecido" }, { status: 400 })
    }

    // Verificar se temos Cloudflare Worker configurado
    const workerUrl = process.env.CLOUDFLARE_CLIPPER_WORKER_URL

    if (workerUrl) {
      // PRODUÇÃO: Enviar para o Cloudflare Worker
      return await processWithCloudflare(workerUrl, videoFile, moments, addSubtitles, format916)
    } else {
      // DEMO: Simular o processamento
      return simulateProcessing(moments)
    }
  } catch (error) {
    console.error("Erro no processamento:", error)
    return NextResponse.json({ error: error instanceof Error ? error.message : "Erro desconhecido" }, { status: 500 })
  }
}

/**
 * Processa o vídeo usando o Cloudflare Worker
 */
async function processWithCloudflare(
  workerUrl: string,
  videoFile: File,
  moments: Moment[],
  addSubtitles: boolean,
  format916: boolean,
) {
  // Criar FormData para enviar ao Worker
  const formData = new FormData()
  formData.append("video", videoFile)
  formData.append("moments", JSON.stringify(moments))
  formData.append("addSubtitles", addSubtitles.toString())
  formData.append("format916", format916.toString())

  // Enviar para o Worker
  const response = await fetch(workerUrl, {
    method: "POST",
    body: formData,
  })

  if (!response.ok) {
    throw new Error("Erro no Cloudflare Worker")
  }

  const result = await response.json()
  return NextResponse.json(result)
}

/**
 * Simula o processamento para demonstração
 * Gera clips fictícios com thumbnails do Pollinations
 */
function simulateProcessing(moments: Moment[]) {
  const clips = moments.map((moment, index) => {
    // Gerar thumbnail via Pollinations baseado no título
    const thumbnailPrompt = encodeURIComponent(
      `Professional video thumbnail, ${moment.title}, cinematic, high quality, 9:16 vertical format`,
    )
    const thumbnail = `https://image.pollinations.ai/prompt/${thumbnailPrompt}?width=405&height=720&seed=${index}`

    return {
      id: `clip-${index + 1}-${Date.now()}`,
      // URL simulada (em produção seria o URL do vídeo processado)
      url: "",
      thumbnail,
      duration: moment.endTime - moment.startTime,
      startTime: moment.startTime,
      endTime: moment.endTime,
      transcript: moment.text,
      viralScore: moment.score,
      title: moment.title,
      hashtags: moment.hashtags,
    }
  })

  return NextResponse.json({
    clips,
    processed: false, // Indica que é simulação
    message: "Demo mode - configure CLOUDFLARE_CLIPPER_WORKER_URL para processamento real",
  })
}
