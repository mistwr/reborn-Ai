import { generateText } from "ai"
import { getVisionModel } from "@/lib/ai-config"

export interface ImageQualityResult {
  checked: boolean
  matched: boolean
  confidence: number
  reason: string
}

function normalizeScore(value: number) {
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.min(100, Math.round(value)))
}

export async function checkImageSemanticQuality(
  imageUrl: string,
  originalRequest: string,
): Promise<ImageQualityResult> {
  try {
    const remote = await fetch(imageUrl, {
      redirect: "follow",
      signal: AbortSignal.timeout(12000),
    })

    if (!remote.ok) {
      return { checked: false, matched: true, confidence: 0, reason: "image-fetch-unavailable" }
    }

    const contentType = remote.headers.get("content-type") || "image/jpeg"
    if (!contentType.startsWith("image/")) {
      return { checked: false, matched: true, confidence: 0, reason: "not-an-image" }
    }

    const bytes = Buffer.from(await remote.arrayBuffer())
    if (bytes.byteLength > 3 * 1024 * 1024) {
      return { checked: false, matched: true, confidence: 0, reason: "image-too-large-for-check" }
    }

    const result = await generateText({
      model: getVisionModel(),
      system:
        "You are Reborn AI Image Quality Control. Judge semantic fidelity, not artistic taste. Return ONLY compact JSON with keys matched (boolean), confidence (0-100 integer), reason (short string).",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Original image request: ${originalRequest}\nDoes the generated image clearly show what was requested? Fail only for meaningful semantic mismatch, missing main subject/action, severe crop, or unusable distortion.`,
            },
            {
              type: "image",
              image: `data:${contentType};base64,${bytes.toString("base64")}`,
            },
          ],
        },
      ],
      maxTokens: 120,
    })

    const text = result.text.trim()
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return { checked: false, matched: true, confidence: 0, reason: "qc-unparseable" }
    }

    const parsed = JSON.parse(jsonMatch[0])
    return {
      checked: true,
      matched: Boolean(parsed.matched),
      confidence: normalizeScore(Number(parsed.confidence)),
      reason: typeof parsed.reason === "string" ? parsed.reason.slice(0, 180) : "",
    }
  } catch (error: any) {
    // Quality control must never block image generation if the vision model is rate-limited or unavailable.
    return {
      checked: false,
      matched: true,
      confidence: 0,
      reason: error?.statusCode === 429 ? "qc-rate-limited" : "qc-unavailable",
    }
  }
}
