"use client"

import { useEffect, useState } from "react"
import { BriefcaseBusiness, ChevronDown, ChevronUp, RotateCcw, Save } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import type { ProjectBrief } from "@/lib/content-brief"

const STORAGE_KEY = "reborn-project-brief-v1"

function readBrief(): ProjectBrief | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function writeBrief(brief: ProjectBrief) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(brief))
  window.dispatchEvent(new CustomEvent("reborn:project-brief", { detail: brief }))
}

export function ProjectContextPanel() {
  const [brief, setBrief] = useState<ProjectBrief | null>(null)
  const [draft, setDraft] = useState<ProjectBrief>({})
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const sync = (event?: Event) => {
      const detail = event instanceof CustomEvent ? event.detail : null
      const next = detail && typeof detail === "object" ? detail : readBrief()
      setBrief(next)
      if (next) setDraft(next)
    }

    sync()
    window.addEventListener("reborn:project-brief", sync)
    window.addEventListener("storage", sync)
    return () => {
      window.removeEventListener("reborn:project-brief", sync)
      window.removeEventListener("storage", sync)
    }
  }, [])

  if (!brief) return null

  const name = brief.projectName || brief.brandName || brief.productOrService || "Projeto ativo"

  const save = () => {
    const clean: ProjectBrief = Object.fromEntries(
      Object.entries(draft).filter(([, value]) =>
        Array.isArray(value) ? value.length > 0 : typeof value === "string" ? value.trim().length > 0 : Boolean(value),
      ),
    )
    writeBrief(clean)
    setBrief(clean)
    setOpen(false)
  }

  const clear = () => {
    window.localStorage.removeItem(STORAGE_KEY)
    setBrief(null)
    setDraft({})
    window.dispatchEvent(new CustomEvent("reborn:project-brief", { detail: null }))
  }

  return (
    <div className="fixed bottom-20 right-3 z-[70] w-[min(92vw,360px)] pointer-events-none">
      <Card className="pointer-events-auto overflow-hidden border-primary/20 bg-background/95 shadow-xl backdrop-blur">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex w-full items-center gap-2 px-3 py-2.5 text-left"
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <BriefcaseBusiness className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Contexto do Projeto</p>
            <p className="truncate text-sm font-semibold text-foreground">{name}</p>
          </div>
          {open ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronUp className="h-4 w-4 text-muted-foreground" />}
        </button>

        {open && (
          <div className="space-y-3 border-t border-border p-3">
            <p className="text-xs text-muted-foreground">
              Este contexto é reutilizado automaticamente em Marketing, Imagens, Slides, Ebooks e WebCraft.
            </p>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-[10px] text-muted-foreground">Marca</Label>
                <Input value={draft.brandName || ""} onChange={(e) => setDraft((d) => ({ ...d, brandName: e.target.value }))} className="h-8 text-xs" />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] text-muted-foreground">Produto / Serviço</Label>
                <Input value={draft.productOrService || ""} onChange={(e) => setDraft((d) => ({ ...d, productOrService: e.target.value }))} className="h-8 text-xs" />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] text-muted-foreground">Público</Label>
                <Input value={draft.audience || ""} onChange={(e) => setDraft((d) => ({ ...d, audience: e.target.value }))} className="h-8 text-xs" />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] text-muted-foreground">Objetivo</Label>
                <Input value={draft.objective || ""} onChange={(e) => setDraft((d) => ({ ...d, objective: e.target.value }))} className="h-8 text-xs" />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] text-muted-foreground">CTA</Label>
                <Input value={draft.cta || ""} onChange={(e) => setDraft((d) => ({ ...d, cta: e.target.value }))} className="h-8 text-xs" />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] text-muted-foreground">Cor principal</Label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={draft.primaryColor || "#6366f1"}
                    onChange={(e) => setDraft((d) => ({ ...d, primaryColor: e.target.value }))}
                    className="h-8 w-10 rounded border border-border bg-transparent"
                  />
                  <Input value={draft.primaryColor || ""} onChange={(e) => setDraft((d) => ({ ...d, primaryColor: e.target.value }))} className="h-8 text-xs" />
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <Button type="button" size="sm" className="flex-1" onClick={save}>
                <Save className="mr-1.5 h-3.5 w-3.5" />Guardar
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={clear}>
                <RotateCcw className="mr-1.5 h-3.5 w-3.5" />Limpar
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}
