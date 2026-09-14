import { generateText } from "ai"
import { getAIModel } from "@/lib/ai-config"

const DEFAULT_FALLBACK_MODELS = [
  "inclusionai/ling-3.0-flash-vl",
  "google/gemini-2.5-flash-lite",
  "deepseek/deepseek-v4.1-flash",
]

const DEFAULT_RETRY_ROUNDS = 2
const BASE_RETRY_DELAY_MS = 450
const DIRECT_OPENAI_MODEL = process.env.OPENAI_DIRECT_MODEL || "gpt-5.6-luna"
const DIRECT_GEMINI_MODEL = process.env.GOOGLE_DIRECT_MODEL || "gemini-2.5-flash-lite"
const DIRECT_HF_MODEL = process.env.HUGGINGFACE_MODEL || "openai/gpt-oss-120b:fastest"

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

function errorMessage(error: unknown) {
  return String((error as any)?.message || error || "AI provider error")
}

function isRetryableAIError(error: unknown) {
  const message = errorMessage(error).toLowerCase()
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

function isGatewayFreeTierLimited(error: unknown) {
  const message = errorMessage(error).toLowerCase()
  return message.includes("free tier requests on this model are rate-limited") || message.includes("upgrade to paid credits")
}

function textFromContent(content: any): string {
  if (typeof content === "string") return content
  if (!Array.isArray(content)) return ""
  return content
    .map((part: any) => {
      if (typeof part === "string") return part
      if (part?.type === "text" && typeof part.text === "string") return part.text
      return ""
    })
    .filter(Boolean)
    .join("\n")
}

function normalizedMessages(options: { system: string; messages?: any[]; prompt?: string }) {
  const messages: Array<{ role: "user" | "assistant" | "system"; content: string }> = []
  if (options.system?.trim()) messages.push({ role: "system", content: options.system.trim() })

  for (const msg of options.messages || []) {
    const role = msg?.role === "assistant" ? "assistant" : msg?.role === "system" ? "system" : "user"
    const content = textFromContent(msg?.content)
    if (content.trim()) messages.push({ role, content })
  }

  if (options.prompt?.trim()) messages.push({ role: "user", content: options.prompt.trim() })
  return messages
}

function extractOpenAIResponseText(data: any) {
  if (typeof data?.output_text === "string" && data.output_text.trim()) return data.output_text.trim()
  const chunks: string[] = []
  for (const item of Array.isArray(data?.output) ? data.output : []) {
    if (item?.type !== "message" || !Array.isArray(item?.content)) continue
    for (const part of item.content) {
      if ((part?.type === "output_text" || part?.type === "text") && typeof part?.text === "string") chunks.push(part.text)
    }
  }
  return chunks.join("\n").trim()
}

async function tryDirectOpenAI(options: {
  system: string
  messages?: any[]
  prompt?: string
  maxOutputTokens?: number
  temperature?: number
}) {
  const apiKey = process.env.OPENAI_API_KEY?.trim()
  if (!apiKey) return null

  const messages = normalizedMessages({ ...options, system: "" })
    .filter((m) => m.role !== "system")
    .map((m) => ({ role: m.role === "assistant" ? "assistant" : "user", content: m.content }))

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: DIRECT_OPENAI_MODEL,
      instructions: options.system || undefined,
      input: messages.length ? messages : options.prompt || "Responde ao pedido do utilizador.",
      max_output_tokens: options.maxOutputTokens || 2048,
    }),
    signal: AbortSignal.timeout(35_000),
  })

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    const err = new Error(String(data?.error?.message || `OpenAI HTTP ${response.status}`))
    ;(err as any).status = response.status
    throw err
  }

  const text = extractOpenAIResponseText(data)
  return text ? { text, model: `openai-direct/${DIRECT_OPENAI_MODEL}` } : null
}

async function tryDirectGemini(options: {
  system: string
  messages?: any[]
  prompt?: string
  maxOutputTokens?: number
  temperature?: number
}) {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim()
  if (!apiKey) return null

  const { GoogleGenerativeAI } = await import("@google/generative-ai")
  const client = new GoogleGenerativeAI(apiKey)
  const model = client.getGenerativeModel({
    model: DIRECT_GEMINI_MODEL,
    systemInstruction: options.system || undefined,
    generationConfig: {
      ...(options.maxOutputTokens ? { maxOutputTokens: options.maxOutputTokens } : {}),
      ...(typeof options.temperature === "number" ? { temperature: options.temperature } : {}),
    },
  })

  const all = normalizedMessages({ ...options, system: "" })
  const lastUserIndex = [...all].map((m) => m.role).lastIndexOf("user")
  const prompt = lastUserIndex >= 0 ? all[lastUserIndex].content : options.prompt || "Responde ao pedido do utilizador."
  const history = all
    .slice(0, lastUserIndex >= 0 ? lastUserIndex : all.length)
    .filter((m) => m.role !== "system")
    .map((m) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] }))

  const chat = model.startChat({ history: history as any })
  const response = await chat.sendMessage(prompt)
  const text = response.response.text()?.trim()
  return text ? { text, model: `google-direct/${DIRECT_GEMINI_MODEL}` } : null
}

async function tryDirectHuggingFace(options: {
  system: string
  messages?: any[]
  prompt?: string
  maxOutputTokens?: number
  temperature?: number
}) {
  const apiKey = process.env.HUGGINGFACE_API_KEY?.trim()
  if (!apiKey) return null

  const { HfInference } = await import("@huggingface/inference")
  const client = new HfInference(apiKey)
  const messages = normalizedMessages(options)
  const response: any = await client.chatCompletion({
    model: DIRECT_HF_MODEL,
    messages: messages as any,
    max_tokens: options.maxOutputTokens || 2048,
    ...(typeof options.temperature === "number" ? { temperature: options.temperature } : {}),
  } as any)
  const text = String(response?.choices?.[0]?.message?.content || "").trim()
  return text ? { text, model: `huggingface-direct/${DIRECT_HF_MODEL}` } : null
}

async function tryDirectProviders(
  options: {
    system: string
    messages?: any[]
    prompt?: string
    maxOutputTokens?: number
    temperature?: number
  },
  failures: Array<{ model: string; error: string; round?: number }>,
  round: number,
) {
  const providers = [
    { name: `openai-direct/${DIRECT_OPENAI_MODEL}`, run: () => tryDirectOpenAI(options) },
    { name: `google-direct/${DIRECT_GEMINI_MODEL}`, run: () => tryDirectGemini(options) },
    { name: `huggingface-direct/${DIRECT_HF_MODEL}`, run: () => tryDirectHuggingFace(options) },
  ]

  for (const provider of providers) {
    try {
      const result = await provider.run()
      if (result?.text) return { ...result, failures, resilienceRound: round }
    } catch (error) {
      const message = errorMessage(error)
      failures.push({ model: provider.name, error: message.slice(0, 260), round })
      console.warn(`[Lumin AI] direct provider ${provider.name} failed on round ${round}:`, message)
    }
  }
  return null
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
    let gatewayGloballyLimited = false

    for (const model of models) {
      if (gatewayGloballyLimited) break
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
        const message = errorMessage(error)
        const retryable = isRetryableAIError(error)
        failures.push({ model, error: message.slice(0, 260), round })
        console.warn(`[Lumin AI] model ${model} failed on round ${round}:`, message)

        if (isGatewayFreeTierLimited(error)) {
          gatewayGloballyLimited = true
          sawRetryableFailure = true
          break
        }

        if (!retryable) {
          sawRetryableFailure = true
          continue
        }
        sawRetryableFailure = true
      }
    }

    const direct = await tryDirectProviders(options, failures, round)
    if (direct) return direct

    if (round < retryRounds && sawRetryableFailure && !gatewayGloballyLimited) {
      const jitter = Math.floor(Math.random() * 250)
      await sleep(BASE_RETRY_DELAY_MS * round + jitter)
      continue
    }

    if (gatewayGloballyLimited) break
  }

  const lastError = failures.at(-1)?.error || "Todos os modelos estão temporariamente indisponíveis."
  const aggregate = new Error(`Lumin AI indisponível após ${failures.length} tentativas. ${lastError}`)
  ;(aggregate as any).failures = failures
  ;(aggregate as any).resilienceExhausted = true
  throw aggregate
}
