"use client"

import { useEffect } from "react"
import { usePathname, useSearchParams } from "next/navigation"
import { trackEvent } from "@/lib/analytics"

const META_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID?.trim()
const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "fbclid"] as const

function persistAttribution(searchParams: URLSearchParams) {
  const attribution: Record<string, string> = {}
  for (const key of UTM_KEYS) {
    const value = searchParams.get(key)
    if (value) attribution[key] = value
  }

  if (Object.keys(attribution).length > 0) {
    localStorage.setItem("reborn_attribution", JSON.stringify({ ...attribution, capturedAt: new Date().toISOString() }))
    trackEvent("feature_used", { feature: "campaign_attribution", source: attribution.utm_source || "direct" })
  }
}

function initMetaPixel(pixelId: string) {
  if ((window as any).fbq) return

  const f: any = function (...args: any[]) {
    f.callMethod ? f.callMethod.apply(f, args) : f.queue.push(args)
  }
  f.push = f
  f.loaded = true
  f.version = "2.0"
  f.queue = []
  ;(window as any).fbq = f

  const script = document.createElement("script")
  script.async = true
  script.src = "https://connect.facebook.net/en_US/fbevents.js"
  document.head.appendChild(script)

  f("init", pixelId)
}

export function GrowthTracking() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    persistAttribution(new URLSearchParams(searchParams.toString()))
  }, [searchParams])

  useEffect(() => {
    if (!META_PIXEL_ID) return
    initMetaPixel(META_PIXEL_ID)
    ;(window as any).fbq?.("track", "PageView")
  }, [pathname])

  return null
}

export function getStoredAttribution(): Record<string, string> {
  if (typeof window === "undefined") return {}
  try {
    return JSON.parse(localStorage.getItem("reborn_attribution") || "{}")
  } catch {
    return {}
  }
}

export function trackMetaEvent(name: "Lead" | "InitiateCheckout" | "Purchase", params?: Record<string, unknown>) {
  if (typeof window === "undefined") return
  ;(window as any).fbq?.("track", name, params || {})
}
