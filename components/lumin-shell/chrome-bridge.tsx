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

    const [tokenCount, tokenLimit] = tokenText
      ? tokenText.split("/").map((part) => Number(part.trim()))
      : [0, 15000]

    return {
      tokenCount: Number.isFinite(tokenCount) ? tokenCount : 0,
      tokenLimit: Number.isFinite(tokenLimit) ? tokenLimit : 15000,
      onOpenMenu: () => menuButton?.click(),
      onToggleMusic: musicButton ? () => musicButton.click() : undefined,
    }
  }, [legacyHeader])

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
