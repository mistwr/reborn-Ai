"use client"

import { useEffect, useRef, useState } from "react"
import { WebCraftStudioV2 } from "@/components/webcraft-studio-v2"

export function WebCraftStudio() {
  const rootRef = useRef<HTMLDivElement>(null)
  const [hasProject, setHasProject] = useState(false)

  useEffect(() => {
    const root = rootRef.current
    if (!root) return

    const syncProjectState = () => {
      const buttons = Array.from(root.querySelectorAll<HTMLButtonElement>("button"))
      setHasProject(buttons.some((button) => button.textContent?.trim() === "HTML"))
    }

    syncProjectState()
    const observer = new MutationObserver(syncProjectState)
    observer.observe(root, { childList: true, subtree: true })

    return () => observer.disconnect()
  }, [])

  const triggerStudioAction = (label: string) => {
    const root = rootRef.current
    if (!root) return

    const button = Array.from(root.querySelectorAll<HTMLButtonElement>("button")).find(
      (candidate) => candidate.textContent?.replace(/\s+/g, " ").trim() === label,
    )

    button?.click()
  }

  return (
    <div ref={rootRef} className="contents">
      <WebCraftStudioV2 />

      {hasProject && (
        <div className="fixed inset-x-3 bottom-24 z-[95] grid grid-cols-2 gap-2 rounded-2xl border border-primary/25 bg-background/95 p-2 shadow-2xl backdrop-blur md:hidden">
          <button
            type="button"
            onClick={() => triggerStudioAction("HTML")}
            className="rounded-xl border border-primary/30 bg-primary px-3 py-3 text-sm font-semibold text-primary-foreground shadow-sm active:scale-[0.98]"
          >
            ↓ Transferir site
          </button>
          <button
            type="button"
            onClick={() => triggerStudioAction("Full-Stack ZIP")}
            className="rounded-xl border border-border bg-card px-3 py-3 text-sm font-semibold text-foreground shadow-sm active:scale-[0.98]"
          >
            ZIP completo
          </button>
          <p className="col-span-2 px-1 text-center text-[11px] text-muted-foreground">
            O download HTML está disponível diretamente no Lumin AI Studio.
          </p>
        </div>
      )}
    </div>
  )
}
