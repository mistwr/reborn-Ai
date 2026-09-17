"use client"

import { useEffect } from "react"

const DEAD_SHORTCUTS = new Set(["whatsapp web", "facebook", "instagram"])

function normalizedText(node: Element) {
  return (node.textContent || "").replace(/\s+/g, " ").trim().toLowerCase()
}

function pruneDeadShortcuts() {
  const buttons = Array.from(document.querySelectorAll("button, a"))

  for (const button of buttons) {
    const text = normalizedText(button)
    if (!DEAD_SHORTCUTS.has(text)) continue

    const row = button.closest("li") || button
    if (row instanceof HTMLElement) {
      row.style.display = "none"
      row.setAttribute("aria-hidden", "true")
      row.setAttribute("data-lumin-retired-shortcut", text)
    }
  }
}

/**
 * Temporary compatibility bridge for legacy sidebar entries that are still
 * rendered by app/page.tsx. It deliberately avoids MutationObserver: pruning
 * runs after hydration and after user interactions that can re-render menus.
 */
export function LuminSidebarPruner() {
  useEffect(() => {
    const run = () => requestAnimationFrame(pruneDeadShortcuts)

    run()
    const timers = [250, 750, 1500, 3000].map((delay) => window.setTimeout(run, delay))
    document.addEventListener("click", run, true)
    document.addEventListener("visibilitychange", run)

    return () => {
      timers.forEach(window.clearTimeout)
      document.removeEventListener("click", run, true)
      document.removeEventListener("visibilitychange", run)
    }
  }, [])

  return null
}
