"use client"

import {
  ArrowRight,
  Code2,
  FileText,
  Grid2X2,
  ImagePlus,
  MessageSquare,
  Sparkles,
  Video,
} from "lucide-react"
import { LuminOrb } from "@/components/lumin-orb"

interface ChatWelcomeProps {
  onTabChange: (tab: string) => void
}

const primaryTools = [
  { icon: MessageSquare, title: "Escrever", description: "Textos, emails e ideias", tab: "chat" },
  { icon: ImagePlus, title: "Gerar Imagens", description: "Cria imagens incríveis", tab: "images" },
  { icon: FileText, title: "Analisar", description: "PDFs, documentos e imagens", tab: "vision" },
  { icon: Grid2X2, title: "Mais Ferramentas", description: "Explora todo o potencial", tab: "webcraft" },
]

const suggestions = [
  { icon: Sparkles, label: "Resume este texto para mim", prompt: "Resume este texto para mim: " },
  { icon: ImagePlus, label: "Cria uma imagem de um cenário futurista", tab: "images" },
  { icon: FileText, label: "Analisa este documento", tab: "vision" },
  { icon: Code2, label: "Cria uma landing page profissional", tab: "webcraft" },
]

function focusComposer(prompt?: string) {
  const input = document.querySelector<HTMLInputElement | HTMLTextAreaElement>(
    'textarea:not([disabled]), input[placeholder="Escreve uma mensagem..."]:not([disabled])',
  )
  if (!input) return
  input.scrollIntoView({ behavior: "smooth", block: "center" })
  input.focus()

  if (prompt) {
    const prototype = input instanceof HTMLTextAreaElement ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype
    const nativeSetter = Object.getOwnPropertyDescriptor(prototype, "value")?.set
    nativeSetter?.call(input, prompt)
    input.dispatchEvent(new Event("input", { bubbles: true }))
  }
}

export function ChatWelcome({ onTabChange }: ChatWelcomeProps) {
  return (
    <div className="relative w-full overflow-hidden bg-[#030303] text-white">
      <div
        className="pointer-events-none absolute inset-0 opacity-90"
        style={{
          background:
            "radial-gradient(circle at 50% 10%, rgba(214,168,75,.14), transparent 30%), radial-gradient(circle at 82% 34%, rgba(229,188,99,.07), transparent 24%), linear-gradient(180deg,#050504 0%,#020202 100%)",
        }}
      />

      <div className="relative mx-auto flex w-full max-w-6xl flex-col px-4 pb-8 pt-4 sm:px-6 sm:pb-10 md:px-8 lg:px-10">
        <header className="sticky top-0 z-30 -mx-4 mb-2 flex items-center justify-between border-b border-[#d6a84b]/10 bg-black/75 px-4 py-3 backdrop-blur-xl sm:-mx-6 sm:px-6 md:static md:mx-0 md:border-0 md:bg-transparent md:px-0 md:backdrop-blur-none">
          <div className="flex items-center gap-3">
            <div className="relative flex h-11 w-11 items-center justify-center rounded-full border border-[#d6a84b]/30 bg-[#100d08] shadow-[0_0_28px_rgba(214,168,75,.14)]">
              <Sparkles className="h-5 w-5 animate-pulse text-[#f0c86b]" />
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
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,.9)]" />
              <span className="hidden xs:inline">Online</span>
            </div>
            <button
              type="button"
              onClick={() => onTabChange("live")}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-[#d6a84b]/20 bg-[#d6a84b]/[.04] text-zinc-300 transition hover:border-[#d6a84b]/45 hover:bg-[#d6a84b]/[.08] hover:text-[#f0c86b]"
              aria-label="Abrir modo Live"
            >
              <Video className="h-4 w-4" />
            </button>
          </div>
        </header>

        <section className="mx-auto flex w-full max-w-4xl flex-col items-center pt-2 text-center sm:pt-5 lg:pt-7">
          <div className="scale-[.82] sm:scale-90 md:scale-100">
            <LuminOrb state="idle" level={0.12} size={280} />
          </div>
          <h1 className="-mt-5 text-balance text-3xl font-semibold tracking-[-0.035em] sm:mt-0 sm:text-4xl md:text-5xl lg:text-6xl">
            Olá, eu sou o <span className="text-[#e9be62]">Lumin.</span>
          </h1>
          <p className="mt-2 text-sm tracking-wide text-zinc-400 sm:text-base md:text-lg">O teu assistente de IA mais completo.</p>
        </section>

        <section className="mx-auto mt-6 grid w-full max-w-4xl grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
          {primaryTools.map(({ icon: Icon, title, description, tab }) => (
            <button
              key={title}
              type="button"
              onClick={() => onTabChange(tab)}
              className="group min-h-[118px] rounded-[22px] border border-[#d6a84b]/16 bg-gradient-to-b from-[#d6a84b]/[.045] to-white/[.015] p-4 text-left text-[#e9ba59] transition duration-200 hover:-translate-y-1 hover:border-[#d6a84b]/32 hover:bg-[#d6a84b]/[.07] hover:shadow-[0_16px_45px_rgba(0,0,0,.38),0_0_24px_rgba(214,168,75,.06)] active:translate-y-0"
            >
              <Icon className="mb-4 h-5 w-5 sm:h-6 sm:w-6" />
              <div className="text-sm font-semibold text-zinc-100 sm:text-base">{title}</div>
              <div className="mt-1 text-xs leading-relaxed text-zinc-500 sm:text-sm">{description}</div>
            </button>
          ))}
        </section>

        <button
          type="button"
          onClick={() => focusComposer()}
          className="mx-auto mt-4 flex w-full max-w-4xl items-center justify-center gap-3 rounded-[22px] border border-[#e8bd61]/55 bg-gradient-to-r from-[#8e5b18]/42 via-[#24180b] to-[#8e5b18]/42 px-5 py-4 text-base font-semibold text-[#ffe7a5] shadow-[0_0_30px_rgba(217,166,66,.16),inset_0_0_18px_rgba(255,220,145,.04)] transition hover:border-[#f3cf7a]/80 hover:shadow-[0_0_40px_rgba(217,166,66,.24)] sm:text-lg"
        >
          <MessageSquare className="h-5 w-5" />
          Começar a conversar
          <ArrowRight className="ml-auto h-5 w-5" />
        </button>

        <section className="mx-auto mt-6 w-full max-w-4xl">
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
                className="flex min-h-[64px] items-center gap-3 rounded-[18px] border border-[#d6a84b]/10 bg-white/[.018] px-4 py-3 text-left text-sm text-zinc-300 transition hover:border-[#d6a84b]/25 hover:bg-[#d6a84b]/[.035]"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#d6a84b]/10 bg-[#d6a84b]/[.06] text-[#dcb25a]">
                  <Icon className="h-4 w-4" />
                </span>
                <span className="leading-snug">{label}</span>
              </button>
            ))}
          </div>
        </section>

        <footer className="mx-auto mt-6 flex w-full max-w-4xl items-center justify-between gap-4 border-t border-[#d6a84b]/[.06] pt-4 text-[8px] uppercase tracking-[.28em] text-zinc-700 sm:text-[9px]">
          <span className="text-[#a8803e]">Lumin AI Studio</span>
          <span className="hidden sm:block">Ideias transformam realidades</span>
        </footer>
      </div>
    </div>
  )
}
