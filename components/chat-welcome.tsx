"use client"

import {
  ArrowRight,
  Bot,
  Code2,
  FileText,
  Grid2X2,
  ImagePlus,
  MessageSquare,
  Paperclip,
  Send,
  Sparkles,
  Video,
} from "lucide-react"

interface ChatWelcomeProps {
  onTabChange: (tab: string) => void
}

const primaryTools = [
  {
    icon: MessageSquare,
    title: "Escrever",
    description: "Textos, emails e ideias",
    tab: "chat",
    accent: "violet",
  },
  {
    icon: ImagePlus,
    title: "Gerar Imagens",
    description: "Cria imagens incríveis",
    tab: "images",
    accent: "gold",
  },
  {
    icon: FileText,
    title: "Analisar",
    description: "PDFs, documentos e imagens",
    tab: "vision",
    accent: "blue",
  },
  {
    icon: Grid2X2,
    title: "Mais Ferramentas",
    description: "Explora todo o potencial",
    tab: "webcraft",
    accent: "purple",
  },
]

const suggestions = [
  { icon: Sparkles, label: "Resume este texto para mim", prompt: "Resume este texto para mim: " },
  { icon: ImagePlus, label: "Cria uma imagem de um cenário futurista", tab: "images" },
  { icon: FileText, label: "Analisa este documento", tab: "vision" },
  { icon: Code2, label: "Escreve um código para uma landing page", tab: "webcraft" },
]

function focusComposer(prompt?: string) {
  const input = document.querySelector<HTMLTextAreaElement>("textarea")
  if (!input) return
  input.focus()
  if (prompt) {
    const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value")?.set
    nativeSetter?.call(input, prompt)
    input.dispatchEvent(new Event("input", { bubbles: true }))
  }
}

export function ChatWelcome({ onTabChange }: ChatWelcomeProps) {
  return (
    <div className="relative min-h-full w-full bg-[#030303] text-white">
      <div
        className="pointer-events-none absolute inset-0 opacity-80"
        style={{
          background:
            "radial-gradient(circle at 50% 10%, rgba(75,42,130,.22), transparent 34%), radial-gradient(circle at 80% 38%, rgba(194,145,54,.08), transparent 28%), linear-gradient(180deg,#050507 0%,#020203 100%)",
        }}
      />

      <div className="relative mx-auto flex min-h-full w-full max-w-6xl flex-col px-4 pb-28 pt-5 sm:px-6 sm:pb-24 md:px-8 lg:px-10">
        {/* Header */}
        <header className="sticky top-0 z-30 -mx-4 mb-3 flex items-center justify-between border-b border-white/5 bg-black/70 px-4 py-3 backdrop-blur-xl sm:-mx-6 sm:px-6 md:static md:mx-0 md:border-0 md:bg-transparent md:px-0 md:backdrop-blur-none">
          <div className="flex items-center gap-3">
            <div className="relative flex h-11 w-11 items-center justify-center rounded-full border border-[#d6a84b]/30 bg-[#120f0b] shadow-[0_0_26px_rgba(214,168,75,.12)]">
              <Sparkles className="h-5 w-5 text-[#f0c86b]" />
            </div>
            <div>
              <div className="text-xl font-semibold tracking-tight sm:text-2xl">
                Lumin <span className="text-[#e7bd63]">AI</span>
              </div>
              <div className="mt-0.5 text-[8px] font-medium uppercase tracking-[.34em] text-zinc-500 sm:text-[9px]">
                Pensar&nbsp;&nbsp;Criar&nbsp;&nbsp;Realizar
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 rounded-full border border-emerald-400/15 bg-emerald-500/5 px-3 py-2 text-xs text-zinc-200">
              <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,.9)]" />
              <span className="hidden xs:inline">Online</span>
            </div>
            <button
              type="button"
              onClick={() => onTabChange("live")}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[.03] text-zinc-300 transition hover:border-[#d6a84b]/30 hover:text-[#f0c86b]"
              aria-label="Abrir modo Live"
            >
              <Video className="h-4 w-4" />
            </button>
          </div>
        </header>

        {/* Hero */}
        <section className="mx-auto flex w-full max-w-4xl flex-col items-center pt-4 text-center sm:pt-7 lg:pt-10">
          <div className="relative mb-5 flex h-[220px] w-[220px] items-center justify-center sm:h-[290px] sm:w-[290px] lg:h-[330px] lg:w-[330px]">
            <div className="absolute inset-[7%] rounded-full border border-[#d9aa4d]/25 shadow-[0_0_80px_rgba(218,171,76,.10)]" />
            <div className="absolute inset-0 animate-[spin_18s_linear_infinite] rounded-full border border-transparent border-t-[#d9aa4d]/40 border-r-violet-500/20" />
            <div className="absolute inset-[12%] animate-[spin_24s_linear_infinite_reverse] rounded-full border border-transparent border-b-[#d9aa4d]/20 border-l-violet-500/20" />
            <div
              className="absolute inset-[17%] rounded-full border border-white/15 shadow-[inset_0_0_55px_rgba(255,255,255,.05),0_0_55px_rgba(218,171,76,.18)]"
              style={{
                background:
                  "radial-gradient(circle at 34% 23%, rgba(255,255,255,.22), transparent 16%), radial-gradient(circle at 65% 70%, rgba(229,177,68,.20), transparent 25%), radial-gradient(circle at 48% 50%, rgba(24,20,32,.55), rgba(1,1,2,.96) 68%)",
              }}
            />
            <div className="absolute inset-[21%] rounded-full border border-[#e8bd61]/15 bg-black/20 backdrop-blur-[1px]" />
            <div className="relative flex h-[34%] w-[34%] rotate-[-14deg] items-center justify-center rounded-[28%] border border-[#f5d37d]/20 bg-gradient-to-br from-[#f7d981] via-[#b87922] to-[#ffe9a8] shadow-[0_0_34px_rgba(244,196,91,.28)]">
              <Bot className="h-1/2 w-1/2 rotate-[14deg] text-black/80" strokeWidth={1.8} />
              <Sparkles className="absolute -right-3 -top-3 h-7 w-7 rotate-[14deg] text-[#f5cf70] drop-shadow-[0_0_10px_rgba(245,207,112,.7)]" />
            </div>
            <div className="absolute bottom-[7%] h-px w-[72%] bg-gradient-to-r from-transparent via-[#e1ad4a]/70 to-transparent shadow-[0_0_18px_rgba(225,173,74,.45)]" />
          </div>

          <h1 className="text-balance text-3xl font-semibold tracking-[-0.035em] sm:text-4xl md:text-5xl lg:text-6xl">
            Olá, eu sou o <span className="text-[#e9be62]">Lumin.</span>
          </h1>
          <p className="mt-2 text-sm tracking-wide text-zinc-400 sm:text-base md:text-lg">
            O teu assistente de IA mais completo.
          </p>
        </section>

        {/* Tools */}
        <section className="mx-auto mt-7 grid w-full max-w-4xl grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
          {primaryTools.map(({ icon: Icon, title, description, tab, accent }) => {
            const accentClass =
              accent === "gold"
                ? "border-[#c69640]/25 bg-[#b8832b]/[.06] text-[#e9ba59]"
                : accent === "blue"
                  ? "border-blue-400/20 bg-blue-500/[.05] text-blue-400"
                  : "border-violet-400/20 bg-violet-500/[.05] text-violet-400"

            return (
              <button
                key={title}
                type="button"
                onClick={() => onTabChange(tab)}
                className={`group min-h-[132px] rounded-[22px] border p-4 text-left transition duration-200 hover:-translate-y-1 hover:bg-white/[.06] hover:shadow-[0_16px_45px_rgba(0,0,0,.35)] active:translate-y-0 ${accentClass}`}
              >
                <Icon className="mb-5 h-5 w-5 sm:h-6 sm:w-6" />
                <div className="text-sm font-semibold text-zinc-100 sm:text-base">{title}</div>
                <div className="mt-1 text-xs leading-relaxed text-zinc-500 sm:text-sm">{description}</div>
              </button>
            )
          })}
        </section>

        {/* Main CTA */}
        <button
          type="button"
          onClick={() => focusComposer()}
          className="mx-auto mt-5 flex w-full max-w-4xl items-center justify-center gap-3 rounded-[22px] border border-[#e8bd61]/55 bg-gradient-to-r from-[#a56b1d]/45 via-[#2a1c0d] to-[#8f5d1b]/45 px-5 py-4 text-base font-semibold text-[#ffe7a5] shadow-[0_0_30px_rgba(217,166,66,.18),inset_0_0_18px_rgba(255,220,145,.04)] transition hover:border-[#f3cf7a]/80 hover:shadow-[0_0_40px_rgba(217,166,66,.28)] sm:py-5 sm:text-lg"
        >
          <MessageSquare className="h-5 w-5" />
          Começar a conversar
          <ArrowRight className="ml-auto h-5 w-5" />
        </button>

        {/* Suggestions */}
        <section className="mx-auto mt-8 w-full max-w-4xl">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-zinc-200 sm:text-base">Sugestões para começar</h2>
            <button
              type="button"
              onClick={() => onTabChange("chat")}
              className="text-xs text-zinc-500 transition hover:text-[#e6bc63] sm:text-sm"
            >
              Ver todas →
            </button>
          </div>

          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 sm:gap-3">
            {suggestions.map(({ icon: Icon, label, prompt, tab }) => (
              <button
                key={label}
                type="button"
                onClick={() => {
                  if (tab) onTabChange(tab)
                  else focusComposer(prompt)
                }}
                className="flex min-h-[70px] items-center gap-3 rounded-[18px] border border-white/[.08] bg-white/[.025] px-4 py-3 text-left text-sm text-zinc-300 transition hover:border-[#c99943]/25 hover:bg-white/[.045]"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-500/[.08] text-violet-400">
                  <Icon className="h-4 w-4" />
                </span>
                <span className="leading-snug">{label}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Composer-style shortcut */}
        <button
          type="button"
          onClick={() => focusComposer()}
          className="mx-auto mt-5 flex w-full max-w-4xl items-center rounded-[22px] border border-white/[.08] bg-[#0a0a0d]/90 px-3 py-3 text-left shadow-[0_18px_45px_rgba(0,0,0,.25)] transition hover:border-[#c79a42]/20 sm:px-4"
        >
          <span className="mr-3 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/[.08] bg-white/[.03] text-zinc-400">
            <Paperclip className="h-5 w-5" />
          </span>
          <span className="min-w-0 flex-1 truncate text-sm text-zinc-600 sm:text-base">Escreve uma mensagem...</span>
          <span className="ml-3 flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#f3cf78] to-[#a96e1c] text-black shadow-[0_0_25px_rgba(231,183,80,.3)]">
            <Send className="h-4 w-4" />
          </span>
        </button>

        {/* Mobile nav-like shortcuts */}
        <nav className="mx-auto mt-5 grid w-full max-w-4xl grid-cols-4 border-t border-white/[.06] py-4 md:hidden">
          {[
            [Sparkles, "Início", "chat"],
            [MessageSquare, "Chats", "chat"],
            [Grid2X2, "Ferramentas", "webcraft"],
            [Bot, "Conta", "account"],
          ].map(([Icon, label, tab], index) => {
            const NavIcon = Icon as typeof Sparkles
            return (
              <button
                key={label as string}
                type="button"
                onClick={() => onTabChange(tab as string)}
                className={`flex flex-col items-center gap-1.5 text-[11px] ${index === 0 ? "text-[#e9be62]" : "text-zinc-500"}`}
              >
                <NavIcon className="h-5 w-5" />
                {label as string}
              </button>
            )
          })}
        </nav>

        <footer className="mx-auto mt-2 flex w-full max-w-4xl items-center justify-between gap-4 border-t border-white/[.04] pt-4 text-[8px] uppercase tracking-[.28em] text-zinc-700 sm:text-[9px]">
          <span className="text-[#a8803e]">Lumin AI Studio</span>
          <span className="hidden sm:block">Ideias transformam realidades</span>
        </footer>
      </div>
    </div>
  )
}
