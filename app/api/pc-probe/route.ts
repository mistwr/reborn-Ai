export const dynamic = "force-dynamic"

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))
  const safe = {
    stage: String(body?.stage || "unknown").slice(0, 64),
    href: String(body?.href || "").slice(0, 500),
    userAgent: String(body?.userAgent || "").slice(0, 500),
    hydrated: Boolean(body?.hydrated),
    target: String(body?.target || "").slice(0, 250),
    detail: String(body?.detail || "").slice(0, 1000),
    ts: String(body?.ts || ""),
  }

  console.log("[LUMIN_PC_PROBE]", JSON.stringify(safe))
  return Response.json({ ok: true }, { headers: { "Cache-Control": "no-store" } })
}
