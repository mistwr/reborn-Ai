"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import {
  Sparkles,
  Download,
  Loader2,
  RefreshCw,
  Maximize2,
  Copy,
  Check,
  ImagePlus,
  Wand2,
  Layers,
} from "lucide-react"

const MODELS = [
  { id: "flux", label: "Reborn HD", desc: "Alta qualidade, realista" },
  { id: "turbo", label: "Reborn Fast", desc: "Rapido, criativo" },
  { id: "default", label: "Reborn Std", desc: "Equilibrado" },
]

const SIZES = [
  { id: "square", label: "Quadrado", w: 1024, h: 1024 },
  { id: "landscape", label: "Paisagem", w: 1280, h: 720 },
  { id: "portrait", label: "Retrato", w: 720, h: 1280 },
  { id: "wide", label: "Ultrawide", w: 1920, h: 1080 },
  { id: "story", label: "Story", w: 1080, h: 1920 },
]

const STYLES = [
  "Fotografia realista",
  "Arte digital",
  "Aquarela",
  "Arte em oleo",
  "Arte de conceito",
  "Arte anime",
  "Arte cyberpunk",
  "Arte minimalista",
  "Arte abstracta",
  "Sketch a lapiz",
  "Arte 3D",
  "Pixel art",
  "Arte pop",
  "Arte surrealista",
  "Fotografia macro",
]

const PROMPT_TEMPLATES = [
  { label: "Produto em destaque", prompt: "professional product photography, studio lighting, white background, high detail" },
  { label: "Paisagem epica", prompt: "epic landscape photography, golden hour, ultra realistic, 8k, dramatic lighting" },
  { label: "Retrato profissional", prompt: "professional portrait photography, studio lighting, sharp focus, bokeh background" },
  { label: "Arte abstrata", prompt: "abstract digital art, vibrant colors, geometric patterns, modern design" },
  { label: "Cidade futurista", prompt: "futuristic cyberpunk city at night, neon lights, rain reflections, ultra realistic" },
  { label: "Logo minimalista", prompt: "minimalist vector logo design, clean lines, professional, white background" },
  { label: "Flyer evento", prompt: "professional event flyer design, modern typography, gradient background" },
  { label: "Banner web", prompt: "modern website banner, clean design, professional, gradient colors" },
]

interface GeneratedImg {
  url: string
  prompt: string
  model: string
  size: string
  seed?: number
  provider?: string
}

export function ImageGenerator() {
  const [prompt, setPrompt] = useState("")
  const [selectedModel, setSelectedModel] = useState("flux")
  const [selectedSize, setSelectedSize] = useState("square")
  const [selectedStyle, setSelectedStyle] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [gallery, setGallery] = useState<GeneratedImg[]>([])
  const [selected, setSelected] = useState<GeneratedImg | null>(null)
  const [copied, setCopied] = useState(false)
  const [batchCount, setBatchCount] = useState(1)

  const buildPrompt = () => {
    let full = prompt.trim()
    if (selectedStyle) full = `${full}, ${selectedStyle}`
    return full
  }

  const generate = async (count = batchCount) => {
    if (!prompt.trim()) return
    setIsGenerating(true)

    const size = SIZES.find((s) => s.id === selectedSize)!
    const fullPrompt = buildPrompt()

    const results: GeneratedImg[] = []

    for (let i = 0; i < count; i++) {
      try {
        const res = await fetch("/api/generate-image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: fullPrompt,
            width: size.w,
            height: size.h,
            model: selectedModel,
          }),
        })
        const data = await res.json()
        if (data.url) {
          results.push({
            url: data.url,
            prompt: fullPrompt,
            model: selectedModel,
            size: selectedSize,
            seed: data.seed,
            provider: data.provider,
          })
        }
      } catch {
        // skip failed
      }
    }

    if (results.length > 0) {
      setGallery((prev) => [...results, ...prev])
      setSelected(results[0])
    }

    setIsGenerating(false)
  }

  const copyPrompt = async (text: string) => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const downloadImage = (img: GeneratedImg) => {
    const a = document.createElement("a")
    a.href = img.url
    a.download = `reborn-ai-${img.model}-${Date.now()}.jpg`
    a.target = "_blank"
    a.click()
  }

  return (
    <div className="flex flex-col lg:flex-row h-full gap-4 p-4 overflow-y-auto">
      {/* Left panel — controls */}
      <div className="lg:w-80 shrink-0 space-y-4">
        <Card className="p-4 space-y-4">
          <h3 className="font-semibold flex items-center gap-2 text-foreground">
            <Wand2 className="h-4 w-4 text-primary" />
            Gerador de Imagens IA
          </h3>

          {/* Prompt */}
          <div className="space-y-1.5">
            <Label>Descricao</Label>
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Descreve a imagem em detalhe..."
              className="min-h-[90px] resize-none text-sm"
            />
          </div>

          {/* Style pill picker */}
          <div className="space-y-1.5">
            <Label>Estilo</Label>
            <div className="flex flex-wrap gap-1.5">
              {STYLES.map((s) => (
                <button
                  key={s}
                  onClick={() => setSelectedStyle(selectedStyle === s ? "" : s)}
                  className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                    selectedStyle === s
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-muted/40 border-border text-muted-foreground hover:border-primary/60 hover:text-foreground"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Model */}
          <div className="space-y-1.5">
            <Label>Modelo</Label>
            <div className="grid grid-cols-3 gap-2">
              {MODELS.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setSelectedModel(m.id)}
                  className={`rounded-lg border p-2 text-left transition-colors ${
                    selectedModel === m.id
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-muted/30 text-muted-foreground hover:border-primary/50"
                  }`}
                >
                  <div className="text-xs font-semibold">{m.label}</div>
                  <div className="text-[10px] opacity-70 leading-tight">{m.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Size */}
          <div className="space-y-1.5">
            <Label>Tamanho</Label>
            <div className="grid grid-cols-2 gap-1.5">
              {SIZES.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSelectedSize(s.id)}
                  className={`rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
                    selectedSize === s.id
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-muted/30 text-muted-foreground hover:border-primary/50"
                  }`}
                >
                  {s.label}
                  <span className="block text-[10px] opacity-60">
                    {s.w}x{s.h}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Batch count */}
          <div className="space-y-1.5">
            <Label>Quantidade: {batchCount}</Label>
            <div className="flex gap-2">
              {[1, 2, 4].map((n) => (
                <button
                  key={n}
                  onClick={() => setBatchCount(n)}
                  className={`flex-1 rounded-lg border py-1.5 text-xs font-medium transition-colors ${
                    batchCount === n
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-muted/30 text-muted-foreground hover:border-primary/50"
                  }`}
                >
                  {n}x
                </button>
              ))}
            </div>
          </div>

          <Button
            onClick={() => generate()}
            disabled={isGenerating || !prompt.trim()}
            className="w-full"
            size="lg"
          >
            {isGenerating ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" />A gerar...</>
            ) : (
              <><Sparkles className="h-4 w-4 mr-2" />Gerar Imagem</>
            )}
          </Button>
        </Card>

        {/* Quick templates */}
        <Card className="p-4 space-y-3">
          <h4 className="text-sm font-semibold flex items-center gap-2">
            <Layers className="h-4 w-4 text-primary" />
            Templates Rapidos
          </h4>
          <div className="space-y-1.5">
            {PROMPT_TEMPLATES.map((t) => (
              <button
                key={t.label}
                onClick={() => setPrompt(t.prompt)}
                className="w-full text-left px-3 py-2 rounded-lg border border-border bg-muted/20 hover:bg-muted/50 hover:border-primary/50 transition-colors text-xs text-foreground"
              >
                <span className="font-medium block">{t.label}</span>
                <span className="text-muted-foreground line-clamp-1">{t.prompt}</span>
              </button>
            ))}
          </div>
        </Card>
      </div>

      {/* Right panel — preview + gallery */}
      <div className="flex-1 min-h-0 space-y-4">
        {/* Main preview */}
        <Card className="p-4 space-y-3">
          {selected ? (
            <>
              <div className="relative group rounded-lg overflow-hidden bg-muted">
                <img
                  src={selected.url}
                  alt={selected.prompt}
                  className="w-full object-contain max-h-[420px] rounded-lg"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center gap-3 opacity-0 group-hover:opacity-100">
                  <button
                    onClick={() => window.open(selected.url, "_blank")}
                    className="bg-black/70 text-white p-2 rounded-full hover:bg-black/90 transition-colors"
                  >
                    <Maximize2 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => generate(1)}
                    className="bg-black/70 text-white p-2 rounded-full hover:bg-black/90 transition-colors"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => downloadImage(selected)}
                    className="bg-black/70 text-white p-2 rounded-full hover:bg-black/90 transition-colors"
                  >
                    <Download className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <p className="text-xs text-muted-foreground flex-1 line-clamp-2">{selected.prompt}</p>
                <button
                  onClick={() => copyPrompt(selected.prompt)}
                  className="shrink-0 p-1.5 rounded border border-border hover:bg-muted/50 transition-colors"
                >
                  {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5 text-muted-foreground" />}
                </button>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className="text-[10px] bg-primary/5 border-primary/30 text-primary">
                  Reborn AI
                </Badge>
                <Badge variant="outline" className="text-[10px]">
                  {SIZES.find((s) => s.id === selected.size)?.label}
                </Badge>
                <div className="ml-auto flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => window.open(selected.url, "_blank")}>
                    <Maximize2 className="h-3.5 w-3.5 mr-1" />
                    Ver
                  </Button>
                  <Button size="sm" onClick={() => downloadImage(selected)}>
                    <Download className="h-3.5 w-3.5 mr-1" />
                    Download
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="aspect-square max-h-[420px] flex items-center justify-center text-center text-muted-foreground rounded-lg border-2 border-dashed border-border bg-muted/20">
              <div className="space-y-2">
                <ImagePlus className="h-12 w-12 mx-auto opacity-30" />
                <p className="text-sm">A tua imagem aparecera aqui</p>
                <p className="text-xs opacity-60">Escreve uma descricao e clica em Gerar</p>
              </div>
            </div>
          )}
        </Card>

        {/* Gallery */}
        {gallery.length > 1 && (
          <Card className="p-4 space-y-3">
            <h4 className="text-sm font-semibold text-foreground">Galeria ({gallery.length})</h4>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-4 xl:grid-cols-5 gap-2">
              {gallery.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setSelected(img)}
                  className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                    selected?.url === img.url ? "border-primary ring-1 ring-primary" : "border-border hover:border-primary/50"
                  }`}
                >
                  <img src={img.url} alt={img.prompt} className="w-full h-full object-cover" loading="lazy" />
                </button>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}
