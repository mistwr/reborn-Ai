"use client"

import { useEffect } from "react"
import Link from "next/link"
import { CheckCircle2, Sparkles, MessageCircle, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { trackEvent } from "@/lib/analytics"

export default function BillingSuccessPage() {
  useEffect(() => {
    trackEvent("payment_success_viewed")
    
    // Store Pro status in localStorage for immediate UI update
    localStorage.setItem("rebornai-pro", "true")
    localStorage.setItem("rebornai-pro-activated", Date.now().toString())
  }, [])

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-8">
        {/* Success Icon */}
        <div className="relative mx-auto w-24 h-24">
          <div className="absolute inset-0 bg-green-500/20 rounded-full animate-ping" />
          <div className="relative w-24 h-24 bg-gradient-to-br from-green-400 to-emerald-600 rounded-full flex items-center justify-center shadow-lg shadow-green-500/30">
            <CheckCircle2 className="w-12 h-12 text-white" />
          </div>
        </div>

        {/* Title */}
        <div className="space-y-3">
          <h1 className="text-3xl font-bold text-foreground">
            Pagamento confirmado
          </h1>
          <p className="text-lg text-muted-foreground">
            Bem-vindo ao Reborn AI Pro
          </p>
        </div>

        {/* Features unlocked */}
        <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-center gap-2 text-primary">
            <Sparkles className="w-5 h-5" />
            <span className="font-semibold">Conta Pro Ativa</span>
          </div>
          
          <ul className="text-sm text-muted-foreground space-y-2 text-left">
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
              <span>50.000 tokens por dia</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
              <span>Todas as ferramentas desbloqueadas</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
              <span>WebCraft, Marketing, Clipper AI</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
              <span>Suporte prioritario</span>
            </li>
          </ul>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col gap-3">
          <Button asChild size="lg" className="w-full gap-2">
            <Link href="/">
              Entrar na plataforma
              <ArrowRight className="w-4 h-4" />
            </Link>
          </Button>
          
          <Button asChild variant="outline" size="lg" className="w-full gap-2">
            <a 
              href="https://wa.me/351931184023?text=Acabei%20de%20ativar%20o%20Reborn%20AI%20Pro!"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackEvent("whatsapp_clicked", { context: "billing_success" })}
            >
              <MessageCircle className="w-4 h-4" />
              Falar no WhatsApp
            </a>
          </Button>
        </div>

        {/* Footer text */}
        <p className="text-xs text-muted-foreground">
          Recebes um email de confirmacao com os detalhes da subscricao.
          <br />
          Cancela quando quiseres nas definicoes da conta.
        </p>
      </div>
    </div>
  )
}
