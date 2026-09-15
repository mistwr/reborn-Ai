"use client"

import { Menu, Music2, Zap } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { LuminShellBrand } from "@/components/lumin-shell/brand"

interface LuminShellHeaderProps {
  onOpenMenu: () => void
  onToggleMusic?: () => void
  tokenCount?: number
  tokenLimit?: number
  online?: boolean
}

export function LuminShellHeader({
  onOpenMenu,
  onToggleMusic,
  tokenCount = 0,
  tokenLimit = 15000,
  online = true,
}: LuminShellHeaderProps) {
  return (
    <header className="h-14 shrink-0 border-b border-[#d6a84b]/10 bg-[#030303]/90 px-3 backdrop-blur-xl sm:px-4">
      <div className="mx-auto flex h-full w-full items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={onOpenMenu}
            className="h-9 w-9 shrink-0 text-zinc-400 hover:bg-[#d6a84b]/[.06] hover:text-[#f0c86b]"
            aria-label="Abrir menu Lumin"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <div className="hidden sm:block">
            <LuminShellBrand compact subtitle="Assistente Inteligente" />
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <div className="hidden items-center gap-1.5 rounded-full border border-[#d6a84b]/10 bg-[#d6a84b]/[.035] px-2.5 py-1.5 text-xs text-zinc-400 sm:flex">
            <Zap className="h-3 w-3 text-[#d6a84b]" />
            <span>{tokenCount}/{tokenLimit}</span>
          </div>

          {onToggleMusic ? (
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggleMusic}
              className="h-9 w-9 text-zinc-500 hover:bg-[#d6a84b]/[.06] hover:text-[#f0c86b]"
              aria-label="Música"
            >
              <Music2 className="h-5 w-5" />
            </Button>
          ) : null}

          <Badge className="h-7 gap-1.5 border-emerald-500/20 bg-emerald-500/10 px-2 text-xs font-medium text-emerald-500 hover:bg-emerald-500/10">
            <span className={`h-1.5 w-1.5 rounded-full ${online ? "animate-pulse bg-emerald-500" : "bg-zinc-500"}`} />
            {online ? "Online" : "Offline"}
          </Badge>
        </div>
      </div>
    </header>
  )
}
