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
  ShieldCheck,
  AlertTriangle,
  Target,
} from "lucide-react"

const MODELS = [
  { id: "flux", label: "Reborn HD", desc: "Alta qualidade + controlo Vision" },
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
  { label: "Produto em destaque", prompt: "Fotografia profissional de produto, produto inteiro claramente visivel, iluminacao de estudio, fundo limpo, alto detalhe" },
  { label: "Paisagem epica", prompt: "Paisagem epica ao golden hour, fotografia ultra realista, profundidade cinematografica, luz dramatica natural" },
  { label: "Retrato profissional", prompt: "Retrato profissional realista, iluminacao de estudio, rosto natural, foco nitido, fundo bokeh" },
  { label: "Arte abstrata", prompt: "Arte digital abstrata, cores vibrantes, formas geometricas, composicao moderna e coerente" },
  { label: "Cidade futurista", prompt: "Cidade cyberpunk futurista de noite, neon, chuva e reflexos, fotografia cinematografica ultra realista" },
  { label: "Logo minimalista", prompt: "Logotipo vetorial minimalista, linhas limpas, simbolo memoravel, fundo simples, sem mockup" },
  { label: "Flyer evento", prompt: "Flyer profissional para evento, hierarquia visual moderna, area limpa para headline e CTA" },
  { label: "Banner web", prompt: "Banner web profissional, composicao horizontal limpa, foco claro, espaco negativo para copy" },
]

interface QualityControl {
  checked: boolean
  matched: boolean
  confidence: number
  reason: string
}

interface GeneratedImg {
  url: string
  prompt: string
  model: string
  size: string
  seed?: number
  provider?: string
  providerSource?: string
  intentDetected?: string
  qualityControl?: QualityControl
  retried?: boolean
  promptUsed?: string
}

function qualityLabel(qc?: QualityControl) {
  if (!qc?.checked) return "Nao verificado"
  if (qc.confidence >= 90) return "Excelente"
  if (qc.confidence >= 75) return "Muito bom"
  if (qc.confidence >= 60) return "Aceitavel"
  return "A melhorar"
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
  const [error, setError] = useState<string | null>(null)

  const buildPrompt = () => {
    let full = prompt.trim()
    if (selectedStyle) full = `${full}. Estilo visual pedido: ${selectedStyle}.`
    return full
  }

  const generate = async (count = batchCount, improve = false) => {
    if (!prompt.trim()) return
    setIsGenerating(true)
    setError(null)

    const size = SIZES.find((s) => s.id === selectedSize)!
    const basePrompt = buildPrompt()
    const requestPrompt = improve
      ? `${basePrompt} REGENERACAO DE QUALIDADE: melhora a fidelidade semantica, torna o sujeito principal inequivoco, completamente visivel, bem enquadrado e elimina elementos irrelevantes ou deformacoes.`
      : basePrompt

    const results: GeneratedImg[] = []
    const quality = selectedModel === "flux" ? "hd" : selectedModel === "turbo" ? "fast" : "standard"

    for (let i = 0; i < count; i++) {
      try {
        const res = await fetch("/api/generate-image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: requestPrompt,
            width: size.w,
            height: size.h,
            model: selectedModel,
            quality,
            style: selectedStyle,
            validate: selectedModel === "flux" || improve,
          }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || "Falha ao gerar imagem")

        if (data.url) {
          results.push({
            url: data.url,
            prompt: basePrompt,
            model: selectedModel,
            size: selectedSize,
            seed: data.seed,
            provider: data.provider,
            providerSource: data.providerSource,
            intentDetected: data.intentDetected,
            qualityControl: data.qualityControl,
            retried: data.retried,
            promptUsed: data.promptUsed,
          })
        }
      } catch (e: any) {
        setError(e?.message || "Nao foi possivel gerar a imagem")
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

  const qc = selected?.qualityControl
  const lowScore = Boolean(qc?.checked && (!qc.matched || qc.confidence < 75))

  return (
    <div className="flex flex-col lg:flex-row h-full gap-4 p-4 overflow-y-auto">
      <div className="lg:w-80 shrink-0 space-y-4">
        <Card className="p-4 space-y-4">
          <div>
            <h3 className="font-semibold flex items-center gap-2 text-foreground">
              <Wand2 className="h-4 w-4 text-primary" />
              Gerador de Imagens IA
            </h3>
            <p className="mt-1 text-[11px] text-muted-foreground">O Reborn melhora o prompt, deteta a intencao e no modo HD valida o resultado com Vision.</p>
          </div>

          <div className="space-y-1.5">
            <Label>Descricao</Label>
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Ex: Um cavalo branco a correr numa praia ao por do sol, corpo inteiro, fotografia realista..."
              className="min-h-[100px] resize-none text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Estilo</Label>
            <div className="flex flex-wrap gap-1.5">
              {STYLES.map((s) => (
                <button
                  key={s}
                  onClick={() => setSelectedStyle(selectedStyle === s ? "" : s)}
                  className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${selectedStyle === s ? "bg-primary text-primary-foreground border-primary" : "bg-muted/40 border-border text-muted-foreground hover:border-primary/60 hover:text-foreground"}`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Modelo</Label>
            <div className="grid grid-cols-3 gap-2">
              {MODELS.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setSelectedModel(m.id)}
                  className={`rounded-lg border p-2 text-left transition-colors ${selectedModel === m.id ? "border-primary bg-primary/10 text-primary" : "border-border bg-muted/30 text-muted-foreground hover:border-primary/50"}`}
                >
                  <div className="text-xs font-semibold">{m.label}</div>
                  <div className="text-[10px] opacity-70 leading-tight">{m.desc}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Tamanho</Label>
            <div className="grid grid-cols-2 gap-1.5">
              {SIZES.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSelectedSize(s.id)}
                  className={`rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${selectedSize === s.id ? "border-primary bg-primary/10 text-primary" : "border-border bg-muted/30 text-muted-foreground hover:border-primary/50"}`}
                >
                  {s.label}
                  <span className="block text-[10px] opacity-60">{s.w}x{s.h}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Quantidade: {batchCount}</Label>
            <div className="flex gap-2">
              {[1, 2, 4].map((n) => (
                <button
                  key={n}
                  onClick={() => setBatchCount(n)}
                  className={`flex-1 rounded-lg border py-1.5 text-xs font-medium transition-colors ${batchCount === n ? "border-primary bg-primary/10 text-primary" : "border-border bg-muted/30 text-muted-foreground hover:border-primary/50"}`}
                >
                  {n}x
                </button>
              ))}
            </div>
          </div>

          {error && <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</div>}

          <Button onClick={() => generate()} disabled={isGenerating || !prompt.trim()} className="w-full" size="lg">
            {isGenerating ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />A gerar e validar...</> : <><Sparkles className="h-4 w-4 mr-2" />Gerar Imagem</>}
          </Button>
        </Card>

        <Card className="p-4 space-y-3">
          <h4 className="text-sm font-semibold flex items-center gap-2"><Layers className="h-4 w-4 text-primary" />Templates Rapidos</h4>
          <div className="space-y-1.5">
            {PROMPT_TEMPLATES.map((t) => (
              <button key={t.label} onClick={() => setPrompt(t.prompt)} className="w-full text-left px-3 py-2 rounded-lg border border-border bg-muted/20 hover:bg-muted/50 hover:border-primary/50 transition-colors text-xs text-foreground">
                <span className="font-medium block">{t.label}</span>
                <span className="text-muted-foreground line-clamp-1">{t.prompt}</span>
              </button>
            ))}
          </div>
        </Card>
      </div>

      <div className="flex-1 min-h-0 space-y-4">
        <Card className="p-4 space-y-3">
          {selected ? (
            <>
              <div className="relative group rounded-lg overflow-hidden bg-muted">
                <img src={selected.url} alt={selected.prompt} className="w-full object-contain max-h-[480px] rounded-lg" loading="lazy" />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center gap-3 opacity-0 group-hover:opacity-100">
                  <button onClick={() => window.open(selected.url, "_blank")} className="bg-black/70 text-white p-2 rounded-full hover:bg-black/90"><Maximize2 className="h-4 w-4" /></button>
                  <button onClick={() => generate(1, true)} className="bg-black/70 text-white p-2 rounded-full hover:bg-black/90"><RefreshCw className="h-4 w-4" /></button>
                  <button onClick={() => downloadImage(selected)} className="bg-black/70 text-white p-2 rounded-full hover:bg-black/90"><Download className="h-4 w-4" /></button>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <p className="text-xs text-muted-foreground flex-1 line-clamp-2">{selected.prompt}</p>
                <button onClick={() => copyPrompt(selected.prompt)} className="shrink-0 p-1.5 rounded border border-border hover:bg-muted/50">
                  {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5 text-muted-foreground" />}
                </button>
              </div>

              <div className="rounded-xl border border-border bg-muted/20 p-3 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="text-[10px] bg-primary/5 border-primary/30 text-primary">Reborn AI</Badge>
                  {selected.intentDetected && <Badge variant="outline" className="text-[10px]"><Target className="h-3 w-3 mr-1" />{selected.intentDetected.replaceAll("_", " ")}</Badge>}
                  {qc?.checked ? (
                    <Badge variant="outline" className={`text-[10px] ${lowScore ? "border-amber-500/40 text-amber-500" : "border-emerald-500/40 text-emerald-500"}`}>
                      {lowScore ? <AlertTriangle className="h-3 w-3 mr-1" /> : <ShieldCheck className="h-3 w-3 mr-1" />}
                      Vision {qc.confidence}/100 · {qualityLabel(qc)}
                    </Badge>
                  ) : <Badge variant="outline" className="text-[10px]">QC {qualityLabel(qc)}</Badge>}
                  {selected.retried && <Badge variant="outline" className="text-[10px] border-primary/30 text-primary">Auto-retry aplicado</Badge>}
                </div>
                {qc?.checked && qc.reason && <p className="text-[11px] text-muted-foreground">{qc.reason}</p>}
                {lowScore && (
                  <Button size="sm" className="w-full" onClick={() => generate(1, true)} disabled={isGenerating}>
                    <Wand2 className="h-3.5 w-3.5 mr-1.5" />Regenerar melhor
                  </Button>
                )}
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className="text-[10px]">{SIZES.find((s) => s.id === selected.size)?.label}</Badge>
                <div className="ml-auto flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => generate(1, true)} disabled={isGenerating}><RefreshCw className="h-3.5 w-3.5 mr-1" />Melhorar</Button>
                  <Button size="sm" variant="outline" onClick={() => window.open(selected.url, "_blank")}><Maximize2 className="h-3.5 w-3.5 mr-1" />Ver</Button>
                  <Button size="sm" onClick={() => downloadImage(selected)}><Download className="h-3.5 w-3.5 mr-1" />Download</Button>
                </div>
              </div>
            </>
          ) : (
            <div className="aspect-square max-h-[480px] flex items-center justify-center text-center text-muted-foreground rounded-lg border-2 border-dashed border-border bg-muted/20">
              <div className="space-y-2"><ImagePlus className="h-12 w-12 mx-auto opacity-30" /><p className="text-sm">A tua imagem aparecera aqui</p><p className="text-xs opacity-60">O modo HD valida automaticamente se a imagem corresponde ao pedido</p></div>
            </div>
          )}
        </Card>

        {gallery.length > 1 && (
          <Card className="p-4 space-y-3">
            <h4 className="text-sm font-semibold text-foreground">Galeria ({gallery.length})</h4>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-4 xl:grid-cols-5 gap-2">
              {gallery.map((img, i) => (
                <button key={i} onClick={() => setSelected(img)} className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all ${selected?.url === img.url ? "border-primary ring-1 ring-primary" : "border-border hover:border-primary/50"}`}>
                  <img src={img.url} alt={img.prompt} className="w-full h-full object-cover" loading="lazy" />
                  {img.qualityControl?.checked && <span className="absolute bottom-1 right-1 rounded bg-black/70 px-1.5 py-0.5 text-[9px] text-white">{img.qualityControl.confidence}/100</span>}
                </button>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}
