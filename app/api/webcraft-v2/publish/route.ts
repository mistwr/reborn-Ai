import { randomUUID } from "node:crypto"
import { getToken } from "next-auth/jwt"
import JSZip from "jszip"

export const runtime = "nodejs"
export const maxDuration = 60

type ProjectFile = { path: string; content: string; encoding?: "base64" }
type PublishRequest = { name?: string; mode?: "website" | "app"; previewHtml?: string; files?: ProjectFile[]; target?: "preview" | "production" }
const MANUAL_DEPLOY_URL = "https://app.netlify.com/drop"

export async function GET() {
  return Response.json({
    provider: "netlify",
    configured: Boolean(process.env.NETLIFY_AUTH_TOKEN?.trim()),
    manualDeployUrl: MANUAL_DEPLOY_URL,
    supports: { static: true, sourceBuildRequiresGit: true },
  }, { headers: { "Cache-Control": "no-store" } })
}

export async function POST(req: Request) {
  try {
    const body = await req.json() as PublishRequest
    const files: ProjectFile[] = body.mode === "website" && typeof body.previewHtml === "string"
      ? [{ path: "index.html", content: body.previewHtml }]
      : Array.isArray(body.files) ? body.files : []
    if (!files.length || files.length > 80 || files.some(file => !file || typeof file.path !== "string" || !file.path || file.path.startsWith("/") || file.path.includes("..") || file.path.includes("\\") || typeof file.content !== "string" || (file.encoding && file.encoding !== "base64"))) {
      return Response.json({ error: "O projeto não contém ficheiros válidos." }, { status: 400 })
    }
    if (files.reduce((size, file) => size + Buffer.byteLength(file.content, file.encoding === "base64" ? "base64" : "utf8"), 0) > 8_000_000) {
      return Response.json({ error: "O projeto excede o limite de 8 MB." }, { status: 413 })
    }
    if (!files.some(file => file.path === "index.html")) {
      return Response.json({
        error: "Esta aplicação precisa de uma build. O ZIP com o código deve ser ligado a um repositório na Netlify.",
        code: "NETLIFY_BUILD_REQUIRED",
        manualDeployUrl: "https://app.netlify.com/start",
      }, { status: 409 })
    }
    const token = process.env.NETLIFY_AUTH_TOKEN?.trim()
    if (!token) {
      return Response.json({
        error: "A publicação automática na Netlify ainda não está ligada. Podes publicar o ZIP do website.",
        code: "NETLIFY_NOT_CONFIGURED",
        manualDeployUrl: MANUAL_DEPLOY_URL,
      }, { status: 503 })
    }
    const session = await getToken({ req: req as any, secret: process.env.NEXTAUTH_SECRET, secureCookie: new URL(req.url).protocol === "https:" }).catch(() => null)
    if (!session?.sub) return Response.json({ error: "Inicia sessão para publicar.", code: "AUTH_REQUIRED" }, { status: 401 })

    const zip = new JSZip()
    for (const file of files) zip.file(file.path, file.content, { base64: file.encoding === "base64" })
    const archive = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" })
    const prefix = String(body.name || "lumin-webcraft").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 45) || "lumin-webcraft"
    const name = prefix + "-" + randomUUID().slice(0, 8)
    const siteResponse = await fetch("https://api.netlify.com/api/v1/sites", {
      method: "POST", headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
      body: JSON.stringify({ name }), signal: AbortSignal.timeout(12_000),
    })
    const site = await siteResponse.json().catch(() => null)
    if (!siteResponse.ok || !site?.id) throw new Error("A Netlify não conseguiu criar o projeto. Verifica a credencial de publicação.")
    // Always create a new site: generated projects cannot overwrite the Lumin app.
    const deployResponse = await fetch("https://api.netlify.com/api/v1/sites/" + encodeURIComponent(site.id) + "/deploys" + (body.target === "preview" ? "?draft=true" : ""), {
      method: "POST", headers: { Authorization: "Bearer " + token, "Content-Type": "application/zip" },
      body: new Uint8Array(archive), signal: AbortSignal.timeout(25_000),
    })
    let deploy = await deployResponse.json().catch(() => null)
    if (!deployResponse.ok || !deploy?.id) throw new Error("O projeto foi criado, mas a Netlify não aceitou os ficheiros. Não houve nova tentativa automática.")
    const started = Date.now()
    while (!["ready", "error"].includes(deploy.state) && Date.now() - started < 10_000) {
      await new Promise(resolve => setTimeout(resolve, 1000))
      const status = await fetch("https://api.netlify.com/api/v1/deploys/" + encodeURIComponent(deploy.id), { headers: { Authorization: "Bearer " + token }, signal: AbortSignal.timeout(3000) })
      if (!status.ok) break
      deploy = await status.json()
    }
    if (deploy.state === "error") return Response.json({ error: "A Netlify não concluiu a publicação.", code: "NETLIFY_DEPLOY_FAILED", id: deploy.id }, { status: 502 })
    const ready = deploy.state === "ready"
    const url = body.target === "preview" ? deploy.deploy_ssl_url : deploy.ssl_url || site.ssl_url
    return Response.json({ ok: true, ready, provider: "netlify", id: deploy.id, siteId: site.id, url: ready ? url : null, state: String(deploy.state).toUpperCase(), project: name, message: ready ? "Website publicado na Netlify." : "Publicação recebida pela Netlify; aguarda a conclusão no painel." })
  } catch (error: any) {
    return Response.json({ error: error?.message || "Não foi possível publicar na Netlify." }, { status: 502 })
  }
}
