"use client"

import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Download, Image as ImageIcon, Layout, Megaphone, Monitor, Palette, Play, Smartphone, Square, Trash2, Type, Wand2 } from "lucide-react"

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

const CONTENT_TYPES = [
  { id: "post" as const, label: "Post", icon: Square, width: 1080, height: 1080 },
  { id: "story" as const, label: "Story", icon: Smartphone, width: 1080, height: 1920 },
  { id: "banner" as const, label: "Banner", icon: Monitor, width: 1920, height: 1080 },
  { id: "thumbnail" as const, label: "Thumbnail", icon: Play, width: 1280, height: 720 },
]

const TEMPLATE_STYLES: { id: TemplateStyle; label: string }[] = [
  { id: "gradient", label: "Gradiente" },
  { id: "photo", label: "Com foto" },
  { id: "minimal", label: "Minimalista" },
  { id: "bold", label: "Bold" },
  { id: "elegant", label: "Elegante" },
  { id: "neon", label: "Neon" },
]

const GRADIENT_PRESETS = [
  ["#f97316", "#ec4899", "#8b5cf6"],
  ["#06b6d4", "#3b82f6", "#6366f1"],
  ["#10b981", "#059669", "#047857"],
  ["#ef4444", "#f97316", "#eab308"],
  ["#8b5cf6", "#a855f7", "#ec4899"],
  ["#1f2937", "#374151", "#4b5563"],
]

const PHOTO_BACKGROUNDS = [101, 102, 103, 104, 105, 106].map((id) => `https://picsum.photos/1920/1080?random=${id}`)

export function MarketingStudioCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [contentType, setContentType] = useState<ContentType>("post")
  const [templateStyle, setTemplateStyle] = useState<TemplateStyle>("gradient")
  const [selectedGradient, setSelectedGradient] = useState(0)
  const [selectedPhoto, setSelectedPhoto] = useState(0)
  const [primaryColor, setPrimaryColor] = useState("#6366f1")
  const [mainText, setMainText] = useState("")
  const [subText, setSubText] = useState("")
  const [brandName, setBrandName] = useState("")
  const [cta, setCta] = useState("")
  const [preview, setPreview] = useState<string | null>(null)
  const [gallery, setGallery] = useState<GeneratedDesign[]>([])
  const [photo, setPhoto] = useState<HTMLImageElement | null>(null)

  const currentSize = CONTENT_TYPES.find((item) => item.id === contentType) || CONTENT_TYPES[0]

  useEffect(() => {
    if (templateStyle !== "photo") return
    const img = new Image()
    img.crossOrigin = "anonymous"
    img.onload = () => setPhoto(img)
    img.onerror = () => setPhoto(null)
    img.src = PHOTO_BACKGROUNDS[selectedPhoto]
  }, [templateStyle, selectedPhoto])

  const wrapText = (ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number) => {
    const words = text.split(" ")
    let line = ""
    let offset = 0
    for (const word of words) {
      const test = line ? `${line} ${word}` : word
      if (ctx.measureText(test).width > maxWidth && line) {
        ctx.fillText(line, x, y + offset)
        line = word
        offset += lineHeight
      } else line = test
    }
    if (line) ctx.fillText(line, x, y + offset)
  }

  const drawBackground = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    if (templateStyle === "photo" && photo) {
      const scale = Math.max(width / photo.width, height / photo.height)
      const x = (width - photo.width * scale) / 2
      const y = (height - photo.height * scale) / 2
      ctx.drawImage(photo, x, y, photo.width * scale, photo.height * scale)
      ctx.fillStyle = "rgba(0,0,0,.45)"
      ctx.fillRect(0, 0, width, height)
      return
    }
    if (templateStyle === "minimal") {
      ctx.fillStyle = "#ffffff"
      ctx.fillRect(0, 0, width, height)
      ctx.fillStyle = `${primaryColor}22`
      ctx.fillRect(0, height * 0.72, width, height * 0.28)
      return
    }
    if (templateStyle === "bold") {
      ctx.fillStyle = primaryColor
      ctx.fillRect(0, 0, width, height)
      ctx.fillStyle = "rgba(255,255,255,.10)"
      ctx.beginPath(); ctx.arc(width * .85, height * .18, width * .27, 0, Math.PI * 2); ctx.fill()
      ctx.beginPath(); ctx.arc(width * .15, height * .82, width * .22, 0, Math.PI * 2); ctx.fill()
      return
    }
    if (templateStyle === "elegant") {
      const gradient = ctx.createLinearGradient(0, 0, width, height)
      gradient.addColorStop(0, "#111827"); gradient.addColorStop(1, "#1e293b")
      ctx.fillStyle = gradient; ctx.fillRect(0, 0, width, height)
      ctx.strokeStyle = "#d4af37"; ctx.lineWidth = 4; ctx.strokeRect(width * .05, height * .05, width * .9, height * .9)
      return
    }
    if (templateStyle === "neon") {
      ctx.fillStyle = "#09090b"; ctx.fillRect(0, 0, width, height)
      const glow = ctx.createRadialGradient(width * .5, height * .5, 0, width * .5, height * .5, width * .55)
      glow.addColorStop(0, `${primaryColor}66`); glow.addColorStop(1, "transparent")
      ctx.fillStyle = glow; ctx.fillRect(0, 0, width, height)
      return
    }
    const colors = GRADIENT_PRESETS[selectedGradient]
    const gradient = ctx.createLinearGradient(0, 0, width, height)
    colors.forEach((color, i) => gradient.addColorStop(i / (colors.length - 1), color))
    ctx.fillStyle = gradient; ctx.fillRect(0, 0, width, height)
  }

  const generate = () => {
    if (!mainText.trim()) return
    const canvas = canvasRef.current
    const ctx = canvas?.getContext("2d")
    if (!canvas || !ctx) return
    const { width, height } = currentSize
    canvas.width = width; canvas.height = height
    drawBackground(ctx, width, height)

    const darkText = templateStyle === "minimal"
    const textColor = darkText ? "#111827" : "#ffffff"
    const pad = Math.min(width, height) * .09
    ctx.textAlign = "left"
    ctx.fillStyle = textColor
    ctx.font = `700 ${Math.round(Math.min(width, height) * .085)}px Arial`
    wrapText(ctx, mainText, pad, height * .36, width - pad * 2, Math.min(width, height) * .095)

    if (subText) {
      ctx.font = `400 ${Math.round(Math.min(width, height) * .034)}px Arial`
      ctx.globalAlpha = .88
      wrapText(ctx, subText, pad, height * .58, width - pad * 2, Math.min(width, height) * .047)
      ctx.globalAlpha = 1
    }
    if (brandName) {
      ctx.font = `700 ${Math.round(Math.min(width, height) * .025)}px Arial`
      ctx.fillText(brandName.toUpperCase(), pad, pad)
    }
    if (cta) {
      const ctaY = height - pad * 1.65
      ctx.font = `700 ${Math.round(Math.min(width, height) * .028)}px Arial`
      const textWidth = ctx.measureText(cta).width
      ctx.fillStyle = darkText ? primaryColor : "rgba(255,255,255,.18)"
      ctx.fillRect(pad, ctaY - 36, textWidth + 64, 64)
      ctx.fillStyle = "#ffffff"
      ctx.fillText(cta, pad + 32, ctaY + 7)
    }

    const dataUrl = canvas.toDataURL("image/png", 1)
    setPreview(dataUrl)
    setGallery((prev) => [{ dataUrl, type: contentType, platform: "generic", style: templateStyle, timestamp: Date.now() }, ...prev].slice(0, 20))
  }

  const download = (dataUrl: string) => {
    const a = document.createElement("a")
    a.href = dataUrl
    a.download = `reborn-canvas-${contentType}-${Date.now()}.png`
    a.click()
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-6xl mx-auto p-4 pb-10 space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center"><Megaphone className="h-5 w-5 text-primary-foreground" /></div>
          <div><h2 className="text-xl font-bold">Marketing Canvas</h2><p className="text-xs text-muted-foreground">Editor local recuperado das branches antigas do Reborn</p></div>
        </div>

        <Tabs defaultValue="create">
          <TabsList className="grid w-full grid-cols-2"><TabsTrigger value="create"><Wand2 className="h-4 w-4 mr-2" />Criar</TabsTrigger><TabsTrigger value="gallery"><ImageIcon className="h-4 w-4 mr-2" />Galeria</TabsTrigger></TabsList>
          <TabsContent value="create" className="mt-4">
            <div className="grid gap-5 lg:grid-cols-2">
              <div className="space-y-4">
                <Card className="p-4 space-y-3">
                  <Label className="flex items-center gap-2"><Layout className="h-4 w-4" />Formato</Label>
                  <div className="grid grid-cols-4 gap-2">{CONTENT_TYPES.map(({ id, label, icon: Icon }) => <button key={id} onClick={() => setContentType(id)} className={`rounded-xl border p-3 text-xs ${contentType === id ? "border-primary bg-primary/10" : "border-border"}`}><Icon className="h-4 w-4 mx-auto mb-1" />{label}</button>)}</div>
                </Card>
                <Card className="p-4 space-y-3">
                  <Label className="flex items-center gap-2"><Palette className="h-4 w-4" />Estilo</Label>
                  <div className="grid grid-cols-3 gap-2">{TEMPLATE_STYLES.map(({ id, label }) => <button key={id} onClick={() => setTemplateStyle(id)} className={`rounded-xl border p-2 text-xs ${templateStyle === id ? "border-primary bg-primary/10" : "border-border"}`}>{label}</button>)}</div>
                  {templateStyle === "gradient" && <div className="grid grid-cols-6 gap-2">{GRADIENT_PRESETS.map((colors, i) => <button key={i} onClick={() => setSelectedGradient(i)} className={`h-9 rounded-lg border ${selectedGradient === i ? "ring-2 ring-primary" : ""}`} style={{ background: `linear-gradient(135deg, ${colors.join(",")})` }} />)}</div>}
                  {templateStyle === "photo" && <div className="grid grid-cols-6 gap-2">{PHOTO_BACKGROUNDS.map((url, i) => <button key={url} onClick={() => setSelectedPhoto(i)} className={`h-12 rounded-lg bg-cover bg-center border ${selectedPhoto === i ? "ring-2 ring-primary" : ""}`} style={{ backgroundImage: `url(${url})` }} />)}</div>}
                </Card>
                <Card className="p-4 space-y-3">
                  <Label className="flex items-center gap-2"><Type className="h-4 w-4" />Conteudo</Label>
                  <Input value={brandName} onChange={(e) => setBrandName(e.target.value)} placeholder="Marca" />
                  <Input value={mainText} onChange={(e) => setMainText(e.target.value)} placeholder="Titulo principal" />
                  <Input value={subText} onChange={(e) => setSubText(e.target.value)} placeholder="Subtitulo" />
                  <Input value={cta} onChange={(e) => setCta(e.target.value)} placeholder="Chamada para acao" />
                  <div className="flex items-center gap-3"><Label>Cor</Label><input type="color" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className="h-9 w-14 rounded" /></div>
                  <Button className="w-full" onClick={generate}>Gerar design</Button>
                </Card>
              </div>
              <Card className="p-4 flex flex-col min-h-[420px]">
                <div className="flex items-center justify-between mb-3"><span className="text-sm font-medium">Preview {currentSize.width}x{currentSize.height}</span>{preview && <Button size="sm" variant="outline" onClick={() => download(preview)}><Download className="h-4 w-4 mr-2" />Exportar</Button>}</div>
                <div className="flex-1 rounded-xl bg-muted/30 border overflow-hidden flex items-center justify-center">{preview ? <img src={preview} alt="Preview" className="max-h-[640px] max-w-full object-contain" /> : <div className="text-sm text-muted-foreground text-center px-8">Preenche o conteudo e gera um design. Todo o desenho e feito localmente no browser.</div>}</div>
              </Card>
            </div>
          </TabsContent>
          <TabsContent value="gallery" className="mt-4">
            {gallery.length === 0 ? <Card className="p-10 text-center text-muted-foreground">Ainda nao tens designs nesta sessao.</Card> : <div className="grid grid-cols-2 md:grid-cols-3 gap-4">{gallery.map((item) => <Card key={item.timestamp} className="overflow-hidden"><img src={item.dataUrl} alt="Design" className="w-full aspect-square object-cover" /><div className="p-2 flex gap-2"><Button size="sm" className="flex-1" onClick={() => download(item.dataUrl)}><Download className="h-3.5 w-3.5 mr-1" />Guardar</Button><Button size="icon" variant="outline" onClick={() => setGallery((prev) => prev.filter((x) => x.timestamp !== item.timestamp))}><Trash2 className="h-4 w-4" /></Button></div></Card>)}</div>}
          </TabsContent>
        </Tabs>
        <canvas ref={canvasRef} className="hidden" />
      </div>
    </div>
  )
}
