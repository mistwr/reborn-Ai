"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { buildIntelligentImagePrompt } from "@/lib/content-brief"
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
  Target,
  Users,
} from "lucide-react"

type Platform = "instagram" | "facebook" | "twitter" | "linkedin" | "youtube" | "tiktok" | "generic"
type ContentType = "post" | "banner" | "story" | "thumbnail" | "logo" | "cover" | "ad"
type VisualStyle = "minimal" | "bold" | "elegant" | "playful" | "corporate" | "neon" | "retro" | "nature"

interface MarketingResult {
  url: string
  prompt: string
  type: ContentType
  platform: Platform
  style: VisualStyle
}

const PLATFORMS: { id: Platform; label: string; icon: any; color: string }[] = [
  { id: "instagram", label: "Instagram", icon: Instagram, color: "#E4405F" },
  { id: "facebook", label: "Facebook", icon: Facebook, color: "#1877F2" },
  { id: "twitter", label: "Twitter/X", icon: Twitter, color: "#1DA1F2" },
  { id: "linkedin", label: "LinkedIn", icon: Linkedin, color: "#0A66C2" },
  { id: "youtube", label: "YouTube", icon: Youtube, color: "#FF0000" },
  { id: "tiktok", label: "TikTok", icon: Smartphone, color: "#010101" },
  { id: "generic", label: "Generico", icon: Monitor, color: "#6366F1" },
]

const CONTENT_TYPES: { id: ContentType; label: string; icon: any; size: string }[] = [
  { id: "post", label: "Post", icon: Square, size: "1080x1080" },
  { id: "banner", label: "Banner", icon: Monitor, size: "1920x1080" },
  { id: "story", label: "Story", icon: Smartphone, size: "1080x1920" },
  { id: "thumbnail", label: "Thumbnail", icon: Play, size: "1280x720" },
  { id: "logo", label: "Logo", icon: Hexagon, size: "500x500" },
  { id: "cover", label: "Capa", icon: Layout, size: "1640x856" },
  { id: "ad", label: "Anuncio", icon: Megaphone, size: "1200x628" },
]

const VISUAL_STYLES: { id: VisualStyle; label: string; preview: string; desc: string }[] = [
  { id: "minimal", label: "Minimalista", preview: "from-gray-100 to-gray-300", desc: "Clean, espaco em branco" },
  { id: "bold", label: "Bold", preview: "from-red-500 to-orange-500", desc: "Cores fortes, impacto" },
  { id: "elegant", label: "Elegante", preview: "from-amber-300 to-yellow-600", desc: "Luxo, sofisticado" },
  { id: "playful", label: "Divertido", preview: "from-pink-400 to-purple-500", desc: "Colorido, amigavel" },
  { id: "corporate", label: "Corporativo", preview: "from-blue-600 to-blue-800", desc: "Profissional, confianca" },
  { id: "neon", label: "Neon", preview: "from-cyan-400 to-purple-600", desc: "Cyberpunk, vibrante" },
  { id: "retro", label: "Retro", preview: "from-amber-500 to-red-700", desc: "Vintage, classico" },
  { id: "nature", label: "Natureza", preview: "from-green-400 to-emerald-700", desc: "Organico, fresco" },
]

const SIZES: Record<ContentType, { w: number; h: number }> = {
  post: { w: 1080, h: 1080 },
  banner: { w: 1920, h: 1080 },
  story: { w: 1080, h: 1920 },
  thumbnail: { w: 1280, h: 720 },
  logo: { w: 500, h: 500 },
  cover: { w: 1640, h: 856 },
  ad: { w: 1200, h: 628 },
}

const STYLE_PROMPTS: Record<VisualStyle, string> = {
  minimal: "clean minimalist design, white space, simple modern typography, subtle shadows",
  bold: "bold high contrast colors, strong impactful typography, dynamic composition",
  elegant: "luxury elegant design, gold accents, serif typography, premium feel",
  playful: "colorful fun playful design, rounded shapes, friendly approachable",
  corporate: "professional corporate design, trust, business, clean layout",
  neon: "neon glow effects, cyberpunk aesthetic, dark background, vibrant electric colors",
  retro: "vintage retro design, worn texture, classic typography, nostalgic",
  nature: "organic nature inspired, green tones, fresh botanical, earthy",
}

const CONTENT_RULES: Record<ContentType, string> = {
  post: "square social post, one clear focal point, readable hierarchy, strong thumb-stop composition",
  banner: "wide banner, horizontal composition, clear left-to-right hierarchy, generous negative space for copy",
  story: "vertical story, mobile-first composition, focal point in safe area, strong top-to-bottom hierarchy",
  thumbnail: "YouTube-style thumbnail composition, very clear focal subject, high contrast, readable at small size",
  logo: "simple memorable logo mark, vector-like geometry, no mockup scene, no unrelated objects",
  cover: "premium cover composition, strong central idea, editorial hierarchy, room for title and brand",
  ad: "conversion-focused ad creative, product or offer obvious at first glance, clear CTA zone and visual hierarchy",
}

const PLATFORM_RULES: Record<Platform, string> = {
  instagram: "Instagram-native, polished, visually strong, modern social creative",
  facebook: "Facebook feed creative, clear value proposition, readable copy zone, trustworthy visual language",
  twitter: "X/Twitter creative, concise visual idea, bold focal point, fast comprehension",
  linkedin: "LinkedIn professional creative, credible business tone, restrained premium visual language",
  youtube: "YouTube visual language, attention-grabbing composition and strong readable hierarchy",
  tiktok: "TikTok mobile-first creative, energetic vertical-first visual language, immediate focal point",
  generic: "professional cross-platform marketing creative",
}

const COPY_TEMPLATES = [
  { category: "Promocao", templates: [
    "Grande Soldes de Verao - Ate 70% OFF",
    "Flash Sale - Apenas Hoje! Desconto Exclusivo",
    "Compra 2 Leva 3 - Oferta por Tempo Limitado",
    "Semana do Cliente - Precos Especiais",
  ]},
  { category: "Produto", templates: [
    "Novo Produto Lancado - Descobre Ja",
    "Colecao Exclusiva Primavera/Verao 2025",
    "Bestseller de Volta ao Stock",
    "Edicao Limitada - Garante o Teu",
  ]},
  { category: "Servico", templates: [
    "Consultoria Gratuita - Marca Ja",
    "Servico Premium ao Melhor Preco",
    "Resultados Garantidos ou Devolucao",
    "Suporte 24/7 Para os Nossos Clientes",
  ]},
  { category: "Evento", templates: [
    "Webinar Gratuito - Inscricoes Abertas",
    "Workshop Presencial - Vagas Limitadas",
    "Conferencia Anual 2025 - Reserva o Teu Lugar",
    "Evento Online - Participa de Qualquer Lugar",
  ]},
  { category: "Redes Sociais", templates: [
    "Segue Para Conteudo Exclusivo Diario",
    "Partilha com Amigos e Ganha Premios",
    "Comenta a Tua Opiniao Abaixo",
    "Salva Este Post Para Mais Tarde",
  ]},
]

const AI_COPY_HOOKS = [
  "Transforme o seu negocio com",
  "A solucao que estavas a espera:",
  "Porque mereces o melhor:",
  "Nao percas esta oportunidade:",
  "Exclusivo para os nossos seguidores:",
  "Limitado a 100 unidades:",
]

export function MarketingStudio() {
  const [platform, setPlatform] = useState<Platform>("instagram")
  const [contentType, setContentType] = useState<ContentType>("post")
  const [visualStyle, setVisualStyle] = useState<VisualStyle>("bold")
  const [primaryColor, setPrimaryColor] = useState("#6366f1")
  const [mainText, setMainText] = useState("")
  const [subText, setSubText] = useState("")
  const [brandName, setBrandName] = useState("")
  const [cta, setCta] = useState("")
  const [audience, setAudience] = useState("")
  const [objective, setObjective] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [results, setResults] = useState<MarketingResult[]>([])
  const [selected, setSelected] = useState<MarketingResult | null>(null)
  const [copied, setCopied] = useState(false)
  const [activeTab, setActiveTab] = useState("create")
  const [error, setError] = useState<string | null>(null)

  const buildPrompt = () => {
    const size = SIZES[contentType]
    const platformInfo = PLATFORMS.find((p) => p.id === platform)!

    const rawRequest = [
      `Create a ${contentType} marketing design for ${platformInfo.label}.`,
      CONTENT_RULES[contentType],
      PLATFORM_RULES[platform],
      STYLE_PROMPTS[visualStyle],
      mainText ? `The central campaign idea/headline is: ${mainText}.` : "",
      subText ? `Supporting message: ${subText}.` : "",
      brandName ? `Brand: ${brandName}.` : "",
      cta ? `CTA: ${cta}.` : "",
      objective ? `Campaign objective: ${objective}.` : "",
      audience ? `Target audience: ${audience}.` : "",
      `Primary brand color: ${primaryColor}.`,
      `Canvas: ${size.w}x${size.h}.`,
      "Do not render long paragraphs. Keep typography zones clean and intentional. If text rendering is uncertain, prioritize a strong visual with clean negative space instead of gibberish text.",
    ].filter(Boolean).join(" ")

    return buildIntelligentImagePrompt({
      prompt: rawRequest,
      style: visualStyle,
      quality: "hd",
      width: size.w,
      height: size.h,
      intent: "marketing",
      brief: {
        brandName,
        audience,
        objective,
        primaryColor,
        visualStyle,
        cta,
        productOrService: mainText,
        language: "pt-PT",
      },
    })
  }

  const requestImage = async (prompt: string, type: ContentType, style: VisualStyle, platformValue: Platform) => {
    const size = SIZES[type]
    const res = await fetch("/api/generate-image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt,
        width: size.w,
        height: size.h,
        quality: "hd",
        style,
        intent: "marketing",
        brief: {
          brandName,
          audience,
          objective,
          primaryColor,
          visualStyle: style,
          cta,
          productOrService: mainText,
          language: "pt-PT",
        },
      }),
    })

    const data = await res.json()
    if (!res.ok || !data.url) throw new Error(data.error || "Nao foi possivel gerar o design")

    return { url: data.url as string, prompt, type, platform: platformValue, style }
  }

  const generate = async () => {
    if (!mainText.trim()) return
    setIsGenerating(true)
    setError(null)

    try {
      const prompt = buildPrompt()
      const result = await requestImage(prompt, contentType, visualStyle, platform)
      setResults((prev) => [result, ...prev])
      setSelected(result)
    } catch (e: any) {
      setError(e?.message || "Erro ao gerar design")
    } finally {
      setIsGenerating(false)
    }
  }

  const regenerate = async () => {
    if (!selected) return
    setIsGenerating(true)
    setError(null)

    try {
      const result = await requestImage(selected.prompt, selected.type, selected.style, selected.platform)
      setResults((prev) => [result, ...prev])
      setSelected(result)
    } catch (e: any) {
      setError(e?.message || "Erro ao gerar variacao")
    } finally {
      setIsGenerating(false)
    }
  }

  const copyPrompt = async () => {
    if (!selected) return
    await navigator.clipboard.writeText(selected.prompt)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const downloadImage = (result: MarketingResult) => {
    const a = document.createElement("a")
    a.href = result.url
    a.download = `reborn-marketing-${result.type}-${Date.now()}.jpg`
    a.target = "_blank"
    a.click()
  }

  return (
    <div className="flex-1 flex flex-col overflow-y-auto">
      <div className="max-w-5xl mx-auto w-full p-4 pb-10 space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
            <Megaphone className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">Marketing Studio</h2>
            <p className="text-xs text-muted-foreground">Cria campanhas com briefing, contexto e imagem alinhada ao objetivo</p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full grid grid-cols-3">
            <TabsTrigger value="create"><Wand2 className="h-3.5 w-3.5 mr-1.5" />Criar</TabsTrigger>
            <TabsTrigger value="copy"><Type className="h-3.5 w-3.5 mr-1.5" />Templates de Copy</TabsTrigger>
            <TabsTrigger value="gallery"><Palette className="h-3.5 w-3.5 mr-1.5" />Galeria</TabsTrigger>
          </TabsList>

          <TabsContent value="create" className="mt-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <div className="space-y-4">
                <Card className="p-4 space-y-3">
                  <Label className="flex items-center gap-2"><Monitor className="h-3.5 w-3.5 text-primary" />Plataforma</Label>
                  <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                    {PLATFORMS.map(({ id, label, icon: Icon, color }) => (
                      <button key={id} title={label} onClick={() => setPlatform(id)} className={`flex flex-col items-center gap-1 rounded-xl border py-2.5 px-1 transition-all ${platform === id ? "border-primary bg-primary/10 shadow-sm" : "border-border bg-muted/20 hover:border-primary/40"}`}>
                        <Icon className="h-4 w-4" style={{ color: platform === id ? color : undefined }} />
                        <span className="text-[9px] font-medium hidden sm:block leading-tight text-center">{label}</span>
                      </button>
                    ))}
                  </div>
                </Card>

                <Card className="p-4 space-y-3">
                  <Label className="flex items-center gap-2"><Layout className="h-3.5 w-3.5 text-primary" />Tipo de Conteudo</Label>
                  <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                    {CONTENT_TYPES.map(({ id, label, icon: Icon, size }) => (
                      <button key={id} title={`${label} — ${size}`} onClick={() => setContentType(id)} className={`flex flex-col items-center gap-1 rounded-xl border py-2.5 px-1 transition-all ${contentType === id ? "border-primary bg-primary/10 text-primary shadow-sm" : "border-border bg-muted/20 text-muted-foreground hover:border-primary/40"}`}>
                        <Icon className="h-4 w-4" /><span className="text-[9px] font-medium hidden sm:block leading-tight text-center">{label}</span>
                      </button>
                    ))}
                  </div>
                  <p className="text-[10px] text-muted-foreground">Tamanho: {SIZES[contentType].w}x{SIZES[contentType].h}px</p>
                </Card>

                <Card className="p-4 space-y-3">
                  <Label className="flex items-center gap-2"><Palette className="h-3.5 w-3.5 text-primary" />Estilo Visual</Label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {VISUAL_STYLES.map(({ id, label, preview, desc }) => (
                      <button key={id} onClick={() => setVisualStyle(id)} className={`rounded-xl border overflow-hidden transition-all ${visualStyle === id ? "border-primary ring-1 ring-primary shadow-sm" : "border-border hover:border-primary/40"}`}>
                        <div className={`h-8 bg-gradient-to-r ${preview}`} />
                        <div className="px-2 py-1.5 text-left"><div className="text-xs font-semibold text-foreground">{label}</div><div className="text-[9px] text-muted-foreground leading-tight">{desc}</div></div>
                      </button>
                    ))}
                  </div>
                </Card>

                <Card className="p-4 space-y-3">
                  <Label className="flex items-center gap-2"><Target className="h-3.5 w-3.5 text-primary" />Briefing da Campanha</Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div className="space-y-1.5"><Label className="text-xs text-muted-foreground flex items-center gap-1"><Target className="h-3 w-3" />Objetivo</Label><Input value={objective} onChange={(e) => setObjective(e.target.value)} placeholder="Ex: gerar pedidos de demonstracao" className="text-sm" /></div>
                    <div className="space-y-1.5"><Label className="text-xs text-muted-foreground flex items-center gap-1"><Users className="h-3 w-3" />Publico-alvo</Label><Input value={audience} onChange={(e) => setAudience(e.target.value)} placeholder="Ex: equipas comerciais e PMEs" className="text-sm" /></div>
                  </div>
                </Card>

                <Card className="p-4 space-y-3">
                  <Label className="flex items-center gap-2"><Type className="h-3.5 w-3.5 text-primary" />Texto e Cor</Label>
                  <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">Titulo Principal *</Label><Textarea value={mainText} onChange={(e) => setMainText(e.target.value)} placeholder="Ex: Revolucione as suas vendas com IA" className="min-h-[70px] resize-none text-sm" /></div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">Subtitulo</Label><Input value={subText} onChange={(e) => setSubText(e.target.value)} placeholder="Texto secundario" className="text-sm" /></div>
                    <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">Nome da Marca</Label><Input value={brandName} onChange={(e) => setBrandName(e.target.value)} placeholder="Minha Marca" className="text-sm" /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">Call to Action</Label><Input value={cta} onChange={(e) => setCta(e.target.value)} placeholder="Pedir demonstracao" className="text-sm" /></div>
                    <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">Cor Principal</Label><div className="flex gap-2 items-center"><input type="color" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className="w-10 h-10 rounded cursor-pointer border border-border" /><div className="flex flex-wrap gap-1">{["#6366f1", "#ec4899", "#10b981", "#f59e0b", "#ef4444", "#3b82f6"].map((c) => <button key={c} onClick={() => setPrimaryColor(c)} className={`w-5 h-5 rounded-full border transition-all ${primaryColor === c ? "border-foreground scale-110" : "border-transparent"}`} style={{ backgroundColor: c }} />)}</div></div></div>
                  </div>
                  {error && <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</div>}
                  <Button onClick={generate} disabled={isGenerating || !mainText.trim()} className="w-full" size="lg">{isGenerating ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />A gerar com contexto...</> : <><Sparkles className="h-4 w-4 mr-2" />Gerar Design</>}</Button>
                </Card>
              </div>

              <div className="space-y-4">
                <Card className="p-4 space-y-3">
                  <h3 className="text-sm font-semibold text-foreground">Preview</h3>
                  {selected ? <>
                    <div className="rounded-lg overflow-hidden bg-muted border border-border"><img src={selected.url} alt="Marketing design" className="w-full object-contain max-h-[380px]" loading="lazy" /></div>
                    <div className="flex flex-wrap gap-2 items-center"><Badge variant="outline" className="text-[10px] bg-primary/5 border-primary/20 text-primary capitalize">{selected.type}</Badge><Badge variant="outline" className="text-[10px] capitalize">{PLATFORMS.find((p) => p.id === selected.platform)?.label}</Badge><Badge variant="outline" className="text-[10px] capitalize">{VISUAL_STYLES.find((s) => s.id === selected.style)?.label}</Badge></div>
                    <div className="flex gap-2"><Button size="sm" variant="outline" className="flex-1" onClick={regenerate} disabled={isGenerating}><RefreshCw className="h-3.5 w-3.5 mr-1" />Variacao</Button><Button size="sm" variant="outline" onClick={copyPrompt}>{copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}</Button><Button size="sm" className="flex-1" onClick={() => downloadImage(selected)}><Download className="h-3.5 w-3.5 mr-1" />Download</Button></div>
                  </> : <div className="aspect-square flex items-center justify-center border-2 border-dashed border-border rounded-lg bg-muted/20 text-center text-muted-foreground"><div className="space-y-2 p-4"><Megaphone className="h-10 w-10 mx-auto opacity-30" /><p className="text-sm">O teu design aparecera aqui</p><p className="text-xs opacity-60">Preenche o briefing e clica em Gerar</p></div></div>}
                </Card>

                <Card className="p-4 space-y-2"><h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Hooks de Copy Rapidos</h4><div className="flex flex-wrap gap-1.5">{AI_COPY_HOOKS.map((hook) => <button key={hook} onClick={() => setMainText(hook + " " + mainText)} className="text-xs px-2.5 py-1 rounded-full border border-border bg-muted/30 hover:bg-muted/60 hover:border-primary/50 transition-colors text-foreground">{hook}</button>)}</div></Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="copy" className="mt-4">
            <div className="space-y-5">{COPY_TEMPLATES.map(({ category, templates }) => <Card key={category} className="p-4 space-y-3"><h3 className="font-semibold text-foreground flex items-center gap-2"><Type className="h-4 w-4 text-primary" />{category}</h3><div className="grid grid-cols-1 sm:grid-cols-2 gap-2">{templates.map((t) => <button key={t} onClick={() => { setMainText(t); setActiveTab("create") }} className="text-left px-4 py-3 rounded-xl border border-border bg-muted/20 hover:bg-muted/50 hover:border-primary/50 transition-all group"><p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">{t}</p><p className="text-xs text-muted-foreground mt-0.5">Clica para usar como titulo</p></button>)}</div></Card>)}</div>
          </TabsContent>

          <TabsContent value="gallery" className="mt-4">
            {results.length === 0 ? <Card className="p-10 text-center text-muted-foreground"><Palette className="h-10 w-10 mx-auto mb-3 opacity-30" /><p className="text-sm">Ainda nao geraste nenhum design</p><p className="text-xs mt-1 opacity-60">Os teus designs aparecerao aqui</p></Card> : <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">{results.map((r, i) => <button key={i} onClick={() => { setSelected(r); setActiveTab("create") }} className="group relative aspect-square rounded-xl overflow-hidden border border-border hover:border-primary/60 transition-all"><img src={r.url} alt={r.prompt} className="w-full h-full object-cover" loading="lazy" /><div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-colors flex items-end p-2 opacity-0 group-hover:opacity-100"><div className="flex gap-1"><Badge variant="secondary" className="text-[9px] capitalize">{r.type}</Badge><Badge variant="secondary" className="text-[9px] capitalize">{r.style}</Badge></div></div><span onClick={(e) => { e.stopPropagation(); downloadImage(r) }} className="absolute top-2 right-2 bg-black/70 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/90"><Download className="h-3 w-3" /></span></button>)}</div>}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
