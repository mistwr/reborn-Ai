'use client'

import React, { useRef, useState } from 'react'
import { useCliperStore } from '@/lib/stores/clipper-store'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Download, Loader, Play, Scissors, Sparkles, Trash2, Upload, WandSparkles } from 'lucide-react'

const CLIP_DURATIONS = [15, 30, 60] as const
const FORMATS = ['vertical', 'horizontal', 'square'] as const
const PLATFORMS = ['tiktok', 'reels', 'shorts', 'youtube'] as const
const VIDEO_ASPECTS = ['9:16', '16:9', '1:1'] as const

type GeneratorStatus = {
  taskId: string
  state: number
  progress: number
  videos: string[]
  combinedVideos: string[]
  complete: boolean
  failed: boolean
  error?: string | null
  failedStage?: string | null
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export const CliperAITab: React.FC = () => {
  const {
    clips,
    isProcessing,
    uploadedVideo,
    clipDuration,
    selectedFormat,
    setUploadedVideo,
    setClipDuration,
    setSelectedFormat,
    addClip,
    setIsProcessing,
    removeClip,
    clearClips,
  } = useCliperStore()

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [platform, setPlatform] = useState<typeof PLATFORMS[number]>('tiktok')
  const [mode, setMode] = useState<'generate' | 'cut'>('generate')

  const [subject, setSubject] = useState('')
  const [script, setScript] = useState('')
  const [generatedScript, setGeneratedScript] = useState('')
  const [videoSeconds, setVideoSeconds] = useState(30)
  const [videoAspect, setVideoAspect] = useState<typeof VIDEO_ASPECTS[number]>('9:16')
  const [voiceName, setVoiceName] = useState('pt-PT-RaquelNeural-Female')
  const [generatorLoading, setGeneratorLoading] = useState(false)
  const [generatorProgress, setGeneratorProgress] = useState(0)
  const [generatorStep, setGeneratorStep] = useState('')
  const [generatorError, setGeneratorError] = useState('')
  const [generatedVideo, setGeneratedVideo] = useState('')

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) setUploadedVideo(file)
  }

  const pollRender = async (taskId: string) => {
    const startedAt = Date.now()
    while (Date.now() - startedAt < 12 * 60 * 1000) {
      const response = await fetch(`/api/clipper/generate?taskId=${encodeURIComponent(taskId)}`, { cache: 'no-store' })
      const data: GeneratorStatus & { error?: string } = await response.json()
      if (!response.ok) throw new Error(data.error || 'Falha ao consultar o render')

      setGeneratorProgress(Math.max(35, Math.min(99, Number(data.progress || 0))))
      setGeneratorStep('A renderizar vídeo, voz, música e legendas...')

      if (data.failed) {
        throw new Error(data.error || `Render falhou${data.failedStage ? ` na etapa ${data.failedStage}` : ''}`)
      }
      if (data.complete) {
        const url = data.combinedVideos?.[0] || data.videos?.[0]
        if (!url) throw new Error('O render terminou mas não devolveu o MP4.')
        return url
      }
      await wait(2500)
    }
    throw new Error('O render está a demorar mais do que o esperado. Tenta novamente dentro de momentos.')
  }

  const handleGenerateVideo = async () => {
    if (!subject.trim()) return
    setGeneratorLoading(true)
    setGeneratorError('')
    setGeneratedVideo('')
    setGeneratorProgress(8)
    setGeneratorStep('A criar o guião e o storyboard...')

    try {
      const response = await fetch('/api/clipper/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: subject.trim(),
          script: script.trim(),
          seconds: videoSeconds,
          aspect: videoAspect,
          language: 'pt-PT',
          voiceName,
          subtitles: true,
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Não foi possível iniciar o vídeo.')

      setGeneratedScript(data.script || script)
      setGeneratorProgress(35)
      setGeneratorStep('Imagens criadas. O MoneyPrinterTurbo está a montar o MP4...')
      const videoUrl = await pollRender(data.taskId)
      setGeneratedVideo(videoUrl)
      setGeneratorProgress(100)
      setGeneratorStep('Vídeo concluído!')
    } catch (error) {
      setGeneratorError(error instanceof Error ? error.message : 'Erro ao gerar vídeo')
      setGeneratorStep('')
    } finally {
      setGeneratorLoading(false)
    }
  }

  const handleClipVideo = async () => {
    if (!uploadedVideo) return
    setIsProcessing(true)
    try {
      const formData = new FormData()
      formData.append('video', uploadedVideo)
      formData.append('duration', clipDuration.toString())
      formData.append('format', selectedFormat)
      formData.append('platform', platform)

      const response = await fetch('/api/pro/process-video', { method: 'POST', body: formData })
      if (!response.ok) throw new Error('Failed to process video')
      const data = await response.json()
      addClip({
        id: Date.now().toString(),
        name: `${clipDuration}s ${platform} clip`,
        duration: clipDuration,
        format: selectedFormat,
        platform,
        videoUrl: data.videoUrl,
        timestamp: new Date(),
      })
      setUploadedVideo(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
    } catch (error) {
      console.error('Video processing error:', error)
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <h2 className="text-2xl font-bold">Clipper AI</h2>
            <Badge variant="secondary">MoneyPrinterTurbo</Badge>
          </div>
          <p className="text-sm text-muted-foreground">Cria um vídeo completo a partir de um tema ou continua a cortar vídeos existentes.</p>
        </div>
        <div className="flex gap-2">
          <Button variant={mode === 'generate' ? 'default' : 'outline'} onClick={() => setMode('generate')}>
            <WandSparkles className="mr-2 h-4 w-4" /> Gerar vídeo
          </Button>
          <Button variant={mode === 'cut' ? 'default' : 'outline'} onClick={() => setMode('cut')}>
            <Scissors className="mr-2 h-4 w-4" /> Cortar vídeo
          </Button>
        </div>
      </div>

      {mode === 'generate' ? (
        <div className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
          <Card className="p-6">
            <div className="space-y-5">
              <div>
                <label className="mb-2 block text-sm font-medium">Sobre o que queres criar um vídeo?</label>
                <textarea
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Ex.: 5 formas simples de poupar energia em casa"
                  className="min-h-28 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                  disabled={generatorLoading}
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">Guião próprio <span className="text-muted-foreground">(opcional)</span></label>
                <textarea
                  value={script}
                  onChange={(e) => setScript(e.target.value)}
                  placeholder="Deixa vazio e o Lumin AI escreve o guião automaticamente."
                  className="min-h-24 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                  disabled={generatorLoading}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium">Duração</label>
                  <div className="flex gap-2">
                    {[15, 30, 60].map((seconds) => (
                      <Button key={seconds} type="button" size="sm" variant={videoSeconds === seconds ? 'default' : 'outline'} onClick={() => setVideoSeconds(seconds)} disabled={generatorLoading}>
                        {seconds}s
                      </Button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium">Formato</label>
                  <div className="flex gap-2">
                    {VIDEO_ASPECTS.map((aspect) => (
                      <Button key={aspect} type="button" size="sm" variant={videoAspect === aspect ? 'default' : 'outline'} onClick={() => setVideoAspect(aspect)} disabled={generatorLoading}>
                        {aspect}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">Voz PT-PT</label>
                <div className="flex gap-2">
                  <Button size="sm" type="button" variant={voiceName.includes('Raquel') ? 'default' : 'outline'} onClick={() => setVoiceName('pt-PT-RaquelNeural-Female')} disabled={generatorLoading}>Raquel</Button>
                  <Button size="sm" type="button" variant={voiceName.includes('Duarte') ? 'default' : 'outline'} onClick={() => setVoiceName('pt-PT-DuarteNeural-Male')} disabled={generatorLoading}>Duarte</Button>
                </div>
              </div>

              <Button className="w-full" size="lg" onClick={handleGenerateVideo} disabled={!subject.trim() || generatorLoading}>
                {generatorLoading ? <><Loader className="mr-2 h-4 w-4 animate-spin" /> A criar o vídeo...</> : <><Sparkles className="mr-2 h-4 w-4" /> Criar vídeo completo</>}
              </Button>

              {(generatorLoading || generatorProgress > 0) && (
                <div className="space-y-2 rounded-xl border border-border bg-muted/30 p-4">
                  <div className="flex items-center justify-between text-sm"><span>{generatorStep || 'A preparar...'}</span><span>{Math.round(generatorProgress)}%</span></div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted"><div className="h-full bg-primary transition-all" style={{ width: `${generatorProgress}%` }} /></div>
                </div>
              )}

              {generatorError && <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">{generatorError}</div>}
            </div>
          </Card>

          <Card className="overflow-hidden">
            {generatedVideo ? (
              <div className="space-y-4 p-4">
                <div className={`overflow-hidden rounded-xl bg-black ${videoAspect === '9:16' ? 'mx-auto aspect-[9/16] max-h-[620px]' : videoAspect === '1:1' ? 'aspect-square' : 'aspect-video'}`}>
                  <video src={generatedVideo} controls className="h-full w-full object-contain" />
                </div>
                <div className="flex gap-2">
                  <Button asChild className="flex-1"><a href={generatedVideo} target="_blank" rel="noreferrer"><Download className="mr-2 h-4 w-4" /> Abrir / descarregar MP4</a></Button>
                </div>
                {generatedScript && <details className="rounded-xl border border-border p-3 text-sm"><summary className="cursor-pointer font-medium">Ver guião usado</summary><p className="mt-3 whitespace-pre-wrap text-muted-foreground">{generatedScript}</p></details>}
              </div>
            ) : (
              <div className="flex min-h-[460px] flex-col items-center justify-center p-10 text-center">
                <div className="mb-4 rounded-full border border-primary/20 bg-primary/10 p-5"><Play className="h-8 w-8 text-primary" /></div>
                <h3 className="font-semibold">O MP4 aparece aqui</h3>
                <p className="mt-2 max-w-sm text-sm text-muted-foreground">O Lumin cria o guião e imagens; o MoneyPrinterTurbo trata da voz, legendas, música, composição e render final.</p>
              </div>
            )}
          </Card>
        </div>
      ) : (
        <>
          <Card className="p-6 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Upload Video</label>
                <div className="flex gap-2">
                  <Input ref={fileInputRef} type="file" accept="video/*" onChange={handleFileSelect} disabled={isProcessing} />
                  {uploadedVideo && <span className="text-sm text-green-600 flex items-center">{uploadedVideo.name}</span>}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Clip Duration (seconds)</label>
                <div className="flex gap-2">
                  {CLIP_DURATIONS.map((duration) => <Button key={duration} variant={clipDuration === duration ? 'default' : 'outline'} size="sm" onClick={() => setClipDuration(duration)} disabled={isProcessing}>{duration}s</Button>)}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Format</label>
                <div className="flex gap-2">
                  {FORMATS.map((format) => <Button key={format} variant={selectedFormat === format ? 'default' : 'outline'} size="sm" onClick={() => setSelectedFormat(format as typeof FORMATS[number])} disabled={isProcessing} className="capitalize">{format}</Button>)}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Target Platform</label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {PLATFORMS.map((p) => <Button key={p} variant={platform === p ? 'default' : 'outline'} size="sm" onClick={() => setPlatform(p)} disabled={isProcessing} className="capitalize">{p}</Button>)}
                </div>
              </div>
              <Button onClick={handleClipVideo} disabled={!uploadedVideo || isProcessing} className="w-full" size="lg">
                {isProcessing ? <><Loader className="h-4 w-4 mr-2 animate-spin" />Processing...</> : <><Play className="h-4 w-4 mr-2" />Extract Clip</>}
              </Button>
            </div>
          </Card>

          {clips.length > 0 ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between"><h3 className="text-lg font-semibold">Generated Clips</h3><Button variant="outline" size="sm" onClick={clearClips}>Clear All</Button></div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {clips.map((clip) => (
                  <Card key={clip.id} className="overflow-hidden">
                    <div className="aspect-video bg-gray-900 relative group"><video src={clip.videoUrl} className="w-full h-full object-cover" controls /><div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100"><Button size="sm" variant="secondary" onClick={() => { const link = document.createElement('a'); link.href = clip.videoUrl; link.download = `${clip.name}.mp4`; link.click() }}><Download className="h-4 w-4" /></Button><Button size="sm" variant="destructive" onClick={() => removeClip(clip.id)}><Trash2 className="h-4 w-4" /></Button></div></div>
                    <div className="p-3 space-y-2"><p className="text-sm font-medium">{clip.name}</p><div className="flex gap-1 flex-wrap"><Badge variant="secondary" className="text-xs">{clip.duration}s</Badge><Badge variant="secondary" className="text-xs capitalize">{clip.format}</Badge><Badge variant="secondary" className="text-xs capitalize">{clip.platform}</Badge></div></div>
                  </Card>
                ))}
              </div>
            </div>
          ) : !isProcessing && <Card className="p-12 text-center border-2 border-dashed"><Upload className="h-12 w-12 mx-auto mb-4 text-gray-400" /><p className="text-gray-500">Upload a video to start creating clips</p></Card>}
        </>
      )}
    </div>
  )
}
