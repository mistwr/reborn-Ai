import { generateText } from "ai"
import { getAIModel } from "@/lib/ai-config"

const DEFAULT_FALLBACK_MODELS = [
  "inclusionai/ling-3.0-flash-vl",
  "google/gemini-2.5-flash-lite",
  "deepseek/deepseek-v4.1-flash",
]

function unique(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))]
}

export function getLuminModelCandidates() {
  const envFallbacks = (process.env.AI_FALLBACK_MODELS || "")
    .split(",")
    .map((model) => model.trim())
    .filter(Boolean)

  return unique([getAIModel(), ...envFallbacks, ...DEFAULT_FALLBACK_MODELS])
}

function isRetryableAIError(error: unknown) {
  const message = String((error as any)?.message || error || "").toLowerCase()
  const status = Number((error as any)?.statusCode || (error as any)?.status || 0)

  if ([408, 409, 425, 429, 500, 502, 503, 504].includes(status)) return true

  return [
    "rate limit",
    "rate-limit",
    "rate_limited",
    "quota",
    "free tier",
    "too many requests",
    "temporarily unavailable",
    "overloaded",
    "capacity",
    "timeout",
    "timed out",
    "provider error",
  ].some((needle) => message.includes(needle))
}

export async function generateLuminText(options: {
  system: string
  messages?: any[]
  prompt?: string
  maxOutputTokens?: number
}) {
  const failures: Array<{ model: string; error: string }> = []
  const models = getLuminModelCandidates()

  for (const model of models) {
    try {
      const result = await generateText({
        model,
        system: options.system,
        ...(options.messages ? { messages: options.messages } : {}),
        ...(options.prompt ? { prompt: options.prompt } : {}),
        ...(options.maxOutputTokens ? { maxOutputTokens: options.maxOutputTokens } : {}),
      } as any)

      if (result.text?.trim()) {
        return { text: result.text, model, failures }
      }

      failures.push({ model, error: "empty response" })
    } catch (error: any) {
      const message = String(error?.message || error || "AI provider error")
      failures.push({ model, error: message.slice(0, 260) })
      console.warn(`[Lumin AI] model ${model} failed:`, message)

      if (!isRetryableAIError(error)) {
        throw error
      }
    }
  }

  const lastError = failures.at(-1)?.error || "Todos os modelos estão temporariamente indisponíveis."
  const aggregate = new Error(`Lumin AI indisponível após ${models.length} tentativas. ${lastError}`)
  ;(aggregate as any).failures = failures
  throw aggregate
}
