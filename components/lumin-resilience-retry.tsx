"use client"

import { useEffect } from "react"

const CHAT_PATH = "/api/chat"
const RETRY_DELAY_MS = 900

function getPath(input: RequestInfo | URL) {
  try {
    if (typeof input === "string") return new URL(input, window.location.origin).pathname
    if (input instanceof URL) return input.pathname
    return new URL(input.url, window.location.origin).pathname
  } catch {
    return ""
  }
}

function canRetry(init?: RequestInit) {
  if (!init) return true
  const method = String(init.method || "GET").toUpperCase()
  return method === "POST"
}

function sleep(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms))
}

/**
 * Client-side safety net for transient provider outages.
 *
 * ProjectContextBridge intentionally converts server/provider failures into a
 * safe local resilience response. This wrapper sits after that bridge and, only
 * when it sees a provider-resilience response, performs one delayed retry.
 *
 * There is no recursion because retry requests call the previously installed
 * fetch implementation directly. If the provider is still unavailable the
 * second resilience response is returned unchanged.
 */
export function LuminResilienceRetry() {
  useEffect(() => {
    const previousFetch = window.fetch.bind(window)

    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const response = await previousFetch(input, init)

      if (
        getPath(input) !== CHAT_PATH ||
        !canRetry(init) ||
        response.headers.get("X-Lumin-Resilience") !== "provider"
      ) {
        return response
      }

      await sleep(RETRY_DELAY_MS)

      try {
        return await previousFetch(input, init)
      } catch {
        return response
      }
    }

    return () => {
      window.fetch = previousFetch
    }
  }, [])

  return null
}
