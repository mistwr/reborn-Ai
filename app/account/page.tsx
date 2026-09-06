"use client"

import Link from "next/link"
import { useSession, signIn } from "next-auth/react"
import { User, CreditCard, Sparkles, ArrowLeft, Settings, Crown, Zap, ShieldCheck, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PRO_PLAN, FREE_PLAN, formatPrice } from "@/lib/plans"

export default function AccountPage() {
  const { data: session, status } = useSession()

  const user = session?.user as any
  const isFounder = Boolean(user?.isFounder)
  const isPro = Boolean(user?.isPro || isFounder)
  const plan = isFounder ? "founder" : isPro ? "pro" : "free"
  const currentPlan = isPro ? PRO_PLAN : FREE_PLAN
  const email = user?.email || ""
  const tokenLimit = isFounder ? null : currentPlan.tokensPerDay

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin" />
          A carregar conta...
        </div>
      </div>
    )
  }

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
        {!session ? (
          <div className="bg-card border border-border rounded-2xl p-8 text-center space-y-4">
            <User className="w-10 h-10 mx-auto text-muted-foreground" />
            <div>
              <h2 className="text-xl font-bold">Entra na tua conta Reborn</h2>
              <p className="text-sm text-muted-foreground mt-1">O plano e o acesso Pro são verificados de forma segura no servidor.</p>
            </div>
            <Button onClick={() => signIn()}>Entrar</Button>
          </div>
        ) : (
          <>
            <div className="bg-card border border-border rounded-2xl p-6">
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 bg-gradient-to-br from-primary to-violet-600 rounded-full flex items-center justify-center">
                  {isFounder ? <ShieldCheck className="w-8 h-8 text-white" /> : <User className="w-8 h-8 text-white" />}
                </div>
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-xl font-bold text-foreground">{email || user?.name || "Utilizador"}</h2>
                    {isFounder ? (
                      <span className="flex items-center gap-1 px-2 py-0.5 bg-violet-500/10 text-violet-400 text-xs font-medium rounded-full">
                        <ShieldCheck className="w-3 h-3" />
                        FOUNDER
                      </span>
                    ) : isPro ? (
                      <span className="flex items-center gap-1 px-2 py-0.5 bg-primary/10 text-primary text-xs font-medium rounded-full">
                        <Crown className="w-3 h-3" />
                        PRO
                      </span>
                    ) : null}
                  </div>
                  <p className="text-muted-foreground text-sm mt-1">
                    {plan === "founder" ? "Founder Mode · acesso total" : `Plano ${currentPlan.name}`}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-primary" />
                <h3 className="font-semibold text-foreground">Subscrição</h3>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="p-4 bg-muted/50 rounded-xl">
                  <p className="text-sm text-muted-foreground">Plano atual</p>
                  <p className="text-lg font-bold text-foreground flex items-center gap-2">
                    {isFounder ? "Founder" : currentPlan.name}
                    {isFounder ? <ShieldCheck className="w-4 h-4 text-violet-400" /> : isPro ? <Sparkles className="w-4 h-4 text-primary" /> : null}
                  </p>
                </div>
                <div className="p-4 bg-muted/50 rounded-xl">
                  <p className="text-sm text-muted-foreground">Valor mensal</p>
                  <p className="text-lg font-bold text-foreground">
                    {isFounder ? "Acesso fundador" : formatPrice(currentPlan.priceInCents, currentPlan.currency)}
                  </p>
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
                <h3 className="font-semibold text-foreground">Limites de utilização</h3>
              </div>

              {isFounder ? (
                <div className="p-4 bg-violet-500/10 border border-violet-500/20 rounded-xl">
                  <p className="font-semibold text-violet-300">Founder Mode ativo</p>
                  <p className="text-sm text-muted-foreground mt-1">Acesso total às funcionalidades Pro sem bloqueio por plano.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Limite diário do plano</p>
                  <p className="text-2xl font-bold">{tokenLimit?.toLocaleString()} tokens/dia</p>
                  <p className="text-xs text-muted-foreground">O consumo real será ligado ao sistema de usage metering do Reborn.</p>
                </div>
              )}
            </div>

            <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-primary" />
                <h3 className="font-semibold text-foreground">Funcionalidades incluídas</h3>
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
          </>
        )}
      </main>
    </div>
  )
}
