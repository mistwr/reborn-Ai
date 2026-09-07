import { POST as ebookPost } from "@/app/api/generate-ebook/route"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET() {
  if (process.env.VERCEL_ENV === "production") {
    return Response.json({ error: "Not available in production" }, { status: 404 })
  }

  try {
    const response = await ebookPost(
      new Request("http://localhost/api/generate-ebook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: "REBORN AI ebook launch test",
          title: "REBORN AI Ebook Test",
          author: "Reborn AI",
          style: "modern",
          chapters: 2,
        }),
      }),
    )

    const data = await response.json()
    const passed = Boolean(
      response.ok &&
      data?.success &&
      Array.isArray(data?.chapters) &&
      data.chapters.length >= 1 &&
      typeof data?.html === "string" &&
      data.html.includes("<!DOCTYPE html>"),
    )

    return Response.json(
      {
        ok: passed,
        status: response.status,
        chapterCount: Array.isArray(data?.chapters) ? data.chapters.length : 0,
        title: data?.title || null,
        error: data?.error || null,
      },
      { status: passed ? 200 : 503, headers: { "Cache-Control": "no-store" } },
    )
  } catch (error: any) {
    return Response.json(
      { ok: false, error: String(error?.message || error || "Ebook smoke failed").slice(0, 500) },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    )
  }
}
