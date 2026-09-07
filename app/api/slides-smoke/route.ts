import { POST as slidesPost } from "@/app/api/generate-presentation/route"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET() {
  if (process.env.VERCEL_ENV === "production") {
    return Response.json({ error: "Not available in production" }, { status: 404 })
  }

  try {
    const response = await slidesPost(
      new Request("http://localhost/api/generate-presentation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: "REBORN AI launch test",
          template: "modern",
          slides: 3,
        }),
      }),
    )

    const data = await response.json()
    const passed = Boolean(
      response.ok &&
      data?.success &&
      Array.isArray(data?.slides) &&
      data.slides.length >= 2 &&
      typeof data?.html === "string" &&
      data.html.includes("<!DOCTYPE html>"),
    )

    return Response.json(
      {
        ok: passed,
        status: response.status,
        slideCount: Array.isArray(data?.slides) ? data.slides.length : 0,
        firstTitle: data?.slides?.[0]?.title || null,
        error: data?.error || null,
      },
      { status: passed ? 200 : 503, headers: { "Cache-Control": "no-store" } },
    )
  } catch (error: any) {
    return Response.json(
      { ok: false, error: String(error?.message || error || "Slides smoke failed").slice(0, 500) },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    )
  }
}
