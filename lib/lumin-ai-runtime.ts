import OpenAI from "openai"
import { GoogleGenerativeAI, type Part } from "@google/generative-ai"
import { getAIModel } from "@/lib/ai-config"

type TextOptions = {
  system?: string
  messages?: any[]
  prompt?: string
  model?: string
  models?: string[]
  maxOutputTokens?: number
  maxTokens?: number
  temperature?: number
  abortSignal?: AbortSignal
  maxRetries?: number
  retryRounds?: number
}
type Provider = "google" | "openai" | "huggingface"

function providers(): Provider[] {
  const preferred = process.env.AI_PROVIDER?.replace(/-direct$/, "")
  const available: Provider[] = []
  if (process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim()) available.push("google")
  if (process.env.OPENAI_API_KEY?.trim()) available.push("openai")
  if (process.env.HUGGINGFACE_API_KEY?.trim()) available.push("huggingface")
  return available.sort((a, b) => Number(b === preferred) - Number(a === preferred))
}

function modelFor(provider: Provider, options: TextOptions) {
  const requested = options.model || options.models?.[0] || getAIModel()
  if (provider === "google") return process.env.GOOGLE_DIRECT_MODEL || (requested.startsWith("google/") ? requested.slice(7) : "gemini-2.5-flash-lite")
  if (provider === "openai") return process.env.OPENAI_DIRECT_MODEL || (requested.startsWith("openai/") ? requested.slice(7) : "gpt-5.6-luna")
  return process.env.HUGGINGFACE_MODEL || "openai/gpt-oss-120b:fastest"
}

function messages(options: TextOptions) {
  const input = [...(options.messages || [])].filter(message => ["user", "assistant", "system"].includes(message?.role))
  if (options.prompt?.trim()) input.push({ role: "user", content: options.prompt.trim() })
  return input
}

function textContent(content: any): string {
  if (typeof content === "string") return content
  return Array.isArray(content) ? content.filter(part => part?.type === "text").map(part => String(part.text || "")).join("\n") : ""
}

function imageUrl(part: any) {
  if (typeof part?.image === "string") return part.image
  if (part?.image instanceof URL) return part.image.toString()
  if (part?.image instanceof Uint8Array) return "data:" + (part.mediaType || "image/png") + ";base64," + Buffer.from(part.image).toString("base64")
  throw new Error("Formato de imagem não suportado.")
}

async function googleParts(content: any, signal: AbortSignal): Promise<Part[]> {
  if (typeof content === "string") return [{ text: content }]
  const parts: Part[] = []
  for (const part of Array.isArray(content) ? content : []) {
    if (part?.type === "text") parts.push({ text: String(part.text || "") })
    else if (part?.type === "image" || part?.type === "file") {
      let data = part.type === "image" ? imageUrl(part) : String(part.data || "")
      if (part.type === "file" && !data.startsWith("data:")) data = "data:" + (part.mediaType || part.mimeType || "application/pdf") + ";base64," + data
      if (/^https?:\/\//.test(data)) {
        const response = await fetch(data, { signal })
        if (!response.ok) throw new Error("Não foi possível obter a imagem para análise.")
        data = "data:" + (response.headers.get("content-type") || "image/jpeg") + ";base64," + Buffer.from(await response.arrayBuffer()).toString("base64")
      }
      const match = data.match(/^data:([^;]+);base64,([\s\S]+)$/)
      if (!match) throw new Error("Imagem ou documento inválido.")
      parts.push({ inlineData: { mimeType: match[1], data: match[2] } })
    }
  }
  return parts
}

async function googleRequest(options: TextOptions, signal: AbortSignal) {
  const client = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY!.trim())
  const instance = client.getGenerativeModel({
    model: modelFor("google", options),
    systemInstruction: options.system || undefined,
    generationConfig: {
      maxOutputTokens: options.maxOutputTokens || options.maxTokens || 8192,
      ...(typeof options.temperature === "number" ? { temperature: options.temperature } : {}),
    },
  })
  const contents = await Promise.all(messages(options).filter(message => message.role !== "system").map(async message => ({
    role: message.role === "assistant" ? "model" : "user",
    parts: await googleParts(message.content, signal),
  })))
  return { instance, request: { contents } }
}

function openAIInput(options: TextOptions) {
  return messages(options).map(message => ({
    role: message.role,
    content: Array.isArray(message.content) && message.role === "user"
      ? message.content.map((part: any) => {
        if (part.type === "image") return { type: "input_image", image_url: imageUrl(part), detail: "auto" }
        if (part.type === "file") return { type: "input_file", filename: part.filename || "document.pdf", file_data: String(part.data).startsWith("data:") ? part.data : "data:" + (part.mediaType || "application/pdf") + ";base64," + part.data }
        return { type: "input_text", text: String(part.text || "") }
      })
      : textContent(message.content),
  }))
}

async function* providerStream(provider: Provider, options: TextOptions, signal: AbortSignal) {
  const model = modelFor(provider, options)
  if (provider === "google") {
    const { instance, request } = await googleRequest(options, signal)
    const result = await instance.generateContentStream(request, { signal })
    for await (const chunk of result.stream) { const text = chunk.text(); if (text) yield text }
  } else if (provider === "openai") {
    // Official SDK honours both runtime-injected Netlify credentials and base URL.
    const client = new OpenAI({ maxRetries: 0 })
    const stream = await client.responses.create({ model, instructions: options.system || undefined, input: openAIInput(options) as any, max_output_tokens: options.maxOutputTokens || options.maxTokens || 8192, stream: true }, { signal })
    for await (const event of stream) {
      if (event.type === "response.output_text.delta") yield event.delta
      if (event.type === "error" || event.type === "response.failed") throw new Error("O modelo não conseguiu concluir a resposta.")
    }
  } else {
    const { HfInference } = await import("@huggingface/inference")
    const client = new HfInference(process.env.HUGGINGFACE_API_KEY!.trim())
    const stream = client.chatCompletionStream({ model, messages: [{ role: "system", content: options.system || "És o Lumin AI." }, ...messages(options).map(message => ({ role: message.role, content: textContent(message.content) }))] as any, max_tokens: options.maxOutputTokens || options.maxTokens || 4096, signal })
    for await (const event of stream) { const text = event.choices?.[0]?.delta?.content; if (typeof text === "string") yield text }
  }
}

export function getLuminModelCandidates() { return [getAIModel()] }

export async function generateLuminText(options: TextOptions) {
  const available = providers()
  if (!available.length) throw new Error("As credenciais de IA ainda não estão configuradas neste ambiente.")
  const signal = options.abortSignal || AbortSignal.timeout(48_000)
  const failures: Array<{ model: string; error: string; round: number }> = []
  for (const provider of available) {
    const model = modelFor(provider, options)
    try {
      let text = ""
      if (provider === "google") {
        const { instance, request } = await googleRequest(options, signal)
        text = (await instance.generateContent(request, { signal })).response.text()
      } else if (provider === "openai") {
        const client = new OpenAI({ maxRetries: 0 })
        const response = await client.responses.create({ model, instructions: options.system || undefined, input: openAIInput(options) as any, max_output_tokens: options.maxOutputTokens || options.maxTokens || 8192 }, { signal })
        text = response.output_text || ""
      } else {
        const { HfInference } = await import("@huggingface/inference")
        const response = await new HfInference(process.env.HUGGINGFACE_API_KEY!.trim()).chatCompletion({ model, messages: [{ role: "system", content: options.system || "És o Lumin AI." }, ...messages(options).map(message => ({ role: message.role, content: textContent(message.content) }))] as any, max_tokens: options.maxOutputTokens || options.maxTokens || 4096, signal })
        text = String(response.choices?.[0]?.message?.content || "")
      }
      if (!text.trim()) throw new Error("O modelo devolveu uma resposta vazia.")
      return { text, model: provider + "-direct/" + model, failures, resilienceRound: 1 }
    } catch (error: any) {
      failures.push({ model, error: String(error?.message || error).slice(0, 260), round: 1 })
      if (signal.aborted) throw error
    }
  }
  const error = new Error("Os serviços de IA configurados não responderam. Verifica a quota e as credenciais dos modelos.")
  Object.assign(error, { failures, resilienceExhausted: true })
  throw error
}

export const generateText = generateLuminText

export function streamText(options: TextOptions) {
  return {
    toTextStreamResponse() {
      const controller = new AbortController()
      const signals = AbortSignal as typeof AbortSignal & { any(signals: AbortSignal[]): AbortSignal }
      const signal = signals.any([controller.signal, options.abortSignal || AbortSignal.timeout(55_000)])
      const stream = new ReadableStream({
        async start(output) {
          let emitted = false
          let lastError: unknown = new Error("As credenciais de IA ainda não estão configuradas.")
          for (const provider of providers()) {
            try {
              for await (const text of providerStream(provider, options, signal)) { emitted = true; output.enqueue(new TextEncoder().encode(text)) }
              if (!emitted) throw new Error("O modelo devolveu uma resposta vazia.")
              output.close()
              return
            } catch (error) { lastError = error; if (emitted || signal.aborted) break }
          }
          output.error(lastError)
        },
        cancel() { controller.abort() },
      })
      return new Response(stream, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } })
    },
  }
}
