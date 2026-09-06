"use client"

import { useEffect, useRef } from "react"
import { trackEvent } from "@/lib/analytics"

/**
 * Observes active Radix tab panels globally so we can measure which Reborn
 * tools are actually used without coupling analytics to every feature.
 */
export function RebornAnalyticsObserver() {
  const lastFeature = useRef<string | null>(null)

  useEffect(() => {
    const detectActiveFeature = () => {
      const activePanels = Array.from(
        document.querySelectorAll<HTMLElement>('[role="tabpanel"][data-state="active"]'),
      )

      const panel = activePanels.find((node) => {
        const value = node.getAttribute("data-value") || node.id || ""
        return value.includes("chat") || value.includes("live") || value.includes("webcraft") || value.includes("marketing") || value.includes("clipper") || value.includes("image") || value.includes("presentation") || value.includes("ebook") || value.includes("sms") || value.includes("whatsapp") || value.includes("vision")
      }) || activePanels[0]

      if (!panel) return

      const raw = panel.getAttribute("data-value") || panel.id || "unknown"
      const feature = raw
        .replace(/^radix-.*-content-/, "")
        .replace(/^.*content-/, "")
        .replace(/[^a-zA-Z0-9_-]/g, "")
        .slice(0, 64) || "unknown"

      if (feature === lastFeature.current) return
      lastFeature.current = feature
      trackEvent("feature_used", { feature })
    }

    detectActiveFeature()

    const observer = new MutationObserver(detectActiveFeature)
    observer.observe(document.body, {
      subtree: true,
      attributes: true,
      attributeFilter: ["data-state", "hidden", "aria-hidden"],
      childList: true,
    })

    return () => observer.disconnect()
  }, [])

  return null
}
