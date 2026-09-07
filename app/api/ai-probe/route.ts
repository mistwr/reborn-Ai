import { generateText } from "ai"
import { getAIModel } from "@/lib/ai-config"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const ALLOWED_MODELS = new Set([
  "google/gemini-3.6-flash",
  "google/gemini-3.1-flash-lite",
  "google/gemini-2.5-flash-lite",
  "openai/gpt-5",
])

export async function GET(req: Request) {
  if (process.env.VERCEL_ENV === "production") {
    return Response.json({ error: "Not available in production" }, { status: 404 })
  }

  const requested = new URL(req.url).searchParams.get("model")?.trim()
  const model = requested && ALLOWED_MODELS.has(requested) ? requested : getAIModel()

  try {
    const result = await generateText({
      model,
      prompt: "Reply with exactly: REBORN_AI_OK",
      maxOutputTokens: 16,
    })

    return Response.json(
      {
        ok: result.text.trim().includes("REBORN_AI_OK"),
        model,
        response: result.text.trim().slice(0, 64),
      },
      { headers: { "Cache-Control": "no-store" } },
    )
  } catch (error: any) {
    const message = String(error?.message || error || "Unknown AI error")
      .replace(/(Bearer\s+)[A-Za-z0-9._-]+/gi, "$1[redacted]")
      .replace(/(api[_-]?key[=:\s]+)[A-Za-z0-9._-]+/gi, "$1[redacted]")
      .slice(0, 500)

    return Response.json(
      {
        ok: false,
        model,
        error: message,
      },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    )
  }
}
