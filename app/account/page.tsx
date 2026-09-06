"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { User, CreditCard, Sparkles, ArrowLeft, Settings, Crown, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PRO_PLAN, FREE_PLAN, formatPrice } from "@/lib/plans"

export default function AccountPage() {
  const [isPro, setIsPro] = useState(false)
  const [tokenCount, setTokenCount] = useState(0)
  const [email, setEmail] = useState("")

  useEffect(() => {
    const proStatus = localStorage.getItem("rebornai-pro") === "true"
    setIsPro(proStatus)

    const tokens = parseInt(localStorage.getItem("rebornai-token-count") || "0")
    setTokenCount(tokens)

    const userEmail = localStorage.getItem("rebornai-user-email") || ""
    setEmail(userEmail)
  }, [])

  const currentPlan = isPro ? PRO_PLAN : FREE_PLAN
  const tokenLimit = currentPlan.tokensPerDay

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <span>Voltar</span>
          </Link>
          <h1 className="text-lg font-semibold">A minha conta</h1>
          <div className="w-20" />
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        <div className="bg-card border border-border rounded-2xl p-6">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 bg-gradient-to-br from-primary to-violet-600 rounded-full flex items-center justify-center">
              <User className="w-8 h-8 text-white" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-foreground">{email || "Utilizador"}</h2>
                {isPro && (
                  <span className="flex items-center gap-1 px-2 py-0.5 bg-primary/10 text-primary text-xs font-medium rounded-full">
                    <Crown className="w-3 h-3" />
                    PRO
                  </span>
                )}
              </div>
              <p className="text-muted-foreground text-sm mt-1">Plano {currentPlan.name}</p>
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-primary" />
            <h3 className="font-semibold text-foreground">Subscricao</h3>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="p-4 bg-muted/50 rounded-xl">
              <p className="text-sm text-muted-foreground">Plano atual</p>
              <p className="text-lg font-bold text-foreground flex items-center gap-2">
                {currentPlan.name}
                {isPro && <Sparkles className="w-4 h-4 text-primary" />}
              </p>
            </div>
            <div className="p-4 bg-muted/50 rounded-xl">
              <p className="text-sm text-muted-foreground">Valor mensal</p>
              <p className="text-lg font-bold text-foreground">{formatPrice(currentPlan.priceInCents, currentPlan.currency)}</p>
            </div>
          </div>

          {!isPro && (
            <Button asChild className="w-full gap-2">
              <Link href="/?upgrade=true">
                <Sparkles className="w-4 h-4" />
                Fazer upgrade para Pro
              </Link>
            </Button>
          )}
        </div>

        <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-primary" />
            <h3 className="font-semibold text-foreground">Utilizacao de hoje</h3>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Tokens usados</span>
              <span className="font-medium text-foreground">{tokenCount.toLocaleString()} / {tokenLimit.toLocaleString()}</span>
            </div>

            <div className="h-3 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-primary to-violet-500 rounded-full transition-all"
                style={{ width: `${Math.min((tokenCount / tokenLimit) * 100, 100)}%` }}
              />
            </div>

            <p className="text-xs text-muted-foreground">Os tokens renovam todos os dias a meia-noite</p>
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-primary" />
            <h3 className="font-semibold text-foreground">Funcionalidades incluidas</h3>
          </div>

          <ul className="grid gap-2 sm:grid-cols-2">
            {currentPlan.features.map((feature, i) => (
              <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="w-1.5 h-1.5 bg-primary rounded-full shrink-0" />
                {feature}
              </li>
            ))}
          </ul>
        </div>
      </main>
    </div>
  )
}
