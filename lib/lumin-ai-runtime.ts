import { generateText } from "ai"
import { getAIModel } from "@/lib/ai-config"

const DEFAULT_FALLBACK_MODELS = [
  "inclusionai/ling-3.0-flash-vl",
  "google/gemini-2.5-flash-lite",
  "deepseek/deepseek-v4.1-flash",
]

const DEFAULT_RETRY_ROUNDS = 2
const BASE_RETRY_DELAY_MS = 450

function unique(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))]
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
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
    "model unavailable",
    "model is unavailable",
  ].some((needle) => message.includes(needle))
}

export async function generateLuminText(options: {
  system: string
  messages?: any[]
  prompt?: string
  maxOutputTokens?: number
  temperature?: number
  models?: string[]
  retryRounds?: number
}) {
  const failures: Array<{ model: string; error: string; round?: number }> = []
  const models = unique(options.models?.length ? options.models : getLuminModelCandidates())
  const retryRounds = Math.max(1, Math.min(3, Number(options.retryRounds || DEFAULT_RETRY_ROUNDS)))

  for (let round = 1; round <= retryRounds; round++) {
    let sawRetryableFailure = false

    for (const model of models) {
      try {
        const result = await generateText({
          model,
          system: options.system,
          ...(options.messages ? { messages: options.messages } : {}),
          ...(options.prompt ? { prompt: options.prompt } : {}),
          ...(options.maxOutputTokens ? { maxOutputTokens: options.maxOutputTokens } : {}),
          ...(typeof options.temperature === "number" ? { temperature: options.temperature } : {}),
        } as any)

        if (result.text?.trim()) {
          return { text: result.text, model, failures, resilienceRound: round }
        }

        failures.push({ model, error: "empty response", round })
      } catch (error: any) {
        const message = String(error?.message || error || "AI provider error")
        const retryable = isRetryableAIError(error)
        failures.push({ model, error: message.slice(0, 260), round })
        console.warn(`[Lumin AI] model ${model} failed on round ${round}:`, message)

        if (!retryable) {
          throw error
        }
        sawRetryableFailure = true
      }
    }

    if (round < retryRounds && sawRetryableFailure) {
      const jitter = Math.floor(Math.random() * 250)
      await sleep(BASE_RETRY_DELAY_MS * round + jitter)
      continue
    }
    break
  }

  const lastError = failures.at(-1)?.error || "Todos os modelos estão temporariamente indisponíveis."
  const aggregate = new Error(`Lumin AI indisponível após ${failures.length} tentativas. ${lastError}`)
  ;(aggregate as any).failures = failures
  ;(aggregate as any).resilienceExhausted = true
  throw aggregate
}
