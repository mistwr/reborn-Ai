import { NextRequest, NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"
import { generateLuminText } from "@/lib/lumin-ai-runtime"

export const runtime = "nodejs"
export const maxDuration = 300

const MPT_BASE_URL = (process.env.MONEYPRINTERTURBO_API_URL || "https://moneyprinterturbo-production-3021.up.railway.app").replace(/\/$/, "")

function aspectResolution(aspect: string) {
  if (aspect === "16:9") return { width: 1280, height: 720 }
  if (aspect === "1:1") return { width: 1024, height: 1024 }
  return { width: 720, height: 1280 }
}

function cleanJsonArray(text: string): string[] {
  const cleaned = text.replace(/```json/gi, "").replace(/```/g, "").trim()
  try {
    const parsed = JSON.parse(cleaned)
    if (Array.isArray(parsed)) return parsed.map((item) => String(item).trim()).filter(Boolean).slice(0, 6)
  } catch {}
  return cleaned
    .split("\n")
    .map((line) => line.replace(/^[-*\d.\s]+/, "").trim())
    .filter(Boolean)
    .slice(0, 6)
}

async function generateScript(subject: string, seconds: number, language: string) {
  const targetWords = Math.max(45, Math.min(180, Math.round(seconds * 2.2)))
  const result = await generateLuminText({
    system:
      "És um argumentista de vídeos curtos. Escreve apenas o texto que será narrado, sem títulos, markdown, notas de produção ou indicações de narrador.",
    prompt: `Cria um guião envolvente sobre: ${subject}. Idioma: ${language}. Duração aproximada: ${seconds} segundos. Usa cerca de ${targetWords} palavras. Começa com um gancho forte, mantém frases curtas e termina com uma conclusão clara.`,
    maxOutputTokens: 1000,
    temperature: 0.7,
  })
  return result.text.trim()
}

async function generateVisualPrompts(subject: string, script: string) {
  const result = await generateLuminText({
    system:
      "Transforma guiões em prompts visuais cinematográficos. Responde exclusivamente com um array JSON de strings, sem markdown.",
    prompt: `Tema: ${subject}\nGuião: ${script}\n\nGera prompts visuais diferentes, concretos e fotorealistas, que contem a história pela mesma ordem do guião. Responde apenas com o array JSON. Não incluas texto escrito nas imagens.`,
    maxOutputTokens: 900,
    temperature: 0.6,
  })
  const prompts = cleanJsonArray(result.text)
  return prompts.length ? prompts : [subject]
}

async function uploadFreeImage(prompt: string, index: number, aspect: string) {
  const { width, height } = aspectResolution(aspect)
  const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=${width}&height=${height}&nologo=true&seed=${Date.now() + index}`
  const imageResponse = await fetch(imageUrl, { signal: AbortSignal.timeout(35_000), cache: "no-store" })
  if (!imageResponse.ok) throw new Error(`Falha a gerar imagem gratuita ${index + 1}`)

  const bytes = await imageResponse.arrayBuffer()
  const form = new FormData()
  form.append("file", new Blob([bytes], { type: "image/jpeg" }), `scene-${index + 1}.jpg`)

  const uploadResponse = await fetch(`${MPT_BASE_URL}/api/v1/video_materials`, {
    method: "POST",
    body: form,
    signal: AbortSignal.timeout(30_000),
  })
  const uploadData = await uploadResponse.json().catch(() => ({}))
  if (!uploadResponse.ok || !uploadData?.data?.file) {
    throw new Error(uploadData?.message || `MoneyPrinterTurbo recusou a imagem ${index + 1}`)
  }
  return String(uploadData.data.file)
}

function absoluteVideoUrl(value: string) {
  if (!value) return value
  if (/^https?:\/\//i.test(value)) return value
  return `${MPT_BASE_URL}${value.startsWith("/") ? "" : "/"}${value}`
}

export async function POST(request: NextRequest) {
  try {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET }).catch(() => null)
    if (!token?.email) {
      return NextResponse.json({ error: "Inicia sessão no Lumin para criar vídeos.", code: "AUTH_REQUIRED" }, { status: 401 })
    }
    const body = await request.json()
    const subject = String(body?.subject || "").trim()
    if (!subject) return NextResponse.json({ error: "Indica o tema do vídeo." }, { status: 400 })

    const aspect = ["9:16", "16:9", "1:1"].includes(body?.aspect) ? body.aspect : "9:16"
    const seconds = Math.max(15, Math.min(90, Number(body?.seconds || 30)))
    const language = String(body?.language || "pt-PT")
    const voiceName = String(body?.voiceName || "pt-PT-RaquelNeural-Female")
    const script = String(body?.script || "").trim() || (await generateScript(subject, seconds, language))
    const allPrompts = await generateVisualPrompts(subject, script)
    const wantedScenes = seconds <= 15 ? 3 : seconds <= 30 ? 4 : 5
    const prompts = allPrompts.slice(0, wantedScenes)

    const uploaded = await Promise.allSettled(
      prompts.map((prompt, index) => uploadFreeImage(prompt, index, aspect)),
    )
    const materialFiles = uploaded
      .filter((result): result is PromiseFulfilledResult<string> => result.status === "fulfilled")
      .map((result) => result.value)

    if (materialFiles.length < 2) {
      throw new Error("Não foi possível obter imagens suficientes para montar o vídeo. Tenta novamente.")
    }

    const clipDuration = Math.max(3, Math.ceil(seconds / Math.max(1, materialFiles.length)))
    const payload = {
      video_subject: subject,
      video_script: script,
      video_aspect: aspect,
      video_fit_mode: "cover",
      video_concat_mode: "sequential",
      video_transition_mode: "FadeIn",
      video_clip_duration: clipDuration,
      video_clip_speed: 1,
      video_count: 1,
      video_source: "local",
      video_materials: materialFiles.map((file) => ({ provider: "local", url: file, duration: clipDuration })),
      video_language: language,
      voice_name: voiceName,
      voice_volume: 1,
      voice_rate: 1,
      bgm_type: "random",
      bgm_volume: 0.14,
      subtitle_enabled: body?.subtitles !== false,
      subtitle_position: "two_thirds_bottom",
      subtitle_display_mode: "word_by_word",
      subtitle_animation: "pop_spring",
      text_fore_color: "#FFFFFF",
      text_background_color: false,
      font_size: aspect === "9:16" ? 76 : 60,
      stroke_color: "#000000",
      stroke_width: 2,
      n_threads: 2,
    }

    const response = await fetch(`${MPT_BASE_URL}/api/v1/videos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(30_000),
    })
    const data = await response.json().catch(() => ({}))
    if (!response.ok || !data?.data?.task_id) {
      return NextResponse.json(
        { error: data?.message || "Não foi possível iniciar o render no MoneyPrinterTurbo." },
        { status: response.status || 502 },
      )
    }

    return NextResponse.json({
      taskId: data.data.task_id,
      script,
      visualPrompts: prompts,
      engine: "MoneyPrinterTurbo",
      renderBaseUrl: MPT_BASE_URL,
    })
  } catch (error) {
    console.error("[Clipper/MPT] generation error", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro ao iniciar a geração do vídeo." },
      { status: 500 },
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET }).catch(() => null)
    if (!token?.email) {
      return NextResponse.json({ error: "Inicia sessão no Lumin para consultar o vídeo.", code: "AUTH_REQUIRED" }, { status: 401 })
    }
    const taskId = request.nextUrl.searchParams.get("taskId")?.trim()
    if (!taskId) return NextResponse.json({ error: "taskId em falta" }, { status: 400 })

    const response = await fetch(`${MPT_BASE_URL}/api/v1/tasks/${encodeURIComponent(taskId)}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    })
    const data = await response.json().catch(() => ({}))
    if (!response.ok) {
      return NextResponse.json({ error: data?.message || "Falha ao consultar o render." }, { status: response.status })
    }

    const task = data?.data || {}
    const videos = Array.isArray(task.videos) ? task.videos.map((url: string) => absoluteVideoUrl(url)) : []
    const combinedVideos = Array.isArray(task.combined_videos)
      ? task.combined_videos.map((url: string) => absoluteVideoUrl(url))
      : []

    return NextResponse.json({
      taskId,
      state: Number(task.state),
      progress: Number(task.progress || 0),
      failedStage: task.failed_stage || null,
      error: task.error || null,
      videos,
      combinedVideos,
      complete: Number(task.state) === 1,
      failed: Number(task.state) === -1,
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro a consultar o vídeo." },
      { status: 500 },
    )
  }
}
