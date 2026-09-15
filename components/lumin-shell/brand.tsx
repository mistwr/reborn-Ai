"use client"

import { Sparkles } from "lucide-react"

interface LuminShellBrandProps {
  compact?: boolean
  subtitle?: string
}

export function LuminShellBrand({ compact = false, subtitle = "Assistente Inteligente" }: LuminShellBrandProps) {
  const size = compact ? "h-8 w-8 rounded-xl" : "h-10 w-10 rounded-2xl"

  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <div
        className={`relative flex shrink-0 items-center justify-center border border-[#d6a84b]/25 bg-[#100d08] shadow-[0_0_24px_rgba(214,168,75,.14)] ${size}`}
        aria-hidden="true"
      >
        <span className="bg-gradient-to-br from-[#fff1bc] via-[#e3b455] to-[#8d5b17] bg-clip-text text-sm font-semibold text-transparent">
          L
        </span>
        <Sparkles className="absolute -right-1 -top-1 h-3 w-3 text-[#f5cf70]" />
      </div>
      <div className="min-w-0">
        <div className={`${compact ? "text-sm" : "text-base"} truncate font-semibold leading-none text-[#f7f3ea]`}>
          Lumin <span className="text-[#d6a84b]">AI</span>
        </div>
        <div className="mt-1 truncate text-[10px] leading-none text-zinc-500">{subtitle}</div>
      </div>
    </div>
  )
}
