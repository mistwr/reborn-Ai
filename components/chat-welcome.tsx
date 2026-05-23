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
  Rocket,
  Target,
  TrendingUp,
  CheckCircle2,
  Clock,
  Phone,
  Users,
  Store,
  Briefcase,
  Palette,
  Building2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { trackEvent } from "@/lib/analytics"

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

const benefits = [
  {
    icon: Zap,
    title: "Cria mais rapido",
    description: "Transforma ideias em conteudos, paginas, imagens e campanhas sem perder horas."
  },
  {
    icon: Target,
    title: "Feito para vender",
    description: "Ideal para negocios, vendedores, criadores e equipas que querem poupar tempo."
  },
  {
    icon: TrendingUp,
    title: "Mais ferramentas de IA",
    description: "Chat, WebCraft, imagens, ebooks, slides, marketing, visao OCR e muito mais."
  }
]

const useCases = [
  { icon: Globe, text: "Landing page para vender um produto" },
  { icon: Phone, text: "Campanha WhatsApp para captar clientes" },
  { icon: ImagePlus, text: "Imagem profissional para anuncio" },
  { icon: Mail, text: "Email de venda pronto a enviar" },
  { icon: Presentation, text: "Apresentacao comercial" },
  { icon: BookOpen, text: "Ebook para vender ou captar leads" }
]

const targetAudience = [
  { icon: Store, text: "Pequenos negocios" },
  { icon: TrendingUp, text: "Vendedores" },
  { icon: Palette, text: "Criadores de conteudo" },
  { icon: Building2, text: "Agencias" },
  { icon: Briefcase, text: "Consultores" },
  { icon: Users, text: "Equipas comerciais" }
]

interface ChatWelcomeProps {
  onTabChange: (tab: string) => void
  onOpenProModal?: () => void
}

export function ChatWelcome({ onTabChange, onOpenProModal }: ChatWelcomeProps) {
  const [headlineIdx, setHeadlineIdx] = useState(0)
  const [visible, setVisible] = useState(true)

  const headlines = [
    "A tua equipa de IA para criar, vender e automatizar",
    "Cria, escreve e automatiza com IA",
    "O assistente AI mais completo",
    "Produtividade sem limites com IA",
  ]

  useEffect(() => {
    const interval = setInterval(() => {
      setVisible(false)
      setTimeout(() => {
        setHeadlineIdx((i) => (i + 1) % headlines.length)
        setVisible(true)
      }, 350)
    }, 3200)
    return () => clearInterval(interval)
  }, [headlines.length])

  const handleProClick = () => {
    trackEvent("paywall_opened", { source: "welcome_hero" })
    onOpenProModal?.()
  }

  const handleWhatsAppClick = () => {
    trackEvent("whatsapp_clicked", { source: "welcome" })
    window.open("https://wa.me/351932442485?text=Ola! Gostava de saber mais sobre o Reborn AI Pro.", "_blank")
  }

  return (
    <div className="w-full h-full overflow-y-auto">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-10 sm:space-y-14">

        {/* Hero */}
        <div className="text-center space-y-5 relative">
          <div
            className="absolute inset-0 -z-10 pointer-events-none"
            style={{
              background:
                "radial-gradient(ellipse 70% 50% at 50% 0%, oklch(0.65 0.22 220 / 0.12) 0%, transparent 70%)",
            }}
          />

          <Badge variant="secondary" className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary/10 text-primary border-primary/20">
            <Sparkles className="h-3 w-3" />
            Plataforma de IA para Negocios
          </Badge>

          <h1
            className="font-bold text-balance text-foreground leading-tight"
            style={{
              fontSize: "clamp(1.75rem, 5vw, 3.5rem)",
              transition: "opacity 0.35s ease, transform 0.35s ease",
              opacity: visible ? 1 : 0,
              transform: visible ? "translateY(0)" : "translateY(6px)",
            }}
          >
            {headlines[headlineIdx]}
          </h1>

          <p className="text-muted-foreground text-sm sm:text-base md:text-lg max-w-2xl mx-auto text-balance leading-relaxed">
            Reborn AI junta chat, imagens, websites, ebooks, slides, marketing, WhatsApp e automacao numa so plataforma simples.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-wrap justify-center gap-3 pt-4">
            <Button size="lg" onClick={handleProClick} className="gap-2 shadow-lg shadow-primary/25">
              <Sparkles className="h-4 w-4" />
              Comecar agora
            </Button>
            <Button size="lg" variant="outline" onClick={() => onTabChange("chat")} className="gap-2">
              Ver o que faz
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button size="lg" variant="ghost" onClick={handleWhatsAppClick} className="gap-2 text-green-600 hover:text-green-700 hover:bg-green-500/10">
              <Phone className="h-4 w-4" />
              Falar no WhatsApp
            </Button>
          </div>

          {/* Stats */}
          <div className="flex items-center justify-center gap-6 sm:gap-10 pt-4">
            {[
              { icon: Zap, value: "10x", label: "Mais rapido" },
              { icon: Brain, value: "11+", label: "Ferramentas AI" },
              { icon: Shield, value: "100%", label: "Seguro" },
            ].map(({ icon: Icon, value, label }) => (
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

        {/* Benefits Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {benefits.map((benefit, i) => (
            <Card key={i} className="p-5 bg-card/50 border-border/50 hover:border-primary/30 transition-all">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <benefit.icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">{benefit.title}</h3>
                  <p className="text-sm text-muted-foreground">{benefit.description}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Features grid */}
        <div className="space-y-4">
          <div className="space-y-1">
            <h2 className="text-base sm:text-lg font-semibold text-foreground">Explora as ferramentas</h2>
            <p className="text-xs sm:text-sm text-muted-foreground">Clica numa ferramenta para comecar</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {features.map(({ icon: Icon, label, desc, tab, color, iconColor, border }) => (
              <button
                key={tab}
                onClick={() => {
                  trackEvent("feature_clicked", { feature: tab })
                  onTabChange(tab)
                }}
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
        </div>

        {/* Use Cases */}
        <div className="space-y-4">
          <h2 className="text-base sm:text-lg font-semibold text-foreground text-center">O que podes criar com Reborn AI</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {useCases.map((useCase, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border/30">
                <useCase.icon className="h-4 w-4 text-primary shrink-0" />
                <span className="text-sm">{useCase.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Target Audience */}
        <div className="space-y-4">
          <h2 className="text-base sm:text-lg font-semibold text-foreground text-center">Para quem e?</h2>
          <div className="flex flex-wrap justify-center gap-2">
            {targetAudience.map((audience, i) => (
              <Badge key={i} variant="secondary" className="gap-2 py-2 px-3 text-sm bg-card border border-border/50">
                <audience.icon className="h-3.5 w-3.5" />
                {audience.text}
              </Badge>
            ))}
          </div>
        </div>

        {/* Final CTA */}
        <Card className="p-6 md:p-8 bg-gradient-to-br from-primary/5 via-violet-500/5 to-fuchsia-500/5 border-primary/20">
          <div className="text-center space-y-4 max-w-2xl mx-auto">
            <h2 className="text-xl md:text-2xl font-bold">
              Comeca hoje. Cria melhor. Vende mais.
            </h2>
            <p className="text-muted-foreground text-sm md:text-base">
              Por 9,99 euros/mes, tens uma plataforma de IA pronta para trabalhar contigo todos os dias.
            </p>
            <div className="flex flex-wrap justify-center gap-3 pt-2">
              <Button size="lg" onClick={handleProClick} className="gap-2 shadow-lg shadow-primary/25">
                <Rocket className="h-4 w-4" />
                Desbloquear Reborn AI Pro
              </Button>
              <Button size="lg" variant="outline" onClick={handleWhatsAppClick} className="gap-2">
                <Phone className="h-4 w-4" />
                Falar no WhatsApp
              </Button>
            </div>
            <div className="flex flex-wrap justify-center gap-4 pt-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Shield className="h-3 w-3" />
                Pagamento seguro
              </span>
              <span className="flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" />
                Sem fidelizacao
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Cancelamento livre
              </span>
            </div>
            <p className="text-xs text-muted-foreground italic pt-2">
              Menos que um cafe por semana para ter uma plataforma de IA pronta a trabalhar contigo.
            </p>
          </div>
        </Card>

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

      </div>
    </div>
  )
}
