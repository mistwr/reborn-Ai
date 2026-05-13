"use client"

import { useState } from "react"
import { 
  X, 
  Sparkles, 
  Zap, 
  Target, 
  Crown,
  Check,
  Loader2,
  MessageCircle,
  Shield,
  Calendar,
  XCircle
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { trackEvent } from "@/lib/analytics"
import { PRO_PLAN, formatPrice } from "@/lib/plans"

interface ProModalProps {
  isOpen: boolean
  onClose: () => void
  userEmail?: string
}

export function ProModal({ isOpen, onClose, userEmail }: ProModalProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!isOpen) return null

  const handleCheckout = async () => {
    setIsLoading(true)
    setError(null)
    trackEvent("checkout_started")

    try {
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: userEmail }),
      })

      const data = await response.json()

      if (data.url) {
        window.location.href = data.url
      } else {
        throw new Error(data.error || "Erro ao criar sessao de pagamento")
      }
    } catch (err) {
      console.error("[ProModal] Checkout error:", err)
      trackEvent("checkout_error", { error: String(err) })
      setError("Nao foi possivel abrir o pagamento. Tenta novamente ou fala connosco no WhatsApp.")
      setIsLoading(false)
    }
  }

  const handleWhatsApp = () => {
    trackEvent("whatsapp_clicked", { context: "pro_modal" })
    window.open("https://wa.me/351931184023?text=Quero%20saber%20mais%20sobre%20o%20Reborn%20AI%20Pro", "_blank")
  }

  const benefits = [
    {
      icon: Zap,
      title: "Cria mais rapido",
      description: "Transforma ideias em conteudos, paginas, imagens e campanhas sem perder horas."
    },
    {
      icon: Sparkles,
      title: "Mais ferramentas de IA",
      description: "Chat, WebCraft, imagens, ebooks, slides, marketing, visao OCR e muito mais."
    },
    {
      icon: Target,
      title: "Feito para vender",
      description: "Ideal para negocios, vendedores, criadores e equipas que querem poupar tempo."
    },
    {
      icon: Crown,
      title: "Acesso Pro",
      description: "Desbloqueia funcionalidades avancadas e prioridade no uso da plataforma."
    }
  ]

  const trustBadges = [
    { icon: Shield, text: "Pagamento seguro" },
    { icon: Calendar, text: "Sem fidelizacao" },
    { icon: XCircle, text: "Cancelamento livre" }
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div 
        className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto bg-card border border-border rounded-3xl shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors z-10"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Launch offer banner */}
        <div className="bg-gradient-to-r from-primary to-violet-600 text-white text-center py-2 px-4 text-sm font-medium rounded-t-3xl">
          Oferta de lancamento: Reborn AI Pro por {formatPrice(PRO_PLAN.priceInCents)}/mes
        </div>

        <div className="p-6 space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="w-16 h-16 mx-auto bg-gradient-to-br from-primary to-violet-600 rounded-2xl flex items-center justify-center shadow-lg shadow-primary/30">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-foreground">
              Desbloqueia o Reborn AI Pro
            </h2>
            <p className="text-muted-foreground">
              Cria conteudos, imagens, websites, campanhas e ideias de venda em minutos — tudo num so lugar.
            </p>
          </div>

          {/* Benefits */}
          <div className="space-y-3">
            {benefits.map((benefit, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-muted/30">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <benefit.icon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground text-sm">{benefit.title}</h3>
                  <p className="text-xs text-muted-foreground">{benefit.description}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Features list */}
          <div className="bg-muted/30 rounded-xl p-4">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
              Inclui tudo isto:
            </p>
            <ul className="grid grid-cols-2 gap-2">
              {PRO_PLAN.features.map((feature, i) => (
                <li key={i} className="flex items-center gap-2 text-xs text-foreground">
                  <Check className="w-3.5 h-3.5 text-green-500 shrink-0" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Price */}
          <div className="text-center space-y-1">
            <div className="flex items-baseline justify-center gap-1">
              <span className="text-4xl font-bold text-foreground">
                {formatPrice(PRO_PLAN.priceInCents)}
              </span>
              <span className="text-muted-foreground">/mes</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Cancela quando quiseres. Pagamento seguro por Stripe.
            </p>
          </div>

          {/* Error message */}
          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-xl text-sm text-destructive text-center">
              {error}
            </div>
          )}

          {/* CTA Buttons */}
          <div className="space-y-3">
            <Button 
              onClick={handleCheckout}
              disabled={isLoading}
              className="w-full h-12 text-base font-semibold gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  A preparar pagamento...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Comecar agora por {formatPrice(PRO_PLAN.priceInCents)}
                </>
              )}
            </Button>
            
            <Button 
              onClick={handleWhatsApp}
              variant="outline"
              className="w-full gap-2"
            >
              <MessageCircle className="w-4 h-4" />
              Falar no WhatsApp
            </Button>
          </div>

          {/* Trust badges */}
          <div className="flex items-center justify-center gap-4 pt-2">
            {trustBadges.map((badge, i) => (
              <div key={i} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <badge.icon className="w-3.5 h-3.5" />
                <span>{badge.text}</span>
              </div>
            ))}
          </div>

          {/* Microcopy */}
          <p className="text-center text-xs text-muted-foreground italic">
            Menos que um cafe por semana para ter uma plataforma de IA pronta a trabalhar contigo.
          </p>
        </div>
      </div>
    </div>
  )
}
