"use client"

import { useEffect } from "react"
import Link from "next/link"
import { XCircle, ArrowLeft, MessageCircle, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { trackEvent } from "@/lib/analytics"
import { PRO_PLAN, formatPrice } from "@/lib/plans"

export default function BillingCancelPage() {
  useEffect(() => {
    trackEvent("payment_cancel_viewed")
  }, [])

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-8">
        {/* Icon */}
        <div className="mx-auto w-20 h-20 bg-muted rounded-full flex items-center justify-center">
          <XCircle className="w-10 h-10 text-muted-foreground" />
        </div>

        {/* Title */}
        <div className="space-y-3">
          <h1 className="text-2xl font-bold text-foreground">
            Pagamento cancelado
          </h1>
          <p className="text-muted-foreground">
            Nao te preocupes. Podes voltar aos planos quando quiseres.
          </p>
        </div>

        {/* Reminder of what they're missing */}
        <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-center gap-2 text-primary">
            <Sparkles className="w-5 h-5" />
            <span className="font-semibold">O que inclui o Pro?</span>
          </div>
          
          <ul className="text-sm text-muted-foreground space-y-2 text-left">
            {PRO_PLAN.features.slice(0, 5).map((feature, i) => (
              <li key={i} className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-primary rounded-full shrink-0" />
                <span>{feature}</span>
              </li>
            ))}
          </ul>
          
          <div className="pt-2 border-t border-border">
            <p className="text-lg font-bold text-foreground">
              {formatPrice(PRO_PLAN.priceInCents, PRO_PLAN.currency)}/mes
            </p>
            <p className="text-xs text-muted-foreground">
              Menos que um cafe por semana
            </p>
          </div>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col gap-3">
          <Button asChild size="lg" className="w-full gap-2">
            <Link href="/">
              <ArrowLeft className="w-4 h-4" />
              Voltar ao Reborn AI
            </Link>
          </Button>
          
          <Button asChild variant="outline" size="lg" className="w-full gap-2">
            <a 
              href="https://wa.me/351931184023?text=Tenho%20duvidas%20sobre%20o%20Reborn%20AI%20Pro"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackEvent("whatsapp_clicked", { context: "billing_cancel" })}
            >
              <MessageCircle className="w-4 h-4" />
              Falar no WhatsApp
            </a>
          </Button>
        </div>

        {/* Footer */}
        <p className="text-xs text-muted-foreground">
          Tens duvidas? Fala connosco no WhatsApp.
          <br />
          Estamos aqui para ajudar.
        </p>
      </div>
    </div>
  )
}
