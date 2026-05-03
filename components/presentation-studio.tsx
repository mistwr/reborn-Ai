"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Badge } from "@/components/ui/badge"
import {
  Loader2, Sparkles, Download, Maximize2, RotateCcw,
  Presentation, Palette, Image, ChevronLeft, ChevronRight,
  Monitor, Layers, AlignLeft,
} from "lucide-react"
import ReactMarkdown from "react-markdown"

// ── Templates ─────────────────────────────────────────────────────────────────
const TEMPLATES = [
  { id: "modern",    name: "Moderno",       accent: "#3b82f6", dark: true,  preview: "from-[#0f172a] to-[#1e3a5f]" },
  { id: "tech",      name: "Tecnologia",    accent: "#06b6d4", dark: true,  preview: "from-[#020617] to-[#0f172a]" },
  { id: "elegant",   name: "Elegante",      accent: "#d4af37", dark: true,  preview: "from-[#1c1917] to-[#2c2420]" },
  { id: "pitch",     name: "Pitch Deck",    accent: "#00ff88", dark: true,  preview: "from-[#0a0a0a] to-[#111111]" },
  { id: "neon",      name: "Neon",          accent: "#bf00ff", dark: true,  preview: "from-[#0d001a] to-[#1a0033]" },
  { id: "ocean",     name: "Oceano",        accent: "#38bdf8", dark: true,  preview: "from-[#0c4a6e] to-[#164e63]" },
  { id: "sunset",    name: "Pôr do Sol",    accent: "#fb923c", dark: true,  preview: "from-[#7c2d12] to-[#991b1b]" },
  { id: "nature",    name: "Natureza",      accent: "#4ade80", dark: true,  preview: "from-[#052e16] to-[#14532d]" },
  { id: "corporate", name: "Corporativo",   accent: "#1d4ed8", dark: false, preview: "from-[#f8fafc] to-[#e2e8f0]" },
  { id: "creative",  name: "Criativo",      accent: "#a855f7", dark: false, preview: "from-[#fdf4ff] to-[#ede9fe]" },
  { id: "minimal",   name: "Minimalista",   accent: "#171717", dark: false, preview: "from-white to-[#f5f5f5]" },
  { id: "pastel",    name: "Pastel",        accent: "#f472b6", dark: false, preview: "from-[#fefce8] to-[#fce7f3]" },
]

// ── Quick-start topics ─────────────────────────────────────────────────────────
const TOPICS = [
  { label: "Pitch de Startup", prompt: "Pitch de startup inovadora para investidores: problema, solução, mercado, modelo de negócio e roadmap" },
  { label: "Marketing Digital", prompt: "Estratégia de marketing digital: redes sociais, SEO, email marketing, funil de vendas e métricas" },
  { label: "Plano de Negócios", prompt: "Plano de negócios completo: visão, mercado-alvo, proposta de valor, financeiro e plano de ação" },
  { label: "Relatório Mensal", prompt: "Relatório mensal de resultados de empresa: KPIs, conquistas, desafios e próximos passos" },
  { label: "Formação de Equipa", prompt: "Formação de equipa sobre produtividade e comunicação eficaz no trabalho remoto" },
  { label: "Lançamento de Produto", prompt: "Lançamento de novo produto tecnológico: funcionalidades, benefícios, preços e estratégia go-to-market" },
  { label: "Relatório de Vendas", prompt: "Relatório de performance de vendas: metas, resultados, análise e estratégias de melhoria" },
  { label: "Proposta de Projeto", prompt: "Proposta de projeto para cliente: âmbito, metodologia, equipa, cronograma e investimento" },
  { label: "Formação de Liderança", prompt: "Workshop de liderança transformacional: competências, casos práticos e plano de desenvolvimento" },
  { label: "Análise de Mercado", prompt: "Análise de mercado: tendências, concorrência, oportunidades, ameaças e recomendações estratégicas" },
  { label: "Sustentabilidade", prompt: "Estratégia de sustentabilidade empresarial: metas ESG, iniciativas, impacto e comunicação" },
  { label: "Inovação e IA", prompt: "Inovação com Inteligência Artificial: casos de uso, implementação, ética e futuro do trabalho" },
]

export function PresentationStudio() {
  const [topic, setTopic] = useState("")
  const [template, setTemplate] = useState("modern")
  const [slideCount, setSlideCount] = useState(8)
  const [loading, setLoading] = useState(false)
  const [generatedHtml, setGeneratedHtml] = useState<string | null>(null)
  const [slidesData, setSlidesData] = useState<any[]>([])
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<"settings" | "templates" | "preview">("settings")

  // ── Generate ───────────────────────────────────────────────────────────────
  async function generate() {
    if (!topic.trim()) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/generate-presentation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: topic, template, slides: slideCount }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error || "Erro desconhecido")
      setGeneratedHtml(data.html)
      setSlidesData(data.slides ?? [])
      setActiveTab("preview")
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  function download() {
    if (!generatedHtml) return
    const blob = new Blob([generatedHtml], { type: "text/html" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${topic.slice(0, 40).replace(/[^a-z0-9]/gi, "-")}.html`
    a.click()
    URL.revokeObjectURL(url)
  }

  function openFullscreen() {
    if (!generatedHtml) return
    const w = window.open("", "_blank")
    if (!w) return
    w.document.write(generatedHtml)
    w.document.close()
  }

  const selectedTemplate = TEMPLATES.find(t => t.id === template) ?? TEMPLATES[0]

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-background">
      {/* ── Tab Bar ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-1 px-4 pt-4 pb-0 border-b border-border shrink-0">
        {(["settings", "templates", "preview"] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 transition-colors capitalize ${
              activeTab === tab
                ? "border-primary text-primary bg-primary/5"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab === "settings" && <AlignLeft className="h-3.5 w-3.5 inline mr-1.5" />}
            {tab === "templates" && <Palette className="h-3.5 w-3.5 inline mr-1.5" />}
            {tab === "preview" && <Monitor className="h-3.5 w-3.5 inline mr-1.5" />}
            {tab === "settings" ? "Conteudo" : tab === "templates" ? "Templates" : "Preview"}
            {tab === "preview" && generatedHtml && (
              <span className="ml-1.5 h-2 w-2 rounded-full bg-primary inline-block" />
            )}
          </button>
        ))}
        <div className="ml-auto flex gap-2 pb-1">
          {generatedHtml && (
            <>
              <Button size="sm" variant="outline" onClick={download} className="h-8">
                <Download className="h-3.5 w-3.5 mr-1.5" />
                Download
              </Button>
              <Button size="sm" variant="outline" onClick={openFullscreen} className="h-8">
                <Maximize2 className="h-3.5 w-3.5 mr-1.5" />
                Ecra Completo
              </Button>
            </>
          )}
        </div>
      </div>

      {/* ── Content Area ──────────────────────────────────────────────────── */}
      <div className="flex-1 min-h-0 overflow-y-auto">

        {/* Settings Tab */}
        {activeTab === "settings" && (
          <div className="max-w-3xl mx-auto p-4 sm:p-6 space-y-6">

            {/* Topic */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Tema da Apresentacao</Label>
              <Textarea
                value={topic}
                onChange={e => setTopic(e.target.value)}
                placeholder="Ex: Estrategia de marketing digital para PMEs em 2025"
                className="min-h-[90px] resize-none"
              />
            </div>

            {/* Quick topics */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground uppercase tracking-wider">Topicos Rapidos</Label>
              <div className="flex flex-wrap gap-2">
                {TOPICS.map(t => (
                  <button
                    key={t.label}
                    onClick={() => setTopic(t.prompt)}
                    className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                      topic === t.prompt
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-border hover:border-primary/50 hover:text-primary"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Slide count */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Numero de Slides</Label>
                <span className="text-sm font-semibold text-primary tabular-nums">{slideCount}</span>
              </div>
              <Slider
                value={[slideCount]}
                onValueChange={([v]) => setSlideCount(v)}
                min={4}
                max={20}
                step={1}
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>4 (conciso)</span>
                <span>12 (equilibrado)</span>
                <span>20 (detalhado)</span>
              </div>
            </div>

            {/* Selected template preview */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Template Selecionado</Label>
              <button
                onClick={() => setActiveTab("templates")}
                className="w-full flex items-center gap-3 p-3 rounded-lg border border-border hover:border-primary/50 transition-colors text-left"
              >
                <div className={`h-10 w-16 rounded bg-gradient-to-br ${selectedTemplate.preview} shrink-0`} />
                <div>
                  <p className="text-sm font-medium">{selectedTemplate.name}</p>
                  <p className="text-xs text-muted-foreground">Clique para mudar template</p>
                </div>
                <div className="ml-auto h-4 w-4 rounded-full" style={{ background: selectedTemplate.accent }} />
              </button>
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive">
                {error}
              </div>
            )}

            <Button
              onClick={generate}
              disabled={loading || !topic.trim()}
              className="w-full h-11"
              size="lg"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  A gerar apresentacao...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Gerar Apresentacao
                </>
              )}
            </Button>
          </div>
        )}

        {/* Templates Tab */}
        {activeTab === "templates" && (
          <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-4">
            <p className="text-sm text-muted-foreground">
              Seleciona o estilo visual para a tua apresentacao. Cada template inclui imagens automaticas de Unsplash.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {TEMPLATES.map(t => (
                <button
                  key={t.id}
                  onClick={() => { setTemplate(t.id); setActiveTab("settings") }}
                  className={`group relative rounded-xl overflow-hidden border-2 transition-all ${
                    template === t.id
                      ? "border-primary shadow-lg shadow-primary/20 scale-[1.02]"
                      : "border-border hover:border-primary/40"
                  }`}
                >
                  {/* Preview swatch */}
                  <div className={`h-20 bg-gradient-to-br ${t.preview} flex items-end p-2`}>
                    {/* Fake slide lines */}
                    <div className="w-full space-y-1">
                      <div className="h-1.5 rounded-full opacity-90" style={{ background: t.accent, width: "60%" }} />
                      <div className="h-1 rounded-full bg-white/20 w-full" />
                      <div className="h-1 rounded-full bg-white/10" style={{ width: "80%" }} />
                    </div>
                  </div>
                  <div className={`px-3 py-2 flex items-center justify-between ${t.dark ? "bg-zinc-900" : "bg-white"}`}>
                    <span className={`text-xs font-medium ${t.dark ? "text-white" : "text-zinc-900"}`}>{t.name}</span>
                    <div className="h-3 w-3 rounded-full" style={{ background: t.accent }} />
                  </div>
                  {template === t.id && (
                    <div className="absolute top-2 right-2 h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                      <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                        <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
                      </svg>
                    </div>
                  )}
                </button>
              ))}
            </div>

            {/* Image sources info */}
            <div className="mt-4 p-4 rounded-lg bg-muted/40 border border-border text-sm space-y-1">
              <p className="font-medium">Fontes de imagens gratuitas integradas</p>
              <p className="text-muted-foreground text-xs">
                Cada slide inclui automaticamente imagens relevantes de <strong>Unsplash</strong> e <strong>Picsum</strong>
                — sem limite de uso, sem API key necessaria.
              </p>
            </div>
          </div>
        )}

        {/* Preview Tab */}
        {activeTab === "preview" && (
          <div className="flex-1 flex flex-col h-full min-h-[500px]">
            {generatedHtml ? (
              <div className="flex flex-col h-full">
                {/* Slides outline */}
                {slidesData.length > 0 && (
                  <div className="px-4 py-3 border-b border-border bg-muted/30 shrink-0">
                    <div className="flex gap-2 overflow-x-auto pb-1">
                      {slidesData.map((s, i) => (
                        <div
                          key={i}
                          className="shrink-0 text-xs px-2.5 py-1 rounded-md bg-background border border-border max-w-[120px] truncate"
                          title={s.title}
                        >
                          <span className="text-primary font-medium mr-1">{i + 1}.</span>
                          {s.title}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {/* Iframe */}
                <div className="flex-1 min-h-0 bg-black">
                  <iframe
                    srcDoc={generatedHtml}
                    className="w-full h-full border-0"
                    title="Presentation Preview"
                    style={{ minHeight: "500px" }}
                  />
                </div>
                {/* Controls bar */}
                <div className="px-4 py-3 border-t border-border bg-card flex flex-wrap gap-2 items-center justify-between shrink-0">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Layers className="h-3.5 w-3.5" />
                    <span>{slidesData.length} slides</span>
                    <span>·</span>
                    <span>{TEMPLATES.find(t => t.id === template)?.name}</span>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => { setGeneratedHtml(null); setActiveTab("settings") }}>
                      <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                      Nova
                    </Button>
                    <Button size="sm" variant="outline" onClick={download}>
                      <Download className="h-3.5 w-3.5 mr-1.5" />
                      HTML
                    </Button>
                    <Button size="sm" onClick={openFullscreen}>
                      <Maximize2 className="h-3.5 w-3.5 mr-1.5" />
                      Ecra Completo
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8 text-center">
                <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <Presentation className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <p className="font-medium mb-1">Nenhuma apresentacao gerada</p>
                  <p className="text-sm text-muted-foreground">Vai ao separador Conteudo e gera a tua apresentacao</p>
                </div>
                <Button variant="outline" onClick={() => setActiveTab("settings")}>
                  Ir para Conteudo
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
