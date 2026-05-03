"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Slider } from "@/components/ui/slider"
import {
  Scissors, Upload, Sparkles, Download, Play, Pause, Clock, Zap,
  TrendingUp, Instagram, Youtube, Video, Loader2, CheckCircle2,
  Music, Subtitles, Crop, Film, Share2, AlertCircle
} from "lucide-react"

const PLATFORMS = [
  { id: "tiktok", name: "TikTok", ratio: "9:16", duration: "15-60s", color: "#000000", icon: Video },
  { id: "reels", name: "Reels", ratio: "9:16", duration: "15-90s", color: "#E4405F", icon: Instagram },
  { id: "shorts", name: "Shorts", ratio: "9:16", duration: "≤60s", color: "#FF0000", icon: Youtube },
  { id: "story", name: "Story", ratio: "9:16", duration: "15s", color: "#833AB4", icon: Instagram },
]

const FEATURES = [
  { id: "subtitles", label: "Legendas Automáticas", icon: Subtitles, desc: "Gera legendas sincronizadas" },
  { id: "music", label: "Música de Fundo", icon: Music, desc: "Adiciona trilha sonora" },
  { id: "crop", label: "Auto Crop", icon: Crop, desc: "Ajusta ao formato vertical" },
  { id: "highlights", label: "Momentos Virais", icon: TrendingUp, desc: "Detecta os melhores momentos" },
]

type Step = "upload" | "configure" | "processing" | "done"

interface ClipResult {
  id: string
  title: string
  start: string
  end: string
  score: number
  platform: string
  thumbnail: string
}

export function ClipperStudio() {
  const [step, setStep] = useState<Step>("upload")
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [videoTitle, setVideoTitle] = useState("")
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(["tiktok", "reels"])
  const [clipDuration, setClipDuration] = useState([30])
  const [clipCount, setClipCount] = useState([3])
  const [enabledFeatures, setEnabledFeatures] = useState<string[]>(["subtitles", "highlights"])
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [results, setResults] = useState<ClipResult[]>([])
  const [playingId, setPlayingId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setVideoFile(file)
    setVideoUrl(URL.createObjectURL(file))
    setVideoTitle(file.name.replace(/\.[^/.]+$/, ""))
    setStep("configure")
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (!file || !file.type.startsWith("video/")) return
    setVideoFile(file)
    setVideoUrl(URL.createObjectURL(file))
    setVideoTitle(file.name.replace(/\.[^/.]+$/, ""))
    setStep("configure")
  }

  const togglePlatform = (id: string) =>
    setSelectedPlatforms((prev) => prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id])

  const toggleFeature = (id: string) =>
    setEnabledFeatures((prev) => prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id])

  const processVideo = async () => {
    if (!videoFile) return
    setStep("processing")
    setIsProcessing(true)
    setProgress(0)

    // Simulate processing stages with real progress
    const stages = [
      { label: "A analisar video...", target: 20, delay: 600 },
      { label: "A detectar momentos chave...", target: 45, delay: 800 },
      { label: "A gerar clips...", target: 70, delay: 1000 },
      { label: "A adicionar legendas...", target: 85, delay: 700 },
      { label: "A optimizar para plataformas...", target: 100, delay: 600 },
    ]

    for (const stage of stages) {
      await new Promise((res) => setTimeout(res, stage.delay))
      setProgress(stage.target)
    }

    // Generate mock results with Pollinations thumbnails
    const mockClips: ClipResult[] = Array.from({ length: clipCount[0] }, (_, i) => {
      const startSec = Math.floor(Math.random() * 120)
      const endSec = startSec + clipDuration[0]
      const platform = selectedPlatforms[i % selectedPlatforms.length]
      return {
        id: `clip-${i + 1}`,
        title: `${videoTitle} — Clip ${i + 1}`,
        start: `${Math.floor(startSec / 60)}:${String(startSec % 60).padStart(2, "0")}`,
        end: `${Math.floor(endSec / 60)}:${String(endSec % 60).padStart(2, "0")}`,
        score: Math.floor(75 + Math.random() * 25),
        platform,
        thumbnail: `https://image.pollinations.ai/prompt/${encodeURIComponent(
          `${videoTitle} viral clip highlight ${i + 1}, cinematic thumbnail, 9:16 vertical`
        )}?width=270&height=480&nologo=true&seed=${Date.now() + i}`,
      }
    })

    setResults(mockClips)
    setIsProcessing(false)
    setStep("done")
  }

  const reset = () => {
    setStep("upload")
    setVideoFile(null)
    setVideoUrl(null)
    setVideoTitle("")
    setResults([])
    setProgress(0)
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-5xl mx-auto p-4 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
              <Scissors className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h2 className="font-bold text-lg">Clipper AI</h2>
              <p className="text-xs text-muted-foreground">Transforma videos em clips virais para TikTok, Reels e Shorts</p>
            </div>
          </div>
          {step !== "upload" && (
            <Button variant="outline" size="sm" onClick={reset} className="gap-1.5">
              <Upload className="h-3.5 w-3.5" />
              Novo Video
            </Button>
          )}
        </div>

        {/* Step: Upload */}
        {step === "upload" && (
          <Card
            className="border-2 border-dashed border-border hover:border-primary/50 transition-colors cursor-pointer"
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="flex flex-col items-center justify-center py-16 px-4 gap-4 text-center">
              <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Film className="h-10 w-10 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-lg">Arrasta o teu video aqui</p>
                <p className="text-sm text-muted-foreground mt-1">ou clica para selecionar — MP4, MOV, AVI, WebM</p>
              </div>
              <Button className="gap-2 mt-2">
                <Upload className="h-4 w-4" />
                Selecionar Video
              </Button>
              <input ref={fileInputRef} type="file" accept="video/*" className="hidden" onChange={handleFileSelect} />
            </div>
          </Card>
        )}

        {/* Step: Configure */}
        {step === "configure" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Left: Video preview */}
            <Card className="p-4 space-y-3">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <Video className="h-4 w-4 text-primary" />
                Video Selecionado
              </h3>
              {videoUrl && (
                <video src={videoUrl} controls className="w-full rounded-lg aspect-video bg-black" />
              )}
              <div>
                <Label className="text-xs text-muted-foreground">Titulo</Label>
                <Input
                  value={videoTitle}
                  onChange={(e) => setVideoTitle(e.target.value)}
                  className="mt-1 text-sm h-9"
                />
              </div>
            </Card>

            {/* Right: Settings */}
            <div className="space-y-4">
              {/* Platforms */}
              <Card className="p-4 space-y-3">
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  <Share2 className="h-4 w-4 text-primary" />
                  Plataformas
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  {PLATFORMS.map(({ id, name, ratio, duration, color, icon: Icon }) => (
                    <button
                      key={id}
                      onClick={() => togglePlatform(id)}
                      className={`flex items-center gap-2 p-3 rounded-xl border-2 transition-all text-left ${
                        selectedPlatforms.includes(id)
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/40"
                      }`}
                    >
                      <Icon className="h-5 w-5 shrink-0" style={{ color }} />
                      <div>
                        <p className="text-xs font-semibold">{name}</p>
                        <p className="text-[10px] text-muted-foreground">{ratio} • {duration}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </Card>

              {/* Clip settings */}
              <Card className="p-4 space-y-4">
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary" />
                  Configuracoes
                </h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Duracao por clip</Label>
                    <span className="text-xs font-medium text-primary">{clipDuration[0]}s</span>
                  </div>
                  <Slider value={clipDuration} onValueChange={setClipDuration} min={15} max={90} step={5} />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Numero de clips</Label>
                    <span className="text-xs font-medium text-primary">{clipCount[0]}</span>
                  </div>
                  <Slider value={clipCount} onValueChange={setClipCount} min={1} max={10} step={1} />
                </div>
              </Card>

              {/* Features */}
              <Card className="p-4 space-y-3">
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  <Zap className="h-4 w-4 text-primary" />
                  Funcionalidades IA
                </h3>
                <div className="space-y-2">
                  {FEATURES.map(({ id, label, icon: Icon, desc }) => (
                    <button
                      key={id}
                      onClick={() => toggleFeature(id)}
                      className={`w-full flex items-center gap-3 p-2.5 rounded-lg border transition-all text-left ${
                        enabledFeatures.includes(id)
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/30"
                      }`}
                    >
                      <Icon className={`h-4 w-4 shrink-0 ${enabledFeatures.includes(id) ? "text-primary" : "text-muted-foreground"}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium">{label}</p>
                        <p className="text-[10px] text-muted-foreground">{desc}</p>
                      </div>
                      <div className={`w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center ${enabledFeatures.includes(id) ? "border-primary bg-primary" : "border-muted-foreground"}`}>
                        {enabledFeatures.includes(id) && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </div>
                    </button>
                  ))}
                </div>
              </Card>

              <Button onClick={processVideo} className="w-full h-11 gap-2" disabled={selectedPlatforms.length === 0}>
                <Sparkles className="h-4 w-4" />
                Gerar {clipCount[0]} Clip{clipCount[0] > 1 ? "s" : ""}
              </Button>
            </div>
          </div>
        )}

        {/* Step: Processing */}
        {step === "processing" && (
          <Card className="p-8">
            <div className="flex flex-col items-center gap-6 text-center">
              <div className="relative">
                <div className="w-20 h-20 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
                <Scissors className="h-8 w-8 text-primary absolute inset-0 m-auto" />
              </div>
              <div>
                <p className="font-semibold text-lg">A processar video...</p>
                <p className="text-sm text-muted-foreground mt-1">Isto pode demorar alguns segundos</p>
              </div>
              <div className="w-full max-w-sm space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Progresso</span>
                  <span className="font-medium text-primary">{progress}%</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all duration-500"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Step: Done */}
        {step === "done" && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              <p className="font-semibold">{results.length} clip{results.length > 1 ? "s" : ""} gerado{results.length > 1 ? "s" : ""} com sucesso</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {results.map((clip) => (
                <Card key={clip.id} className="overflow-hidden group">
                  <div className="relative aspect-[9/16] bg-muted max-h-48 overflow-hidden">
                    <img
                      src={clip.thumbnail}
                      alt={clip.title}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = `https://picsum.photos/seed/${clip.id}/270/480`
                      }}
                    />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center"
                        onClick={() => setPlayingId(playingId === clip.id ? null : clip.id)}
                      >
                        {playingId === clip.id ? <Pause className="h-5 w-5 text-white" /> : <Play className="h-5 w-5 text-white ml-0.5" />}
                      </button>
                    </div>
                    <div className="absolute top-2 right-2">
                      <Badge className="text-[10px] bg-green-500 text-white border-0">
                        {clip.score}% viral
                      </Badge>
                    </div>
                    <div className="absolute bottom-2 left-2">
                      <Badge variant="secondary" className="text-[10px]">
                        {clip.start} — {clip.end}
                      </Badge>
                    </div>
                  </div>
                  <div className="p-3 space-y-2">
                    <p className="text-xs font-medium truncate">{clip.title}</p>
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className="text-[10px] capitalize">{clip.platform}</Badge>
                      <Button size="sm" variant="outline" className="h-7 text-xs gap-1">
                        <Download className="h-3 w-3" />
                        Download
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            <Card className="p-4 border-amber-500/30 bg-amber-500/5">
              <div className="flex gap-3">
                <AlertCircle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                <div className="text-xs text-muted-foreground">
                  <p className="font-medium text-foreground mb-1">Modo Demonstracao</p>
                  <p>Os clips mostrados sao pre-visualizacoes geradas por IA. Para processamento real de video com download, configura o servidor de processamento em <code className="bg-muted px-1 rounded">/api/clipper</code>.</p>
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
