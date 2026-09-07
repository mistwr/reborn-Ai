import { POST as livePost } from "@/app/api/live/route"
import { POST as visionPost } from "@/app/api/vision/route"
import { POST as websitePost } from "@/app/api/generate-website/route"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

async function readResponse(response: Response) {
  const fullText = (await response.text()).trim()
  return {
    ok: response.ok,
    status: response.status,
    fullText,
    preview: fullText.slice(0, 500),
  }
}

export async function GET() {
  if (process.env.VERCEL_ENV === "production") {
    return Response.json({ error: "Not available in production" }, { status: 404 })
  }

  const visionFixture =
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAKAAAAA8CAIAAABuCSZCAAADQUlEQVR4nO3bv0vjYBzH8dgeSkSpFLooOLhYFMEmgo1p09RWNwcF3fwHBP+O4iKuXfwxKChuithqDYVWnEQymMXRKhSkouKPgnluCBd61qYtd8fBt5/XFJ+Gr094J1EE2xhjHNDl+t8bgH8LgYlDYOIQmDgEJg6BiUNg4hCYOAQmDoGJQ2DiEJg4BCYOgYlDYOIQmDgEJg6BiUNg4hCYOAQmrn7gzs5OVVUjkYggCNls1l6xrK6uVp4TCAQODg44jtvY2BBFUZIkURS3trZqjeJ5PhqN2t+rp6enegNHR0c8z1vH6+vr4XB4dHQ0nU7/4ZW3ClaPx+OxDnRdHxkZqVypPufq6qq/v//4+FiW5VKpxBgrlUqyLJ+cnNQaFQqFNE37Msf29PQkSVJ3dzdjrFgsKory+flpGIbf76+7c2CMNRHYNE2v18scA5umOTAwEIvFzs/P7U/z+Xw8Hq81KpPJKIryZY5taWlpd3fXWjcMY29vjzH28vLi8/kavMIW18TP4HQ6PTk56XzO2dnZ2tqaYRiBQMBeFATh+vq61ijrQNO06mm5XO7u7m5hYcH60u/3z8/Pcxy3v78/MzPT+M5bWt1bgOf5SCQyMTHh9Xrv7+/tFYv1pForwWDQ7XZPTU319va+vb3ZE15fX/v6+r4dZT2amqaFw2H2+xP8/v4+Pj5eKBS+rN/c3AwPDxeLxb9xf9PXxCt6ZWUlkUgwx1e0rusejycej+fzefvTXC43PT3tPEpV1UwmUzl5e3t7aGjIuo3cbvfi4iJj7Pn5WRTFi4uL5q6yhTUR+PLycnZ2ljkGLhQKgiCkUilZlh8fH9mvX7JOT0+dR2Wz2VAoVD25cr5pmnNzczs7Ow1eGzDGfjT+Mh8cHNR13TTNcrmsqqq1KElSIpGwVlwuF8dxyWRybGzs9vY2Go12dHSUy+Xl5eVYLPbtKHtFUZT29vaPjw+HDWxubqZSqYeHh2Qy2dXVdXh42PjmW1Ybw38Xkoa/ZBGHwMQhMHEITBwCE4fAxCEwcQhMHAITh8DEITBxCEwcAhOHwMQhMHEITBwCE4fAxCEwcQhMHAITh8DEITBxCEwcAhOHwMQhMHEITBwCE/cT+fLRVqKtFUIAAAAASUVORK5CYII="

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
          files: [{ dataUrl: visionFixture, mimeType: "image/png", name: "reborn-42.png" }],
          mode: "ocr",
          customPrompt: "Se conseguires ler a imagem e vires o texto REBORN 42, responde apenas: REBORN_VISION_OK",
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
    live: {
      ok: live.ok,
      status: live.status,
      preview: live.preview,
      passed: live.ok && live.fullText.includes("REBORN_LIVE_OK"),
    },
    vision: {
      ok: vision.ok,
      status: vision.status,
      preview: vision.preview,
      passed: vision.ok && vision.fullText.includes("REBORN_VISION_OK"),
    },
    webcraft: {
      ok: website.ok,
      status: website.status,
      preview: website.preview,
      passed: website.ok && website.fullText.includes("REBORN_WEBCRAFT_OK"),
    },
  }

  const ok = result.live.passed && result.vision.passed && result.webcraft.passed
  return Response.json({ ok, result }, { status: ok ? 200 : 503, headers: { "Cache-Control": "no-store" } })
}
