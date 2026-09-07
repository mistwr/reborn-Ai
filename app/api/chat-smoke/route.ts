import { POST as chatPost } from "@/app/api/chat/route"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET() {
  if (process.env.VERCEL_ENV === "production") {
    return Response.json({ error: "Not available in production" }, { status: 404 })
  }

  try {
    const request = new Request("http://localhost/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: "Responde apenas: REBORN_CHAT_OK",
        image: null,
        history: [],
        enableSearch: false,
        userPreferences: { language: "pt", style: "concise" },
      }),
    })

    const response = await chatPost(request)
    const body = await response.text()
    const text = body.trim()

    return Response.json(
      {
        ok: response.ok && text.includes("REBORN_CHAT_OK"),
        status: response.status,
        response: text.slice(0, 200),
      },
      {
        status: response.ok ? 200 : 503,
        headers: { "Cache-Control": "no-store" },
      },
    )
  } catch (error: any) {
    return Response.json(
      {
        ok: false,
        error: String(error?.message || error || "Unknown chat smoke error").slice(0, 500),
      },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    )
  }
}
