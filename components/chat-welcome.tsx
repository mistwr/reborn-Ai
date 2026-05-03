"use client"

import { useState, useEffect } from "react"
import {
  MessageSquare,
  Video,
  ImagePlus,
  Globe,
  Presentation,
  BookOpen,
  Mail,
  Share2,
  Scissors,
  Megaphone,
  Eye,
  Sparkles,
  ArrowRight,
  Zap,
  Brain,
  Shield,
} from "lucide-react"
import { Button } from "@/components/ui/button"

const features = [
  {
    icon: MessageSquare,
    label: "Chat Inteligente",
    desc: "Conversa natural com IA avancada em tempo real",
    tab: "chat",
    color: "from-blue-500/20 to-blue-600/5",
    iconColor: "text-blue-400",
    border: "border-blue-500/20",
  },
  {
    icon: Video,
    label: "Modo Live",
    desc: "Conversa por voz e video com camara e microfone",
    tab: "live",
    color: "from-purple-500/20 to-purple-600/5",
    iconColor: "text-purple-400",
    border: "border-purple-500/20",
  },
  {
    icon: ImagePlus,
    label: "Imagens AI",
    desc: "Gera imagens realistas com inteligencia artificial",
    tab: "images",
    color: "from-pink-500/20 to-pink-600/5",
    iconColor: "text-pink-400",
    border: "border-pink-500/20",
  },
  {
    icon: Globe,
    label: "WebCraft",
    desc: "Cria websites e landing pages automaticamente",
    tab: "webcraft",
    color: "from-cyan-500/20 to-cyan-600/5",
    iconColor: "text-cyan-400",
    border: "border-cyan-500/20",
  },
  {
    icon: Presentation,
    label: "Apresentacoes",
    desc: "Slides profissionais gerados em segundos",
    tab: "presentations",
    color: "from-orange-500/20 to-orange-600/5",
    iconColor: "text-orange-400",
    border: "border-orange-500/20",
  },
  {
    icon: BookOpen,
    label: "Ebooks",
    desc: "Escreve e formata ebooks completos com IA",
    tab: "ebooks",
    color: "from-green-500/20 to-green-600/5",
    iconColor: "text-green-400",
    border: "border-green-500/20",
  },
  {
    icon: Mail,
    label: "Email Marketing",
    desc: "Campanhas de email que convertem mais",
    tab: "email",
    color: "from-yellow-500/20 to-yellow-600/5",
    iconColor: "text-yellow-400",
    border: "border-yellow-500/20",
  },
  {
    icon: Share2,
    label: "WhatsApp",
    desc: "Mensagens e campanhas para WhatsApp",
    tab: "whatsapp",
    color: "from-emerald-500/20 to-emerald-600/5",
    iconColor: "text-emerald-400",
    border: "border-emerald-500/20",
  },
  {
    icon: Scissors,
    label: "Clipper",
    desc: "Extrai e resume conteudo de videos e audios",
    tab: "clipper",
    color: "from-red-500/20 to-red-600/5",
    iconColor: "text-red-400",
    border: "border-red-500/20",
  },
  {
    icon: Megaphone,
    label: "Marketing",
    desc: "Estrategias e copys de marketing com IA",
    tab: "marketing",
    color: "from-indigo-500/20 to-indigo-600/5",
    iconColor: "text-indigo-400",
    border: "border-indigo-500/20",
  },
  {
    icon: Eye,
    label: "Visao AI",
    desc: "OCR e analise de imagens, PDFs e documentos",
    tab: "vision",
    color: "from-violet-500/20 to-violet-600/5",
    iconColor: "text-violet-400",
    border: "border-violet-500/20",
  },
]

const headlines = [
  "A IA que transforma o teu negocio",
  "Cria, escreve e automatiza com IA",
  "O assistente AI mais completo",
  "Produtividade sem limites com IA",
]

const stats = [
  { icon: Zap, value: "10x", label: "Mais rapido" },
  { icon: Brain, value: "11+", label: "Ferramentas AI" },
  { icon: Shield, value: "100%", label: "Seguro" },
]

interface ChatWelcomeProps {
  onTabChange: (tab: string) => void
}

export function ChatWelcome({ onTabChange }: ChatWelcomeProps) {
  const [headlineIdx, setHeadlineIdx] = useState(0)
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const interval = setInterval(() => {
      setVisible(false)
      setTimeout(() => {
        setHeadlineIdx((i) => (i + 1) % headlines.length)
        setVisible(true)
      }, 350)
    }, 3200)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="w-full h-full overflow-y-auto">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-10 sm:space-y-14">

        {/* Hero */}
        <div className="text-center space-y-5 relative">
          {/* Background glow */}
          <div
            className="absolute inset-0 -z-10 pointer-events-none"
            style={{
              background:
                "radial-gradient(ellipse 70% 50% at 50% 0%, oklch(0.65 0.22 220 / 0.12) 0%, transparent 70%)",
            }}
          />

          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-primary/30 bg-primary/5 text-primary text-xs sm:text-sm font-medium">
            <Sparkles className="h-3 w-3" />
            Powered by Gemini 2.0 Flash
          </div>

          {/* Animated headline */}
          <h1
            className="font-bold text-balance text-foreground leading-tight"
            style={{
              fontSize: "clamp(2rem, 6vw, 4rem)",
              transition: "opacity 0.35s ease, transform 0.35s ease",
              opacity: visible ? 1 : 0,
              transform: visible ? "translateY(0)" : "translateY(6px)",
            }}
          >
            {headlines[headlineIdx]}
          </h1>

          <p className="text-muted-foreground text-sm sm:text-base md:text-lg max-w-2xl mx-auto text-balance leading-relaxed">
            Reborn AI e uma plataforma completa de inteligencia artificial. Chat, imagens, websites, apresentacoes, ebooks, marketing e muito mais — tudo num so lugar.
          </p>

          {/* Stats */}
          <div className="flex items-center justify-center gap-6 sm:gap-10 pt-2">
            {stats.map(({ icon: Icon, value, label }) => (
              <div key={label} className="flex flex-col items-center gap-1">
                <div className="flex items-center gap-1.5">
                  <Icon className="h-4 w-4 text-primary" />
                  <span className="text-xl sm:text-2xl font-bold text-foreground">{value}</span>
                </div>
                <span className="text-xs text-muted-foreground">{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Section title */}
        <div className="space-y-1">
          <h2 className="text-base sm:text-lg font-semibold text-foreground">Explora as ferramentas</h2>
          <p className="text-xs sm:text-sm text-muted-foreground">Clica numa ferramenta para comecar</p>
        </div>

        {/* Features grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {features.map(({ icon: Icon, label, desc, tab, color, iconColor, border }) => (
            <button
              key={tab}
              onClick={() => onTabChange(tab)}
              className={`group relative text-left rounded-xl border ${border} bg-gradient-to-br ${color} p-4 sm:p-5 transition-all duration-200 hover:scale-[1.02] hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-primary/40`}
            >
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg bg-background/40 border ${border} shrink-0`}>
                  <Icon className={`h-4 w-4 sm:h-5 sm:w-5 ${iconColor}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-sm sm:text-base text-foreground text-balance">{label}</span>
                    <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0 -translate-x-1 group-hover:translate-x-0 duration-200" />
                  </div>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 leading-relaxed text-balance">{desc}</p>
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Quick start prompts */}
        <div className="space-y-3">
          <h2 className="text-base sm:text-lg font-semibold text-foreground">Experimenta agora</h2>
          <div className="flex flex-wrap gap-2">
            {[
              "Resume este texto...",
              "Cria uma landing page para...",
              "Escreve um email de vendas sobre...",
              "Gera uma imagem de...",
              "Analisa este documento...",
              "Cria uma apresentacao sobre...",
            ].map((prompt) => (
              <button
                key={prompt}
                onClick={() => {
                  const input = document.querySelector<HTMLTextAreaElement>("textarea")
                  if (input) {
                    input.value = prompt
                    input.focus()
                    input.dispatchEvent(new Event("input", { bubbles: true }))
                  }
                }}
                className="px-3 py-1.5 rounded-full border border-border bg-muted/30 text-xs sm:text-sm text-muted-foreground hover:bg-muted hover:text-foreground hover:border-primary/30 transition-all duration-150 active:scale-95"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pb-4">
          <Button
            size="lg"
            className="w-full sm:w-auto gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-lg shadow-primary/20"
            onClick={() => {
              const input = document.querySelector<HTMLTextAreaElement>("textarea")
              if (input) input.focus()
            }}
          >
            <MessageSquare className="h-4 w-4" />
            Comecar a conversar
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="w-full sm:w-auto gap-2"
            onClick={() => onTabChange("live")}
          >
            <Video className="h-4 w-4" />
            Modo Live
          </Button>
        </div>
      </div>
    </div>
  )
}
