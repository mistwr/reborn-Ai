import { generateImage } from "ai"
import type { ProjectBrief } from "@/lib/content-brief"
import { buildAdvancedImagePrompt } from "@/lib/image/prompt-builder"
import { checkImageSemanticQuality } from "@/lib/image/quality-check"

export const maxDuration = 90

const INITIAL_GENERATION_BUDGET_MS = 50_000
const IMAGE_REPAIR_BUDGET_MS = 8_000

function timeoutSignal(deadlineAt: number, maxMs: number): AbortSignal | null {
  const remaining = deadlineAt - Date.now()
  return remaining > 0 ? AbortSignal.timeout(Math.min(remaining, maxMs)) : null
}

type GeneratedImageResult = {
  url: string
  providerSource: string
  quality: "ai-generated" | "stock"
  isBase64?: boolean
  note?: string
}

function aspectRatioFor(width: number, height: number) {
  if (width === height) return "1:1"
  return width > height ? "16:9" : "9:16"
}

function imageToDataUrl(image: any): string | null {
  if (!image) return null

  if (typeof image.base64 === "string" && image.base64) {
    const mediaType = image.mediaType || image.mimeType || "image/png"
    return `data:${mediaType};base64,${image.base64}`
  }

  const bytes = image.uint8Array || image.data
  if (bytes) {
    try {
      const mediaType = image.mediaType || image.mimeType || "image/png"
      const base64 = Buffer.from(bytes).toString("base64")
      return `data:${mediaType};base64,${base64}`
    } catch {
      return null
    }
  }

  if (typeof image.url === "string" && image.url) return image.url
  return null
}

async function generateWithGateway(prompt: string, width: number, height: number, quality: string, deadlineAt: number): Promise<GeneratedImageResult | null> {
  // Keep the cheap/fast option first. If a model is unavailable or the account is
  // rate-limited, move on instead of making image generation look broken.
  const models = quality === "fast"
    ? ["google/imagen-4.0-fast-generate-001"]
    : ["google/imagen-4.0-fast-generate-001", "openai/gpt-image-2", "bfl/flux-2-pro"]

  for (const model of models) {
    const abortSignal = timeoutSignal(deadlineAt, quality === "fast" ? 12_000 : 16_000)
    if (!abortSignal) break

    try {
      const result: any = await generateImage({
        model: model as any,
        prompt,
        aspectRatio: aspectRatioFor(width, height) as any,
        abortSignal,
        maxRetries: 0,
      } as any)

      const url = imageToDataUrl(result?.image || result?.images?.[0])
      if (!url) continue

      return {
        url,
        providerSource: `vercel-ai-gateway:${model}`,
        quality: "ai-generated",
        isBase64: url.startsWith("data:image/"),
      }
    } catch (error) {
      console.warn(`[Lumin Images] gateway model ${model} unavailable`, error instanceof Error ? error.message : error)
    }
  }

  return null
}

async function generateWithPollinations(prompt: string, width: number, height: number, seed: number, deadlineAt: number): Promise<GeneratedImageResult | null> {
  const abortSignal = timeoutSignal(deadlineAt, 20_000)
  if (!abortSignal) return null

  try {
    const url = new URL(`https://gen.pollinations.ai/image/${encodeURIComponent(prompt)}`)
    url.searchParams.set("model", "flux")
    url.searchParams.set("width", String(width))
    url.searchParams.set("height", String(height))
    url.searchParams.set("seed", String(seed))
    url.searchParams.set("nologo", "true")

    const headers: Record<string, string> = { Accept: "image/*" }
    const key = process.env.POLLINATIONS_API_KEY?.trim()
    if (key) headers.Authorization = `Bearer ${key}`

    const response = await fetch(url, {
      headers,
      cache: "no-store",
      signal: abortSignal,
    })

    if (!response.ok) {
      console.warn(`[Lumin Images] Pollinations returned ${response.status}`)
      return null
    }

    const contentType = response.headers.get("content-type") || "image/jpeg"
    if (!contentType.toLowerCase().startsWith("image/")) return null

    const bytes = Buffer.from(await response.arrayBuffer())
    if (!bytes.length) return null

    return {
      url: `data:${contentType};base64,${bytes.toString("base64")}`,
      providerSource: "pollinations-flux",
      quality: "ai-generated",
      isBase64: true,
    }
  } catch (error) {
    console.warn("[Lumin Images] Pollinations unavailable", error instanceof Error ? error.message : error)
    return null
  }
}

async function generateWithCraiyon(prompt: string, negativePrompt: string, deadlineAt: number): Promise<GeneratedImageResult | null> {
  const abortSignal = timeoutSignal(deadlineAt, 8_000)
  if (!abortSignal) return null

  try {
    const response = await fetch("https://api.craiyon.com/v3", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt,
        token: null,
        model: "art",
        negative_prompt: negativePrompt,
        version: "c4ue22fb7kb6wlac",
      }),
      signal: abortSignal,
    })

    if (!response.ok) return null
    const data = await response.json()
    if (!Array.isArray(data?.images) || !data.images[0]) return null

    return {
      url: `data:image/webp;base64,${data.images[0]}`,
      providerSource: "craiyon",
      quality: "ai-generated",
      isBase64: true,
    }
  } catch {
    return null
  }
}

async function stockFallback(prompt: string, width: number, height: number, seed: number, deadlineAt: number): Promise<GeneratedImageResult | null> {
  const keywords = prompt
    .replace(/[^a-zA-Z0-9À-ÿ\s-]/g, " ")
    .trim()
    .split(/\s+/)
    .slice(0, 4)
    .join(",")

  const candidates = [
    `https://loremflickr.com/${width}/${height}/${encodeURIComponent(keywords || "creative")}`,
  ]

  for (const url of candidates) {
    const abortSignal = timeoutSignal(deadlineAt, 5_000)
    if (!abortSignal) break

    try {
      const response = await fetch(url, {
        method: "GET",
        redirect: "follow",
        cache: "no-store",
        signal: abortSignal,
      })
      if (!response.ok) continue
      const contentType = response.headers.get("content-type") || "image/jpeg"
      if (!contentType.toLowerCase().startsWith("image/")) continue
      const bytes = Buffer.from(await response.arrayBuffer())
      if (!bytes.length) continue

      return {
        url: `data:${contentType};base64,${bytes.toString("base64")}`,
        providerSource: "stock-fallback",
        quality: "stock",
        isBase64: true,
        note: "A geração IA estava temporariamente indisponível; foi usado apenas um fallback visual relacionado com o pedido.",
      }
    } catch {
      continue
    }
  }

  return null
}

export async function POST(req: Request) {
  try {
    const {
      prompt,
      width = 1024,
      height = 1024,
      quality = "standard",
      style = "",
      intent = "image",
      brief,
      validate,
    } = (await req.json()) as {
      prompt?: string
      width?: number
      height?: number
      quality?: string
      style?: string
      intent?: string
      brief?: ProjectBrief
      validate?: boolean
    }

    if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
      return Response.json({ error: "Prompt não fornecido" }, { status: 400 })
    }

    const requestStartedAt = Date.now()
    const generationDeadlineAt = requestStartedAt + INITIAL_GENERATION_BUDGET_MS
    const seed = Math.floor(Math.random() * 9_999_999)
    const w = Math.min(Math.max(Number(width) || 1024, 256), 1536)
    const h = Math.min(Math.max(Number(height) || 1024, 256), 1536)
    const built = buildAdvancedImagePrompt({ prompt, style, quality, width: w, height: h, intent, brief })
    const enhancedPrompt = built.prompt
    const shouldValidate = validate ?? quality === "hd"

    let generated = await generateWithGateway(enhancedPrompt, w, h, quality, generationDeadlineAt)

    if (!generated) {
      generated = await generateWithPollinations(enhancedPrompt, w, h, seed, generationDeadlineAt)
    }

    if (!generated && quality !== "fast") {
      generated = await generateWithCraiyon(enhancedPrompt, built.negativePrompt, generationDeadlineAt)
    }

    if (!generated) {
      generated = await stockFallback(prompt, Math.min(w, 1280), Math.min(h, 1280), seed, generationDeadlineAt)
    }

    if (!generated) {
      return Response.json(
        {
          error: "Os geradores de imagem estão temporariamente ocupados. Tenta novamente dentro de alguns segundos.",
          code: "IMAGE_PROVIDERS_UNAVAILABLE",
        },
        { status: 503 },
      )
    }

    let qualityControl = { checked: false, matched: true, confidence: 0, reason: "qc-disabled" }
    let retried = false
    let promptUsed = enhancedPrompt

    if (shouldValidate && generated.quality === "ai-generated") {
      try {
        qualityControl = await checkImageSemanticQuality(generated.url, prompt)

        // One semantic repair pass: if Vision says the image does not really
        // represent the request, regenerate with the actual failure reason.
        if (!qualityControl.matched || qualityControl.confidence < 72) {
          const repairPrompt = [
            enhancedPrompt,
            "STRICT SEMANTIC REPAIR.",
            `The previous result did not match the user's request well enough: ${qualityControl.reason || "semantic mismatch"}.`,
            `Original request that MUST be visually obvious: ${prompt.trim()}.`,
            "Make the requested subject unmistakable, correctly framed and central to the composition.",
            "Do not replace it with a generic futuristic person, generic AI imagery, unrelated stock-like scenery, text or logos.",
          ].join(" ")

          const repairDeadlineAt = Math.min(Date.now() + IMAGE_REPAIR_BUDGET_MS, requestStartedAt + 80_000)
          let repaired = await generateWithGateway(repairPrompt, w, h, quality, repairDeadlineAt)
          if (!repaired) repaired = await generateWithPollinations(repairPrompt, w, h, seed + 1, repairDeadlineAt)

          if (repaired?.quality === "ai-generated") {
            const repairedQc = await checkImageSemanticQuality(repaired.url, prompt)
            const repairedWins =
              (repairedQc.matched && !qualityControl.matched) ||
              repairedQc.confidence >= qualityControl.confidence + 5

            if (repairedWins) {
              generated = repaired
              qualityControl = repairedQc
              promptUsed = repairPrompt
              retried = true
            }
          }
        }
      } catch (error) {
        console.warn("[Lumin Images] quality check skipped", error instanceof Error ? error.message : error)
      }
    }

    return Response.json({
      url: generated.url,
      provider: "Lumin AI",
      providerSource: generated.providerSource,
      seed,
      success: true,
      isBase64: generated.isBase64,
      quality: generated.quality,
      generationMode: generated.quality === "stock" ? "fallback" : "generated",
      note: generated.note,
      intentDetected: built.intent,
      promptUsed,
      negativePrompt: built.negativePrompt,
      qualityControl,
      retried,
    })
  } catch (error: any) {
    console.error("[Lumin Images] generation error", error)
    return Response.json(
      { error: error?.message || "Falha ao gerar imagem", code: "GENERATION_ERROR" },
      { status: 500 },
    )
  }
}
