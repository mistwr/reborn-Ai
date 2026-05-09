"use client"

import { useState, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Slider } from "@/components/ui/slider"
import { Progress } from "@/components/ui/progress"
import {
  Upload,
  Download,
  Sparkles,
  Wand2,
  ImagePlus,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Loader2,
  Check,
  X,
  Sun,
  Contrast,
  Palette,
  Focus,
  Layers,
  RefreshCw,
  ArrowLeftRight,
  Maximize2,
  Copy,
  Share2,
} from "lucide-react"

interface EnhancementOptions {
  brightness: number
  contrast: number
  saturation: number
  sharpness: number
  denoise: number
}

export function ImageEnhancer() {
  const [originalImage, setOriginalImage] = useState<string | null>(null)
  const [enhancedImage, setEnhancedImage] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [showComparison, setShowComparison] = useState(false)
  const [comparisonPosition, setComparisonPosition] = useState(50)
  const [selectedEnhancement, setSelectedEnhancement] = useState<string>("auto")
  const [options, setOptions] = useState<EnhancementOptions>({
    brightness: 0,
    contrast: 0,
    saturation: 0,
    sharpness: 0,
    denoise: 0,
  })
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const comparisonRef = useRef<HTMLDivElement>(null)

  const enhancementPresets = [
    { id: "auto", name: "Auto Enhance", icon: Sparkles, description: "Melhoria automatica inteligente" },
    { id: "upscale", name: "Upscale 2x", icon: ZoomIn, description: "Aumentar resolucao 2x" },
    { id: "denoise", name: "Remover Ruido", icon: Layers, description: "Limpar ruido da imagem" },
    { id: "sharpen", name: "Nitidez", icon: Focus, description: "Aumentar nitidez e detalhes" },
    { id: "color", name: "Correcao Cor", icon: Palette, description: "Corrigir cores e saturacao" },
    { id: "light", name: "Correcao Luz", icon: Sun, description: "Ajustar exposicao e brilho" },
  ]

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (event) => {
        setOriginalImage(event.target?.result as string)
        setEnhancedImage(null)
        setShowComparison(false)
      }
      reader.readAsDataURL(file)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (file && file.type.startsWith("image/")) {
      const reader = new FileReader()
      reader.onload = (event) => {
        setOriginalImage(event.target?.result as string)
        setEnhancedImage(null)
        setShowComparison(false)
      }
      reader.readAsDataURL(file)
    }
  }, [])

  const applyCanvasFilters = useCallback((
    ctx: CanvasRenderingContext2D,
    img: HTMLImageElement,
    width: number,
    height: number,
    preset: string,
    opts: EnhancementOptions
  ) => {
    // Draw original image
    ctx.drawImage(img, 0, 0, width, height)
    
    // Get image data
    const imageData = ctx.getImageData(0, 0, width, height)
    const data = imageData.data
    
    // Apply brightness
    const brightness = preset === "light" ? 20 : opts.brightness
    // Apply contrast
    const contrast = preset === "auto" || preset === "sharpen" ? 15 : opts.contrast
    // Apply saturation
    const saturation = preset === "color" ? 25 : opts.saturation
    
    const contrastFactor = (259 * (contrast + 255)) / (255 * (259 - contrast))
    
    for (let i = 0; i < data.length; i += 4) {
      let r = data[i]
      let g = data[i + 1]
      let b = data[i + 2]
      
      // Brightness
      r += brightness
      g += brightness
      b += brightness
      
      // Contrast
      r = contrastFactor * (r - 128) + 128
      g = contrastFactor * (g - 128) + 128
      b = contrastFactor * (b - 128) + 128
      
      // Saturation
      const gray = 0.2989 * r + 0.5870 * g + 0.1140 * b
      const satFactor = 1 + saturation / 100
      r = gray + satFactor * (r - gray)
      g = gray + satFactor * (g - gray)
      b = gray + satFactor * (b - gray)
      
      // Clamp values
      data[i] = Math.max(0, Math.min(255, r))
      data[i + 1] = Math.max(0, Math.min(255, g))
      data[i + 2] = Math.max(0, Math.min(255, b))
    }
    
    // Apply sharpening for sharpen preset
    if (preset === "sharpen" || preset === "auto") {
      // Unsharp mask simulation
      const sharpData = new Uint8ClampedArray(data)
      const kernel = [-1, -1, -1, -1, 9, -1, -1, -1, -1]
      const kernelSize = 3
      const half = Math.floor(kernelSize / 2)
      
      for (let y = half; y < height - half; y++) {
        for (let x = half; x < width - half; x++) {
          for (let c = 0; c < 3; c++) {
            let sum = 0
            for (let ky = 0; ky < kernelSize; ky++) {
              for (let kx = 0; kx < kernelSize; kx++) {
                const idx = ((y + ky - half) * width + (x + kx - half)) * 4 + c
                sum += data[idx] * kernel[ky * kernelSize + kx]
              }
            }
            const idx = (y * width + x) * 4 + c
            sharpData[idx] = Math.max(0, Math.min(255, sum * 0.3 + data[idx] * 0.7))
          }
        }
      }
      
      for (let i = 0; i < data.length; i++) {
        imageData.data[i] = sharpData[i]
      }
    } else {
      ctx.putImageData(imageData, 0, 0)
      return
    }
    
    ctx.putImageData(imageData, 0, 0)
  }, [])

  const enhanceImage = useCallback(async () => {
    if (!originalImage || !canvasRef.current) return
    
    setIsProcessing(true)
    setProgress(0)
    
    const canvas = canvasRef.current
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    
    const img = new Image()
    img.crossOrigin = "anonymous"
    
    img.onload = async () => {
      // Simulate progress
      for (let i = 0; i <= 30; i++) {
        await new Promise(r => setTimeout(r, 30))
        setProgress(i)
      }
      
      let targetWidth = img.width
      let targetHeight = img.height
      
      // Upscale if selected
      if (selectedEnhancement === "upscale") {
        targetWidth *= 2
        targetHeight *= 2
      }
      
      canvas.width = targetWidth
      canvas.height = targetHeight
      
      setProgress(50)
      
      // Apply filters
      applyCanvasFilters(ctx, img, targetWidth, targetHeight, selectedEnhancement, options)
      
      for (let i = 50; i <= 90; i++) {
        await new Promise(r => setTimeout(r, 20))
        setProgress(i)
      }
      
      // Convert to base64
      const enhanced = canvas.toDataURL("image/png", 1.0)
      setEnhancedImage(enhanced)
      setShowComparison(true)
      setProgress(100)
      
      setTimeout(() => {
        setIsProcessing(false)
      }, 500)
    }
    
    img.src = originalImage
  }, [originalImage, selectedEnhancement, options, applyCanvasFilters])

  const downloadImage = useCallback(() => {
    if (!enhancedImage) return
    const link = document.createElement("a")
    link.href = enhancedImage
    link.download = `enhanced-image-${Date.now()}.png`
    link.click()
  }, [enhancedImage])

  const copyToClipboard = useCallback(async () => {
    if (!enhancedImage) return
    try {
      const response = await fetch(enhancedImage)
      const blob = await response.blob()
      await navigator.clipboard.write([
        new ClipboardItem({ [blob.type]: blob })
      ])
    } catch (err) {
      console.error("Failed to copy image:", err)
    }
  }, [enhancedImage])

  const resetAll = useCallback(() => {
    setOriginalImage(null)
    setEnhancedImage(null)
    setShowComparison(false)
    setProgress(0)
    setOptions({
      brightness: 0,
      contrast: 0,
      saturation: 0,
      sharpness: 0,
      denoise: 0,
    })
  }, [])

  const handleComparisonDrag = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!comparisonRef.current) return
    const rect = comparisonRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100))
    setComparisonPosition(percentage)
  }, [])

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500/20 to-purple-500/20 flex items-center justify-center">
            <Wand2 className="h-5 w-5 text-violet-500" />
          </div>
          <div>
            <h2 className="font-semibold">Image Enhancer AI</h2>
            <p className="text-xs text-muted-foreground">Melhora imagens com IA - Upscale, Nitidez, Cores</p>
          </div>
        </div>
        {originalImage && (
          <Button variant="ghost" size="sm" onClick={resetAll}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Nova Imagem
          </Button>
        )}
      </div>

      <div className="flex-1 overflow-auto p-4">
        {!originalImage ? (
          // Upload Area
          <div className="h-full flex items-center justify-center">
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="w-full max-w-xl p-12 border-2 border-dashed border-white/10 rounded-2xl bg-white/[0.02] hover:bg-white/[0.04] hover:border-primary/30 transition-all cursor-pointer group"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
              <div className="text-center">
                <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-violet-500/20 to-purple-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Upload className="h-10 w-10 text-violet-500" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Carregar Imagem</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Arrasta uma imagem ou clica para selecionar
                </p>
                <div className="flex flex-wrap justify-center gap-2">
                  {["JPG", "PNG", "WEBP", "GIF"].map((format) => (
                    <Badge key={format} variant="outline" className="text-xs">
                      {format}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-full">
            {/* Left Panel - Enhancement Options */}
            <div className="lg:col-span-1 space-y-4">
              <Card className="p-4 bg-white/[0.02] border-white/5">
                <h3 className="text-sm font-semibold mb-3">Tipo de Melhoria</h3>
                <div className="grid grid-cols-2 gap-2">
                  {enhancementPresets.map((preset) => (
                    <button
                      key={preset.id}
                      onClick={() => setSelectedEnhancement(preset.id)}
                      className={`p-3 rounded-xl text-left transition-all ${
                        selectedEnhancement === preset.id
                          ? "bg-primary/20 ring-1 ring-primary/50"
                          : "bg-white/5 hover:bg-white/10"
                      }`}
                    >
                      <preset.icon className={`h-5 w-5 mb-2 ${
                        selectedEnhancement === preset.id ? "text-primary" : "text-muted-foreground"
                      }`} />
                      <p className="text-xs font-medium">{preset.name}</p>
                    </button>
                  ))}
                </div>
              </Card>

              <Card className="p-4 bg-white/[0.02] border-white/5">
                <h3 className="text-sm font-semibold mb-3">Ajustes Manuais</h3>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-xs mb-2">
                      <span className="flex items-center gap-1.5">
                        <Sun className="h-3.5 w-3.5" /> Brilho
                      </span>
                      <span className="text-muted-foreground">{options.brightness}</span>
                    </div>
                    <Slider
                      value={[options.brightness]}
                      onValueChange={([v]) => setOptions({ ...options, brightness: v })}
                      min={-50}
                      max={50}
                      step={1}
                    />
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-2">
                      <span className="flex items-center gap-1.5">
                        <Contrast className="h-3.5 w-3.5" /> Contraste
                      </span>
                      <span className="text-muted-foreground">{options.contrast}</span>
                    </div>
                    <Slider
                      value={[options.contrast]}
                      onValueChange={([v]) => setOptions({ ...options, contrast: v })}
                      min={-50}
                      max={50}
                      step={1}
                    />
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-2">
                      <span className="flex items-center gap-1.5">
                        <Palette className="h-3.5 w-3.5" /> Saturacao
                      </span>
                      <span className="text-muted-foreground">{options.saturation}</span>
                    </div>
                    <Slider
                      value={[options.saturation]}
                      onValueChange={([v]) => setOptions({ ...options, saturation: v })}
                      min={-50}
                      max={50}
                      step={1}
                    />
                  </div>
                </div>
              </Card>

              <Button
                onClick={enhanceImage}
                disabled={isProcessing}
                className="w-full bg-gradient-to-r from-violet-600 to-purple-600 hover:opacity-90"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    A Processar... {progress}%
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Melhorar Imagem
                  </>
                )}
              </Button>

              {isProcessing && (
                <Progress value={progress} className="h-2" />
              )}
            </div>

            {/* Right Panel - Image Preview */}
            <div className="lg:col-span-2 space-y-4">
              {showComparison && enhancedImage ? (
                <>
                  {/* Comparison View */}
                  <Card className="relative overflow-hidden bg-black/50 border-white/5 aspect-video">
                    <div
                      ref={comparisonRef}
                      className="relative w-full h-full cursor-ew-resize"
                      onMouseMove={handleComparisonDrag}
                      onClick={handleComparisonDrag}
                    >
                      {/* Enhanced Image (Background) */}
                      <img
                        src={enhancedImage}
                        alt="Enhanced"
                        className="absolute inset-0 w-full h-full object-contain"
                      />
                      
                      {/* Original Image (Clipped) */}
                      <div
                        className="absolute inset-0 overflow-hidden"
                        style={{ width: `${comparisonPosition}%` }}
                      >
                        <img
                          src={originalImage}
                          alt="Original"
                          className="absolute inset-0 w-full h-full object-contain"
                          style={{ width: `${100 / (comparisonPosition / 100)}%`, maxWidth: "none" }}
                        />
                      </div>
                      
                      {/* Divider Line */}
                      <div
                        className="absolute top-0 bottom-0 w-1 bg-white shadow-lg"
                        style={{ left: `${comparisonPosition}%`, transform: "translateX(-50%)" }}
                      >
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-lg">
                          <ArrowLeftRight className="h-5 w-5 text-black" />
                        </div>
                      </div>
                      
                      {/* Labels */}
                      <div className="absolute top-3 left-3 px-2 py-1 rounded bg-black/70 text-xs font-medium">
                        Original
                      </div>
                      <div className="absolute top-3 right-3 px-2 py-1 rounded bg-primary/70 text-xs font-medium">
                        Melhorada
                      </div>
                    </div>
                  </Card>
                  
                  {/* Action Buttons */}
                  <div className="flex flex-wrap gap-2">
                    <Button onClick={downloadImage} className="flex-1">
                      <Download className="h-4 w-4 mr-2" />
                      Descarregar
                    </Button>
                    <Button variant="outline" onClick={copyToClipboard}>
                      <Copy className="h-4 w-4 mr-2" />
                      Copiar
                    </Button>
                    <Button variant="outline" onClick={() => setShowComparison(false)}>
                      <Maximize2 className="h-4 w-4 mr-2" />
                      Ver Original
                    </Button>
                  </div>
                </>
              ) : (
                // Original Image Preview
                <Card className="relative overflow-hidden bg-black/50 border-white/5 aspect-video flex items-center justify-center">
                  <img
                    src={originalImage}
                    alt="Original"
                    className="max-w-full max-h-full object-contain"
                  />
                  {!enhancedImage && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                      <p className="text-sm text-muted-foreground">
                        Seleciona uma melhoria e clica em &quot;Melhorar Imagem&quot;
                      </p>
                    </div>
                  )}
                </Card>
              )}
            </div>
          </div>
        )}
      </div>
      
      {/* Hidden Canvas for Processing */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  )
}
