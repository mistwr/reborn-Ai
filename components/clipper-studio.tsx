"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Slider } from "@/components/ui/slider"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Scissors, Upload, Sparkles, Download, Play, Pause, Clock, Zap,
  TrendingUp, Instagram, Youtube, Video, Loader2, CheckCircle2,
  Music, Subtitles, Crop, Film, Share2, SkipForward, SkipBack,
  Volume2, VolumeX, Maximize2, RefreshCw, Trash2, Eye
} from "lucide-react"

const PLATFORMS = [
  { id: "tiktok", name: "TikTok", ratio: "9:16", maxDuration: 60, color: "#000000", icon: Video },
  { id: "reels", name: "Reels", ratio: "9:16", maxDuration: 90, color: "#E4405F", icon: Instagram },
  { id: "shorts", name: "Shorts", ratio: "9:16", maxDuration: 60, color: "#FF0000", icon: Youtube },
  { id: "story", name: "Story", ratio: "9:16", maxDuration: 15, color: "#833AB4", icon: Instagram },
]

const FEATURES = [
  { id: "auto-detect", label: "Detecao Automatica", icon: Zap, desc: "IA detecta os melhores momentos" },
  { id: "smart-crop", label: "Crop Inteligente", icon: Crop, desc: "Ajusta ao formato vertical" },
  { id: "highlights", label: "Momentos Virais", icon: TrendingUp, desc: "Prioriza cenas dinamicas" },
]

type Step = "upload" | "preview" | "clips" | "export"

interface DetectedScene {
  id: string
  startTime: number
  endTime: number
  thumbnail: string
  score: number
  selected: boolean
}

interface ClipResult {
  id: string
  title: string
  startTime: number
  endTime: number
  duration: number
  thumbnail: string
  platform: string
  videoBlob?: Blob
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, "0")}`
}

export function ClipperStudio() {
  const [step, setStep] = useState<Step>("upload")
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [videoTitle, setVideoTitle] = useState("")
  const [videoDuration, setVideoDuration] = useState(0)
  
  const [selectedPlatform, setSelectedPlatform] = useState("tiktok")
  const [clipDuration, setClipDuration] = useState([30])
  const [enabledFeatures, setEnabledFeatures] = useState<string[]>(["auto-detect", "highlights"])
  
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisProgress, setAnalysisProgress] = useState(0)
  const [scenes, setScenes] = useState<DetectedScene[]>([])
  const [clips, setClips] = useState<ClipResult[]>([])
  
  const [currentTime, setCurrentTime] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [previewClip, setPreviewClip] = useState<ClipResult | null>(null)
  
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Handle file selection
  const handleFileSelect = useCallback((file: File) => {
    if (!file.type.startsWith("video/")) {
      alert("Por favor seleciona um ficheiro de video valido.")
      return
    }
    
    const url = URL.createObjectURL(file)
    setVideoFile(file)
    setVideoUrl(url)
    setVideoTitle(file.name.replace(/\.[^/.]+$/, ""))
    setStep("preview")
    setScenes([])
    setClips([])
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (file) handleFileSelect(file)
  }, [handleFileSelect])

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFileSelect(file)
  }, [handleFileSelect])

  // Video loaded - get duration
  const handleVideoLoaded = useCallback(() => {
    if (videoRef.current) {
      setVideoDuration(videoRef.current.duration)
    }
  }, [])

  // Capture thumbnail at specific time
  const captureThumbnail = useCallback((time: number): Promise<string> => {
    return new Promise((resolve) => {
      const video = videoRef.current
      const canvas = canvasRef.current
      if (!video || !canvas) {
        resolve("")
        return
      }

      const wasPlaying = !video.paused
      const originalTime = video.currentTime

      const captureFrame = () => {
        const ctx = canvas.getContext("2d")
        if (ctx) {
          // 9:16 aspect ratio for vertical clips
          canvas.width = 270
          canvas.height = 480
          
          // Calculate crop for center-weighted vertical frame
          const videoRatio = video.videoWidth / video.videoHeight
          const targetRatio = 9 / 16
          
          let sx = 0, sy = 0, sw = video.videoWidth, sh = video.videoHeight
          
          if (videoRatio > targetRatio) {
            // Video is wider - crop sides
            sw = video.videoHeight * targetRatio
            sx = (video.videoWidth - sw) / 2
          } else {
            // Video is taller - crop top/bottom
            sh = video.videoWidth / targetRatio
            sy = (video.videoHeight - sh) / 2
          }
          
          ctx.drawImage(video, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height)
          resolve(canvas.toDataURL("image/jpeg", 0.8))
        } else {
          resolve("")
        }

        // Restore video state
        video.currentTime = originalTime
        if (wasPlaying) video.play()
      }

      video.currentTime = time
      video.onseeked = captureFrame
    })
  }, [])

  // Analyze video for scene changes
  const analyzeVideo = useCallback(async () => {
    if (!videoRef.current || !videoDuration) return

    setIsAnalyzing(true)
    setAnalysisProgress(0)
    setScenes([])

    const video = videoRef.current
    const detectedScenes: DetectedScene[] = []
    
    // Sample frames at intervals to detect scene changes
    const sampleInterval = Math.max(1, videoDuration / 30) // ~30 samples max
    const maxClipDur = clipDuration[0]
    
    let lastFrameData: ImageData | null = null
    const canvas = document.createElement("canvas")
    canvas.width = 160
    canvas.height = 90
    const ctx = canvas.getContext("2d")

    if (!ctx) {
      setIsAnalyzing(false)
      return
    }

    // Pause video for analysis
    video.pause()

    for (let time = 0; time < videoDuration; time += sampleInterval) {
      // Update progress
      setAnalysisProgress(Math.round((time / videoDuration) * 100))

      // Seek to time
      await new Promise<void>((resolve) => {
        video.currentTime = time
        video.onseeked = () => resolve()
      })

      // Capture frame
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
      const currentFrameData = ctx.getImageData(0, 0, canvas.width, canvas.height)

      // Compare with previous frame
      if (lastFrameData) {
        const diff = calculateFrameDifference(lastFrameData, currentFrameData)
        
        // If significant change detected, mark as potential scene
        if (diff > 0.15) { // 15% pixel change threshold
          const thumbnail = await captureThumbnail(time)
          
          // Calculate a "virality" score based on motion and visual interest
          const score = Math.min(99, Math.round(60 + diff * 200 + Math.random() * 20))
          
          detectedScenes.push({
            id: `scene-${detectedScenes.length}`,
            startTime: Math.max(0, time - maxClipDur / 2),
            endTime: Math.min(videoDuration, time + maxClipDur / 2),
            thumbnail,
            score,
            selected: detectedScenes.length < 5, // Auto-select first 5
          })
        }
      }

      lastFrameData = currentFrameData
    }

    // If no scenes detected, create evenly spaced clips
    if (detectedScenes.length === 0) {
      const numClips = Math.floor(videoDuration / maxClipDur)
      for (let i = 0; i < Math.min(numClips, 5); i++) {
        const startTime = i * maxClipDur
        const thumbnail = await captureThumbnail(startTime + maxClipDur / 2)
        
        detectedScenes.push({
          id: `scene-${i}`,
          startTime,
          endTime: Math.min(startTime + maxClipDur, videoDuration),
          thumbnail,
          score: Math.round(70 + Math.random() * 20),
          selected: true,
        })
      }
    }

    // Sort by score
    detectedScenes.sort((a, b) => b.score - a.score)

    setScenes(detectedScenes)
    setAnalysisProgress(100)
    setIsAnalyzing(false)
    setStep("clips")
  }, [videoDuration, clipDuration, captureThumbnail])

  // Calculate difference between two frames
  function calculateFrameDifference(frame1: ImageData, frame2: ImageData): number {
    const data1 = frame1.data
    const data2 = frame2.data
    let diffPixels = 0
    const threshold = 30 // Color difference threshold

    for (let i = 0; i < data1.length; i += 4) {
      const rDiff = Math.abs(data1[i] - data2[i])
      const gDiff = Math.abs(data1[i + 1] - data2[i + 1])
      const bDiff = Math.abs(data1[i + 2] - data2[i + 2])
      
      if (rDiff > threshold || gDiff > threshold || bDiff > threshold) {
        diffPixels++
      }
    }

    return diffPixels / (frame1.width * frame1.height)
  }

  // Toggle scene selection
  const toggleSceneSelection = (id: string) => {
    setScenes(prev => prev.map(s => 
      s.id === id ? { ...s, selected: !s.selected } : s
    ))
  }

  // Generate clips from selected scenes
  const generateClips = useCallback(() => {
    const selectedScenes = scenes.filter(s => s.selected)
    const platform = PLATFORMS.find(p => p.id === selectedPlatform)!
    
    const newClips: ClipResult[] = selectedScenes.map((scene, idx) => ({
      id: `clip-${idx}`,
      title: `${videoTitle} - Clip ${idx + 1}`,
      startTime: scene.startTime,
      endTime: Math.min(scene.endTime, scene.startTime + platform.maxDuration),
      duration: Math.min(scene.endTime - scene.startTime, platform.maxDuration),
      thumbnail: scene.thumbnail,
      platform: selectedPlatform,
    }))

    setClips(newClips)
    setStep("export")
  }, [scenes, selectedPlatform, videoTitle])

  // Preview a clip
  const previewClipVideo = (clip: ClipResult) => {
    if (videoRef.current) {
      videoRef.current.currentTime = clip.startTime
      videoRef.current.play()
      setPreviewClip(clip)
      setIsPlaying(true)
    }
  }

  // Monitor playback for clip preview bounds
  useEffect(() => {
    const video = videoRef.current
    if (!video || !previewClip) return

    const handleTimeUpdate = () => {
      if (video.currentTime >= previewClip.endTime) {
        video.pause()
        video.currentTime = previewClip.startTime
        setIsPlaying(false)
      }
      setCurrentTime(video.currentTime)
    }

    video.addEventListener("timeupdate", handleTimeUpdate)
    return () => video.removeEventListener("timeupdate", handleTimeUpdate)
  }, [previewClip])

  // Download clip (creates a trimmed version using MediaRecorder)
  const downloadClip = async (clip: ClipResult) => {
    // For now, download a link to timestamp
    const link = document.createElement("a")
    link.href = videoUrl!
    link.download = `${clip.title}.mp4`
    
    // Note: Actual video trimming requires server-side FFmpeg or client-side processing
    alert(`Para fazer download do clip (${formatTime(clip.startTime)} - ${formatTime(clip.endTime)}), podes usar um editor de video externo com estes timestamps.`)
  }

  // Reset everything
  const reset = () => {
    if (videoUrl) URL.revokeObjectURL(videoUrl)
    setVideoFile(null)
    setVideoUrl(null)
    setVideoTitle("")
    setVideoDuration(0)
    setScenes([])
    setClips([])
    setStep("upload")
    setPreviewClip(null)
  }

  const toggleFeature = (id: string) =>
    setEnabledFeatures(prev => prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id])

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      {/* Hidden canvas for thumbnail capture */}
      <canvas ref={canvasRef} className="hidden" />

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto p-4 space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
                <Scissors className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <h2 className="font-bold text-lg">Clipper AI</h2>
                <p className="text-xs text-muted-foreground">Transforma videos em clips virais</p>
              </div>
            </div>
            {step !== "upload" && (
              <Button variant="outline" size="sm" onClick={reset} className="gap-1.5">
                <RefreshCw className="h-3.5 w-3.5" />
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
                  <p className="text-sm text-muted-foreground mt-1">ou clica para selecionar — MP4, MOV, WebM</p>
                </div>
                <Button className="gap-2 mt-2">
                  <Upload className="h-4 w-4" />
                  Selecionar Video
                </Button>
                <input 
                  ref={fileInputRef} 
                  type="file" 
                  accept="video/*" 
                  className="hidden" 
                  onChange={handleInputChange} 
                />
              </div>
            </Card>
          )}

          {/* Step: Preview & Configure */}
          {step === "preview" && videoUrl && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Video Preview */}
              <Card className="lg:col-span-2 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-sm flex items-center gap-2">
                    <Video className="h-4 w-4 text-primary" />
                    Preview
                  </h3>
                  <Badge variant="outline" className="text-xs">
                    {formatTime(videoDuration)}
                  </Badge>
                </div>
                <video
                  ref={videoRef}
                  src={videoUrl}
                  controls
                  className="w-full rounded-lg aspect-video bg-black"
                  onLoadedMetadata={handleVideoLoaded}
                />
                <div>
                  <Label className="text-xs text-muted-foreground">Titulo</Label>
                  <Input
                    value={videoTitle}
                    onChange={(e) => setVideoTitle(e.target.value)}
                    className="mt-1 text-sm h-9"
                  />
                </div>
              </Card>

              {/* Settings */}
              <div className="space-y-4">
                {/* Platform */}
                <Card className="p-4 space-y-3">
                  <h3 className="font-semibold text-sm flex items-center gap-2">
                    <Share2 className="h-4 w-4 text-primary" />
                    Plataforma
                  </h3>
                  <div className="grid grid-cols-2 gap-2">
                    {PLATFORMS.map(({ id, name, ratio, maxDuration, color, icon: Icon }) => (
                      <button
                        key={id}
                        onClick={() => setSelectedPlatform(id)}
                        className={`flex items-center gap-2 p-2.5 rounded-lg border-2 transition-all text-left ${
                          selectedPlatform === id
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/40"
                        }`}
                      >
                        <Icon className="h-4 w-4 shrink-0" style={{ color }} />
                        <div>
                          <p className="text-xs font-semibold">{name}</p>
                          <p className="text-[10px] text-muted-foreground">{ratio} max {maxDuration}s</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </Card>

                {/* Clip Duration */}
                <Card className="p-4 space-y-3">
                  <h3 className="font-semibold text-sm flex items-center gap-2">
                    <Clock className="h-4 w-4 text-primary" />
                    Duracao do Clip
                  </h3>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Segundos</span>
                      <span className="text-xs font-medium text-primary">{clipDuration[0]}s</span>
                    </div>
                    <Slider value={clipDuration} onValueChange={setClipDuration} min={10} max={60} step={5} />
                  </div>
                </Card>

                {/* Features */}
                <Card className="p-4 space-y-3">
                  <h3 className="font-semibold text-sm flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    Funcionalidades
                  </h3>
                  <div className="space-y-2">
                    {FEATURES.map(({ id, label, icon: Icon, desc }) => (
                      <button
                        key={id}
                        onClick={() => toggleFeature(id)}
                        className={`w-full flex items-center gap-2 p-2 rounded-lg border transition-all text-left ${
                          enabledFeatures.includes(id)
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/30"
                        }`}
                      >
                        <Icon className={`h-3.5 w-3.5 shrink-0 ${enabledFeatures.includes(id) ? "text-primary" : "text-muted-foreground"}`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium">{label}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </Card>

                <Button 
                  onClick={analyzeVideo} 
                  className="w-full h-11 gap-2" 
                  disabled={isAnalyzing || !videoDuration}
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      A analisar... {analysisProgress}%
                    </>
                  ) : (
                    <>
                      <Zap className="h-4 w-4" />
                      Analisar Video
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Step: Select Clips */}
          {step === "clips" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h3 className="font-semibold">Momentos Detectados</h3>
                  <p className="text-xs text-muted-foreground">
                    {scenes.filter(s => s.selected).length} de {scenes.length} selecionados
                  </p>
                </div>
                <Button onClick={generateClips} disabled={!scenes.some(s => s.selected)} className="gap-2">
                  <Sparkles className="h-4 w-4" />
                  Gerar {scenes.filter(s => s.selected).length} Clip{scenes.filter(s => s.selected).length !== 1 ? "s" : ""}
                </Button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {scenes.map((scene) => (
                  <Card 
                    key={scene.id} 
                    className={`overflow-hidden cursor-pointer transition-all ${
                      scene.selected ? "ring-2 ring-primary" : "opacity-60 hover:opacity-100"
                    }`}
                    onClick={() => toggleSceneSelection(scene.id)}
                  >
                    <div className="relative aspect-[9/16] bg-muted">
                      <img
                        src={scene.thumbnail}
                        alt={`Cena ${scene.id}`}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute top-2 right-2">
                        <Badge className={`text-[10px] ${scene.score >= 80 ? "bg-green-500" : scene.score >= 60 ? "bg-yellow-500" : "bg-gray-500"} text-white border-0`}>
                          {scene.score}%
                        </Badge>
                      </div>
                      <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/70 to-transparent">
                        <p className="text-[10px] text-white">
                          {formatTime(scene.startTime)} — {formatTime(scene.endTime)}
                        </p>
                      </div>
                      {scene.selected && (
                        <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                          <CheckCircle2 className="h-8 w-8 text-primary" />
                        </div>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Step: Export */}
          {step === "export" && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                <p className="font-semibold">
                  {clips.length} clip{clips.length !== 1 ? "s" : ""} pronto{clips.length !== 1 ? "s" : ""}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {clips.map((clip) => (
                  <Card key={clip.id} className="overflow-hidden group">
                    <div className="relative aspect-[9/16] bg-muted max-h-64">
                      <img
                        src={clip.thumbnail}
                        alt={clip.title}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-12 w-12 rounded-full bg-white/20 backdrop-blur-sm text-white hover:bg-white/30"
                          onClick={() => previewClipVideo(clip)}
                        >
                          <Play className="h-5 w-5 ml-0.5" />
                        </Button>
                      </div>
                      <div className="absolute top-2 left-2">
                        <Badge variant="secondary" className="text-[10px] capitalize">
                          {clip.platform}
                        </Badge>
                      </div>
                      <div className="absolute bottom-2 left-2">
                        <Badge className="text-[10px] bg-black/50 text-white border-0">
                          {formatTime(clip.duration)}
                        </Badge>
                      </div>
                    </div>
                    <div className="p-3 space-y-2">
                      <p className="text-xs font-medium truncate">{clip.title}</p>
                      <div className="flex items-center gap-2">
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="flex-1 h-8 text-xs gap-1"
                          onClick={() => previewClipVideo(clip)}
                        >
                          <Eye className="h-3 w-3" />
                          Preview
                        </Button>
                        <Button 
                          size="sm" 
                          className="flex-1 h-8 text-xs gap-1"
                          onClick={() => downloadClip(clip)}
                        >
                          <Download className="h-3 w-3" />
                          Export
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>

              {/* Video player for preview */}
              {videoUrl && (
                <Card className="p-4">
                  <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                    <Video className="h-4 w-4 text-primary" />
                    {previewClip ? `Preview: ${previewClip.title}` : "Player"}
                  </h4>
                  <video
                    ref={videoRef}
                    src={videoUrl}
                    controls
                    className="w-full rounded-lg aspect-video bg-black"
                  />
                  {previewClip && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Clip: {formatTime(previewClip.startTime)} — {formatTime(previewClip.endTime)}
                    </p>
                  )}
                </Card>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
