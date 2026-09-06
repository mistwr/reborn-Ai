"use client"

import { useEffect, useState } from "react"
import { X, Sparkles, Zap, Target, Crown, Check, Loader2, MessageCircle, Shield, Calendar, XCircle } from "lucide-react"
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
  const supportWhatsApp = (process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP || "").replace(/\D/g, "")

  useEffect(() => {
    if (isOpen) trackEvent("paywall_opened", { source: "pro_modal" })
  }, [isOpen])

  if (!isOpen) return null

  const handleCheckout = async () => {
    setIsLoading(true)
    setError(null)
    trackEvent("checkout_started", { plan: "pro", price_cents: PRO_PLAN.priceInCents })

    try {
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: userEmail }),
      })
      const data = await response.json()
      if (data.url) window.location.href = data.url
      else throw new Error(data.error || "Erro ao criar sessao de pagamento")
    } catch (err) {
      console.error("[ProModal] Checkout error:", err)
      trackEvent("checkout_error", { error: String(err), plan: "pro" })
      setError("Nao foi possivel abrir o pagamento. Tenta novamente.")
      setIsLoading(false)
    }
  }

  const handleWhatsApp = () => {
    if (!supportWhatsApp) return
    trackEvent("whatsapp_clicked", { context: "pro_modal" })
    window.open(
      `https://wa.me/${supportWhatsApp}?text=${encodeURIComponent("Quero saber mais sobre o Reborn AI Pro")}`,
      "_blank",
      "noopener,noreferrer",
    )
  }

  const benefits = [
    [Zap, "Cria mais rapido", "Transforma ideias em conteudos, paginas, imagens e campanhas sem perder horas."],
    [Sparkles, "Mais ferramentas de IA", "Chat, WebCraft, imagens, ebooks, slides, marketing, visao OCR e muito mais."],
    [Target, "Feito para vender", "Ideal para negocios, vendedores, criadores e equipas que querem poupar tempo."],
    [Crown, "Acesso Pro", "Desbloqueia funcionalidades avancadas e prioridade no uso da plataforma."],
  ] as const

  const trustBadges = [
    [Shield, "Pagamento seguro"],
    [Calendar, "Sem fidelizacao"],
    [XCircle, "Cancelamento livre"],
  ] as const

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto bg-card border border-border rounded-3xl shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors z-10">
          <X className="w-4 h-4" />
        </button>

        <div className="bg-gradient-to-r from-primary to-violet-600 text-white text-center py-2 px-4 text-sm font-medium rounded-t-3xl">
          Reborn AI Pro por {formatPrice(PRO_PLAN.priceInCents)}/mes
        </div>

        <div className="p-6 space-y-6">
          <div className="text-center space-y-2">
            <div className="w-16 h-16 mx-auto bg-gradient-to-br from-primary to-violet-600 rounded-2xl flex items-center justify-center shadow-lg shadow-primary/30">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-foreground">Desbloqueia o Reborn AI Pro</h2>
            <p className="text-sm text-muted-foreground">Todas as ferramentas do Reborn numa unica subscricao.</p>
          </div>

          <div className="space-y-3">
            {benefits.map(([Icon, title, description]) => (
              <div key={title} className="flex gap-3 p-3 rounded-xl bg-muted/30 border border-border/50">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0"><Icon className="w-4 h-4 text-primary" /></div>
                <div><p className="font-medium text-sm">{title}</p><p className="text-xs text-muted-foreground mt-0.5">{description}</p></div>
              </div>
            ))}
          </div>

          <div className="space-y-2">
            {PRO_PLAN.features.map((feature) => (
              <div key={feature} className="flex items-start gap-2 text-sm"><Check className="w-4 h-4 text-primary mt-0.5 shrink-0" /><span>{feature}</span></div>
            ))}
          </div>

          {error && <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}

          <Button size="lg" className="w-full gap-2" onClick={handleCheckout} disabled={isLoading}>
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Crown className="w-4 h-4" />}
            {isLoading ? "A abrir pagamento..." : "Ativar Reborn AI Pro"}
          </Button>

          {supportWhatsApp && (
            <Button variant="outline" className="w-full gap-2" onClick={handleWhatsApp}>
              <MessageCircle className="w-4 h-4" />
              Falar no WhatsApp
            </Button>
          )}

          <div className="flex flex-wrap justify-center gap-3 pt-1">
            {trustBadges.map(([Icon, text]) => <span key={text} className="flex items-center gap-1 text-[11px] text-muted-foreground"><Icon className="w-3 h-3" />{text}</span>)}
          </div>
        </div>
      </div>
    </div>
  )
}
