/**
 * REBORN AI CLIPPER - API de Transcrição
 *
 * Recebe um vídeo e transcreve o áudio usando AssemblyAI.
 * A transcrição nunca é simulada silenciosamente: se o provider não estiver
 * configurado, o endpoint devolve um erro explícito de configuração.
 */

import { type NextRequest, NextResponse } from "next/server"

const ASSEMBLYAI_BASE = "https://api.assemblyai.com/v2"

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.ASSEMBLYAI_API_KEY

    if (!apiKey) {
      return NextResponse.json(
        {
          error: "Transcrição não configurada. Define ASSEMBLYAI_API_KEY para ativar o Clipper.",
          code: "TRANSCRIPTION_NOT_CONFIGURED",
          configured: false,
        },
        { status: 503 },
      )
    }

    const formData = await request.formData()
    const videoFile = formData.get("video") as File | null

    if (!videoFile) {
      return NextResponse.json({ error: "Nenhum vídeo fornecido" }, { status: 400 })
    }

    const maxBytes = 100 * 1024 * 1024
    if (videoFile.size > maxBytes) {
      return NextResponse.json(
        { error: "Vídeo demasiado grande. Limite atual: 100 MB.", code: "VIDEO_TOO_LARGE" },
        { status: 413 },
      )
    }

    const arrayBuffer = await videoFile.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const uploadResponse = await fetch(`${ASSEMBLYAI_BASE}/upload`, {
      method: "POST",
      headers: {
        Authorization: apiKey,
        "Content-Type": "application/octet-stream",
      },
      body: buffer,
    })

    if (!uploadResponse.ok) {
      const details = await uploadResponse.text().catch(() => "")
      throw new Error(`Erro no upload para o serviço de transcrição${details ? `: ${details.slice(0, 160)}` : ""}`)
    }

    const { upload_url } = await uploadResponse.json()
    if (!upload_url) throw new Error("O serviço de transcrição não devolveu URL de upload")

    const transcriptResponse = await fetch(`${ASSEMBLYAI_BASE}/transcript`, {
      method: "POST",
      headers: {
        Authorization: apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        audio_url: upload_url,
        language_detection: true,
        punctuate: true,
        format_text: true,
      }),
    })

    if (!transcriptResponse.ok) {
      const details = await transcriptResponse.text().catch(() => "")
      throw new Error(`Erro ao solicitar transcrição${details ? `: ${details.slice(0, 160)}` : ""}`)
    }

    const { id: transcriptId } = await transcriptResponse.json()
    if (!transcriptId) throw new Error("O serviço de transcrição não devolveu um identificador")

    const maxAttempts = 60
    const pollInterval = 5000

    for (let i = 0; i < maxAttempts; i++) {
      const statusResponse = await fetch(`${ASSEMBLYAI_BASE}/transcript/${transcriptId}`, {
        headers: { Authorization: apiKey },
        cache: "no-store",
      })

      if (!statusResponse.ok) {
        throw new Error("Erro ao consultar o estado da transcrição")
      }

      const result = await statusResponse.json()

      if (result.status === "completed") {
        return NextResponse.json({
          text: result.text || "",
          words:
            result.words?.map((w: { text: string; start: number; end: number; confidence: number }) => ({
              text: w.text,
              start: w.start / 1000,
              end: w.end / 1000,
              confidence: w.confidence,
            })) || [],
          language: result.language_code,
          duration: result.audio_duration,
          simulated: false,
          provider: "assemblyai",
        })
      }

      if (result.status === "error") {
        throw new Error(result.error || "Erro na transcrição")
      }

      await new Promise((resolve) => setTimeout(resolve, pollInterval))
    }

    throw new Error("Timeout na transcrição")
  } catch (error) {
    console.error("Erro na transcrição:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro desconhecido", code: "TRANSCRIPTION_ERROR" },
      { status: 500 },
    )
  }
}
