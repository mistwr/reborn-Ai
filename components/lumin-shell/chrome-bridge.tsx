"use client"

import { useEffect, useMemo, useState } from "react"
import { createPortal } from "react-dom"
import { LuminShellHeader } from "@/components/lumin-shell/header"

function findLegacyHeader(): HTMLElement | null {
  const main = document.querySelector("main")
  const candidate = main?.previousElementSibling
  return candidate instanceof HTMLElement && candidate.tagName === "HEADER" ? candidate : null
}

function findLegacyButton(header: HTMLElement, matcher: (button: HTMLButtonElement) => boolean) {
  return Array.from(header.querySelectorAll("button")).find(
    (button): button is HTMLButtonElement => button instanceof HTMLButtonElement && matcher(button),
  )
}

export function LuminShellChromeBridge() {
  const [mountTarget, setMountTarget] = useState<HTMLElement | null>(null)
  const [legacyHeader, setLegacyHeader] = useState<HTMLElement | null>(null)
  const [creditState, setCreditState] = useState<{ used: number; limit: number } | null>(null)

  useEffect(() => {
    let cancelled = false
    let retries = 0

    const attach = () => {
      if (cancelled) return

      const header = findLegacyHeader()
      const parent = header?.parentElement

      if (!header || !(parent instanceof HTMLElement)) {
        retries += 1
        if (retries < 40) window.setTimeout(attach, 125)
        return
      }

      header.dataset.luminLegacyHeader = "true"
      header.style.display = "none"
      parent.dataset.luminShellHost = "true"

      setLegacyHeader(header)
      setMountTarget(parent)
    }

    attach()

    return () => {
      cancelled = true
      const header = findLegacyHeader() ?? legacyHeader
      if (header) {
        header.style.removeProperty("display")
        delete header.dataset.luminLegacyHeader
      }
      if (mountTarget) delete mountTarget.dataset.luminShellHost
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    const refreshCredits = async () => {
      try {
        const response = await fetch("/api/credits", { cache: "no-store", credentials: "include" })
        if (!response.ok) return
        const data = await response.json()
        if (!cancelled && Number.isFinite(data?.used) && Number.isFinite(data?.limit)) {
          setCreditState({ used: data.used, limit: data.limit })
        }
      } catch {
        // Keep the legacy fallback if billing is temporarily unavailable.
      }
    }

    void refreshCredits()
    const timer = window.setInterval(refreshCredits, 10000)
    const onFocus = () => void refreshCredits()
    window.addEventListener("focus", onFocus)
    window.addEventListener("lumin:credits-changed", onFocus as EventListener)

    return () => {
      cancelled = true
      window.clearInterval(timer)
      window.removeEventListener("focus", onFocus)
      window.removeEventListener("lumin:credits-changed", onFocus as EventListener)
    }
  }, [])

  const actions = useMemo(() => {
    if (!legacyHeader) return null

    const menuButton = findLegacyButton(legacyHeader, (button) =>
      /menu/i.test(button.getAttribute("aria-label") ?? "") || Boolean(button.querySelector("svg.lucide-menu")),
    )

    const musicButton = findLegacyButton(legacyHeader, (button) =>
      /música|musica/i.test(button.getAttribute("aria-label") ?? "") || Boolean(button.querySelector("svg.lucide-music2")),
    )

    const tokenText = Array.from(legacyHeader.querySelectorAll("button,span"))
      .map((element) => element.textContent?.trim() ?? "")
      .find((text) => /^\d+\s*\/\s*\d+$/.test(text))

    const [legacyCount, legacyLimit] = tokenText
      ? tokenText.split("/").map((part) => Number(part.trim()))
      : [0, 15000]

    return {
      tokenCount: creditState?.used ?? (Number.isFinite(legacyCount) ? legacyCount : 0),
      tokenLimit: creditState?.limit ?? (Number.isFinite(legacyLimit) ? legacyLimit : 15000),
      onOpenMenu: () => menuButton?.click(),
      onToggleMusic: musicButton ? () => musicButton.click() : undefined,
    }
  }, [legacyHeader, creditState])

  if (!mountTarget || !actions) return null

  return createPortal(
    <LuminShellHeader
      onOpenMenu={actions.onOpenMenu}
      onToggleMusic={actions.onToggleMusic}
      tokenCount={actions.tokenCount}
      tokenLimit={actions.tokenLimit}
      online
    />,
    mountTarget,
  )
}
