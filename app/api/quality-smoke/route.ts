import { POST as generateImage } from "@/app/api/generate-image/route"
import { POST as analyzeVision } from "@/app/api/vision/route"

export const maxDuration = 120

export async function GET() {
  const imageReq = new Request("http://local/api/generate-image", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      prompt: "Gera um cavalo inteiro, claramente visível, fotografia realista",
      width: 768,
      height: 768,
      quality: "hd",
      intent: "image",
      style: "Fotografia realista",
    }),
  })

  const imageRes = await generateImage(imageReq)
  const imageJson = await imageRes.json()
  if (!imageRes.ok || !imageJson?.url) {
    return Response.json({ ok: false, stage: "generate", status: imageRes.status, imageJson }, { status: 500 })
  }

  const remote = await fetch(imageJson.url)
  if (!remote.ok) {
    return Response.json({ ok: false, stage: "fetch-image", status: remote.status, url: imageJson.url }, { status: 500 })
  }

  const mimeType = remote.headers.get("content-type") || "image/jpeg"
  const bytes = Buffer.from(await remote.arrayBuffer())
  const dataUrl = `data:${mimeType};base64,${bytes.toString("base64")}`

  const visionReq = new Request("http://local/api/vision", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      files: [{ name: "horse-test.jpg", mimeType, dataUrl }],
      mode: "identify",
      customPrompt: "Identifica o objeto ou animal principal da imagem. Responde de forma curta e objetiva.",
    }),
  })

  const visionRes = await analyzeVision(visionReq)
  const visionText = await visionRes.text()
  const normalized = visionText.toLowerCase()
  const matched = normalized.includes("cavalo") || normalized.includes("horse")

  return Response.json({
    ok: imageRes.ok && visionRes.ok && matched,
    generated: imageJson.url,
    provider: imageJson.providerSource || imageJson.provider,
    visionStatus: visionRes.status,
    matched,
    vision: visionText.slice(0, 1000),
  })
}
