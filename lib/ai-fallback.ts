import { getAIModel, getVisionModel } from "@/lib/ai-config"

type ModelKind = "text" | "vision"

const DEFAULT_TEXT_FALLBACKS = [
  "google/gemini-2.5-flash-lite",
  "google/gemini-3.6-flash",
  "openai/gpt-5.6-sol",
]

const DEFAULT_VISION_FALLBACKS = [
  "google/gemini-2.5-flash-lite",
  "google/gemini-3.1-pro-preview",
  "openai/gpt-5.6-sol",
]

function envModels(name: string) {
  return (process.env[name] || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean)
}

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)))
}

export function getModelFallbackChain(kind: ModelKind, economy = false) {
  const primary = kind === "vision" ? getVisionModel() : getAIModel()
  const configured = envModels(kind === "vision" ? "AI_VISION_FALLBACK_MODELS" : "AI_FALLBACK_MODELS")
  const defaults = kind === "vision" ? DEFAULT_VISION_FALLBACKS : DEFAULT_TEXT_FALLBACKS

  if (economy) {
    return unique([
      "google/gemini-2.5-flash-lite",
      ...configured,
      primary,
      ...defaults,
    ])
  }

  return unique([primary, ...configured, ...defaults])
}

function errorStatus(error: any) {
  const candidates = [
    error?.status,
    error?.statusCode,
    error?.response?.status,
    error?.cause?.status,
    error?.cause?.statusCode,
  ]
  return candidates.map(Number).find((value) => Number.isFinite(value)) || 0
}

export function isRetryableAIError(error: any) {
  const status = errorStatus(error)
  if ([408, 409, 425, 429, 500, 502, 503, 504].includes(status)) return true

  const message = [
    error?.message,
    error?.cause?.message,
    error?.responseBody,
    error?.data?.error?.message,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()

  return [
    "429",
    "rate limit",
    "rate_limit",
    "quota",
    "resource exhausted",
    "resource_exhausted",
    "overloaded",
    "temporarily unavailable",
    "service unavailable",
    "capacity",
    "timeout",
    "timed out",
    "gateway",
    "model not found",
    "model_not_found",
  ].some((needle) => message.includes(needle))
}

export async function withModelFallback<T>(
  runner: (model: string) => Promise<T>,
  options: {
    kind?: ModelKind
    economy?: boolean
    label?: string
  } = {},
): Promise<{ value: T; model: string; attempts: number }> {
  const kind = options.kind || "text"
  const models = getModelFallbackChain(kind, Boolean(options.economy))
  let lastError: any = null

  for (let index = 0; index < models.length; index += 1) {
    const model = models[index]
    try {
      const value = await runner(model)
      return { value, model, attempts: index + 1 }
    } catch (error: any) {
      lastError = error
      const hasNext = index < models.length - 1
      const retryable = isRetryableAIError(error)

      console.warn(
        `[Lumin AI fallback] ${options.label || kind} model failed`,
        {
          model,
          status: errorStatus(error) || undefined,
          retryable,
          hasNext,
        },
      )

      if (!hasNext || !retryable) throw error
    }
  }

  throw lastError || new Error("No AI model was available")
}
