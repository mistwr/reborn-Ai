import { POST as chatPost } from "@/app/api/chat/route"
import { POST as websitePost } from "@/app/api/generate-website/route"

export const maxDuration = 60

export async function GET() {
  if (process.env.VERCEL_ENV !== "production") {
    return Response.json({ error: "Not available" }, { status: 404 })
  }

  const chatRequest = new Request("https://reborn.local/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message: "Responde apenas: REBORN_PROD_CHAT_OK",
      image: null,
      history: [],
      enableSearch: false,
      userPreferences: { language: "pt", style: "concise" },
    }),
  })

  const chatResponse = await chatPost(chatRequest)
  const chatText = await chatResponse.text()
  const chatOk = chatResponse.ok && chatText.includes("REBORN_PROD_CHAT_OK")

  // Keep the two gateway calls sequential and separated to avoid free-tier burst limits.
  await new Promise((resolve) => setTimeout(resolve, 2000))

  const websiteRequest = new Request("https://reborn.local/api/generate-website", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      prompt: "Cria uma pagina de teste simples cujo texto principal visivel seja exatamente REBORN_PROD_WEB_OK.",
      template: "minimal",
      category: "startup",
      features: ["hero"],
      language: "pt-PT",
    }),
  })

  const websiteResponse = await websitePost(websiteRequest)
  const websiteText = await websiteResponse.text()
  const websiteOk =
    websiteResponse.ok &&
    websiteText.includes("REBORN_PROD_WEB_OK") &&
    websiteText.toLowerCase().includes("<!doctype html>")

  return Response.json(
    {
      ok: chatOk && websiteOk,
      chat: { ok: chatOk, status: chatResponse.status, response: chatText.slice(0, 120) },
      webcraft: { ok: websiteOk, status: websiteResponse.status, htmlLength: websiteText.length },
    },
    { status: chatOk && websiteOk ? 200 : 503 },
  )
}
