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

function hideRetiredEntries() {
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

  const labels = Array.from(document.querySelectorAll("div, span, p"))
  for (const label of labels) {
    if (normalizedText(label) !== "pro" || !isSidebarEntry(label)) continue
    if (label.querySelector("button, a")) continue
    if (label instanceof HTMLElement) {
      label.style.display = "none"
      label.setAttribute("aria-hidden", "true")
    }
  }
}

function ensureCreditsShortcut() {
  const existing = Array.from(document.querySelectorAll("button, a")).find((node) => {
    const text = normalizedText(node)
    return isSidebarEntry(node) && (text === "comprar créditos" || text === "creditos" || text === "créditos")
  })
  if (existing) return

  const clipper = Array.from(document.querySelectorAll("button, a")).find(
    (node) => isSidebarEntry(node) && normalizedText(node) === "video clipper",
  )
  if (!(clipper instanceof HTMLElement) || !(clipper.parentElement instanceof HTMLElement)) return

  const credits = clipper.cloneNode(true) as HTMLElement
  credits.removeAttribute("data-state")
  credits.removeAttribute("aria-current")
  credits.setAttribute("data-lumin-credits-shortcut", "true")
  credits.setAttribute("aria-label", "Comprar créditos")
  credits.innerHTML = `
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="8" cy="8" r="5"></circle>
      <path d="M8 5v6M6.5 6.5H9a1.5 1.5 0 0 1 0 3H7"></path>
      <circle cx="16" cy="16" r="5"></circle>
      <path d="M16 13v6M14.5 14.5H17a1.5 1.5 0 0 1 0 3h-2"></path>
    </svg>
    <span>Comprar créditos</span>
  `
  credits.addEventListener("click", (event) => {
    event.preventDefault()
    window.location.href = "/credits"
  })

  clipper.parentElement.insertBefore(credits, clipper.nextSibling)
}

function syncLegacySidebar() {
  hideRetiredEntries()
  ensureCreditsShortcut()
}

/**
 * Compatibility bridge for legacy sidebar entries that are still rendered by
 * app/page.tsx. Besides retiring obsolete shortcuts, this exposes the credits
 * wallet in the legacy navigation until app/page.tsx is fully replaced by the
 * native Lumin shell.
 */
export function LuminSidebarPruner() {
  useEffect(() => {
    const run = () => requestAnimationFrame(syncLegacySidebar)

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
