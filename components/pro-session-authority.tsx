"use client"

import { useLayoutEffect } from "react"
import { useSession } from "next-auth/react"

const PRO_KEY = "rebornai-pro"
const PRO_DATE_KEY = "rebornai-pro-date"

/**
 * Compatibility bridge for the historical homepage while Pro access is migrated
 * fully away from browser state. The NextAuth session remains authoritative.
 *
 * useLayoutEffect deliberately runs before the homepage's passive useEffect,
 * so stale/forged legacy localStorage cannot unlock the UI on first paint.
 */
export function ProSessionAuthority() {
  const { data: session, status } = useSession()

  useLayoutEffect(() => {
    // Never trust the historical payment callback as proof of purchase.
    const url = new URL(window.location.href)
    if (url.searchParams.has("payment")) {
      url.searchParams.delete("payment")
      window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`)
    }

    if (status === "loading") {
      // Clear stale legacy authority before the homepage reads it.
      localStorage.removeItem(PRO_KEY)
      localStorage.removeItem(PRO_DATE_KEY)
      return
    }

    const isPro = Boolean((session?.user as any)?.isPro)
    if (isPro) {
      localStorage.setItem(PRO_KEY, "true")
      localStorage.setItem(PRO_DATE_KEY, new Date().toISOString())
    } else {
      localStorage.removeItem(PRO_KEY)
      localStorage.removeItem(PRO_DATE_KEY)
    }
  }, [session, status])

  return null
}
