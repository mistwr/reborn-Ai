import { generateText } from "ai"
import { getAIModel } from "@/lib/ai-config"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET() {
  if (process.env.VERCEL_ENV === "production") {
    return Response.json({ error: "Not available in production" }, { status: 404 })
  }

  const model = getAIModel()

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
