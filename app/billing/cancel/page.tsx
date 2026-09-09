"use client"

import Link from "next/link"
import { useEffect } from "react"
import { XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { trackEvent } from "@/lib/analytics"

export default function BillingCancelPage() {
  useEffect(() => {
    trackEvent("payment_cancel_viewed")
  }, [])

  return (
    <main className="min-h-screen bg-background text-foreground flex items-center justify-center px-6 py-16">
      <div className="w-full max-w-xl rounded-3xl border border-border bg-card p-8 text-center shadow-sm">
        <XCircle className="mx-auto h-14 w-14 text-muted-foreground" />
        <h1 className="mt-6 text-3xl font-bold">Pagamento cancelado</h1>
        <p className="mt-3 text-muted-foreground">
          Não foi feita nenhuma ativação Pro. Podes continuar a usar o Reborn AI ou voltar ao checkout quando quiseres.
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button asChild>
            <Link href="/">Voltar ao Reborn AI</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/global">Ver o Reborn AI Global</Link>
          </Button>
        </div>
      </div>
    </main>
  )
}
