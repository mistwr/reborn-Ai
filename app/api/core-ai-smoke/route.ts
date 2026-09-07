import { POST as livePost } from "@/app/api/live/route"
import { POST as visionPost } from "@/app/api/vision/route"
import { POST as websitePost } from "@/app/api/generate-website/route"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

async function readResponse(response: Response) {
  const text = (await response.text()).trim()
  return {
    ok: response.ok,
    status: response.status,
    text: text.slice(0, 500),
  }
}

export async function GET() {
  if (process.env.VERCEL_ENV === "production") {
    return Response.json({ error: "Not available in production" }, { status: 404 })
  }

  const tinyPng =
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl9ZQAAAABJRU5ErkJggg=="

  const [live, vision, website] = await Promise.all([
    livePost(
      new Request("http://localhost/api/live", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: "Responde apenas: REBORN_LIVE_OK",
          conversationHistory: [],
          mode: "voice",
        }),
      }),
    ).then(readResponse),
    visionPost(
      new Request("http://localhost/api/vision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          files: [{ dataUrl: tinyPng, mimeType: "image/png", name: "pixel.png" }],
          mode: "describe",
          customPrompt: "Responde apenas: REBORN_VISION_OK",
        }),
      }),
    ).then(readResponse),
    websitePost(
      new Request("http://localhost/api/generate-website", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: "Cria uma landing page mínima com o texto REBORN_WEBCRAFT_OK visível",
          category: "technology",
        }),
      }),
    ).then(readResponse),
  ])

  const result = {
    live: { ...live, passed: live.ok && live.text.includes("REBORN_LIVE_OK") },
    vision: { ...vision, passed: vision.ok && vision.text.includes("REBORN_VISION_OK") },
    webcraft: { ...website, passed: website.ok && website.text.includes("REBORN_WEBCRAFT_OK") },
  }

  const ok = result.live.passed && result.vision.passed && result.webcraft.passed
  return Response.json({ ok, result }, { status: ok ? 200 : 503, headers: { "Cache-Control": "no-store" } })
}
