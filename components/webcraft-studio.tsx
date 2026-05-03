"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Globe, Loader2, Rocket, Download, Edit3, Check, Maximize2, RefreshCw,
  Smartphone, Monitor, Tablet, Code2, Eye, ImagePlus, Palette, Layout,
  Zap, Star, ShoppingCart, Briefcase, Heart, GraduationCap, Home, Calendar, Pen
} from "lucide-react"

const CATEGORIES = [
  { id: "startup", name: "Startup/Tech", icon: Zap },
  { id: "ecommerce", name: "E-commerce", icon: ShoppingCart },
  { id: "restaurant", name: "Restaurante", icon: Star },
  { id: "portfolio", name: "Portfolio", icon: Briefcase },
  { id: "services", name: "Serviços", icon: Globe },
  { id: "health", name: "Saúde", icon: Heart },
  { id: "education", name: "Educação", icon: GraduationCap },
  { id: "realestate", name: "Imobiliária", icon: Home },
  { id: "events", name: "Eventos", icon: Calendar },
  { id: "blog", name: "Blog", icon: Pen },
]

const TEMPLATES = [
  { id: "modern", name: "Moderno", desc: "Clean, flat, shadows suaves" },
  { id: "minimal", name: "Minimalista", desc: "Espaço branco, tipografia" },
  { id: "bold", name: "Bold", desc: "Cores fortes, impactante" },
  { id: "elegant", name: "Elegante", desc: "Luxo, gradientes subtis" },
  { id: "dark", name: "Dark Mode", desc: "Fundo escuro, neon" },
  { id: "corporate", name: "Corporativo", desc: "Profissional, sóbrio" },
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
  { id: "services", name: "Serviços" },
  { id: "pricing", name: "Preços" },
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
  const [selectedSections, setSelectedSections] = useState<string[]>(["hero", "features", "cta"])
  const [viewMode, setViewMode] = useState<ViewMode>("desktop")
  const [activePanel, setActivePanel] = useState<"config" | "preview">("config")

  const chosenColor = COLOR_SCHEMES.find((c) => c.id === selectedColorScheme)

  const generateWebsite = async () => {
    setIsGenerating(true)
    setGeneratedWebsite(null)
    setEditMode(false)
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
      setActivePanel("preview")
    } catch (err: any) {
      alert(`Erro ao gerar website: ${err.message}`)
    } finally {
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

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      {/* Mobile panel switcher */}
      <div className="flex lg:hidden border-b border-border shrink-0">
        <button
          className={`flex-1 py-2.5 text-sm font-medium flex items-center justify-center gap-1.5 ${activePanel === "config" ? "bg-primary/10 text-primary border-b-2 border-primary" : "text-muted-foreground"}`}
          onClick={() => setActivePanel("config")}
        >
          <Layout className="h-3.5 w-3.5" />
          Configurar
        </button>
        <button
          className={`flex-1 py-2.5 text-sm font-medium flex items-center justify-center gap-1.5 ${activePanel === "preview" ? "bg-primary/10 text-primary border-b-2 border-primary" : "text-muted-foreground"}`}
          onClick={() => setActivePanel("preview")}
        >
          <Eye className="h-3.5 w-3.5" />
          Preview
        </button>
      </div>

      <div className="flex-1 flex gap-0 lg:gap-4 p-0 lg:p-4 min-h-0 overflow-hidden">
        {/* Config Panel */}
        <div className={`${activePanel === "config" ? "flex" : "hidden"} lg:flex flex-col w-full lg:w-96 shrink-0 overflow-y-auto lg:rounded-xl border border-border bg-card`}>
          <div className="p-4 border-b border-border flex items-center gap-2 shrink-0">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Globe className="h-4 w-4 text-primary-foreground" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">WebCraft Studio</h3>
              <p className="text-xs text-muted-foreground">Cria websites profissionais com IA</p>
            </div>
          </div>

          <div className="p-4 space-y-5 flex-1">
            {/* Category */}
            <div className="space-y-2">
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
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Template</Label>
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
            <div className="space-y-2">
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
                    className={`w-7 h-7 rounded-full border-2 transition-transform hover:scale-110 ${
                      selectedColorScheme === c.id ? "border-foreground scale-110 ring-2 ring-offset-1 ring-primary" : "border-transparent"
                    }`}
                    style={{ backgroundColor: c.color }}
                  />
                ))}
              </div>
            </div>

            {/* Business info */}
            <div className="space-y-3">
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

            {/* Sections */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Seccoes</Label>
              <div className="flex flex-wrap gap-1.5">
                {SECTIONS.map((s) => (
                  <Badge
                    key={s.id}
                    variant={selectedSections.includes(s.id) ? "default" : "outline"}
                    className="cursor-pointer text-xs select-none hover:opacity-80 transition-opacity"
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

            {/* Description */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Descricao</Label>
              <Textarea
                value={websitePrompt}
                onChange={(e) => setWebsitePrompt(e.target.value)}
                placeholder="Descreve o site que queres criar..."
                className="min-h-[80px] text-sm resize-none"
              />
            </div>

            <Button onClick={generateWebsite} disabled={isGenerating} className="w-full h-10 gap-2">
              {isGenerating ? (
                <><Loader2 className="h-4 w-4 animate-spin" />A gerar website...</>
              ) : (
                <><Rocket className="h-4 w-4" />Gerar Website</>
              )}
            </Button>

            {/* Image upload (only after generation) */}
            {generatedWebsite && (
              <div className="pt-3 border-t border-border space-y-3">
                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1">
                  <ImagePlus className="h-3 w-3" />
                  Inserir Imagens
                </Label>
                <Input type="file" accept="image/*" multiple onChange={handleImageUpload} className="text-xs h-9" />
                {uploadedImages.length > 0 && (
                  <div className="space-y-1.5 max-h-36 overflow-y-auto">
                    {uploadedImages.map((img) => (
                      <button
                        key={img.id}
                        onClick={() => insertImage(img.dataUrl)}
                        className="w-full flex items-center gap-2 p-2 bg-muted rounded-lg hover:bg-muted/80 transition-colors text-left"
                      >
                        <img src={img.dataUrl} alt={img.name} className="w-9 h-9 object-cover rounded" />
                        <span className="text-xs flex-1 truncate">{img.name}</span>
                        <Badge variant="outline" className="text-[10px] shrink-0">Inserir</Badge>
                      </button>
                    ))}
                  </div>
                )}

                {/* Edit toggle */}
                <Button
                  variant={editMode ? "default" : "outline"}
                  size="sm"
                  className="w-full gap-2"
                  onClick={() => {
                    if (editMode) setGeneratedWebsite(editableHtml)
                    else setEditableHtml(generatedWebsite || "")
                    setEditMode(!editMode)
                  }}
                >
                  {editMode ? (
                    <><Check className="h-3.5 w-3.5" />Guardar Alteracoes</>
                  ) : (
                    <><Edit3 className="h-3.5 w-3.5" />Editar HTML</>
                  )}
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Preview Panel */}
        <div className={`${activePanel === "preview" ? "flex" : "hidden"} lg:flex flex-col flex-1 min-h-0 min-w-0 lg:rounded-xl border border-border bg-card overflow-hidden`}>
          {/* Preview header */}
          <div className="shrink-0 px-4 py-2.5 border-b border-border flex items-center justify-between gap-3">
            <div className="flex items-center gap-1">
              {[
                { mode: "desktop" as ViewMode, icon: Monitor },
                { mode: "tablet" as ViewMode, icon: Tablet },
                { mode: "mobile" as ViewMode, icon: Smartphone },
              ].map(({ mode, icon: Icon }) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={`p-1.5 rounded-md transition-colors ${
                    viewMode === mode ? "bg-primary text-primary-foreground" : "hover:bg-muted text-muted-foreground"
                  }`}
                  title={mode}
                >
                  <Icon className="h-3.5 w-3.5" />
                </button>
              ))}
            </div>

            <span className="text-xs text-muted-foreground flex items-center gap-1">
              {editMode ? <><Code2 className="h-3 w-3" />Editor HTML</> : <><Eye className="h-3 w-3" />Preview</>}
            </span>

            {generatedWebsite && (
              <div className="flex items-center gap-1.5">
                <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => { setGeneratedWebsite(null); setActivePanel("config") }}>
                  <RefreshCw className="h-3 w-3" />
                  Novo
                </Button>
                <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={downloadHtml}>
                  <Download className="h-3 w-3" />
                  Download
                </Button>
                <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => {
                  const w = window.open("", "_blank")
                  if (w) { w.document.write(generatedWebsite); w.document.close() }
                }}>
                  <Maximize2 className="h-3 w-3" />
                  Fullscreen
                </Button>
              </div>
            )}
          </div>

          {/* Preview body */}
          <div className="flex-1 min-h-0 bg-muted/30 flex items-start justify-center overflow-auto p-4">
            {editMode && generatedWebsite ? (
              <Textarea
                value={editableHtml}
                onChange={(e) => setEditableHtml(e.target.value)}
                className="w-full h-full font-mono text-xs resize-none border-0 bg-card"
                placeholder="Edita o HTML aqui..."
              />
            ) : generatedWebsite ? (
              <div
                className="transition-all duration-300 bg-white shadow-xl rounded-lg overflow-hidden"
                style={{ width: previewWidth, minHeight: "400px" }}
              >
                <iframe
                  srcDoc={generatedWebsite}
                  className="w-full border-0"
                  style={{ height: "70dvh" }}
                  title="Website Preview"
                />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <Globe className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">Preview do Website</p>
                  <p className="text-sm text-muted-foreground mt-1">Configura e clica em &quot;Gerar Website&quot; para ver o resultado aqui</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
