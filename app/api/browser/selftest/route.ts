import { executeHeadlessBrowserAction } from "@/lib/lumin-browser-headless-v2"

export const maxDuration = 180

export async function GET() {
  const startedAt = Date.now()
  const result = await executeHeadlessBrowserAction({
    action: { type: "navigate", url: "https://example.com" },
    cookies: [],
  })

  return Response.json(
    {
      ok: result.ok,
      durationMs: Date.now() - startedAt,
      finalUrl: result.finalUrl,
      title: result.title,
      text: result.text?.slice(0, 400),
      links: result.links?.slice(0, 5) || [],
      error: result.error,
      code: result.code,
    },
    { status: result.ok ? 200 : 500, headers: { "Cache-Control": "no-store" } },
  )
}
