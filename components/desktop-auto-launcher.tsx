"use client"

import { useEffect, useState } from "react"
import { X } from "lucide-react"

const items = [
  ["chat", "Escrever"],
  ["images", "Gerar Imagens"],
  ["vision", "Analisar"],
  ["webcraft", "WebCraft"],
  ["presentations", "Slides"],
  ["ebooks", "Ebooks"],
  ["clipper", "Video Clipper"],
  ["marketing", "Marketing"],
] as const

export function DesktopAutoLauncher() {
  const [open, setOpen] = useState(true)

  useEffect(() => {
    try {
      if (new URLSearchParams(window.location.search).get("launcher") === "0") {
        setOpen(false)
      }
    } catch {}
  }, [])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[90] hidden items-center justify-center bg-black/80 p-6 backdrop-blur-sm lg:flex"
      role="dialog"
      aria-modal="true"
      aria-label="Menu Lumin AI"
    >
      <div className="w-full max-w-xl rounded-2xl border border-[#d6a84b]/30 bg-zinc-950 p-6 shadow-2xl">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#d6a84b]">Lumin AI</p>
            <h2 className="mt-1 text-2xl font-bold text-white">O que queres abrir?</h2>
            <p className="mt-1 text-sm text-zinc-400">Escolhe diretamente uma ferramenta.</p>
          </div>

          <a
            href="/?launcher=0"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-zinc-300 hover:bg-white/10 hover:text-white"
            aria-label="Fechar"
          >
            <X className="h-5 w-5" />
          </a>
        </div>

        <a
          href="/login"
          className="mb-3 flex w-full items-center justify-center rounded-xl border border-[#d6a84b]/30 bg-[#d6a84b]/10 px-4 py-3 text-sm font-semibold text-[#f0c86b] hover:bg-[#d6a84b]/15"
        >
          Entrar / Criar conta
        </a>

        <div className="grid grid-cols-2 gap-3">
          {items.map(([tab, label]) => (
            <a
              key={tab}
              href={`/?tab=${tab}&launcher=0`}
              className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-4 text-sm font-semibold text-white transition hover:border-[#d6a84b]/40 hover:bg-[#d6a84b]/10"
            >
              {label}
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}
