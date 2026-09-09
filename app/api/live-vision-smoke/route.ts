import { POST as livePost } from "@/app/api/live/route"

export const maxDuration = 120

export async function GET() {
  const source = "https://image.pollinations.ai/prompt/a%20bright%20red%20sports%20car%20parked%20on%20a%20snowy%20mountain%20road%2C%20photorealistic?width=640&height=480&model=flux&nologo=true&seed=884422"
  const imageRes = await fetch(source, { redirect: "follow" })
  if (!imageRes.ok) return Response.json({ ok: false, stage: "image", status: imageRes.status }, { status: 502 })
  const type = imageRes.headers.get("content-type") || "image/jpeg"
  const bytes = Buffer.from(await imageRes.arrayBuffer())
  const imageDataUrl = `data:${type};base64,${bytes.toString("base64")}`

  const req = new Request("http://local/api/live", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      message: "O que estás a ver? Responde em uma frase curta e concreta.",
      conversationHistory: [],
      mode: "both",
      imageDataUrl,
    }),
  })

  const res = await livePost(req)
  const text = await res.text()
  return Response.json({ ok: res.ok, status: res.status, response: text })
}
