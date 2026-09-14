const DEFAULT_PROJECT_ID = "prj_h0JhWRWBtf1DhpveHzsVDVdlQyV8"
const DEFAULT_TEAM_ID = "team_JnCeZC9Btsn8DLiOsbLMguxk"

export const maxDuration = 60

export async function GET() {
  const token = process.env.VERCEL_TOKEN || process.env.VERCEL_OIDC_TOKEN || ""
  const projectId = process.env.LUMIN_VERCEL_PROJECT_ID || DEFAULT_PROJECT_ID
  const teamId = process.env.LUMIN_VERCEL_TEAM_ID || DEFAULT_TEAM_ID
  if (!token) return Response.json({ ok: false, error: "missing_token" }, { status: 500 })

  const name = `lumin-diag-${crypto.randomUUID().slice(0, 8)}`
  const q = new URLSearchParams({ teamId })
  const payload = {
    name,
    projectId,
    runtime: "node24",
    timeout: 180000,
    persistent: false,
    ports: [],
    networkPolicy: {
      mode: "custom",
      allowedDomains: ["example.com", "registry.npmjs.org", "storage.googleapis.com", "chrome-for-testing-public.storage.googleapis.com", "edgedl.me.gvt1.com"],
      allowedCIDRs: [],
      deniedCIDRs: [],
      injectionRules: [],
    },
    resources: { vcpus: 2, memory: 4096 },
    tags: { product: "lumin-ai", purpose: "browser-diag" },
  }

  const response = await fetch(`https://api.vercel.com/v2/sandboxes?${q}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(15000),
  })
  const text = await response.text()

  if (response.ok) {
    try {
      const cleanupQ = new URLSearchParams({ projectId, teamId })
      await fetch(`https://api.vercel.com/v2/sandboxes/${encodeURIComponent(name)}?${cleanupQ}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(10000),
      })
    } catch {}
  }

  return Response.json({ ok: response.ok, status: response.status, response: text.slice(0, 4000), payload: { ...payload, name: "redacted" } }, { status: response.ok ? 200 : 500, headers: { "Cache-Control": "no-store" } })
}
