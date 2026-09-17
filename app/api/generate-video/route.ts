import { getServerSession } from "next-auth"
import { NextResponse } from "next/server"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"

export const maxDuration = 60
export const dynamic = "force-dynamic"

const GATEWAY_BASE = "https://ai-gateway.vercel.sh/v4/ai"
const DEFAULT_MODEL = process.env.LUMIN_VIDEO_MODEL || "google/veo-3.1-generate-001"

function authToken() {
  return process.env.AI_GATEWAY_API_KEY?.trim() || process.env.VERCEL_OIDC_TOKEN?.trim() || ""
}

function gatewayHeaders(model: string) {
  const token = authToken()
  if (!token) throw new Error("AI Gateway não configurado")

  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    Accept: "application/json",
    "ai-video-model-specification-version": "4",
    "ai-model-id": model,
  }
}

function normalizeVideos(videos: any[] | undefined) {
  if (!Array.isArray(videos)) return []

  return videos
    .map((video) => {
      if (!video) return null
      if (video.type === "url" && typeof video.url === "string") {
        return { url: video.url, mediaType: video.mediaType || "video/mp4" }
      }
      if (video.type === "base64" && typeof video.data === "string") {
        const mediaType = video.mediaType || "video/mp4"
        return { url: `data:${mediaType};base64,${video.data}`, mediaType }
      }
      if (typeof video.url === "string") return { url: video.url, mediaType: video.mediaType || "video/mp4" }
      return null
    })
    .filter(Boolean)
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions as any)
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Inicia sessão para gerar vídeo", code: "AUTH_REQUIRED" }, { status: 401 })
    }

    const isPro = Boolean((session.user as any)?.isPro)
    if (!isPro) {
      return NextResponse.json(
        { error: "A geração de vídeo IA está incluída no Lumin Pro", code: "PRO_REQUIRED" },
        { status: 403 },
      )
    }

    const body = await req.json()
    const action = body?.action === "status" ? "status" : "start"
    const model = typeof body?.model === "string" && body.model.trim() ? body.model.trim() : DEFAULT_MODEL

    if (action === "status") {
      if (!body?.operation) {
        return NextResponse.json({ error: "Operação de vídeo em falta" }, { status: 400 })
      }

      const response = await fetch(`${GATEWAY_BASE}/video-model/status`, {
        method: "POST",
        headers: gatewayHeaders(model),
        body: JSON.stringify({ operation: body.operation }),
        cache: "no-store",
        signal: AbortSignal.timeout(55000),
      })

      const data = await response.json().catch(() => null)
      if (!response.ok) {
        console.error("[Lumin Video] status failed", response.status, data)
        return NextResponse.json(
          { error: data?.error?.message || data?.message || `AI Gateway respondeu ${response.status}` },
          { status: response.status },
        )
      }

      if (data?.status === "completed") {
        return NextResponse.json({
          status: "completed",
          videos: normalizeVideos(data.videos),
          model,
          provider: "Vercel AI Gateway",
        })
      }

      if (data?.status === "error" || data?.status === "cancelled") {
        return NextResponse.json(
          { status: "error", error: data?.error || "A geração de vídeo falhou", model },
          { status: 502 },
        )
      }

      return NextResponse.json({ status: "pending", model })
    }

    const prompt = typeof body?.prompt === "string" ? body.prompt.trim() : ""
    if (!prompt) {
      return NextResponse.json({ error: "Descreve o vídeo que queres gerar" }, { status: 400 })
    }

    const duration = Math.min(Math.max(Number(body?.duration) || 5, 2), 8)
    const aspectRatio = ["16:9", "9:16", "1:1"].includes(body?.aspectRatio) ? body.aspectRatio : "16:9"
    const resolution = body?.resolution === "1080p" ? "1080p" : "720p"
    const generateAudio = body?.generateAudio !== false

    const response = await fetch(`${GATEWAY_BASE}/video-model/start`, {
      method: "POST",
      headers: gatewayHeaders(model),
      body: JSON.stringify({
        prompt,
        n: 1,
        duration,
        aspectRatio,
        resolution,
        generateAudio,
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(55000),
    })

    const data = await response.json().catch(() => null)
    if (!response.ok) {
      console.error("[Lumin Video] start failed", response.status, data)
      return NextResponse.json(
        {
          error: data?.error?.message || data?.message || `AI Gateway respondeu ${response.status}`,
          code: "VIDEO_PROVIDER_UNAVAILABLE",
        },
        { status: response.status },
      )
    }

    if (!data?.operation) {
      return NextResponse.json({ error: "O provider não devolveu uma operação de vídeo" }, { status: 502 })
    }

    return NextResponse.json({
      status: "pending",
      operation: data.operation,
      model,
      provider: "Vercel AI Gateway",
    })
  } catch (error: any) {
    console.error("[Lumin Video] generation error", error)
    return NextResponse.json(
      { error: error?.message || "Não foi possível gerar o vídeo", code: "VIDEO_GENERATION_ERROR" },
      { status: 500 },
    )
  }
}
