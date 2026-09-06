"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Globe2, Sparkles, Wand2, Video, ImageIcon, Presentation, BookOpen, Megaphone, ArrowRight, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { trackEvent } from "@/lib/analytics"

const copy = {
  pt: {
    eyebrow: "UMA IA. QUALQUER IDIOMA. MAIS POSSIBILIDADES.",
    title: "Cria, comunica, vende e automatiza com o Reborn AI.",
    subtitle: "Chat, Live, websites, imagens, marketing, clips, apresentações e ebooks numa única plataforma.",
    cta: "Experimentar Reborn AI",
    secondary: "Ver ferramentas",
    global: "Preparado para utilizadores em todo o mundo",
    tools: "Tudo num só lugar",
    items: ["Chat e Live em tempo real", "WebCraft para criar websites", "Imagens e marketing", "Clipper para vídeos curtos", "Apresentações e ebooks", "Ferramentas para negócios e criadores"],
    pricing: "Começa gratuitamente. Faz upgrade quando precisares de mais poder.",
  },
  en: {
    eyebrow: "ONE AI. ANY LANGUAGE. MORE POSSIBILITIES.",
    title: "Create, communicate, sell and automate with Reborn AI.",
    subtitle: "Chat, Live, websites, images, marketing, clips, presentations and ebooks in one platform.",
    cta: "Try Reborn AI",
    secondary: "Explore tools",
    global: "Built for users around the world",
    tools: "Everything in one place",
    items: ["Real-time Chat and Live", "WebCraft website creation", "Images and marketing", "Clipper for short-form video", "Presentations and ebooks", "Tools for businesses and creators"],
    pricing: "Start free. Upgrade when you need more power.",
  },
  es: {
    eyebrow: "UNA IA. CUALQUIER IDIOMA. MÁS POSIBILIDADES.",
    title: "Crea, comunica, vende y automatiza con Reborn AI.",
    subtitle: "Chat, Live, sitios web, imágenes, marketing, clips, presentaciones y ebooks en una sola plataforma.",
    cta: "Probar Reborn AI",
    secondary: "Ver herramientas",
    global: "Preparado para usuarios de todo el mundo",
    tools: "Todo en un solo lugar",
    items: ["Chat y Live en tiempo real", "WebCraft para crear sitios web", "Imágenes y marketing", "Clipper para vídeos cortos", "Presentaciones y ebooks", "Herramientas para negocios y creadores"],
    pricing: "Empieza gratis. Mejora cuando necesites más potencia.",
  },
} as const

type Lang = keyof typeof copy

function detectLanguage(): Lang {
  if (typeof navigator === "undefined") return "en"
  const lang = (navigator.language || "en").toLowerCase()
  if (lang.startsWith("pt")) return "pt"
  if (lang.startsWith("es")) return "es"
  return "en"
}

export default function GlobalLandingPage() {
  const [lang, setLang] = useState<Lang>("en")

  useEffect(() => {
    const detected = detectLanguage()
    setLang(detected)
    trackEvent("feature_used", { feature: "global_landing", language: detected })
  }, [])

  const t = useMemo(() => copy[lang], [lang])

  const tools = [
    [Sparkles, "Chat + Live"],
    [Wand2, "WebCraft"],
    [ImageIcon, "Images"],
    [Megaphone, "Marketing"],
    [Video, "Clipper"],
    [Presentation, "Slides"],
    [BookOpen, "Ebooks"],
  ] as const

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="max-w-6xl mx-auto px-4 py-6 flex items-center justify-between">
        <Link href="/" className="font-bold text-xl tracking-tight">REBORN AI</Link>
        <div className="flex items-center gap-2">
          <Globe2 className="w-4 h-4 text-muted-foreground" />
          <select
            value={lang}
            onChange={(e) => setLang(e.target.value as Lang)}
            className="bg-transparent text-sm border border-border rounded-lg px-2 py-1"
            aria-label="Language"
          >
            <option value="en">EN</option>
            <option value="pt">PT</option>
            <option value="es">ES</option>
          </select>
        </div>
      </header>

      <section className="max-w-6xl mx-auto px-4 pt-16 pb-20 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground mb-6">
          <Globe2 className="w-3.5 h-3.5" /> {t.eyebrow}
        </div>
        <h1 className="text-4xl sm:text-6xl font-black tracking-tight max-w-4xl mx-auto leading-tight">{t.title}</h1>
        <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto">{t.subtitle}</p>

        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
          <Button size="lg" asChild className="gap-2" onClick={() => trackEvent("signup_started", { source: "global_landing", language: lang })}>
            <Link href="/">{t.cta}<ArrowRight className="w-4 h-4" /></Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <a href="#tools">{t.secondary}</a>
          </Button>
        </div>

        <p className="mt-5 text-sm text-muted-foreground">{t.global}</p>
      </section>

      <section id="tools" className="max-w-6xl mx-auto px-4 pb-20">
        <div className="rounded-3xl border border-border bg-card p-6 sm:p-10">
          <h2 className="text-2xl sm:text-3xl font-bold text-center">{t.tools}</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 mt-8">
            {tools.map(([Icon, name]) => (
              <div key={name} className="rounded-2xl border border-border bg-background p-4 text-center">
                <Icon className="w-5 h-5 mx-auto text-primary" />
                <p className="mt-2 text-sm font-medium">{name}</p>
              </div>
            ))}
          </div>

          <div className="grid sm:grid-cols-2 gap-3 mt-8 max-w-3xl mx-auto">
            {t.items.map((item) => (
              <div key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                <span>{item}</span>
              </div>
            ))}
          </div>

          <p className="mt-8 text-center text-sm font-medium">{t.pricing}</p>
        </div>
      </section>
    </main>
  )
}
