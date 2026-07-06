"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Slider } from "@/components/ui/slider"
import {
  BookOpen,
  Sparkles,
  Loader2,
  Download,
  Maximize2,
  RotateCcw,
  FileText,
  Palette,
  Layers,
} from "lucide-react"

// ── Style catalogue ───────────────────────────────────────────────────────────
const STYLES = [
  { id: "modern",   name: "Moderno",      gradient: "from-blue-600 to-indigo-600",    preview: "#3b82f6" },
  { id: "classic",  name: "Classico",     gradient: "from-amber-700 to-yellow-600",   preview: "#b45309" },
  { id: "minimal",  name: "Minimalista",  gradient: "from-gray-600 to-gray-400",      preview: "#6b7280" },
  { id: "magazine", name: "Magazine",     gradient: "from-rose-600 to-pink-600",      preview: "#e11d48" },
  { id: "academic", name: "Academico",    gradient: "from-emerald-700 to-teal-600",   preview: "#047857" },
  { id: "creative", name: "Criativo",     gradient: "from-violet-600 to-purple-600",  preview: "#7c3aed" },
  { id: "dark",     name: "Escuro",       gradient: "from-gray-900 to-gray-800",      preview: "#111827" },
  { id: "elegant",  name: "Elegante",     gradient: "from-amber-400 to-yellow-300",   preview: "#d97706" },
  { id: "tech",     name: "Tecnologia",   gradient: "from-cyan-600 to-blue-600",      preview: "#0891b2" },
  { id: "nature",   name: "Natureza",     gradient: "from-green-700 to-emerald-500",  preview: "#15803d" },
  { id: "vintage",  name: "Vintage",      gradient: "from-orange-700 to-amber-600",   preview: "#c2410c" },
  { id: "bold",     name: "Bold",         gradient: "from-red-600 to-orange-600",     preview: "#dc2626" },
]

// ── Quick topic templates ─────────────────────────────────────────────────────
const QUICK_TOPICS = [
  { label: "Marketing Digital",   style: "modern",   chapters: 7 },
  { label: "Produtividade",       style: "minimal",  chapters: 5 },
  { label: "Nutricao Saudavel",   style: "nature",   chapters: 8 },
  { label: "Empreendedorismo",    style: "bold",     chapters: 10 },
  { label: "Programacao Python",  style: "tech",     chapters: 8 },
  { label: "Mindfulness",         style: "elegant",  chapters: 6 },
  { label: "Fotografia",          style: "creative", chapters: 6 },
  { label: "Financas Pessoais",   style: "classic",  chapters: 7 },
]

// ─────────────────────────────────────────────────────────────────────────────
export function EbookStudio() {
  const [prompt, setPrompt]           = useState("")
  const [style, setStyle]             = useState("modern")
  const [chapters, setChapters]       = useState(5)
  const [generated, setGenerated]     = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [activeTab, setActiveTab]     = useState<"create" | "templates" | "preview">("create")

  const generate = async () => {
    if (!prompt.trim()) return
    setIsGenerating(true)
    setGenerated(null)
    setActiveTab("preview")
    try {
      const res = await fetch("/api/generate-ebook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, style, chapters }),
      })
      const data = await res.json()
      if (data.html) {
        setGenerated(data.html)
      } else {
        throw new Error(data.error || "Erro ao gerar ebook")
      }
    } catch (err: any) {
      alert(`Falha: ${err.message}`)
      setActiveTab("create")
    } finally {
      setIsGenerating(false)
    }
  }

  const download = () => {
    if (!generated) return
    const blob = new Blob([generated], { type: "text/html" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `ebook-${prompt.slice(0, 20).replace(/\s+/g, "-")}.html`
    a.click()
    URL.revokeObjectURL(url)
  }

  const selectedStyle = STYLES.find(s => s.id === style) ?? STYLES[0]

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      {/* Tab bar */}
      <div className="border-b border-border px-4 pt-3 pb-0 shrink-0 flex gap-1">
        {[
          { id: "create" as const,    icon: FileText,  label: "Criar" },
          { id: "templates" as const, icon: Palette,   label: "Templates" },
          { id: "preview" as const,   icon: Layers,    label: "Preview" },
        ].map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
            {id === "preview" && generated && (
              <span className="h-1.5 w-1.5 rounded-full bg-green-400 ml-0.5" />
            )}
          </button>
        ))}
      </div>

      {/* Create tab */}
      {activeTab === "create" && (
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-2xl mx-auto p-4 space-y-5">
            <Card className="p-5 space-y-5">
              <div className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-primary" />
                <h3 className="font-semibold text-lg">Criar Ebook com IA</h3>
              </div>

              {/* Topic */}
              <div className="space-y-1.5">
                <Label>Titulo / Tema do Ebook</Label>
                <Textarea
                  value={prompt}
                  onChange={e => setPrompt(e.target.value)}
                  placeholder="Ex: Guia Completo de Marketing Digital para Iniciantes"
                  className="min-h-[90px]"
                />
              </div>

              {/* Style picker */}
              <div className="space-y-2">
                <Label>Estilo Visual</Label>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {STYLES.map(s => (
                    <button
                      key={s.id}
                      onClick={() => setStyle(s.id)}
                      className={`relative rounded-lg overflow-hidden border-2 transition-all ${
                        style === s.id ? "border-primary shadow-lg shadow-primary/20" : "border-border hover:border-muted-foreground"
                      }`}
                    >
                      <div className={`h-10 bg-gradient-to-br ${s.gradient}`} />
                      <div className="py-1 px-1 text-center">
                        <span className="text-[10px] font-medium leading-none">{s.name}</span>
                      </div>
                      {style === s.id && (
                        <div className="absolute top-1 right-1 h-3 w-3 rounded-full bg-primary border-2 border-background" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Chapters slider */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Numero de Capitulos</Label>
                  <Badge variant="outline" className="font-mono">{chapters}</Badge>
                </div>
                <Slider value={[chapters]} onValueChange={([v]) => setChapters(v)} min={3} max={15} step={1} />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>3 (resumido)</span>
                  <span>15 (completo)</span>
                </div>
              </div>

              <Button onClick={generate} disabled={isGenerating || !prompt.trim()} className="w-full" size="lg">
                {isGenerating
                  ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />A gerar ebook...</>
                  : <><Sparkles className="h-4 w-4 mr-2" />Gerar Ebook</>}
              </Button>
            </Card>

            {/* Quick start */}
            <Card className="p-5">
              <h4 className="font-medium mb-3 text-sm text-muted-foreground uppercase tracking-wide">Inicio Rapido</h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {QUICK_TOPICS.map(t => (
                  <button
                    key={t.label}
                    onClick={() => { setPrompt(t.label); setStyle(t.style); setChapters(t.chapters) }}
                    className="p-3 rounded-lg border bg-card hover:bg-muted transition-colors text-left group"
                  >
                    <div className="text-xs font-medium group-hover:text-primary transition-colors leading-snug">{t.label}</div>
                    <div className="text-[10px] text-muted-foreground mt-1">{t.chapters} cap. · {STYLES.find(s => s.id === t.style)?.name}</div>
                  </button>
                ))}
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* Templates tab */}
      {activeTab === "templates" && (
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto p-4 space-y-4">
            <p className="text-sm text-muted-foreground">Seleciona um estilo para pre-visualizar como ficara o teu ebook.</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {STYLES.map(s => (
                <Card
                  key={s.id}
                  onClick={() => { setStyle(s.id); setActiveTab("create") }}
                  className={`cursor-pointer overflow-hidden transition-all hover:shadow-lg hover:shadow-primary/10 ${style === s.id ? "ring-2 ring-primary" : ""}`}
                >
                  <div className={`h-24 bg-gradient-to-br ${s.gradient} flex items-center justify-center`}>
                    <BookOpen className="h-8 w-8 text-white/80" />
                  </div>
                  <div className="p-3 space-y-1">
                    <p className="font-medium text-sm">{s.name}</p>
                    {style === s.id && (
                      <Badge className="text-[10px] h-4">Selecionado</Badge>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Preview tab */}
      {activeTab === "preview" && (
        <div className="flex-1 flex flex-col min-h-0">
          {/* Toolbar */}
          <div className="border-b border-border px-4 py-2 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <div className={`h-4 w-4 rounded-full bg-gradient-to-br ${selectedStyle.gradient}`} />
              <span className="text-sm font-medium">{selectedStyle.name}</span>
              {isGenerating && <Badge variant="outline" className="gap-1 text-xs"><Loader2 className="h-2.5 w-2.5 animate-spin" />A gerar...</Badge>}
              {generated && !isGenerating && <Badge variant="outline" className="gap-1 text-xs text-green-400 border-green-500/30 bg-green-500/10">Pronto</Badge>}
            </div>
            <div className="flex items-center gap-2">
              {generated && (
                <>
                  <Button size="sm" variant="outline" onClick={() => window.open(URL.createObjectURL(new Blob([generated], { type: "text/html" })), "_blank")}>
                    <Maximize2 className="h-3 w-3 mr-1" />Abrir
                  </Button>
                  <Button size="sm" variant="outline" onClick={download}>
                    <Download className="h-3 w-3 mr-1" />Download
                  </Button>
                </>
              )}
              <Button size="sm" variant="ghost" onClick={() => setActiveTab("create")}>
                <RotateCcw className="h-3 w-3 mr-1" />Novo
              </Button>
            </div>
          </div>

          {/* iframe / placeholder */}
          <div className="flex-1 min-h-0 bg-white">
            {isGenerating ? (
              <div className="h-full flex flex-col items-center justify-center gap-3 bg-background">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">A criar o teu ebook...</p>
                <p className="text-xs text-muted-foreground">Isso pode levar alguns segundos.</p>
              </div>
            ) : generated ? (
              <iframe srcDoc={generated} className="w-full h-full border-0" title="Ebook Preview" />
            ) : (
              <div className="h-full flex flex-col items-center justify-center gap-3 bg-background text-muted-foreground">
                <BookOpen className="h-12 w-12 opacity-30" />
                <p className="text-sm">O preview do ebook aparecera aqui</p>
                <Button variant="outline" size="sm" onClick={() => setActiveTab("create")}>
                  <Sparkles className="h-3 w-3 mr-1" />Criar Ebook
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
