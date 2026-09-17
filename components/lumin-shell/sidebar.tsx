"use client"

import type { LucideIcon } from "lucide-react"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { LuminShellBrand } from "@/components/lumin-shell/brand"

export interface LuminShellNavItem {
  id: string
  label: string
  icon: LucideIcon
}

interface LuminShellSidebarProps {
  open: boolean
  onClose: () => void
  items: LuminShellNavItem[]
  activeId: string
  onSelect: (id: string) => void
  footer?: React.ReactNode
}

export function LuminShellSidebar({ open, onClose, items, activeId, onSelect, footer }: LuminShellSidebarProps) {
  const visibleItems = items.filter((item) => item.id !== "pro")

  return (
    <>
      {open ? (
        <button
          type="button"
          aria-label="Fechar menu"
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm lg:hidden"
        />
      ) : null}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-[#d6a84b]/10 bg-[#050504] transition-transform duration-300 ease-out ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="shrink-0 border-b border-[#d6a84b]/10 p-4">
          <div className="flex items-center justify-between gap-3">
            <LuminShellBrand subtitle="Plataforma Inteligente" />
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-9 w-9 text-zinc-500 hover:bg-[#d6a84b]/[.06] hover:text-[#f0c86b]"
              aria-label="Fechar menu"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {visibleItems.map(({ id, label, icon: Icon }) => {
            const active = activeId === id
            return (
              <button
                key={id}
                type="button"
                onClick={() => {
                  onSelect(id)
                  onClose()
                }}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition ${
                  active
                    ? "border border-[#d6a84b]/15 bg-[#d6a84b]/[.08] text-[#f4d486]"
                    : "border border-transparent text-zinc-400 hover:bg-white/[.035] hover:text-zinc-100"
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="truncate">{label}</span>
              </button>
            )
          })}
        </nav>

        {footer ? <div className="shrink-0 border-t border-[#d6a84b]/10 p-3">{footer}</div> : null}
      </aside>
    </>
  )
}
