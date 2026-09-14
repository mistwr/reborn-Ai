import { lookup } from "node:dns/promises"
import net from "node:net"

const DEFAULT_PROJECT_ID = "prj_h0JhWRWBtf1DhpveHzsVDVdlQyV8"
const DEFAULT_TEAM_ID = "team_JnCeZC9Btsn8DLiOsbLMguxk"
const INSTALL_TIMEOUT_MS = 95_000
const RUN_TIMEOUT_MS = 45_000

export type HeadlessBrowserAction =
  | { type: "navigate"; url: string }
  | { type: "click"; url: string; selector: string }
  | { type: "fill"; url: string; fields: Record<string, string> }
  | { type: "fill_and_click"; url: string; fields: Record<string, string>; selector: string }

export type HeadlessBrowserResult = {
  ok: boolean
  finalUrl?: string
  title?: string
  text?: string
  links?: Array<{ text: string; href: string }>
  buttons?: Array<{ text: string; selector: string }>
  inputs?: Array<{ name: string; type: string; placeholder: string; selector: string }>
  cookies?: any[]
  error?: string
  code?: string
}

function getConfig() {
  return {
    token: process.env.VERCEL_TOKEN || process.env.VERCEL_OIDC_TOKEN || "",
    projectId: process.env.LUMIN_VERCEL_PROJECT_ID || DEFAULT_PROJECT_ID,
    teamId: process.env.LUMIN_VERCEL_TEAM_ID || DEFAULT_TEAM_ID,
  }
}

function blockedIPv4(ip: string) {
  const p = ip.split(".").map(Number)
  if (p.length !== 4) return true
  const [a, b] = p
  return (
    a === 0 || a === 10 || a === 127 || a >= 224 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 198 && (b === 18 || b === 19))
  )
}

function blockedIPv6(ip: string) {
  const x = ip.toLowerCase()
  return x === "::" || x === "::1" || x.startsWith("fc") || x.startsWith("fd") || x.startsWith("fe8") || x.startsWith("fe9") || x.startsWith("fea") || x.startsWith("feb") || x.startsWith("ff")
}

async function assertPublicUrl(value: string) {
  const url = new URL(value)
  if (!/^https?:$/.test(url.protocol)) throw new Error("unsupported_protocol")
  if (url.username || url.password) throw new Error("credentials_in_url")
  const host = url.hostname.toLowerCase().replace(/\.$/, "")
  if (!host || host === "localhost" || host.endsWith(".local") || host.endsWith(".localhost")) throw new Error("local_host_blocked")

  if (net.isIP(host)) {
    if ((net.isIPv4(host) && blockedIPv4(host)) || (net.isIPv6(host) && blockedIPv6(host))) throw new Error("private_address_blocked")
  } else {
    const resolved = await lookup(host, { all: true, verbatim: true })
    if (!resolved.length) throw new Error("host_not_resolved")
    for (const entry of resolved) {
      if ((entry.family === 4 && blockedIPv4(entry.address)) || (entry.family === 6 && blockedIPv6(entry.address))) throw new Error("private_address_blocked")
    }
  }
  return url
}

function sensitiveField(name: string) {
  return /password|passwd|senha|otp|2fa|totp|cvv|cvc|card|cartao|cartão|iban|swift|token|secret|api[_-]?key|private[_-]?key/i.test(name)
}

function validateAction(action: HeadlessBrowserAction) {
  if ((action.type === "fill" || action.type === "fill_and_click") && Object.keys(action.fields || {}).some(sensitiveField)) {
    throw new Error("sensitive_fields_blocked")
  }
  if (/\b(checkout|payment|pay|purchase|buy|delete|remove|unsubscribe|transfer|withdraw|checkout)\b/i.test(action.url)) {
    throw new Error("high_impact_target_blocked")
  }
  if ((action.type === "click" || action.type === "fill_and_click") && !action.selector?.trim()) {
    throw new Error("selector_required")
  }
}

function parseNdjson(raw: string) {
  const stdout: string[] = []
  const stderr: string[] = []
  let exitCode: number | null = null
  for (const line of raw.split(/\r?\n/).map((x) => x.trim()).filter(Boolean)) {
    let event: any
    try { event = JSON.parse(line) } catch { event = { data: line } }
    const stream = String(event?.stream || event?.type || event?.channel || "").toLowerCase()
    const payload = event?.stdout ?? event?.stderr ?? event?.text ?? event?.message ?? event?.data?.text ?? event?.data?.message ?? (typeof event?.data === "string" ? event.data : "")
    const code = event?.command?.exitCode ?? event?.result?.command?.exitCode ?? event?.exitCode ?? event?.result?.exitCode
    if (code !== undefined && code !== null && Number.isFinite(Number(code))) exitCode = Number(code)
    if (payload !== undefined && payload !== null && String(payload).trim()) {
      if (stream.includes("stderr") || event?.stderr !== undefined) stderr.push(String(payload))
      else stdout.push(String(payload))
    }
  }
  return { stdout: stdout.join("\n"), stderr: stderr.join("\n"), exitCode }
}

function extractJson(text: string) {
  const marker = "__LUMIN_BROWSER_RESULT__"
  const idx = text.lastIndexOf(marker)
  if (idx < 0) return null
  const after = text.slice(idx + marker.length).trim()
  const line = after.split(/\r?\n/)[0]?.trim()
  if (!line) return null
  try { return JSON.parse(line) } catch { return null }
}

async function stopSandbox(name: string, token: string, projectId: string, teamId: string) {
  try {
    const q = new URLSearchParams({ projectId, teamId })
    await fetch(`https://api.vercel.com/v2/sandboxes/${encodeURIComponent(name)}?${q}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(10_000),
    })
  } catch {}
}

async function runCommand(input: { sessionId: string; token: string; teamId: string; command: string; args: string[]; timeout: number; env?: Record<string, string> }) {
  const cmdId = crypto.randomUUID()
  const url = `https://api.vercel.com/v2/sandboxes/sessions/${encodeURIComponent(input.sessionId)}/cmd?cmdId=${encodeURIComponent(cmdId)}&teamId=${encodeURIComponent(input.teamId)}`
  const response = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${input.token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ command: input.command, args: input.args, cwd: "/vercel/sandbox", env: input.env || {}, sudo: false, wait: true, logs: true, timeout: input.timeout }),
    signal: AbortSignal.timeout(input.timeout + 15_000),
  })
  const raw = await response.text()
  return { ok: response.ok, raw, ...parseNdjson(raw) }
}

export async function executeHeadlessBrowserAction(input: { action: HeadlessBrowserAction; cookies?: any[] }): Promise<HeadlessBrowserResult> {
  try {
    validateAction(input.action)
    const target = await assertPublicUrl(input.action.url)
    const { token, projectId, teamId } = getConfig()
    if (!token) return { ok: false, error: "Headless browser ainda não está configurado", code: "HEADLESS_NOT_CONFIGURED" }

    const name = `lumin-browser-${crypto.randomUUID().slice(0, 8)}`
    let created = false
    try {
      const allowedDomains = Array.from(new Set([
        target.hostname,
        `*.${target.hostname}`,
        "registry.npmjs.org",
        "*.npmjs.org",
        "storage.googleapis.com",
        "chrome-for-testing-public.storage.googleapis.com",
        "edgedl.me.gvt1.com",
      ]))

      const q = new URLSearchParams({ teamId })
      const create = await fetch(`https://api.vercel.com/v3/sandboxes?${q}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          projectId,
          runtime: "node24",
          timeout: "180000",
          persistent: false,
          networkPolicy: { mode: "custom", allowedDomains, allowedCIDRs: [], deniedCIDRs: [], injectionRules: [] },
          resources: { vcpus: "2", memory: "4096" },
          tags: { product: "lumin-ai", purpose: "browser-headless" },
        }),
        signal: AbortSignal.timeout(15_000),
      })
      const createdData = await create.json().catch(() => ({}))
      if (!create.ok) return { ok: false, error: `Não foi possível criar o browser sandbox (${create.status})` }
      created = true
      const sessionId = createdData?.sessionId || createdData?.id || createdData?.session?.id || createdData?.sandbox?.currentSessionId
      if (!sessionId) return { ok: false, error: "Browser sandbox sem sessão" }

      const install = await runCommand({
        sessionId,
        token,
        teamId,
        command: "sh",
        args: ["-lc", "npm init -y >/dev/null 2>&1 && npm install --no-save puppeteer@24.16.0 >/tmp/lumin-puppeteer-install.log 2>&1"],
        timeout: INSTALL_TIMEOUT_MS,
      })
      if (!install.ok || (install.exitCode !== null && install.exitCode !== 0)) {
        return { ok: false, error: "Não foi possível preparar Chromium na sandbox", code: "HEADLESS_INSTALL_FAILED" }
      }

      const script = `
const puppeteer = require('puppeteer');
(async()=>{
  const action = JSON.parse(process.env.LUMIN_ACTION || '{}');
  const savedCookies = JSON.parse(process.env.LUMIN_COOKIES || '[]');
  const browser = await puppeteer.launch({headless:true,args:['--no-sandbox','--disable-setuid-sandbox','--disable-dev-shm-usage']});
  try {
    const page = await browser.newPage();
    await page.setViewport({width:1280,height:900});
    if (Array.isArray(savedCookies) && savedCookies.length) {
      const safeCookies = savedCookies.filter(c=>c && c.name && c.value && (c.domain || c.url));
      if (safeCookies.length) await page.setCookie(...safeCookies).catch(()=>{});
    }
    await page.goto(action.url,{waitUntil:'domcontentloaded',timeout:30000});
    await new Promise(r=>setTimeout(r,1200));
    if (action.type === 'fill' || action.type === 'fill_and_click') {
      for (const [selector,value] of Object.entries(action.fields || {})) {
        await page.waitForSelector(selector,{timeout:8000});
        await page.focus(selector);
        await page.evaluate((s)=>{ const el=document.querySelector(s); if(el && 'value' in el) el.value=''; },selector);
        await page.type(selector,String(value),{delay:8});
      }
    }
    if (action.type === 'click' || action.type === 'fill_and_click') {
      await page.waitForSelector(action.selector,{timeout:8000});
      await Promise.allSettled([
        page.waitForNavigation({waitUntil:'domcontentloaded',timeout:12000}),
        page.click(action.selector)
      ]);
      await new Promise(r=>setTimeout(r,900));
    }
    const snapshot = await page.evaluate(()=>{
      const txt=(document.body?.innerText||'').replace(/\s+/g,' ').trim().slice(0,12000);
      const links=[...document.querySelectorAll('a[href]')].slice(0,40).map(a=>({text:(a.innerText||a.textContent||'').trim().slice(0,140),href:a.href}));
      const buttons=[...document.querySelectorAll('button,input[type=button],input[type=submit],[role=button]')].slice(0,30).map((el,i)=>({text:(el.innerText||el.value||el.getAttribute('aria-label')||'').trim().slice(0,120),selector:el.id?'#'+CSS.escape(el.id):el.name?'[name="'+CSS.escape(el.name)+'"]':el.tagName.toLowerCase()+':nth-of-type('+(i+1)+')'}));
      const inputs=[...document.querySelectorAll('input,textarea,select')].slice(0,40).map((el,i)=>({name:el.getAttribute('name')||'',type:el.getAttribute('type')||el.tagName.toLowerCase(),placeholder:el.getAttribute('placeholder')||'',selector:el.id?'#'+CSS.escape(el.id):el.getAttribute('name')?'[name="'+CSS.escape(el.getAttribute('name'))+'"]':el.tagName.toLowerCase()+':nth-of-type('+(i+1)+')'}));
      return {title:document.title,text:txt,links,buttons,inputs};
    });
    const cookies = await page.cookies();
    console.log('__LUMIN_BROWSER_RESULT__'+JSON.stringify({ok:true,finalUrl:page.url(),...snapshot,cookies}));
  } catch (e) {
    console.log('__LUMIN_BROWSER_RESULT__'+JSON.stringify({ok:false,error:String(e && e.message || e)}));
  } finally { await browser.close(); }
})();`

      const run = await runCommand({
        sessionId,
        token,
        teamId,
        command: "node",
        args: ["-e", script],
        timeout: RUN_TIMEOUT_MS,
        env: {
          LUMIN_ACTION: JSON.stringify(input.action),
          LUMIN_COOKIES: JSON.stringify(Array.isArray(input.cookies) ? input.cookies : []),
        },
      })
      if (!run.ok) return { ok: false, error: "Falha ao executar Chromium", code: "HEADLESS_RUN_FAILED" }
      const result = extractJson(run.stdout || run.raw)
      if (!result) return { ok: false, error: "Chromium não devolveu resultado legível", code: "HEADLESS_BAD_RESULT" }
      return result as HeadlessBrowserResult
    } finally {
      if (created) await stopSandbox(name, token, projectId, teamId)
    }
  } catch (error: any) {
    return { ok: false, error: String(error?.message || "Erro no browser headless") }
  }
}
