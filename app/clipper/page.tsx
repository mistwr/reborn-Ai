/**
 * REBORN AI CLIPPER - Módulo estilo Opus Clip
 *
 * Este módulo permite ao utilizador:
 * 1. Carregar um vídeo longo
 * 2. Transcrever automaticamente com AssemblyAI
 * 3. Gerar clipes curtos otimizados para TikTok/Reels/Shorts
 * 4. Adicionar legendas automáticas
 *
 * ARQUITETURA:
 * - Frontend: Next.js (esta página)
 * - Transcrição: AssemblyAI API (free tier)
 * - Processamento: Cloudflare Worker com FFmpeg WASM
 *
 * NOTA: Este módulo é completamente isolado e não modifica
 * nenhuma funcionalidade existente do Reborn AI.
 */

"use client"

import type React from "react"

import { useState, useRef, useCallback } from "react"
import Link from "next/link"
import {
  ArrowLeft,
  Upload,
  Scissors,
  Play,
  Download,
  Loader2,
  Video,
  FileText,
  Sparkles,
  Clock,
  AlertCircle,
  Trash2,
  Share2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Slider } from "@/components/ui/slider"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

// ============================================
// TIPOS E INTERFACES
// ============================================

/** Representa um clip gerado */
interface GeneratedClip {
  id: string
  url: string
  thumbnail: string
  duration: number
  startTime: number
  endTime: number
  transcript: string
  viralScore: number
  title: string
  hashtags: string[]
}

/** Resultado da transcrição */
interface TranscriptWord {
  text: string
  start: number
  end: number
  confidence: number
}

/** Estado do processamento */
type ProcessingStep =
  | "idle"
  | "uploading"
  | "transcribing"
  | "analyzing"
  | "cutting"
  | "formatting"
  | "complete"
  | "error"

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export default function ClipperPage() {
  // Estados do vídeo
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [videoPreview, setVideoPreview] = useState<string>("")
  const [videoDuration, setVideoDuration] = useState<number>(0)

  // Estados do processamento
  const [processingStep, setProcessingStep] = useState<ProcessingStep>("idle")
  const [progress, setProgress] = useState<number>(0)
  const [errorMessage, setErrorMessage] = useState<string>("")

  // Estados da transcrição
  const [transcript, setTranscript] = useState<TranscriptWord[]>([])
  const [fullTranscript, setFullTranscript] = useState<string>("")

  // Estados dos clipes gerados
  const [clips, setClips] = useState<GeneratedClip[]>([])
  const [selectedClip, setSelectedClip] = useState<GeneratedClip | null>(null)

  // Configurações do utilizador
  const [clipDuration, setClipDuration] = useState<[number, number]>([15, 45])
  const [numClips, setNumClips] = useState<number>(5)
  const [addSubtitles, setAddSubtitles] = useState<boolean>(true)
  const [format916, setFormat916] = useState<boolean>(true)

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)

  // ============================================
  // HANDLERS DE UPLOAD
  // ============================================

  /**
   * Processa o ficheiro de vídeo selecionado
   * Valida tipo e tamanho antes de aceitar
   */
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validar tipo de ficheiro
    const validTypes = ["video/mp4", "video/webm", "video/quicktime", "video/mov"]
    if (!validTypes.includes(file.type) && !file.name.match(/\.(mp4|webm|mov)$/i)) {
      setErrorMessage("Formato não suportado. Use MP4, WebM ou MOV.")
      return
    }

    // Validar tamanho (máximo 500MB para free tier)
    const maxSize = 500 * 1024 * 1024
    if (file.size > maxSize) {
      setErrorMessage("Ficheiro muito grande. Máximo 500MB.")
      return
    }

    setVideoFile(file)
    setVideoPreview(URL.createObjectURL(file))
    setErrorMessage("")
    setProcessingStep("idle")
    setClips([])
    setTranscript([])
  }, [])

  /**
   * Handler para drag and drop
   */
  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      const file = e.dataTransfer.files[0]
      if (file) {
        const input = fileInputRef.current
        if (input) {
          const dt = new DataTransfer()
          dt.items.add(file)
          input.files = dt.files
          handleFileSelect({ target: input } as React.ChangeEvent<HTMLInputElement>)
        }
      }
    },
    [handleFileSelect],
  )

  /**
   * Obtém a duração do vídeo quando carregado
   */
  const handleVideoLoaded = useCallback(() => {
    if (videoRef.current) {
      setVideoDuration(videoRef.current.duration)
    }
  }, [])

  // ============================================
  // PROCESSAMENTO PRINCIPAL
  // ============================================

  /**
   * Inicia o processamento completo do vídeo
   * 1. Upload
   * 2. Transcrição com AssemblyAI
   * 3. Análise de momentos virais
   * 4. Corte dos clipes
   * 5. Formatação final
   */
  const startProcessing = async () => {
    if (!videoFile) return

    setProcessingStep("uploading")
    setProgress(0)
    setErrorMessage("")

    try {
      // PASSO 1: Upload do vídeo
      setProgress(10)
      const formData = new FormData()
      formData.append("video", videoFile)
      formData.append("duration", videoDuration.toString())

      // PASSO 2: Transcrição
      setProcessingStep("transcribing")
      setProgress(20)

      const transcribeRes = await fetch("/api/clipper/transcribe", {
        method: "POST",
        body: formData,
      })

      if (!transcribeRes.ok) {
        const error = await transcribeRes.text()
        throw new Error(error || "Erro na transcrição")
      }

      const transcriptData = await transcribeRes.json()
      setTranscript(transcriptData.words || [])
      setFullTranscript(transcriptData.text || "")
      setProgress(40)

      // PASSO 3: Análise de momentos virais
      setProcessingStep("analyzing")
      setProgress(50)

      const analyzeRes = await fetch("/api/clipper/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcript: transcriptData,
          minDuration: clipDuration[0],
          maxDuration: clipDuration[1],
          numClips: numClips,
        }),
      })

      if (!analyzeRes.ok) {
        throw new Error("Erro na análise")
      }

      const moments = await analyzeRes.json()
      setProgress(60)

      // PASSO 4: Corte dos clipes
      setProcessingStep("cutting")
      setProgress(70)

      const processRes = await fetch("/api/clipper/process", {
        method: "POST",
        body: formData,
        headers: {
          "X-Moments": JSON.stringify(moments.moments),
          "X-Add-Subtitles": addSubtitles.toString(),
          "X-Format-916": format916.toString(),
        },
      })

      if (!processRes.ok) {
        throw new Error("Erro no processamento")
      }

      // PASSO 5: Formatação final
      setProcessingStep("formatting")
      setProgress(90)

      const result = await processRes.json()
      setClips(result.clips || [])

      setProcessingStep("complete")
      setProgress(100)
    } catch (error) {
      setProcessingStep("error")
      setErrorMessage(error instanceof Error ? error.message : "Erro desconhecido")
    }
  }

  /**
   * Reseta todo o estado
   */
  const resetAll = () => {
    setVideoFile(null)
    setVideoPreview("")
    setVideoDuration(0)
    setProcessingStep("idle")
    setProgress(0)
    setErrorMessage("")
    setTranscript([])
    setFullTranscript("")
    setClips([])
    setSelectedClip(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  // ============================================
  // FORMATADORES
  // ============================================

  /** Formata segundos para mm:ss */
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  /** Formata bytes para tamanho legível */
  const formatSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  /** Retorna cor baseada no score viral */
  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-500"
    if (score >= 60) return "text-yellow-500"
    return "text-orange-500"
  }

  /** Retorna label do passo atual */
  const getStepLabel = () => {
    switch (processingStep) {
      case "uploading":
        return "A enviar vídeo..."
      case "transcribing":
        return "A transcrever áudio..."
      case "analyzing":
        return "A analisar momentos virais..."
      case "cutting":
        return "A cortar clipes..."
      case "formatting":
        return "A formatar para 9:16..."
      case "complete":
        return "Concluído!"
      case "error":
        return "Erro no processamento"
      default:
        return "Pronto para processar"
    }
  }

  // ============================================
  // RENDER
  // ============================================

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="sm" className="gap-2">
                <ArrowLeft className="w-4 h-4" />
                Voltar
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                <Scissors className="w-4 h-4 text-white" />
              </div>
              <span className="font-semibold text-lg">Clipper AI</span>
              <Badge variant="secondary" className="text-xs">
                Beta
              </Badge>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Sparkles className="w-4 h-4" />
            Estilo Opus Clip
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Coluna esquerda - Upload e Configurações */}
          <div className="lg:col-span-1 space-y-6">
            {/* Upload Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="w-5 h-5" />
                  Upload de Vídeo
                </CardTitle>
                <CardDescription>Carrega um vídeo longo para gerar clipes curtos automaticamente</CardDescription>
              </CardHeader>
              <CardContent>
                {!videoFile ? (
                  <div
                    className="border-2 border-dashed border-border rounded-xl p-8 text-center hover:border-primary/50 hover:bg-accent/50 transition-all cursor-pointer"
                    onDrop={handleDrop}
                    onDragOver={(e) => e.preventDefault()}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Video className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="font-medium mb-1">Arrasta um vídeo ou clica aqui</p>
                    <p className="text-sm text-muted-foreground">MP4, WebM ou MOV até 500MB</p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Preview do vídeo */}
                    <div className="relative rounded-lg overflow-hidden bg-black aspect-video">
                      <video
                        ref={videoRef}
                        src={videoPreview}
                        className="w-full h-full object-contain"
                        controls
                        onLoadedMetadata={handleVideoLoaded}
                      />
                    </div>

                    {/* Info do ficheiro */}
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground truncate max-w-[200px]">{videoFile.name}</span>
                      <div className="flex items-center gap-3 text-muted-foreground">
                        <span>{formatSize(videoFile.size)}</span>
                        {videoDuration > 0 && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatTime(videoDuration)}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Botão remover */}
                    <Button variant="outline" size="sm" onClick={resetAll} className="w-full bg-transparent">
                      <Trash2 className="w-4 h-4 mr-2" />
                      Remover vídeo
                    </Button>
                  </div>
                )}

                {/* Erro */}
                {errorMessage && (
                  <div className="mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg flex items-center gap-2 text-destructive text-sm">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    {errorMessage}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Configurações */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Configurações</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Duração dos clipes */}
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span>Duração dos clipes</span>
                    <span className="text-muted-foreground">
                      {clipDuration[0]}s - {clipDuration[1]}s
                    </span>
                  </div>
                  <Slider
                    value={clipDuration}
                    min={10}
                    max={60}
                    step={5}
                    onValueChange={(v) => setClipDuration(v as [number, number])}
                    disabled={processingStep !== "idle"}
                  />
                </div>

                {/* Número de clipes */}
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span>Número de clipes</span>
                    <span className="text-muted-foreground">{numClips}</span>
                  </div>
                  <Slider
                    value={[numClips]}
                    min={1}
                    max={10}
                    step={1}
                    onValueChange={(v) => setNumClips(v[0])}
                    disabled={processingStep !== "idle"}
                  />
                </div>

                {/* Opções */}
                <div className="space-y-3">
                  <label className="flex items-center justify-between">
                    <span className="text-sm">Adicionar legendas</span>
                    <input
                      type="checkbox"
                      checked={addSubtitles}
                      onChange={(e) => setAddSubtitles(e.target.checked)}
                      disabled={processingStep !== "idle"}
                      className="w-4 h-4 rounded"
                    />
                  </label>
                  <label className="flex items-center justify-between">
                    <span className="text-sm">Formato 9:16 (vertical)</span>
                    <input
                      type="checkbox"
                      checked={format916}
                      onChange={(e) => setFormat916(e.target.checked)}
                      disabled={processingStep !== "idle"}
                      className="w-4 h-4 rounded"
                    />
                  </label>
                </div>
              </CardContent>
            </Card>

            {/* Botão de Processar */}
            <Button
              onClick={startProcessing}
              disabled={
                !videoFile || (processingStep !== "idle" && processingStep !== "complete" && processingStep !== "error")
              }
              className="w-full h-12 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
              size="lg"
            >
              {processingStep === "idle" || processingStep === "complete" || processingStep === "error" ? (
                <>
                  <Sparkles className="w-5 h-5 mr-2" />
                  Gerar Clipes Automáticos
                </>
              ) : (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  {getStepLabel()}
                </>
              )}
            </Button>

            {/* Progresso */}
            {processingStep !== "idle" && processingStep !== "complete" && processingStep !== "error" && (
              <div className="space-y-2">
                <Progress value={progress} className="h-2" />
                <p className="text-xs text-center text-muted-foreground">{getStepLabel()}</p>
              </div>
            )}
          </div>

          {/* Coluna direita - Resultados */}
          <div className="lg:col-span-2">
            <Tabs defaultValue="clips" className="w-full">
              <TabsList className="w-full justify-start">
                <TabsTrigger value="clips" className="gap-2">
                  <Scissors className="w-4 h-4" />
                  Clipes ({clips.length})
                </TabsTrigger>
                <TabsTrigger value="transcript" className="gap-2">
                  <FileText className="w-4 h-4" />
                  Transcrição
                </TabsTrigger>
              </TabsList>

              {/* Tab Clipes */}
              <TabsContent value="clips" className="mt-6">
                {clips.length === 0 ? (
                  <Card>
                    <CardContent className="py-16 text-center">
                      <Scissors className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" />
                      <h3 className="text-lg font-medium mb-2">Nenhum clipe gerado</h3>
                      <p className="text-muted-foreground text-sm max-w-md mx-auto">
                        Carrega um vídeo e clica em "Gerar Clipes Automáticos" para criar clipes curtos otimizados para
                        redes sociais.
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid sm:grid-cols-2 gap-4">
                    {clips.map((clip, index) => (
                      <Card
                        key={clip.id}
                        className={`overflow-hidden cursor-pointer transition-all hover:ring-2 hover:ring-primary/50 ${
                          selectedClip?.id === clip.id ? "ring-2 ring-primary" : ""
                        }`}
                        onClick={() => setSelectedClip(clip)}
                      >
                        <div className="relative aspect-[9/16] max-h-[300px] bg-black">
                          {clip.thumbnail ? (
                            <img
                              src={clip.thumbnail || "/placeholder.svg"}
                              alt={`Clip ${index + 1}`}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Video className="w-12 h-12 text-muted-foreground" />
                            </div>
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                          <div className="absolute bottom-0 left-0 right-0 p-4">
                            <div className="flex items-center justify-between mb-2">
                              <Badge variant="secondary" className="text-xs">
                                Clip {index + 1}
                              </Badge>
                              <span className={`text-sm font-bold ${getScoreColor(clip.viralScore)}`}>
                                {clip.viralScore}% viral
                              </span>
                            </div>
                            <p className="text-white text-sm line-clamp-2 mb-2">{clip.title}</p>
                            <div className="flex items-center justify-between text-xs text-white/70">
                              <span>{formatTime(clip.duration)}</span>
                              <span>
                                {formatTime(clip.startTime)} - {formatTime(clip.endTime)}
                              </span>
                            </div>
                          </div>
                          {/* Play overlay */}
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                            <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                              <Play className="w-6 h-6 text-white fill-white" />
                            </div>
                          </div>
                        </div>
                        <CardContent className="p-3">
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" className="flex-1 bg-transparent">
                              <Download className="w-3 h-3 mr-1" />
                              Download
                            </Button>
                            <Button size="sm" variant="outline">
                              <Share2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* Tab Transcrição */}
              <TabsContent value="transcript" className="mt-6">
                <Card>
                  <CardContent className="p-6">
                    {fullTranscript ? (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h3 className="font-medium">Transcrição Completa</h3>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => navigator.clipboard.writeText(fullTranscript)}
                          >
                            Copiar
                          </Button>
                        </div>
                        <div className="p-4 bg-muted rounded-lg max-h-[500px] overflow-y-auto">
                          <p className="text-sm leading-relaxed whitespace-pre-wrap">{fullTranscript}</p>
                        </div>
                        {transcript.length > 0 && (
                          <div className="pt-4 border-t">
                            <h4 className="font-medium mb-3">Timestamps</h4>
                            <div className="space-y-1 max-h-[300px] overflow-y-auto">
                              {transcript.map((word, i) => (
                                <span
                                  key={i}
                                  className="inline-block mr-1 text-sm hover:bg-primary/10 px-1 rounded cursor-pointer"
                                  title={`${formatTime(word.start)} - ${formatTime(word.end)}`}
                                >
                                  {word.text}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="py-12 text-center">
                        <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground/30" />
                        <p className="text-muted-foreground">A transcrição aparecerá aqui após o processamento</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>

        {/* Modal do clip selecionado */}
        {selectedClip && (
          <div
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setSelectedClip(null)}
          >
            <div
              className="bg-card rounded-xl overflow-hidden max-w-lg w-full max-h-[90vh]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="aspect-[9/16] bg-black relative">
                <video src={selectedClip.url} className="w-full h-full object-contain" controls autoPlay />
              </div>
              <div className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium">{selectedClip.title}</h3>
                  <span className={`font-bold ${getScoreColor(selectedClip.viralScore)}`}>
                    {selectedClip.viralScore}% viral
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">{selectedClip.transcript}</p>
                <div className="flex flex-wrap gap-2">
                  {selectedClip.hashtags.map((tag, i) => (
                    <Badge key={i} variant="secondary">
                      #{tag}
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2 pt-2">
                  <Button className="flex-1">
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </Button>
                  <Button variant="outline" onClick={() => setSelectedClip(null)}>
                    Fechar
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer com info */}
      <footer className="border-t border-border py-6 mt-12">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>Reborn AI Clipper usa AssemblyAI para transcrição e Cloudflare Workers para processamento.</p>
          <p className="mt-1">Os vídeos são processados de forma segura e não são armazenados permanentemente.</p>
        </div>
      </footer>
    </div>
  )
}
