'use client'

import React, { useState } from 'react'
import { useImageGeneratorStore } from '@/lib/stores/image-generator-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { AlertTriangle, CheckCircle2, Download, Loader, Trash2 } from 'lucide-react'

const ASPECT_RATIOS = ['1:1', '16:9', '9:16'] as const
const STYLES = ['Fotorealista', 'Anime', 'Digital Art', 'Illustration', '3D'] as const

export const ImageGeneratorProTab: React.FC = () => {
  const [error, setError] = useState<string | null>(null)
  const [lastQuality, setLastQuality] = useState<{ confidence?: number; matched?: boolean; retried?: boolean; note?: string } | null>(null)
  const {
    images,
    isGenerating,
    prompt,
    selectedAspectRatio,
    selectedStyle,
    setPrompt,
    setAspectRatio,
    setStyle,
    addImage,
    setIsGenerating,
    clearHistory,
  } = useImageGeneratorStore()

  const handleGenerate = async () => {
    if (!prompt.trim()) return

    setIsGenerating(true)
    setError(null)
    setLastQuality(null)
    try {
      // Call the image generation API
      const response = await fetch('/api/pro/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          aspectRatio: selectedAspectRatio,
          style: selectedStyle,
        }),
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data?.error || 'Failed to generate image')

      setLastQuality({
        confidence: data?.qualityControl?.confidence,
        matched: data?.qualityControl?.matched,
        retried: data?.retried,
        note: data?.note,
      })

      addImage({
        id: Date.now().toString(),
        prompt,
        aspectRatio: selectedAspectRatio,
        style: selectedStyle,
        imageUrl: data.imageUrl,
        timestamp: new Date(),
      })
    } catch (error: any) {
      console.error('Generation error:', error)
      setError(error?.message || 'Não foi possível gerar a imagem.')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleDownload = (imageUrl: string, index: number) => {
    const link = document.createElement('a')
    link.href = imageUrl
    link.download = `generated-image-${index}.png`
    link.click()
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">LUMIN Images Pro</h2>
        <p className="text-gray-600">Geração de imagem com validação de contexto e melhoria automática</p>
      </div>
      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {lastQuality && (
        <div className="flex items-start gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-3 py-2 text-sm">
          <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0 text-emerald-500" />
          <span className="text-muted-foreground">
            {typeof lastQuality.confidence === "number" ? `Contexto: ${lastQuality.confidence}/100. ` : ""}
            {lastQuality.retried ? "O LUMIN regenerou automaticamente para melhorar a fidelidade. " : ""}
            {lastQuality.note || ""}
          </span>
        </div>
      )}

      {/* Control Panel */}
      <Card className="p-6 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        <div className="space-y-4">
          {/* Prompt Input */}
          <div>
            <label className="block text-sm font-medium mb-2">Describe your image</label>
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="E.g., A futuristic city with neon lights and flying cars..."
              className="resize-none"
              rows={3}
            />
          </div>

          {/* Aspect Ratio Selection */}
          <div>
            <label className="block text-sm font-medium mb-2">Aspect Ratio</label>
            <div className="flex gap-2">
              {ASPECT_RATIOS.map((ratio) => (
                <Button
                  key={ratio}
                  variant={selectedAspectRatio === ratio ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setAspectRatio(ratio)}
                >
                  {ratio}
                </Button>
              ))}
            </div>
          </div>

          {/* Style Selection */}
          <div>
            <label className="block text-sm font-medium mb-2">Style</label>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
              {STYLES.map((style) => (
                <Button
                  key={style}
                  variant={selectedStyle === style ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStyle(style as typeof STYLES[number])}
                  className="text-xs"
                >
                  {style}
                </Button>
              ))}
            </div>
          </div>

          {/* Generate Button */}
          <Button
            onClick={handleGenerate}
            disabled={!prompt.trim() || isGenerating}
            className="w-full"
            size="lg"
          >
            {isGenerating ? (
              <>
                <Loader className="h-4 w-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              'Generate Image'
            )}
          </Button>
        </div>
      </Card>

      {/* History Section */}
      {images.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Generation History</h3>
            <Button variant="outline" size="sm" onClick={clearHistory}>
              Clear All
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {images.map((image, index) => (
              <Card key={image.id} className="overflow-hidden">
                <div className="relative aspect-square bg-gray-200 overflow-hidden group">
                  <img
                    src={image.imageUrl}
                    alt={image.prompt}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleDownload(image.imageUrl, index)}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="p-3 space-y-2">
                  <p className="text-sm line-clamp-2">{image.prompt}</p>
                  <div className="flex gap-1 flex-wrap">
                    <Badge variant="secondary" className="text-xs">
                      {image.aspectRatio}
                    </Badge>
                    <Badge variant="secondary" className="text-xs">
                      {image.style}
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-500">
                    {new Date(image.timestamp).toLocaleString()}
                  </p>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {images.length === 0 && !isGenerating && (
        <Card className="p-12 text-center border-2 border-dashed">
          <p className="text-gray-500">Start generating images to see them here</p>
        </Card>
      )}
    </div>
  )
}
