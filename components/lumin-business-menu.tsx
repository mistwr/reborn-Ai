"use client"

import { useMemo, useState } from "react"
import { useSession } from "next-auth/react"
import {
  Bot,
  Building2,
  ChevronRight,
  Globe2,
  Headphones,
  LayoutDashboard,
  Megaphone,
  PhoneCall,
  Sparkles,
  X,
} from "lucide-react"

function clickExistingTab(labels: string[]) {
  const candidates = Array.from(
    document.querySelectorAll<HTMLElement>('button, [role="tab"], a'),
  )
  const match = candidates.find((node) => {
    const text = (node.textContent || "").trim().toLowerCase()
    return labels.some((label) => text.includes(label.toLowerCase()))
  })
  if (match) {
    match.click()
    return true
  }
  return false
}

export function LuminBusinessMenu() {
  const { data: session, status } = useSession()
  const [open, setOpen] = useState(false)
  const user = (session?.user || {}) as any
  const isBusiness = status === "authenticated" && user.accountType === "business"

  const company = useMemo(
    () => user.organizationName || "A tua empresa",
    [user.organizationName],
  )

  if (!isBusiness) return null

  const goTo = (labels: string[]) => {
    setOpen(false)
    window.setTimeout(() => clickExistingTab(labels), 20)
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-[88px] right-4 z-[72] flex items-center gap-2 rounded-full border border-amber-300/25 bg-[#0b0b0e]/95 px-4 py-2.5 text-sm font-medium text-white shadow-[0_12px_45px_rgba(0,0,0,.55),0_0_28px_rgba(218,171,76,.10)] backdrop-blur-xl transition hover:border-amber-300/45 sm:bottom-5 sm:right-5"
        aria-label="Abrir espaço da empresa"
      >
        <span className="relative flex h-7 w-7 items-center justify-center rounded-full border border-amber-300/25 bg-amber-300/10">
          <Building2 className="h-3.5 w-3.5 text-amber-300" />
          <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-emerald-400 ring-2 ring-[#0b0b0e]" />
        </span>
        <span className="max-w-[150px] truncate">{company}</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-[90] bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)}>
          <aside
            className="absolute bottom-0 right-0 top-0 flex w-full max-w-[390px] flex-col border-l border-white/10 bg-[#08080b]/98 shadow-[-30px_0_80px_rgba(0,0,0,.5)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="border-b border-white/[.07] p-5 pt-[max(1.25rem,env(safe-area-inset-top))]">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-amber-300/20 bg-gradient-to-br from-amber-300/10 to-transparent">
                  <Building2 className="h-5 w-5 text-amber-300" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 text-[10px] font-medium uppercase tracking-[.2em] text-amber-300/80">
                    <Sparkles className="h-3 w-3" /> Lumin Business
                  </div>
                  <h2 className="mt-1 truncate text-lg font-semibold text-white">{company}</h2>
                  <p className="truncate text-xs text-zinc-500">{user.organizationSector || "Espaço empresarial"}</p>
                </div>
                <button type="button" onClick={() => setOpen(false)} className="flex h-9 w-9 items-center justify-center rounded-full text-zinc-500 transition hover:bg-white/[.05] hover:text-white" aria-label="Fechar">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              <p className="mb-2 px-2 text-[10px] font-medium uppercase tracking-[.18em] text-zinc-600">Trabalhar</p>
              <div className="space-y-1.5">
                <BusinessItem icon={Bot} title="Assistente da empresa" subtitle="Chat com contexto empresarial" onClick={() => goTo(["chat"])} />
                <BusinessItem icon={Headphones} title="Live" subtitle="Fala com o Lumin em tempo real" onClick={() => goTo(["live"])} />
                <BusinessItem icon={Globe2} title="Websites & Apps" subtitle="Lumin AI Studio" onClick={() => goTo(["webcraft", "lumin ai studio"])} />
                <BusinessItem icon={Megaphone} title="Marketing" subtitle="Campanhas e conteúdos" onClick={() => goTo(["marketing"])} />
              </div>

              <p className="mb-2 mt-6 px-2 text-[10px] font-medium uppercase tracking-[.18em] text-zinc-600">Operação comercial</p>
              <div className="space-y-1.5">
                <BusinessItem
                  icon={LayoutDashboard}
                  title="CRM PARCENDi"
                  subtitle="Clientes, vendas e produção"
                  onClick={() => window.open("https://parcendi.pt", "_blank", "noopener,noreferrer")}
                  external
                />
                <BusinessItem
                  icon={PhoneCall}
                  title="SD Dialer"
                  subtitle="Leads, chamadas e follow-ups"
                  onClick={() => window.open("https://sd-dialer-2p.vercel.app", "_blank", "noopener,noreferrer")}
                  external
                />
              </div>

              <div className="mt-6 rounded-3xl border border-amber-300/10 bg-gradient-to-br from-amber-300/[.06] via-white/[.015] to-violet-500/[.04] p-4">
                <div className="text-sm font-medium text-white">O Lumin conhece a tua empresa</div>
                <p className="mt-1.5 text-xs leading-relaxed text-zinc-500">
                  Este espaço passa a ser o centro para IA, CRM, SD Dialer, websites, marketing e automações. As integrações ficam associadas à empresa e à equipa, não ao dispositivo.
                </p>
              </div>
            </div>

            <div className="border-t border-white/[.07] p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
              <div className="flex items-center justify-between rounded-2xl bg-white/[.025] px-4 py-3">
                <div>
                  <div className="text-xs text-zinc-500">Plano da empresa</div>
                  <div className="text-sm font-medium text-white">{user.organizationPlan === "business_free" ? "Business Free" : user.organizationPlan || "Business"}</div>
                </div>
                <span className="rounded-full border border-amber-300/15 bg-amber-300/[.06] px-2.5 py-1 text-[10px] font-medium uppercase tracking-[.12em] text-amber-300">Empresa</span>
              </div>
            </div>
          </aside>
        </div>
      )}
    </>
  )
}

function BusinessItem({ icon: Icon, title, subtitle, onClick, external = false }: any) {
  return (
    <button type="button" onClick={onClick} className="group flex w-full items-center gap-3 rounded-2xl border border-transparent px-3 py-3 text-left transition hover:border-white/[.07] hover:bg-white/[.035]">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/[.07] bg-white/[.03] text-zinc-400 transition group-hover:border-amber-300/15 group-hover:text-amber-300">
        <Icon className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium text-zinc-200">{title}</span>
        <span className="block truncate text-xs text-zinc-600">{subtitle}</span>
      </span>
      <ChevronRight className={`h-4 w-4 text-zinc-700 transition group-hover:text-zinc-400 ${external ? "-rotate-45" : ""}`} />
    </button>
  )
}
