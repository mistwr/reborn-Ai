const DEFAULT_PROJECT_ID = "prj_h0JhWRWBtf1DhpveHzsVDVdlQyV8"
const DEFAULT_TEAM_ID = "team_JnCeZC9Btsn8DLiOsbLMguxk"

export const maxDuration = 120

async function runCmd(input: {
  sessionId: string
  token: string
  teamId: string
  command: string
  args: string[]
  timeout: number
}) {
  const url = `https://api.vercel.com/v2/sandboxes/sessions/${encodeURIComponent(input.sessionId)}/cmd?cmdId=${crypto.randomUUID()}&teamId=${encodeURIComponent(input.teamId)}`
  const response = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${input.token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      command: input.command,
      args: input.args,
      cwd: "/vercel/sandbox",
      env: {},
      sudo: false,
      wait: true,
      logs: true,
      timeout: input.timeout,
    }),
    signal: AbortSignal.timeout(input.timeout + 15000),
  })
  return { status: response.status, raw: (await response.text()).slice(0, 12000) }
}

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
      allowedDomains: [
        "example.com",
        "registry.npmjs.org",
        "storage.googleapis.com",
        "chrome-for-testing-public.storage.googleapis.com",
        "edgedl.me.gvt1.com",
      ],
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

  let install: any = null
  let launch: any = null

  if (response.ok) {
    try {
      const parsed = JSON.parse(text)
      const sessionId = parsed?.session?.id || parsed?.sandbox?.currentSessionId || parsed?.sessionId || parsed?.id
      if (sessionId) {
        install = await runCmd({
          sessionId,
          token,
          teamId,
          command: "sh",
          args: ["-lc", "npm init -y >/dev/null 2>&1 && npm install --no-save puppeteer@24.16.0"],
          timeout: 95000,
        })

        launch = await runCmd({
          sessionId,
          token,
          teamId,
          command: "node",
          args: [
            "-e",
            `const puppeteer=require('puppeteer');(async()=>{try{const browser=await puppeteer.launch({headless:true,args:['--no-sandbox','--disable-setuid-sandbox','--disable-dev-shm-usage']});const page=await browser.newPage();await page.goto('https://example.com',{waitUntil:'domcontentloaded',timeout:30000});console.log('__LUMIN_DIAG__'+JSON.stringify({ok:true,title:await page.title(),url:page.url(),text:(await page.$eval('body',el=>el.innerText)).slice(0,300)}));await browser.close();}catch(e){console.error('__LUMIN_DIAG_ERR__'+String(e&&e.stack||e));process.exitCode=1;}})();`,
          ],
          timeout: 45000,
        })
      }
    } catch (error: any) {
      launch = { status: 500, raw: String(error?.stack || error) }
    }

    try {
      const cleanupQ = new URLSearchParams({ projectId, teamId })
      await fetch(`https://api.vercel.com/v2/sandboxes/${encodeURIComponent(name)}?${cleanupQ}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(10000),
      })
    } catch {}
  }

  return Response.json(
    {
      ok: response.ok,
      status: response.status,
      sandboxResponse: text.slice(0, 4000),
      install,
      launch,
    },
    { status: response.ok ? 200 : 500, headers: { "Cache-Control": "no-store" } },
  )
}
