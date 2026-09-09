"use client"

import { useEffect } from "react"
import type { ProjectBrief } from "@/lib/content-brief"

const STORAGE_KEY = "reborn-project-brief-v1"
const CONTEXT_ENDPOINTS = [
  "/api/generate-image",
  "/api/generate-presentation",
  "/api/generate-ebook",
  "/api/generate-website",
]

function readStoredBrief(): ProjectBrief | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === "object" ? parsed : null
  } catch {
    return null
  }
}

function compactBrief(input: unknown): ProjectBrief | null {
  if (!input || typeof input !== "object") return null
  const source = input as Record<string, unknown>
  const out: ProjectBrief = {}
  const keys: Array<keyof ProjectBrief> = [
    "projectName",
    "brandName",
    "audience",
    "objective",
    "tone",
    "language",
    "primaryColor",
    "secondaryColor",
    "visualStyle",
    "cta",
    "productOrService",
    "notes",
  ]

  for (const key of keys) {
    const value = source[key]
    if (typeof value === "string" && value.trim()) {
      ;(out as Record<string, unknown>)[key] = value.trim().slice(0, 500)
    }
  }

  if (Array.isArray(source.keywords)) {
    out.keywords = source.keywords
      .filter((v): v is string => typeof v === "string" && Boolean(v.trim()))
      .slice(0, 12)
      .map((v) => v.trim().slice(0, 80))
  }

  return Object.keys(out).length ? out : null
}

function mergeBrief(base: ProjectBrief | null, next: ProjectBrief | null): ProjectBrief | null {
  if (!base && !next) return null
  return {
    ...(base || {}),
    ...(next || {}),
    keywords: next?.keywords?.length ? next.keywords : base?.keywords,
  }
}

function saveBrief(brief: ProjectBrief | null) {
  if (!brief) return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(brief))
    window.dispatchEvent(new CustomEvent("reborn:project-brief", { detail: brief }))
  } catch {
    // Context is an enhancement; never block generation if storage is unavailable.
  }
}

function endpointPath(input: RequestInfo | URL) {
  try {
    if (typeof input === "string") return new URL(input, window.location.origin).pathname
    if (input instanceof URL) return input.pathname
    return new URL(input.url, window.location.origin).pathname
  } catch {
    return ""
  }
}

export function ProjectContextBridge() {
  useEffect(() => {
    const originalFetch = window.fetch.bind(window)

    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const path = endpointPath(input)
      const shouldEnhance = CONTEXT_ENDPOINTS.includes(path)

      if (!shouldEnhance || !init?.body || typeof init.body !== "string") {
        return originalFetch(input, init)
      }

      try {
        const body = JSON.parse(init.body)
        if (!body || typeof body !== "object") return originalFetch(input, init)

        const stored = readStoredBrief()
        const incoming = compactBrief(body.brief)
        const merged = mergeBrief(stored, incoming)

        if (incoming) saveBrief(merged)

        if (merged) {
          body.brief = merged

          // Give content modules enough context even if their older handlers only read prompt/title.
          const contextParts = [
            merged.brandName && `Marca: ${merged.brandName}`,
            merged.productOrService && `Produto/serviço: ${merged.productOrService}`,
            merged.audience && `Público: ${merged.audience}`,
            merged.objective && `Objetivo: ${merged.objective}`,
            merged.tone && `Tom: ${merged.tone}`,
            merged.visualStyle && `Estilo visual: ${merged.visualStyle}`,
            merged.primaryColor && `Cor principal: ${merged.primaryColor}`,
            merged.cta && `CTA: ${merged.cta}`,
          ].filter(Boolean)

          if (contextParts.length && path !== "/api/generate-image") {
            const context = contextParts.join(". ")
            if (typeof body.prompt === "string" && !body.prompt.includes("[Contexto Reborn]")) {
              body.prompt = `${body.prompt}\n\n[Contexto Reborn] ${context}`
            }
          }
        }

        return originalFetch(input, { ...init, body: JSON.stringify(body) })
      } catch {
        return originalFetch(input, init)
      }
    }

    return () => {
      window.fetch = originalFetch
    }
  }, [])

  return null
}

export function getStoredProjectBrief(): ProjectBrief | null {
  if (typeof window === "undefined") return null
  return readStoredBrief()
}
