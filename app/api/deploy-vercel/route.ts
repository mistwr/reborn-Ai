import { POST as publishOnNetlify } from "@/app/api/webcraft-v2/publish/route"

export const runtime = "nodejs"
export const maxDuration = 60

// Compatibility for older WebCraft clients; publication now uses Netlify.
export async function POST(req: Request) {
  const body = await req.json().catch(() => null)
  if (typeof body?.html !== "string" || !body.html.trim()) {
    return Response.json({ error: "HTML é obrigatório" }, { status: 400 })
  }
  return publishOnNetlify(new Request(req.url, {
    method: "POST",
    headers: req.headers,
    body: JSON.stringify({ mode: "website", previewHtml: body.html, name: body.projectName }),
  }))
}
