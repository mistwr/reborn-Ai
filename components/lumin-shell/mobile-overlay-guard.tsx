"use client"

import { useEffect } from "react"

function isLegacyMobileOverlay(element: Element): element is HTMLDivElement {
  if (!(element instanceof HTMLDivElement)) return false
  const className = String(element.className)
  return (
    className.includes("fixed") &&
    className.includes("inset-0") &&
    className.includes("z-40") &&
    className.includes("bg-black/60") &&
    className.includes("backdrop-blur-sm") &&
    className.includes("lg:hidden")
  )
}

export function LuminMobileOverlayGuard() {
  useEffect(() => {
    const hidden = new Set<HTMLDivElement>()

    const retireLegacyOverlay = () => {
      for (const element of Array.from(document.querySelectorAll("div"))) {
        if (!isLegacyMobileOverlay(element)) continue
        if (element.dataset.luminLegacyOverlayRetired === "true") continue

        element.dataset.luminLegacyOverlayRetired = "true"
        element.style.setProperty("display", "none", "important")
        element.style.setProperty("pointer-events", "none", "important")
        hidden.add(element)
      }
    }

    retireLegacyOverlay()

    const observer = new MutationObserver(() => retireLegacyOverlay())
    observer.observe(document.body, { childList: true, subtree: true })

    return () => {
      observer.disconnect()
      for (const element of hidden) {
        element.style.removeProperty("display")
        element.style.removeProperty("pointer-events")
        delete element.dataset.luminLegacyOverlayRetired
      }
    }
  }, [])

  return null
}
