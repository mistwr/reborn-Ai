"use client"

import { useEffect } from "react"

const DEAD_SHORTCUTS = new Set(["whatsapp web", "facebook", "instagram", "modo pro"])

function normalizedText(node: Element) {
  return (node.textContent || "").replace(/\s+/g, " ").trim().toLowerCase()
}

function isSidebarEntry(node: Element) {
  const sidebar = node.closest("aside")
  if (sidebar) return true

  const fixedPanel = node.closest("div.fixed.inset-y-0.left-0.w-72")
  return Boolean(fixedPanel)
}

function pruneDeadShortcuts() {
  const buttons = Array.from(document.querySelectorAll("button, a"))

  for (const button of buttons) {
    const text = normalizedText(button)
    const retiredPro = text === "pro" && isSidebarEntry(button)
    if (!DEAD_SHORTCUTS.has(text) && !retiredPro) continue

    const row = button.closest("li") || button
    if (row instanceof HTMLElement) {
      row.style.display = "none"
      row.setAttribute("aria-hidden", "true")
      row.setAttribute("data-lumin-retired-shortcut", text)
    }
  }
}

/**
 * Compatibility bridge for legacy sidebar entries that are still rendered by
 * app/page.tsx. Runs after hydration and after interactions that may re-render
 * navigation so retired shortcuts cannot reappear.
 */
export function LuminSidebarPruner() {
  useEffect(() => {
    const run = () => requestAnimationFrame(pruneDeadShortcuts)

    run()
    const timers = [100, 250, 750, 1500, 3000].map((delay) => window.setTimeout(run, delay))
    document.addEventListener("click", run, true)
    document.addEventListener("visibilitychange", run)

    const observer = new MutationObserver(run)
    observer.observe(document.body, { childList: true, subtree: true })

    return () => {
      timers.forEach(window.clearTimeout)
      observer.disconnect()
      document.removeEventListener("click", run, true)
      document.removeEventListener("visibilitychange", run)
    }
  }, [])

  return null
}
