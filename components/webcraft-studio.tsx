"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Globe, Loader2, Rocket, Download, Edit3, Check, Maximize2, RefreshCw,
  Smartphone, Monitor, Tablet, Code2, Eye, ImagePlus, Palette, Layout,
  Zap, Star, ShoppingCart, Briefcase, Heart, GraduationCap, Home, Calendar, Pen,
  Sparkles, Settings2, ChevronDown, ChevronUp, Wand2, ArrowRight, Play
} from "lucide-react"

const CATEGORIES = [
  { id: "startup", name: "Startup/Tech", icon: Zap },
  { id: "ecommerce", name: "E-commerce", icon: ShoppingCart },
  { id: "restaurant", name: "Restaurante", icon: Star },
  { id: "portfolio", name: "Portfolio", icon: Briefcase },
  { id: "services", name: "Servicos", icon: Globe },
  { id: "health", name: "Saude", icon: Heart },
  { id: "education", name: "Educacao", icon: GraduationCap },
  { id: "realestate", name: "Imobiliaria", icon: Home },
  { id: "events", name: "Eventos", icon: Calendar },
  { id: "blog", name: "Blog", icon: Pen },
]

const TEMPLATES = [
  { id: "modern", name: "Moderno", desc: "Clean, flat, shadows suaves" },
  { id: "minimal", name: "Minimalista", desc: "Espaco branco, tipografia" },
  { id: "bold", name: "Bold", desc: "Cores fortes, impactante" },
  { id: "elegant", name: "Elegante", desc: "Luxo, gradientes subtis" },
  { id: "dark", name: "Dark Mode", desc: "Fundo escuro, neon" },
  { id: "corporate", name: "Corporativo", desc: "Profissional, sobrio" },
]

const COLOR_SCHEMES = [
  { id: "blue", name: "Azul", color: "#3B82F6" },
  { id: "green", name: "Verde", color: "#10B981" },
  { id: "purple", name: "Roxo", color: "#8B5CF6" },
  { id: "red", name: "Vermelho", color: "#EF4444" },
  { id: "orange", name: "Laranja", color: "#F97316" },
  { id: "pink", name: "Rosa", color: "#EC4899" },
  { id: "teal", name: "Teal", color: "#14B8A6" },
  { id: "indigo", name: "Indigo", color: "#6366F1" },
  { id: "amber", name: "Amber", color: "#F59E0B" },
  { id: "cyan", name: "Cyan", color: "#06B6D4" },
]

const SECTIONS = [
  { id: "hero", name: "Hero" },
  { id: "features", name: "Funcionalidades" },
  { id: "about", name: "Sobre" },
  { id: "services", name: "Servicos" },
  { id: "pricing", name: "Precos" },
  { id: "testimonials", name: "Testemunhos" },
  { id: "team", name: "Equipa" },
  { id: "faq", name: "FAQ" },
  { id: "contact", name: "Contacto" },
  { id: "cta", name: "Call to Action" },
  { id: "chatbot", name: "Chatbot" },
  { id: "newsletter", name: "Newsletter" },
  { id: "gallery", name: "Galeria" },
  { id: "blog", name: "Blog" },
]

const EXAMPLE_PROMPTS = [
  "Landing page para uma app de fitness com subscricao mensal",
  "Website para restaurante japones moderno em Lisboa",
  "Portfolio para fotografo de casamentos",
  "Loja online de roupa sustentavel",
  "Site para clinica dentaria com marcacoes online",
  "Pagina para agencia de marketing digital",
]

type ViewMode = "desktop" | "tablet" | "mobile"

export function WebCraftStudio() {
  const [websitePrompt, setWebsitePrompt] = useState("")
  const [generatedWebsite, setGeneratedWebsite] = useState<string | null>(null)
  const [editMode, setEditMode] = useState(false)
  const [editableHtml, setEditableHtml] = useState("")
  const [uploadedImages, setUploadedImages] = useState<{ id: string; dataUrl: string; name: string }[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState("startup")
  const [selectedTemplate, setSelectedTemplate] = useState("modern")
  const [selectedColorScheme, setSelectedColorScheme] = useState("blue")
  const [businessName, setBusinessName] = useState("")
  const [businessContact, setBusinessContact] = useState("")
  const [selectedSections, setSelectedSections] = useState<string[]>(["hero", "features", "about", "cta", "contact"])
  const [viewMode, setViewMode] = useState<ViewMode>("desktop")
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [showTutorial, setShowTutorial] = useState(true)
  const [generationProgress, setGenerationProgress] = useState(0)

  const chosenColor = COLOR_SCHEMES.find((c) => c.id === selectedColorScheme)

  // Auto-hide tutorial after first generation
  useEffect(() => {
    if (generatedWebsite) {
      setShowTutorial(false)
    }
  }, [generatedWebsite])

  const generateWebsite = async () => {
    if (!websitePrompt.trim()) {
      alert("Por favor, descreve o website que queres criar")
      return
    }

    setIsGenerating(true)
    setGeneratedWebsite(null)
    setEditMode(false)
    setGenerationProgress(0)

    // Simulate progress
    const progressInterval = setInterval(() => {
      setGenerationProgress(prev => Math.min(prev + Math.random() * 15, 90))
    }, 500)

    try {
      const response = await fetch("/api/generate-website", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: websitePrompt,
          template: selectedTemplate,
          category: selectedCategory,
          palette: chosenColor
            ? { name: chosenColor.name, primary: chosenColor.color, colors: [chosenColor.color, "#ffffff", "#f8fafc"] }
            : undefined,
          features: selectedSections,
          businessName,
          businessPhone: "",
          businessEmail: businessContact,
        }),
      })

      if (!response.body) throw new Error("No response body")
      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let html = ""
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        html += decoder.decode(value, { stream: true })
        const clean = html.replace(/^```html?\n?/i, "").replace(/\n?```$/i, "")
        setGeneratedWebsite(clean)
      }
      const finalHtml = html.replace(/^```html?\n?/i, "").replace(/\n?```$/i, "")
      setGeneratedWebsite(finalHtml)
      setEditableHtml(finalHtml)
      setGenerationProgress(100)
    } catch (err: any) {
      alert(`Erro ao gerar website: ${err.message}`)
    } finally {
      clearInterval(progressInterval)
      setIsGenerating(false)
    }
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    files.forEach((file) => {
      const reader = new FileReader()
      reader.onload = (ev) => {
        setUploadedImages((prev) => [
          ...prev,
          { id: Date.now().toString(), dataUrl: ev.target?.result as string, name: file.name },
        ])
      }
      reader.readAsDataURL(file)
    })
  }

  const insertImage = (dataUrl: string) => {
    const tag = `<img src="${dataUrl}" alt="Imagem" style="max-width:100%;height:auto;" />`
    setEditableHtml((prev) => prev + tag)
    if (editMode) setGeneratedWebsite(editableHtml + tag)
  }

  const downloadHtml = () => {
    if (!generatedWebsite) return
    const blob = new Blob([generatedWebsite], { type: "text/html" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${businessName || "website"}.html`
    a.click()
    URL.revokeObjectURL(url)
  }

  const previewWidth = viewMode === "desktop" ? "100%" : viewMode === "tablet" ? "768px" : "375px"

  // If website is generated, show preview
  if (generatedWebsite) {
    return (
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {/* Preview header */}
        <div className="shrink-0 px-4 py-3 border-b border-border flex items-center justify-between gap-3 bg-card">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" className="h-8 gap-2" onClick={() => { setGeneratedWebsite(null); setShowTutorial(false) }}>
              <RefreshCw className="h-3.5 w-3.5" />
              Novo Website
            </Button>
            <div className="flex items-center gap-1 p-1 rounded-lg bg-muted">
              {[
                { mode: "desktop" as ViewMode, icon: Monitor },
                { mode: "tablet" as ViewMode, icon: Tablet },
                { mode: "mobile" as ViewMode, icon: Smartphone },
              ].map(({ mode, icon: Icon }) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={`p-1.5 rounded-md transition-colors ${
                    viewMode === mode ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground"
                  }`}
                  title={mode}
                >
                  <Icon className="h-4 w-4" />
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant={editMode ? "default" : "outline"}
              size="sm"
              className="h-8 gap-2"
              onClick={() => {
                if (editMode) setGeneratedWebsite(editableHtml)
                else setEditableHtml(generatedWebsite || "")
                setEditMode(!editMode)
              }}
            >
              {editMode ? <><Check className="h-3.5 w-3.5" />Guardar</> : <><Code2 className="h-3.5 w-3.5" />Editar HTML</>}
            </Button>
            <Button variant="outline" size="sm" className="h-8 gap-2" onClick={downloadHtml}>
              <Download className="h-3.5 w-3.5" />
              Download
            </Button>
            <Button variant="outline" size="sm" className="h-8 gap-2" onClick={() => {
              const w = window.open("", "_blank")
              if (w) { w.document.write(generatedWebsite); w.document.close() }
            }}>
              <Maximize2 className="h-3.5 w-3.5" />
              Fullscreen
            </Button>
          </div>
        </div>

        {/* Preview body */}
        <div className="flex-1 min-h-0 bg-muted/30 flex items-start justify-center overflow-auto p-4">
          {editMode ? (
            <Textarea
              value={editableHtml}
              onChange={(e) => setEditableHtml(e.target.value)}
              className="w-full h-full font-mono text-xs resize-none border-0 bg-card rounded-xl"
              placeholder="Edita o HTML aqui..."
            />
          ) : (
            <div
              className="transition-all duration-300 bg-white shadow-2xl rounded-xl overflow-hidden"
              style={{ width: previewWidth, minHeight: "400px" }}
            >
              <iframe
                srcDoc={generatedWebsite}
                className="w-full border-0"
                style={{ height: "80dvh" }}
                title="Website Preview"
              />
            </div>
          )}
        </div>

        {/* Image upload drawer */}
        {uploadedImages.length > 0 && (
          <div className="shrink-0 p-3 border-t border-border bg-card">
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              <span className="text-xs text-muted-foreground shrink-0">Imagens:</span>
              {uploadedImages.map((img) => (
                <button
                  key={img.id}
                  onClick={() => insertImage(img.dataUrl)}
                  className="shrink-0 flex items-center gap-2 px-2 py-1 bg-muted rounded-lg hover:bg-muted/80 transition-colors"
                >
                  <img src={img.dataUrl} alt={img.name} className="w-8 h-8 object-cover rounded" />
                  <span className="text-xs truncate max-w-20">{img.name}</span>
                </button>
              ))}
              <label className="shrink-0 flex items-center gap-1 px-3 py-1.5 bg-primary/10 text-primary rounded-lg cursor-pointer hover:bg-primary/20 transition-colors text-xs">
                <ImagePlus className="h-3.5 w-3.5" />
                Adicionar
                <input type="file" accept="image/*" multiple onChange={handleImageUpload} className="hidden" />
              </label>
            </div>
          </div>
        )}
      </div>
    )
  }

  // Main creation interface
  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-auto">
      <div className="flex-1 max-w-4xl mx-auto w-full p-4 md:p-6 space-y-6">
        
        {/* Tutorial Banner */}
        {showTutorial && (
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/20 via-violet-500/10 to-primary/5 border border-primary/20 p-6">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
            <div className="relative">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center shrink-0">
                  <Wand2 className="h-6 w-6 text-primary-foreground" />
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-bold mb-2">Cria o teu website em segundos</h2>
                  <p className="text-muted-foreground mb-4">
                    Basta descreveres o que precisas e a IA gera um website profissional completo. 
                    Sem conhecimentos de codigo necessarios!
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary" className="gap-1">
                      <Sparkles className="h-3 w-3" />
                      Geracao por IA
                    </Badge>
                    <Badge variant="secondary" className="gap-1">
                      <Globe className="h-3 w-3" />
                      Responsivo
                    </Badge>
                    <Badge variant="secondary" className="gap-1">
                      <Download className="h-3 w-3" />
                      Download HTML
                    </Badge>
                  </div>
                </div>
                <button 
                  onClick={() => setShowTutorial(false)}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  &times;
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Main Prompt Input */}
        <div className="space-y-4">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-violet-500/20 to-primary/20 rounded-2xl blur-xl opacity-50" />
            <div className="relative bg-card border border-border rounded-2xl p-4 md:p-6 space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <Globe className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">Descreve o teu website</h3>
              </div>
              
              <Textarea
                value={websitePrompt}
                onChange={(e) => setWebsitePrompt(e.target.value)}
                placeholder="Ex: Landing page para uma startup de tecnologia que oferece software de gestao para PMEs, com precos, testemunhos de clientes e formulario de contacto..."
                className="min-h-[120px] text-base resize-none border-0 bg-muted/50 focus-visible:ring-1 focus-visible:ring-primary rounded-xl"
              />

              {/* Example prompts */}
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">Exemplos rapidos:</p>
                <div className="flex flex-wrap gap-2">
                  {EXAMPLE_PROMPTS.slice(0, 3).map((prompt, i) => (
                    <button
                      key={i}
                      onClick={() => setWebsitePrompt(prompt)}
                      className="px-3 py-1.5 text-xs bg-muted hover:bg-muted/80 rounded-full transition-colors text-left"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Generate button */}
              <Button 
                onClick={generateWebsite} 
                disabled={isGenerating || !websitePrompt.trim()} 
                className="w-full h-12 text-base gap-2 rounded-xl"
                size="lg"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    A gerar website... {Math.round(generationProgress)}%
                  </>
                ) : (
                  <>
                    <Rocket className="h-5 w-5" />
                    Gerar Website com IA
                    <ArrowRight className="h-4 w-4 ml-1" />
                  </>
                )}
              </Button>

              {/* Progress bar */}
              {isGenerating && (
                <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-primary to-violet-500 transition-all duration-300"
                    style={{ width: `${generationProgress}%` }}
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Advanced Options (Collapsible) */}
        <div className="space-y-4">
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <Settings2 className="h-4 w-4" />
            Opcoes avancadas (opcional)
            {showAdvanced ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>

          {showAdvanced && (
            <div className="grid gap-6 md:grid-cols-2 animate-in slide-in-from-top-2 duration-200">
              {/* Category */}
              <div className="space-y-3 bg-card border border-border rounded-xl p-4">
                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Categoria</Label>
                <div className="grid grid-cols-2 gap-1.5">
                  {CATEGORIES.map(({ id, name, icon: Icon }) => (
                    <button
                      key={id}
                      onClick={() => setSelectedCategory(id)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium border transition-all ${
                        selectedCategory === id
                          ? "bg-primary text-primary-foreground border-primary"
                          : "border-border hover:border-primary/50 hover:bg-primary/5"
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5 shrink-0" />
                      {name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Template */}
              <div className="space-y-3 bg-card border border-border rounded-xl p-4">
                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Estilo Visual</Label>
                <div className="grid grid-cols-2 gap-1.5">
                  {TEMPLATES.map(({ id, name, desc }) => (
                    <button
                      key={id}
                      onClick={() => setSelectedTemplate(id)}
                      className={`flex flex-col items-start px-3 py-2 rounded-lg text-xs border transition-all ${
                        selectedTemplate === id
                          ? "bg-primary text-primary-foreground border-primary"
                          : "border-border hover:border-primary/50 hover:bg-primary/5"
                      }`}
                    >
                      <span className="font-semibold">{name}</span>
                      <span className={`text-[10px] mt-0.5 ${selectedTemplate === id ? "text-primary-foreground/70" : "text-muted-foreground"}`}>{desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Colour */}
              <div className="space-y-3 bg-card border border-border rounded-xl p-4">
                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1">
                  <Palette className="h-3 w-3" />
                  Cor Principal
                </Label>
                <div className="flex flex-wrap gap-2">
                  {COLOR_SCHEMES.map((c) => (
                    <button
                      key={c.id}
                      title={c.name}
                      onClick={() => setSelectedColorScheme(c.id)}
                      className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${
                        selectedColorScheme === c.id ? "border-foreground scale-110 ring-2 ring-offset-2 ring-primary" : "border-transparent"
                      }`}
                      style={{ backgroundColor: c.color }}
                    />
                  ))}
                </div>
              </div>

              {/* Business info */}
              <div className="space-y-3 bg-card border border-border rounded-xl p-4">
                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Informacao do Negocio</Label>
                <div className="space-y-2">
                  <Input
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder="Nome do negocio"
                    className="text-sm h-9"
                  />
                  <Input
                    value={businessContact}
                    onChange={(e) => setBusinessContact(e.target.value)}
                    placeholder="Email ou telefone"
                    className="text-sm h-9"
                  />
                </div>
              </div>

              {/* Sections - Full width */}
              <div className="space-y-3 bg-card border border-border rounded-xl p-4 md:col-span-2">
                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Seccoes do Website</Label>
                <div className="flex flex-wrap gap-2">
                  {SECTIONS.map((s) => (
                    <Badge
                      key={s.id}
                      variant={selectedSections.includes(s.id) ? "default" : "outline"}
                      className="cursor-pointer text-xs select-none hover:opacity-80 transition-opacity px-3 py-1"
                      onClick={() =>
                        setSelectedSections((prev) =>
                          prev.includes(s.id) ? prev.filter((x) => x !== s.id) : [...prev, s.id]
                        )
                      }
                    >
                      {s.name}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Quick Start Examples */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-muted-foreground">Inspiracao</h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {EXAMPLE_PROMPTS.map((prompt, i) => (
              <button
                key={i}
                onClick={() => { setWebsitePrompt(prompt); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
                className="group relative overflow-hidden rounded-xl bg-card border border-border p-4 text-left hover:border-primary/50 hover:bg-primary/5 transition-all"
              >
                <div className="absolute top-0 right-0 w-16 h-16 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/10 transition-colors" />
                <p className="text-sm relative z-10">{prompt}</p>
                <div className="flex items-center gap-1 mt-3 text-xs text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                  <Play className="h-3 w-3" />
                  Usar este exemplo
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
