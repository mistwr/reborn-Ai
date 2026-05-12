"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Sparkles,
  Download,
  Loader2,
  RefreshCw,
  Copy,
  Check,
  Megaphone,
  Palette,
  Type,
  Layout,
  Instagram,
  Facebook,
  Youtube,
  Linkedin,
  Twitter,
  Monitor,
  Smartphone,
  Square,
  Play,
  Hexagon,
  Wand2,
  Image as ImageIcon,
  Trash2,
} from "lucide-react"

// ─── Types ───────────────────────────────────────────────────────────────────

type Platform = "instagram" | "facebook" | "twitter" | "linkedin" | "youtube" | "tiktok" | "generic"
type ContentType = "post" | "story" | "banner" | "thumbnail"
type TemplateStyle = "gradient" | "photo" | "minimal" | "bold" | "elegant" | "neon"

interface GeneratedDesign {
  dataUrl: string
  type: ContentType
  platform: Platform
  style: TemplateStyle
  timestamp: number
}

// ─── Data ────────────────────────────────────────────────────────────────────

const PLATFORMS: { id: Platform; label: string; icon: any; color: string }[] = [
  { id: "instagram", label: "Instagram", icon: Instagram, color: "#E4405F" },
  { id: "facebook", label: "Facebook", icon: Facebook, color: "#1877F2" },
  { id: "twitter", label: "Twitter/X", icon: Twitter, color: "#1DA1F2" },
  { id: "linkedin", label: "LinkedIn", icon: Linkedin, color: "#0A66C2" },
  { id: "youtube", label: "YouTube", icon: Youtube, color: "#FF0000" },
  { id: "tiktok", label: "TikTok", icon: Smartphone, color: "#010101" },
  { id: "generic", label: "Generico", icon: Monitor, color: "#6366F1" },
]

const CONTENT_TYPES: { id: ContentType; label: string; icon: any; width: number; height: number }[] = [
  { id: "post", label: "Post", icon: Square, width: 1080, height: 1080 },
  { id: "story", label: "Story", icon: Smartphone, width: 1080, height: 1920 },
  { id: "banner", label: "Banner", icon: Monitor, width: 1920, height: 1080 },
  { id: "thumbnail", label: "Thumbnail", icon: Play, width: 1280, height: 720 },
]

const TEMPLATE_STYLES: { id: TemplateStyle; label: string; desc: string }[] = [
  { id: "gradient", label: "Gradiente", desc: "Fundo gradiente vibrante" },
  { id: "photo", label: "Com Foto", desc: "Imagem de fundo profissional" },
  { id: "minimal", label: "Minimalista", desc: "Clean e moderno" },
  { id: "bold", label: "Bold", desc: "Texto grande impactante" },
  { id: "elegant", label: "Elegante", desc: "Luxo e sofisticacao" },
  { id: "neon", label: "Neon", desc: "Efeito glow vibrante" },
]

const GRADIENT_PRESETS = [
  { name: "Sunset", colors: ["#f97316", "#ec4899", "#8b5cf6"] },
  { name: "Ocean", colors: ["#06b6d4", "#3b82f6", "#6366f1"] },
  { name: "Forest", colors: ["#10b981", "#059669", "#047857"] },
  { name: "Fire", colors: ["#ef4444", "#f97316", "#eab308"] },
  { name: "Purple", colors: ["#8b5cf6", "#a855f7", "#ec4899"] },
  { name: "Dark", colors: ["#1f2937", "#374151", "#4b5563"] },
  { name: "Gold", colors: ["#d97706", "#b45309", "#92400e"] },
  { name: "Rose", colors: ["#ec4899", "#f43f5e", "#e11d48"] },
]

const PHOTO_BACKGROUNDS = [
  { id: 1, url: "https://picsum.photos/1920/1080?random=101", label: "Business" },
  { id: 2, url: "https://picsum.photos/1920/1080?random=102", label: "Technology" },
  { id: 3, url: "https://picsum.photos/1920/1080?random=103", label: "Nature" },
  { id: 4, url: "https://picsum.photos/1920/1080?random=104", label: "City" },
  { id: 5, url: "https://picsum.photos/1920/1080?random=105", label: "Abstract" },
  { id: 6, url: "https://picsum.photos/1920/1080?random=106", label: "Office" },
]

const COPY_TEMPLATES = [
  { category: "Promocao", templates: [
    "Grande Promocao de Verao - Ate 70% OFF",
    "Flash Sale - Apenas Hoje!",
    "Compra 2 Leva 3",
    "Semana do Cliente",
  ]},
  { category: "Produto", templates: [
    "Novo Lancamento",
    "Colecao Exclusiva 2025",
    "Bestseller de Volta",
    "Edicao Limitada",
  ]},
  { category: "Servico", templates: [
    "Consultoria Gratuita",
    "Servico Premium",
    "Resultados Garantidos",
    "Suporte 24/7",
  ]},
  { category: "Evento", templates: [
    "Webinar Gratuito",
    "Workshop Presencial",
    "Conferencia 2025",
    "Evento Online",
  ]},
]

// ─── Component ───────────────────────────────────────────────────────────────

export function MarketingStudio() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [platform, setPlatform] = useState<Platform>("instagram")
  const [contentType, setContentType] = useState<ContentType>("post")
  const [templateStyle, setTemplateStyle] = useState<TemplateStyle>("gradient")
  const [selectedGradient, setSelectedGradient] = useState(0)
  const [selectedPhoto, setSelectedPhoto] = useState(0)
  const [primaryColor, setPrimaryColor] = useState("#6366f1")
  const [mainText, setMainText] = useState("")
  const [subText, setSubText] = useState("")
  const [brandName, setBrandName] = useState("")
  const [cta, setCta] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedDesigns, setGeneratedDesigns] = useState<GeneratedDesign[]>([])
  const [currentPreview, setCurrentPreview] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("create")
  const [copied, setCopied] = useState(false)
  const [photoLoaded, setPhotoLoaded] = useState(false)
  const photoImageRef = useRef<HTMLImageElement | null>(null)

  // Get current dimensions
  const currentSize = CONTENT_TYPES.find(c => c.id === contentType) || CONTENT_TYPES[0]

  // Load photo background when needed
  useEffect(() => {
    if (templateStyle === "photo") {
      setPhotoLoaded(false)
      const img = new Image()
      img.crossOrigin = "anonymous"
      img.onload = () => {
        photoImageRef.current = img
        setPhotoLoaded(true)
      }
      img.onerror = () => {
        setPhotoLoaded(false)
      }
      img.src = PHOTO_BACKGROUNDS[selectedPhoto].url
    }
  }, [templateStyle, selectedPhoto])

  // Generate design on canvas
  const generateDesign = async () => {
    if (!mainText.trim()) return
    setIsGenerating(true)

    const canvas = canvasRef.current
    if (!canvas) {
      setIsGenerating(false)
      return
    }

    const ctx = canvas.getContext("2d")
    if (!ctx) {
      setIsGenerating(false)
      return
    }

    const { width, height } = currentSize
    canvas.width = width
    canvas.height = height

    // Clear canvas
    ctx.clearRect(0, 0, width, height)

    // Draw background based on style
    await drawBackground(ctx, width, height)

    // Draw overlay for text readability
    drawOverlay(ctx, width, height)

    // Draw text content
    drawTextContent(ctx, width, height)

    // Draw brand elements
    drawBrandElements(ctx, width, height)

    // Convert to data URL
    const dataUrl = canvas.toDataURL("image/png", 1.0)
    setCurrentPreview(dataUrl)

    // Save to gallery
    const newDesign: GeneratedDesign = {
      dataUrl,
      type: contentType,
      platform,
      style: templateStyle,
      timestamp: Date.now(),
    }
    setGeneratedDesigns(prev => [newDesign, ...prev].slice(0, 20))

    setIsGenerating(false)
  }

  const drawBackground = async (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    switch (templateStyle) {
      case "gradient": {
        const colors = GRADIENT_PRESETS[selectedGradient].colors
        const gradient = ctx.createLinearGradient(0, 0, width, height)
        colors.forEach((color, i) => {
          gradient.addColorStop(i / (colors.length - 1), color)
        })
        ctx.fillStyle = gradient
        ctx.fillRect(0, 0, width, height)
        break
      }

      case "photo": {
        if (photoImageRef.current && photoLoaded) {
          // Draw photo covering entire canvas
          const img = photoImageRef.current
          const scale = Math.max(width / img.width, height / img.height)
          const x = (width - img.width * scale) / 2
          const y = (height - img.height * scale) / 2
          ctx.drawImage(img, x, y, img.width * scale, img.height * scale)
        } else {
          // Fallback gradient
          const gradient = ctx.createLinearGradient(0, 0, width, height)
          gradient.addColorStop(0, "#1f2937")
          gradient.addColorStop(1, "#374151")
          ctx.fillStyle = gradient
          ctx.fillRect(0, 0, width, height)
        }
        break
      }

      case "minimal": {
        ctx.fillStyle = "#ffffff"
        ctx.fillRect(0, 0, width, height)
        // Add subtle accent
        ctx.fillStyle = primaryColor + "15"
        ctx.fillRect(0, height * 0.7, width, height * 0.3)
        break
      }

      case "bold": {
        ctx.fillStyle = primaryColor
        ctx.fillRect(0, 0, width, height)
        // Add geometric shapes
        ctx.fillStyle = "rgba(255,255,255,0.1)"
        ctx.beginPath()
        ctx.arc(width * 0.8, height * 0.2, width * 0.3, 0, Math.PI * 2)
        ctx.fill()
        ctx.beginPath()
        ctx.arc(width * 0.2, height * 0.8, width * 0.25, 0, Math.PI * 2)
        ctx.fill()
        break
      }

      case "elegant": {
        // Dark elegant background
        const gradient = ctx.createLinearGradient(0, 0, width, height)
        gradient.addColorStop(0, "#1a1a2e")
        gradient.addColorStop(1, "#16213e")
        ctx.fillStyle = gradient
        ctx.fillRect(0, 0, width, height)
        // Gold accent lines
        ctx.strokeStyle = "#d4af37"
        ctx.lineWidth = 3
        ctx.strokeRect(width * 0.05, height * 0.05, width * 0.9, height * 0.9)
        // Corner accents
        ctx.fillStyle = "#d4af37"
        const cornerSize = Math.min(width, height) * 0.08
        ctx.fillRect(width * 0.05, height * 0.05, cornerSize, 3)
        ctx.fillRect(width * 0.05, height * 0.05, 3, cornerSize)
        ctx.fillRect(width * 0.95 - cornerSize, height * 0.05, cornerSize, 3)
        ctx.fillRect(width * 0.95 - 3, height * 0.05, 3, cornerSize)
        ctx.fillRect(width * 0.05, height * 0.95 - 3, cornerSize, 3)
        ctx.fillRect(width * 0.05, height * 0.95 - cornerSize, 3, cornerSize)
        ctx.fillRect(width * 0.95 - cornerSize, height * 0.95 - 3, cornerSize, 3)
        ctx.fillRect(width * 0.95 - 3, height * 0.95 - cornerSize, 3, cornerSize)
        break
      }

      case "neon": {
        // Dark background
        ctx.fillStyle = "#0a0a0a"
        ctx.fillRect(0, 0, width, height)
        // Neon glow circles
        const drawGlow = (x: number, y: number, radius: number, color: string) => {
          const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius)
          gradient.addColorStop(0, color + "40")
          gradient.addColorStop(0.5, color + "20")
          gradient.addColorStop(1, "transparent")
          ctx.fillStyle = gradient
          ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2)
        }
        drawGlow(width * 0.2, height * 0.3, width * 0.4, "#ec4899")
        drawGlow(width * 0.8, height * 0.7, width * 0.35, "#06b6d4")
        drawGlow(width * 0.5, height * 0.5, width * 0.3, "#8b5cf6")
        break
      }
    }
  }

  const drawOverlay = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    if (templateStyle === "photo") {
      // Dark overlay for text readability
      const gradient = ctx.createLinearGradient(0, 0, 0, height)
      gradient.addColorStop(0, "rgba(0,0,0,0.3)")
      gradient.addColorStop(0.5, "rgba(0,0,0,0.5)")
      gradient.addColorStop(1, "rgba(0,0,0,0.7)")
      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, width, height)
    }
  }

  const drawTextContent = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    const isVertical = contentType === "story"
    const baseFontSize = Math.min(width, height) * 0.08
    const padding = Math.min(width, height) * 0.1

    // Determine text color based on style
    let textColor = "#ffffff"
    let subTextColor = "rgba(255,255,255,0.8)"
    if (templateStyle === "minimal") {
      textColor = "#1f2937"
      subTextColor = "#6b7280"
    }

    // Main text
    ctx.textAlign = "center"
    ctx.textBaseline = "middle"

    // Calculate font size to fit
    let fontSize = baseFontSize
    ctx.font = `bold ${fontSize}px Inter, system-ui, sans-serif`
    
    // Word wrap main text
    const maxWidth = width - padding * 2
    const lines = wrapText(ctx, mainText, maxWidth)
    
    // Adjust font size if too many lines
    while (lines.length > 4 && fontSize > baseFontSize * 0.5) {
      fontSize *= 0.9
      ctx.font = `bold ${fontSize}px Inter, system-ui, sans-serif`
      lines.length = 0
      lines.push(...wrapText(ctx, mainText, maxWidth))
    }

    // Draw main text with shadow
    ctx.fillStyle = textColor
    ctx.shadowColor = "rgba(0,0,0,0.3)"
    ctx.shadowBlur = 10
    ctx.shadowOffsetX = 2
    ctx.shadowOffsetY = 2

    const lineHeight = fontSize * 1.2
    const totalTextHeight = lines.length * lineHeight
    let startY = height * 0.4 - totalTextHeight / 2

    if (isVertical) {
      startY = height * 0.35 - totalTextHeight / 2
    }

    lines.forEach((line, i) => {
      ctx.fillText(line, width / 2, startY + i * lineHeight)
    })

    // Reset shadow
    ctx.shadowColor = "transparent"
    ctx.shadowBlur = 0
    ctx.shadowOffsetX = 0
    ctx.shadowOffsetY = 0

    // Subtext
    if (subText) {
      ctx.font = `500 ${fontSize * 0.4}px Inter, system-ui, sans-serif`
      ctx.fillStyle = subTextColor
      const subY = startY + totalTextHeight + fontSize * 0.5
      ctx.fillText(subText, width / 2, subY)
    }

    // CTA button
    if (cta) {
      const ctaY = isVertical ? height * 0.75 : height * 0.7
      const ctaFontSize = fontSize * 0.35
      ctx.font = `bold ${ctaFontSize}px Inter, system-ui, sans-serif`
      const ctaWidth = ctx.measureText(cta).width + ctaFontSize * 2
      const ctaHeight = ctaFontSize * 2.5

      // Button background
      ctx.fillStyle = templateStyle === "minimal" ? primaryColor : "#ffffff"
      roundRect(ctx, width / 2 - ctaWidth / 2, ctaY - ctaHeight / 2, ctaWidth, ctaHeight, ctaHeight / 2)
      ctx.fill()

      // Button text
      ctx.fillStyle = templateStyle === "minimal" ? "#ffffff" : "#000000"
      ctx.fillText(cta, width / 2, ctaY)
    }
  }

  const drawBrandElements = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    if (!brandName) return

    const fontSize = Math.min(width, height) * 0.03
    ctx.font = `600 ${fontSize}px Inter, system-ui, sans-serif`
    ctx.textAlign = "center"

    // Position based on content type
    const y = contentType === "story" ? height * 0.92 : height * 0.88

    // Determine color
    let color = "rgba(255,255,255,0.9)"
    if (templateStyle === "minimal") {
      color = "#6b7280"
    }

    ctx.fillStyle = color
    ctx.fillText(brandName, width / 2, y)
  }

  // Helper: wrap text to multiple lines
  const wrapText = (ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] => {
    const words = text.split(" ")
    const lines: string[] = []
    let currentLine = ""

    words.forEach(word => {
      const testLine = currentLine ? `${currentLine} ${word}` : word
      const metrics = ctx.measureText(testLine)
      if (metrics.width > maxWidth && currentLine) {
        lines.push(currentLine)
        currentLine = word
      } else {
        currentLine = testLine
      }
    })
    if (currentLine) lines.push(currentLine)
    return lines
  }

  // Helper: draw rounded rectangle
  const roundRect = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
    ctx.beginPath()
    ctx.moveTo(x + r, y)
    ctx.lineTo(x + w - r, y)
    ctx.quadraticCurveTo(x + w, y, x + w, y + r)
    ctx.lineTo(x + w, y + h - r)
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
    ctx.lineTo(x + r, y + h)
    ctx.quadraticCurveTo(x, y + h, x, y + h - r)
    ctx.lineTo(x, y + r)
    ctx.quadraticCurveTo(x, y, x + r, y)
    ctx.closePath()
  }

  const downloadDesign = (dataUrl: string, filename?: string) => {
    const link = document.createElement("a")
    link.download = filename || `reborn-marketing-${contentType}-${Date.now()}.png`
    link.href = dataUrl
    link.click()
  }

  const copyTemplate = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="flex-1 flex flex-col overflow-y-auto">
      {/* Hidden canvas for generation */}
      <canvas ref={canvasRef} className="hidden" />

      <div className="max-w-5xl mx-auto w-full p-4 pb-10 space-y-5">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
            <Megaphone className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">Marketing Studio</h2>
            <p className="text-xs text-muted-foreground">Cria posts, banners, stories e thumbnails profissionais</p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full grid grid-cols-3">
            <TabsTrigger value="create">
              <Wand2 className="h-3.5 w-3.5 mr-1.5" />
              Criar
            </TabsTrigger>
            <TabsTrigger value="templates">
              <Type className="h-3.5 w-3.5 mr-1.5" />
              Templates
            </TabsTrigger>
            <TabsTrigger value="gallery">
              <Palette className="h-3.5 w-3.5 mr-1.5" />
              Galeria ({generatedDesigns.length})
            </TabsTrigger>
          </TabsList>

          {/* CREATE TAB */}
          <TabsContent value="create" className="mt-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Left - Settings */}
              <div className="space-y-4">
                {/* Platform */}
                <Card className="p-4 space-y-3">
                  <Label className="flex items-center gap-2 text-sm font-medium">
                    <Monitor className="h-3.5 w-3.5 text-primary" />
                    Plataforma
                  </Label>
                  <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                    {PLATFORMS.map(({ id, label, icon: Icon, color }) => (
                      <button
                        key={id}
                        title={label}
                        onClick={() => setPlatform(id)}
                        className={`flex flex-col items-center gap-1 rounded-xl border py-2.5 px-1 transition-all ${
                          platform === id
                            ? "border-primary bg-primary/10 shadow-sm"
                            : "border-border bg-muted/20 hover:border-primary/40"
                        }`}
                      >
                        <Icon className="h-4 w-4" style={{ color: platform === id ? color : undefined }} />
                        <span className="text-[9px] font-medium hidden sm:block">{label}</span>
                      </button>
                    ))}
                  </div>
                </Card>

                {/* Content Type */}
                <Card className="p-4 space-y-3">
                  <Label className="flex items-center gap-2 text-sm font-medium">
                    <Layout className="h-3.5 w-3.5 text-primary" />
                    Formato
                  </Label>
                  <div className="grid grid-cols-4 gap-2">
                    {CONTENT_TYPES.map(({ id, label, icon: Icon, width, height }) => (
                      <button
                        key={id}
                        title={`${width}x${height}px`}
                        onClick={() => setContentType(id)}
                        className={`flex flex-col items-center gap-1 rounded-xl border py-3 px-2 transition-all ${
                          contentType === id
                            ? "border-primary bg-primary/10 text-primary shadow-sm"
                            : "border-border bg-muted/20 text-muted-foreground hover:border-primary/40"
                        }`}
                      >
                        <Icon className="h-5 w-5" />
                        <span className="text-xs font-medium">{label}</span>
                        <span className="text-[9px] text-muted-foreground">{width}x{height}</span>
                      </button>
                    ))}
                  </div>
                </Card>

                {/* Template Style */}
                <Card className="p-4 space-y-3">
                  <Label className="flex items-center gap-2 text-sm font-medium">
                    <Palette className="h-3.5 w-3.5 text-primary" />
                    Estilo do Template
                  </Label>
                  <div className="grid grid-cols-3 gap-2">
                    {TEMPLATE_STYLES.map(({ id, label, desc }) => (
                      <button
                        key={id}
                        onClick={() => setTemplateStyle(id)}
                        className={`rounded-xl border p-3 text-left transition-all ${
                          templateStyle === id
                            ? "border-primary bg-primary/10 shadow-sm"
                            : "border-border bg-muted/20 hover:border-primary/40"
                        }`}
                      >
                        <div className="text-xs font-semibold text-foreground">{label}</div>
                        <div className="text-[10px] text-muted-foreground">{desc}</div>
                      </button>
                    ))}
                  </div>

                  {/* Gradient selection */}
                  {templateStyle === "gradient" && (
                    <div className="space-y-2 pt-2">
                      <Label className="text-xs text-muted-foreground">Escolhe o Gradiente</Label>
                      <div className="grid grid-cols-4 gap-2">
                        {GRADIENT_PRESETS.map((preset, i) => (
                          <button
                            key={i}
                            onClick={() => setSelectedGradient(i)}
                            className={`h-10 rounded-lg transition-all ${
                              selectedGradient === i ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : ""
                            }`}
                            style={{
                              background: `linear-gradient(135deg, ${preset.colors.join(", ")})`
                            }}
                            title={preset.name}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Photo selection */}
                  {templateStyle === "photo" && (
                    <div className="space-y-2 pt-2">
                      <Label className="text-xs text-muted-foreground">Escolhe o Fundo</Label>
                      <div className="grid grid-cols-3 gap-2">
                        {PHOTO_BACKGROUNDS.map((photo, i) => (
                          <button
                            key={photo.id}
                            onClick={() => setSelectedPhoto(i)}
                            className={`relative h-16 rounded-lg overflow-hidden transition-all ${
                              selectedPhoto === i ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : ""
                            }`}
                          >
                            <img
                              src={photo.url}
                              alt={photo.label}
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                              <span className="text-[10px] text-white font-medium">{photo.label}</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Color picker for minimal/bold */}
                  {(templateStyle === "minimal" || templateStyle === "bold") && (
                    <div className="space-y-2 pt-2">
                      <Label className="text-xs text-muted-foreground">Cor Principal</Label>
                      <div className="flex gap-2 items-center">
                        <input
                          type="color"
                          value={primaryColor}
                          onChange={(e) => setPrimaryColor(e.target.value)}
                          className="w-10 h-10 rounded cursor-pointer border border-border"
                        />
                        <div className="flex flex-wrap gap-1">
                          {["#6366f1", "#ec4899", "#10b981", "#f59e0b", "#ef4444", "#3b82f6", "#8b5cf6", "#06b6d4"].map((c) => (
                            <button
                              key={c}
                              onClick={() => setPrimaryColor(c)}
                              className={`w-6 h-6 rounded-full border-2 transition-all ${primaryColor === c ? "border-foreground scale-110" : "border-transparent"}`}
                              style={{ backgroundColor: c }}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </Card>

                {/* Text Content */}
                <Card className="p-4 space-y-3">
                  <Label className="flex items-center gap-2 text-sm font-medium">
                    <Type className="h-3.5 w-3.5 text-primary" />
                    Conteudo
                  </Label>

                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Titulo Principal *</Label>
                    <Textarea
                      value={mainText}
                      onChange={(e) => setMainText(e.target.value)}
                      placeholder="Ex: Grande Promocao de Verao - Ate 50% OFF"
                      className="min-h-[80px] resize-none text-sm"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Subtitulo</Label>
                      <Input
                        value={subText}
                        onChange={(e) => setSubText(e.target.value)}
                        placeholder="Texto secundario"
                        className="text-sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Marca</Label>
                      <Input
                        value={brandName}
                        onChange={(e) => setBrandName(e.target.value)}
                        placeholder="Minha Marca"
                        className="text-sm"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Botao CTA</Label>
                    <Input
                      value={cta}
                      onChange={(e) => setCta(e.target.value)}
                      placeholder="Ex: Compra Agora, Saber Mais, Reservar"
                      className="text-sm"
                    />
                  </div>

                  <Button
                    onClick={generateDesign}
                    disabled={isGenerating || !mainText.trim()}
                    className="w-full"
                    size="lg"
                  >
                    {isGenerating ? (
                      <><Loader2 className="h-4 w-4 mr-2 animate-spin" />A gerar...</>
                    ) : (
                      <><Sparkles className="h-4 w-4 mr-2" />Gerar Design</>
                    )}
                  </Button>
                </Card>
              </div>

              {/* Right - Preview */}
              <div className="space-y-4">
                <Card className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-foreground">Preview</h3>
                    {currentPreview && (
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => generateDesign()}>
                          <RefreshCw className="h-3.5 w-3.5 mr-1" />
                          Regenerar
                        </Button>
                        <Button size="sm" onClick={() => downloadDesign(currentPreview)}>
                          <Download className="h-3.5 w-3.5 mr-1" />
                          Download
                        </Button>
                      </div>
                    )}
                  </div>

                  {currentPreview ? (
                    <div className="rounded-lg overflow-hidden bg-muted border border-border">
                      <img
                        src={currentPreview}
                        alt="Generated design"
                        className="w-full object-contain max-h-[500px]"
                      />
                    </div>
                  ) : (
                    <div className="rounded-lg bg-muted/50 border border-dashed border-border h-[300px] flex flex-col items-center justify-center text-muted-foreground">
                      <ImageIcon className="h-12 w-12 mb-3 opacity-30" />
                      <p className="text-sm">Preenche os campos e clica em Gerar</p>
                      <p className="text-xs mt-1">O preview aparecera aqui</p>
                    </div>
                  )}

                  {currentPreview && (
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline" className="text-[10px] bg-primary/5 border-primary/20 text-primary capitalize">
                        {contentType}
                      </Badge>
                      <Badge variant="outline" className="text-[10px] capitalize">
                        {PLATFORMS.find(p => p.id === platform)?.label}
                      </Badge>
                      <Badge variant="outline" className="text-[10px] capitalize">
                        {TEMPLATE_STYLES.find(s => s.id === templateStyle)?.label}
                      </Badge>
                      <Badge variant="outline" className="text-[10px]">
                        {currentSize.width}x{currentSize.height}px
                      </Badge>
                    </div>
                  )}
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* TEMPLATES TAB */}
          <TabsContent value="templates" className="mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {COPY_TEMPLATES.map((category) => (
                <Card key={category.category} className="p-4">
                  <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                    <Type className="h-4 w-4 text-primary" />
                    {category.category}
                  </h3>
                  <div className="space-y-2">
                    {category.templates.map((template, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between p-2.5 rounded-lg bg-muted/50 hover:bg-muted transition-colors group"
                      >
                        <span className="text-sm text-foreground">{template}</span>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2"
                            onClick={() => {
                              setMainText(template)
                              setActiveTab("create")
                            }}
                          >
                            <Wand2 className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2"
                            onClick={() => copyTemplate(template)}
                          >
                            {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* GALLERY TAB */}
          <TabsContent value="gallery" className="mt-4">
            {generatedDesigns.length === 0 ? (
              <Card className="p-8 text-center">
                <ImageIcon className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">Ainda nao geraste nenhum design</p>
                <p className="text-xs text-muted-foreground mt-1">Os teus designs aparecerao aqui</p>
              </Card>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {generatedDesigns.map((design, i) => (
                  <Card key={design.timestamp} className="overflow-hidden group">
                    <div className="relative aspect-square">
                      <img
                        src={design.dataUrl}
                        alt={`Design ${i + 1}`}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => downloadDesign(design.dataUrl)}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => {
                            setCurrentPreview(design.dataUrl)
                            setActiveTab("create")
                          }}
                        >
                          <ImageIcon className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="p-2 flex flex-wrap gap-1">
                      <Badge variant="outline" className="text-[9px] capitalize">{design.type}</Badge>
                      <Badge variant="outline" className="text-[9px] capitalize">{design.style}</Badge>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
