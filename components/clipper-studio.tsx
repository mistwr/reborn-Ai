"use client"

import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  CheckCircle2,
  Download,
  Film,
  Loader2,
  Scissors,
  Sparkles,
  Upload,
  Video,
  Wand2,
} from "lucide-react"

type WorkspaceMode = "clipper" | "generate"
type ClipFormat = "vertical" | "horizontal" | "square"

const CLIP_DURATIONS = [15, 30, 60] as const
const VIDEO_DURATIONS = [15, 30, 60] as const
const VIDEO_RATIOS = ["16:9", "9:16", "1:1"] as const

function buttonClass(active: boolean) {
  return active
    ? "border-[#d2a643]/70 bg-[#d2a643]/15 text-[#f4cf73]"
    : "border-white/10 bg-white/[0.025] text-zinc-400 hover:border-[#d2a643]/40 hover:text-zinc-100"
}

export function ClipperStudio() {
  const [mode, setMode] = useState<WorkspaceMode>("clipper")

  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [clipDuration, setClipDuration] = useState<(typeof CLIP_DURATIONS)[number]>(15)
  const [clipFormat, setClipFormat] = useState<ClipFormat>("vertical")
  const [isProcessing, setIsProcessing] = useState(false)
  const [clipProgress, setClipProgress] = useState(0)
  const [clipResult, setClipResult] = useState<string | null>(null)
  const [clipError, setClipError] = useState<string | null>(null)

  const [prompt, setPrompt] = useState("")
  const [aiDuration, setAiDuration] = useState<(typeof VIDEO_DURATIONS)[number]>(5)
  const [aspectRatio, setAspectRatio] = useState<(typeof VIDEO_RATIOS)[number]>("16:9")
  const [voiceName, setVoiceName] = useState("pt-PT-RaquelNeural-Female")
  const [isGenerating, setIsGenerating] = useState(false)
  const [generationStatus, setGenerationStatus] = useState("")
  const [generatedVideo, setGeneratedVideo] = useState<string | null>(null)
  const [generationError, setGenerationError] = useState<string | null>(null)

  const ffmpegRef = useRef<any>(null)
  const ffmpegLoadedRef = useRef(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cancelledRef = useRef(false)

  useEffect(() => {
    return () => {
      cancelledRef.current = true
      if (videoUrl) URL.revokeObjectURL(videoUrl)
      if (clipResult) URL.revokeObjectURL(clipResult)
    }
  }, [videoUrl, clipResult])

  const chooseFile = (file: File | null) => {
    if (!file) return
    if (!file.type.startsWith("video/")) {
      setClipError("Seleciona um ficheiro de vídeo válido.")
      return
    }

    if (videoUrl) URL.revokeObjectURL(videoUrl)
    if (clipResult) URL.revokeObjectURL(clipResult)
    setVideoFile(file)
    setVideoUrl(URL.createObjectURL(file))
    setClipResult(null)
    setClipError(null)
    setClipProgress(0)
  }

  const ensureFfmpeg = async () => {
    if (ffmpegLoadedRef.current && ffmpegRef.current) return ffmpegRef.current

    setGenerationStatus("")
    setClipProgress(2)

    const [{ FFmpeg }, { toBlobURL }] = await Promise.all([
      import("@ffmpeg/ffmpeg"),
      import("@ffmpeg/util"),
    ])

    const ffmpeg = new FFmpeg()
    ffmpeg.on("progress", ({ progress }: { progress: number }) => {
      setClipProgress(Math.max(3, Math.min(99, Math.round(progress * 100))))
    })

    const coreBase = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd"
    await ffmpeg.load({
      coreURL: await toBlobURL(`${coreBase}/ffmpeg-core.js`, "text/javascript"),
      wasmURL: await toBlobURL(`${coreBase}/ffmpeg-core.wasm`, "application/wasm"),
    })

    ffmpegRef.current = ffmpeg
    ffmpegLoadedRef.current = true
    return ffmpeg
  }

  const processClip = async () => {
    if (!videoFile) return

    setIsProcessing(true)
    setClipError(null)
    setClipProgress(1)

    try {
      const [{ fetchFile }] = await Promise.all([import("@ffmpeg/util")])
      const ffmpeg = await ensureFfmpeg()
      const extension = videoFile.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "mp4"
      const inputName = `lumin-input.${extension}`
      const outputName = "lumin-clip.mp4"

      await ffmpeg.writeFile(inputName, await fetchFile(videoFile))

      const dimensions: Record<ClipFormat, [number, number]> = {
        vertical: [720, 1280],
        horizontal: [1280, 720],
        square: [1080, 1080],
      }
      const [width, height] = dimensions[clipFormat]
      const filter = `scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2`

      await ffmpeg.exec([
        "-i",
        inputName,
        "-t",
        String(clipDuration),
        "-vf",
        filter,
        "-c:v",
        "libx264",
        "-preset",
        "ultrafast",
        "-crf",
        "27",
        "-c:a",
        "aac",
        "-movflags",
        "+faststart",
        outputName,
      ])

      const data = await ffmpeg.readFile(outputName)
      const bytes = typeof data === "string" ? new TextEncoder().encode(data) : data
      const blob = new Blob([bytes as BlobPart], { type: "video/mp4" })
      if (clipResult) URL.revokeObjectURL(clipResult)
      setClipResult(URL.createObjectURL(blob))
      setClipProgress(100)

      try {
        await ffmpeg.deleteFile(inputName)
        await ffmpeg.deleteFile(outputName)
      } catch {
        // Cleanup is best effort.
      }
    } catch (error: any) {
      console.error("[Lumin Clipper] local processing failed", error)
      setClipError(
        error?.message?.includes("SharedArrayBuffer")
          ? "O navegador bloqueou o motor local de vídeo. Abre o Lumin numa janela normal do Chrome e tenta novamente."
          : "Não foi possível processar este vídeo neste dispositivo. Tenta um MP4 mais curto ou mais leve.",
      )
    } finally {
      setIsProcessing(false)
    }
  }

  const pollGeneration = async (taskId: string) => {
    const maxAttempts = 180
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      if (cancelledRef.current) return
      setGenerationStatus(`A criar voz, legendas e vídeo… ${Math.min(99, Math.max(12, attempt))}%`)
      await new Promise((resolve) => setTimeout(resolve, 2500))

      const response = await fetch(`/api/clipper/generate?taskId=${encodeURIComponent(taskId)}`, {
        cache: "no-store",
      })
      const data = await response.json().catch(() => ({}))

      if (!response.ok) throw new Error(data?.error || "Falha ao consultar o render")
      if (data?.failed) throw new Error(data?.error || "A criação do vídeo falhou")
      if (data?.complete) {
        const url = data?.videos?.[0] || data?.combinedVideos?.[0]
        if (!url) throw new Error("O render terminou mas não devolveu o MP4")
        setGeneratedVideo(url)
        setGenerationStatus("Vídeo pronto")
        return
      }
    }

    throw new Error("A geração demorou demasiado tempo. Tenta novamente.")
  }

  const generateVideo = async () => {
    if (!prompt.trim()) return

    cancelledRef.current = false
    setIsGenerating(true)
    setGenerationError(null)
    setGeneratedVideo(null)
    setGenerationStatus("A criar guião e storyboard…")

    try {
      const response = await fetch("/api/clipper/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: prompt.trim(),
          seconds: aiDuration,
          aspect: aspectRatio,
          language: "pt-PT",
          voiceName,
          subtitles: true,
        }),
      })
      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        if (data?.code === "AUTH_REQUIRED") {
          throw new Error("Inicia sessão no Lumin para criar o vídeo.")
        }
        throw new Error(data?.error || "Não foi possível iniciar a criação do vídeo")
      }

      if (!data?.taskId) throw new Error("O motor de vídeo não devolveu uma tarefa válida")
      setGenerationStatus("A montar o MP4…")
      await pollGeneration(data.taskId)
    } catch (error: any) {
      console.error("[Lumin Video] generation failed", error)
      setGenerationError(error?.message || "Não foi possível gerar o vídeo")
      setGenerationStatus("")
    } finally {
      setIsGenerating(false)
    }
  }

  const download = (url: string, name: string) => {
    const a = document.createElement("a")
    a.href = url
    a.download = name
    a.target = "_blank"
    a.rel = "noreferrer"
    document.body.appendChild(a)
    a.click()
    a.remove()
  }

  return (
    <div className="flex-1 min-h-0 overflow-y-auto bg-[#050506] text-zinc-100">
      <div className="mx-auto w-full max-w-6xl p-3 sm:p-5 lg:p-7 space-y-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#d2a643]/30 bg-[#d2a643]/10">
              <Scissors className="h-5 w-5 text-[#e2bb59]" />
            </div>
            <div>
              <h2 className="text-xl font-semibold tracking-tight">Lumin Video Studio</h2>
              <p className="text-sm text-zinc-500">Corta vídeos no dispositivo ou cria novos vídeos com IA.</p>
            </div>
          </div>

          <div className="grid grid-cols-2 rounded-xl border border-white/10 bg-white/[0.025] p-1 sm:w-auto">
            <button
              onClick={() => setMode("clipper")}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition ${mode === "clipper" ? "bg-[#d2a643] text-black" : "text-zinc-400"}`}
            >
              Clipper
            </button>
            <button
              onClick={() => setMode("generate")}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition ${mode === "generate" ? "bg-[#d2a643] text-black" : "text-zinc-400"}`}
            >
              Gerar vídeo IA
            </button>
          </div>
        </div>

        {mode === "clipper" ? (
          <div className="grid gap-5 lg:grid-cols-[360px_1fr]">
            <Card className="border-white/10 bg-[#0b0b0d] p-4 sm:p-5 space-y-5">
              <div>
                <h3 className="flex items-center gap-2 font-semibold"><Film className="h-4 w-4 text-[#d2a643]" />Clipper local</h3>
                <p className="mt-1 text-xs leading-relaxed text-zinc-500">O vídeo é processado no teu próprio dispositivo com FFmpeg. Não precisa de upload para um servidor.</p>
              </div>

              <div className="space-y-2">
                <Label>Vídeo</Label>
                <Input
                  ref={fileInputRef}
                  type="file"
                  accept="video/*"
                  onChange={(event) => chooseFile(event.target.files?.[0] || null)}
                  className="border-white/10 bg-black/30 file:text-zinc-200"
                />
                {videoFile && <p className="truncate text-xs text-zinc-500">{videoFile.name}</p>}
              </div>

              <div className="space-y-2">
                <Label>Duração</Label>
                <div className="grid grid-cols-3 gap-2">
                  {CLIP_DURATIONS.map((duration) => (
                    <button key={duration} onClick={() => setClipDuration(duration)} className={`rounded-xl border px-3 py-2 text-sm transition ${buttonClass(clipDuration === duration)}`}>
                      {duration}s
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Formato</Label>
                <div className="grid grid-cols-3 gap-2">
                  {(["vertical", "horizontal", "square"] as ClipFormat[]).map((format) => (
                    <button key={format} onClick={() => setClipFormat(format)} className={`rounded-xl border px-2 py-2 text-xs capitalize transition ${buttonClass(clipFormat === format)}`}>
                      {format === "vertical" ? "9:16" : format === "horizontal" ? "16:9" : "1:1"}
                    </button>
                  ))}
                </div>
              </div>

              {clipError && <div className="rounded-xl border border-red-500/25 bg-red-500/10 p-3 text-xs text-red-300">{clipError}</div>}

              <Button
                onClick={processClip}
                disabled={!videoFile || isProcessing}
                className="w-full bg-[#c99d38] text-black hover:bg-[#ddb650]"
              >
                {isProcessing ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />A processar {clipProgress}%</> : <><Scissors className="mr-2 h-4 w-4" />Criar clip</>}
              </Button>
            </Card>

            <Card className="min-h-[360px] border-white/10 bg-[#09090b] p-3 sm:p-5">
              {clipResult ? (
                <div className="space-y-4">
                  <video src={clipResult} controls playsInline className="max-h-[620px] w-full rounded-2xl bg-black object-contain" />
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-sm text-emerald-400"><CheckCircle2 className="h-4 w-4" />Clip pronto no dispositivo</div>
                    <Button onClick={() => download(clipResult, `lumin-clip-${Date.now()}.mp4`)} variant="outline" className="border-[#d2a643]/40 text-[#e5bd58]">
                      <Download className="mr-2 h-4 w-4" />Download MP4
                    </Button>
                  </div>
                </div>
              ) : videoUrl ? (
                <video src={videoUrl} controls playsInline className="max-h-[620px] w-full rounded-2xl bg-black object-contain" />
              ) : (
                <button onClick={() => fileInputRef.current?.click()} className="flex min-h-[330px] w-full flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 text-center transition hover:border-[#d2a643]/40">
                  <Upload className="mb-3 h-9 w-9 text-[#d2a643]" />
                  <span className="font-medium">Escolhe um vídeo</span>
                  <span className="mt-1 text-sm text-zinc-500">MP4, MOV ou WebM</span>
                </button>
              )}
            </Card>
          </div>
        ) : (
          <div className="grid gap-5 lg:grid-cols-[380px_1fr]">
            <Card className="border-white/10 bg-[#0b0b0d] p-4 sm:p-5 space-y-5">
              <div>
                <div className="flex items-center justify-between gap-3">
                  <h3 className="flex items-center gap-2 font-semibold"><Wand2 className="h-4 w-4 text-[#d2a643]" />Gerador de vídeo IA</h3>
                </div>
                <p className="mt-1 text-xs leading-relaxed text-zinc-500">Criação completa com guião, imagens, voz PT-PT, legendas, música e MP4 final.</p>
              </div>

              <div className="space-y-2">
                <Label>Descreve o vídeo</Label>
                <Textarea
                  value={prompt}
                  onChange={(event) => setPrompt(event.target.value)}
                  placeholder="Ex.: plano cinematográfico de um carro desportivo preto a atravessar o Porto à noite, chuva, reflexos dourados, câmara baixa..."
                  className="min-h-[130px] resize-none border-white/10 bg-black/30"
                />
              </div>

              <div className="space-y-2">
                <Label>Duração</Label>
                <div className="grid grid-cols-3 gap-2">
                  {VIDEO_DURATIONS.map((duration) => (
                    <button key={duration} onClick={() => setAiDuration(duration)} className={`rounded-xl border px-3 py-2 text-sm transition ${buttonClass(aiDuration === duration)}`}>
                      {duration} segundos
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Formato</Label>
                <div className="grid grid-cols-3 gap-2">
                  {VIDEO_RATIOS.map((ratio) => (
                    <button key={ratio} onClick={() => setAspectRatio(ratio)} className={`rounded-xl border px-3 py-2 text-sm transition ${buttonClass(aspectRatio === ratio)}`}>
                      {ratio}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Voz PT-PT</Label>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => setVoiceName("pt-PT-RaquelNeural-Female")} className={`rounded-xl border px-3 py-2 text-sm transition ${buttonClass(voiceName.includes("Raquel"))}`}>
                    Raquel
                  </button>
                  <button onClick={() => setVoiceName("pt-PT-DuarteNeural-Male")} className={`rounded-xl border px-3 py-2 text-sm transition ${buttonClass(voiceName.includes("Duarte"))}`}>
                    Duarte
                  </button>
                </div>
              </div>

              {generationError && <div className="rounded-xl border border-red-500/25 bg-red-500/10 p-3 text-xs leading-relaxed text-red-300">{generationError}</div>}

              <Button
                onClick={generateVideo}
                disabled={!prompt.trim() || isGenerating}
                className="w-full bg-[#c99d38] text-black hover:bg-[#ddb650]"
              >
                {isGenerating ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{generationStatus || "A gerar…"}</> : <><Sparkles className="mr-2 h-4 w-4" />Gerar vídeo com IA</>}
              </Button>
            </Card>

            <Card className="min-h-[420px] border-white/10 bg-[#09090b] p-3 sm:p-5">
              {generatedVideo ? (
                <div className="space-y-4">
                  <video src={generatedVideo} controls playsInline className="max-h-[640px] w-full rounded-2xl bg-black object-contain" />
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-sm text-emerald-400"><CheckCircle2 className="h-4 w-4" />Vídeo IA concluído</div>
                    <Button onClick={() => download(generatedVideo, `lumin-ai-video-${Date.now()}.mp4`)} variant="outline" className="border-[#d2a643]/40 text-[#e5bd58]">
                      <Download className="mr-2 h-4 w-4" />Download vídeo
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex min-h-[390px] flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 px-6 text-center">
                  <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-[#d2a643]/25 bg-[#d2a643]/10">
                    <Video className="h-7 w-7 text-[#d2a643]" />
                  </div>
                  <h4 className="font-semibold">Texto → vídeo</h4>
                  <p className="mt-2 max-w-md text-sm leading-relaxed text-zinc-500">Escreve o tema. O Lumin cria o guião, escolhe as imagens, gera voz e legendas e entrega o MP4 aqui.</p>
                  {isGenerating && <div className="mt-5 flex items-center gap-2 text-sm text-[#e5bd58]"><Loader2 className="h-4 w-4 animate-spin" />{generationStatus}</div>}
                </div>
              )}
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
