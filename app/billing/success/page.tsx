"use client"

import Link from "next/link"
import { useEffect } from "react"
import { CheckCircle2, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { trackEvent } from "@/lib/analytics"

export default function BillingSuccessPage() {
  useEffect(() => {
    trackEvent("payment_success_viewed")
  }, [])

  return (
    <main className="min-h-screen bg-background text-foreground flex items-center justify-center px-6 py-16">
      <div className="w-full max-w-xl rounded-3xl border border-border bg-card p-8 text-center shadow-sm">
        <CheckCircle2 className="mx-auto h-14 w-14 text-emerald-500" />
        <h1 className="mt-6 text-3xl font-bold">Pagamento recebido</h1>
        <p className="mt-3 text-muted-foreground">
          A Stripe concluiu o checkout. O Reborn AI está agora a confirmar a subscrição de forma segura.
        </p>

        <div className="mt-6 flex items-center justify-center gap-2 rounded-2xl bg-muted px-4 py-3 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          A ativação Pro só fica concluída depois da confirmação do webhook.
        </div>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button asChild>
            <Link href="/account">Ver a minha conta</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/">Voltar ao Reborn AI</Link>
          </Button>
        </div>
      </div>
    </main>
  )
}
