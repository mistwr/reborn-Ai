"use client"

import { useEffect, useMemo, useState } from "react"
import { ArrowLeft, Check, Coins, Crown, Loader2, Sparkles } from "lucide-react"

interface CreditStatus {
  plan?: string
  limit?: number
  used?: number
  dailyRemaining?: number
  bonusCredits?: number
  remaining?: number
}

type PackId = "starter" | "boost" | "max"

const PACKS: Array<{ id: PackId; label: string; credits: number; price: string; highlight?: boolean }> = [
  { id: "starter", label: "Boost", credits: 20_000, price: "9,99 €" },
  { id: "boost", label: "Power", credits: 60_000, price: "24,99 €", highlight: true },
  { id: "max", label: "Max", credits: 150_000, price: "49,99 €" },
]

function formatNumber(value?: number) {
  return new Intl.NumberFormat("pt-PT").format(Math.max(0, Number(value || 0)))
}

export default function CreditsPage() {
  const [status, setStatus] = useState<CreditStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [buying, setBuying] = useState<PackId | null>(null)
  const [error, setError] = useState("")

  const loadStatus = async () => {
    try {
      const response = await fetch("/api/credits", { cache: "no-store" })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data?.error || "Não foi possível carregar o saldo.")
      setStatus(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível carregar o saldo.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadStatus()
  }, [])

  const dailyUsed = useMemo(() => {
    const limit = Number(status?.limit || 0)
    const remaining = Number(status?.dailyRemaining || 0)
    return Math.max(0, limit - remaining)
  }, [status])

  const buy = async (pack: PackId) => {
    setError("")
    setBuying(pack)
    try {
      const response = await fetch("/api/stripe/credits/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pack }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok || !data?.url) throw new Error(data?.error || "Não foi possível abrir o pagamento.")
      window.location.href = data.url
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível abrir o pagamento.")
      setBuying(null)
    }
  }

  return (
    <main className="min-h-screen bg-[#050504] px-4 py-6 text-zinc-100 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <button
          type="button"
          onClick={() => (window.location.href = "/")}
          className="mb-6 inline-flex items-center gap-2 text-sm text-zinc-400 transition hover:text-[#f0c86b]"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar ao Lumin AI
        </button>

        <section className="rounded-3xl border border-[#d6a84b]/15 bg-gradient-to-b from-[#0b0a08] to-[#070706] p-5 shadow-2xl shadow-black/30 sm:p-7">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#d6a84b]/20 bg-[#d6a84b]/[.07] px-3 py-1 text-xs font-medium text-[#f0c86b]">
                <Coins className="h-3.5 w-3.5" />
                Créditos Lumin
              </div>
              <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Saldo e packs de créditos</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400 sm:text-base">
                Usa primeiro o saldo diário do teu plano. Os créditos extra comprados ficam na carteira e não expiram no reset diário.
              </p>
            </div>

            <div className="grid min-w-full gap-3 sm:grid-cols-3 lg:min-w-[520px]">
              <div className="rounded-2xl border border-white/10 bg-white/[.025] p-4">
                <div className="text-xs uppercase tracking-[.16em] text-zinc-500">Plano</div>
                <div className="mt-2 flex items-center gap-2 text-lg font-semibold">
                  {String(status?.plan || "free").toLowerCase() === "pro" ? <Crown className="h-5 w-5 text-[#f0c86b]" /> : null}
                  {String(status?.plan || "Free").toUpperCase()}
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[.025] p-4">
                <div className="text-xs uppercase tracking-[.16em] text-zinc-500">Hoje</div>
                <div className="mt-2 text-lg font-semibold text-[#f4d486]">
                  {loading ? "—" : formatNumber(status?.dailyRemaining)}
                </div>
                <div className="mt-1 text-xs text-zinc-500">de {formatNumber(status?.limit)} disponíveis</div>
              </div>
              <div className="rounded-2xl border border-[#d6a84b]/15 bg-[#d6a84b]/[.04] p-4">
                <div className="text-xs uppercase tracking-[.16em] text-zinc-500">Extra</div>
                <div className="mt-2 text-lg font-semibold text-[#f4d486]">
                  {loading ? "—" : formatNumber(status?.bonusCredits)}
                </div>
                <div className="mt-1 text-xs text-zinc-500">créditos na carteira</div>
              </div>
            </div>
          </div>

          {!loading && status?.limit ? (
            <div className="mt-6">
              <div className="mb-2 flex items-center justify-between text-xs text-zinc-500">
                <span>Consumo diário</span>
                <span>{formatNumber(dailyUsed)} usados</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-white/[.06]">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#9f762a] to-[#f0c86b]"
                  style={{ width: `${Math.min(100, Math.max(0, (dailyUsed / Math.max(1, Number(status.limit))) * 100))}%` }}
                />
              </div>
            </div>
          ) : null}
        </section>

        <section className="mt-6">
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold">Comprar créditos extra</h2>
              <p className="mt-1 text-sm text-zinc-500">Pagamento único. O saldo entra na tua conta após confirmação da Stripe.</p>
            </div>
            <Sparkles className="hidden h-5 w-5 text-[#f0c86b] sm:block" />
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {PACKS.map((pack) => (
              <article
                key={pack.id}
                className={`relative rounded-3xl border p-5 transition ${
                  pack.highlight
                    ? "border-[#d6a84b]/35 bg-[#d6a84b]/[.055] shadow-lg shadow-[#d6a84b]/5"
                    : "border-white/10 bg-white/[.02]"
                }`}
              >
                {pack.highlight ? (
                  <div className="absolute -top-3 left-5 rounded-full border border-[#d6a84b]/30 bg-[#171107] px-3 py-1 text-[11px] font-semibold uppercase tracking-[.12em] text-[#f0c86b]">
                    Mais escolhido
                  </div>
                ) : null}
                <div className="text-sm font-medium text-zinc-400">{pack.label}</div>
                <div className="mt-2 text-3xl font-semibold tracking-tight">{formatNumber(pack.credits)}</div>
                <div className="text-sm text-zinc-500">créditos</div>
                <div className="mt-5 text-2xl font-semibold text-[#f4d486]">{pack.price}</div>
                <div className="mt-1 text-xs text-zinc-500">pagamento único</div>

                <div className="mt-5 space-y-2 text-sm text-zinc-400">
                  <div className="flex items-center gap-2"><Check className="h-4 w-4 text-[#d6a84b]" /> Não expira no reset diário</div>
                  <div className="flex items-center gap-2"><Check className="h-4 w-4 text-[#d6a84b]" /> Soma ao saldo diário</div>
                  <div className="flex items-center gap-2"><Check className="h-4 w-4 text-[#d6a84b]" /> Crédito automático após pagamento</div>
                </div>

                <button
                  type="button"
                  disabled={Boolean(buying)}
                  onClick={() => void buy(pack.id)}
                  className={`mt-6 flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition disabled:cursor-wait disabled:opacity-60 ${
                    pack.highlight
                      ? "bg-[#d6a84b] text-black hover:bg-[#e4bb62]"
                      : "border border-[#d6a84b]/20 bg-[#d6a84b]/[.07] text-[#f4d486] hover:bg-[#d6a84b]/[.12]"
                  }`}
                >
                  {buying === pack.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Coins className="h-4 w-4" />}
                  {buying === pack.id ? "A abrir Stripe…" : `Comprar ${pack.label}`}
                </button>
              </article>
            ))}
          </div>

          {error ? (
            <div className="mt-4 rounded-2xl border border-red-500/20 bg-red-500/[.06] px-4 py-3 text-sm text-red-300">{error}</div>
          ) : null}
        </section>
      </div>
    </main>
  )
}
