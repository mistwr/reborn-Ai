type ProjectFile = { path: string; content: string; encoding?: "base64" }

type UploadedImage = {
  name?: string
  dataUrl?: string
}

type PublishRequest = {
  name?: string
  files?: ProjectFile[]
  uploadedImages?: UploadedImage[]
  target?: "preview" | "production"
}

const MAX_FILES = 80
const MAX_TOTAL_BYTES = 4_000_000
const READY_POLL_MS = 1500
const READY_TIMEOUT_MS = 45_000

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80) || "lumin-ai-studio-app"
}

function normalizeUploadedAssets(input: unknown): ProjectFile[] {
  if (!Array.isArray(input)) return []

  const assets: ProjectFile[] = []
  for (const value of input.slice(0, 5)) {
    const dataUrl = value && typeof value === "object" && typeof (value as any).dataUrl === "string"
      ? (value as any).dataUrl.trim()
      : ""
    const match = dataUrl.match(/^data:image\/(jpeg|jpg|png|webp);base64,([a-z0-9+/=\s]+)$/i)
    if (!match) continue

    const rawType = match[1].toLowerCase()
    const extension = rawType === "jpeg" ? "jpg" : rawType
    assets.push({
      path: `public/lumin-assets/asset-${assets.length + 1}.${extension}`,
      content: match[2].replace(/\s+/g, ""),
      encoding: "base64",
    })
  }
  return assets
}

function ensureUploadedAssets(files: ProjectFile[], uploadedImages: unknown) {
  const assets = normalizeUploadedAssets(uploadedImages)
  if (!assets.length) return files

  const byPath = new Map(files.map((file) => [file.path, file]))
  for (const asset of assets) {
    if (!byPath.has(asset.path)) byPath.set(asset.path, asset)
  }
  return Array.from(byPath.values())
}

function ensureTailwindSupport(files: ProjectFile[]) {
  const byPath = new Map(files.map((file) => [file.path, { ...file }]))

  const packageFile = byPath.get("package.json")
  if (packageFile && packageFile.encoding !== "base64") {
    try {
      const pkg = JSON.parse(packageFile.content)
      pkg.devDependencies = {
        ...(pkg.devDependencies || {}),
        "@tailwindcss/postcss": pkg.devDependencies?.["@tailwindcss/postcss"] || "^4.0.0",
        tailwindcss: pkg.devDependencies?.tailwindcss || "^4.0.0",
      }
      packageFile.content = JSON.stringify(pkg, null, 2) + "\n"
      byPath.set("package.json", packageFile)
    } catch {
      // Keep the original package.json if it is not valid JSON.
    }
  }

  if (!byPath.has("postcss.config.mjs")) {
    byPath.set("postcss.config.mjs", {
      path: "postcss.config.mjs",
      content: 'export default {\n  plugins: {\n    "@tailwindcss/postcss": {},\n  },\n}\n',
    })
  }

  const globals = byPath.get("app/globals.css")
  if (globals && globals.encoding !== "base64" && !globals.content.includes('@import "tailwindcss"')) {
    globals.content = '@import "tailwindcss";\n\n' + globals.content
    byPath.set("app/globals.css", globals)
  }

  return Array.from(byPath.values())
}

function makeSupabaseProxySafe(file: ProjectFile): ProjectFile {
  if (file.path !== "proxy.ts") return file
  if (!file.content.includes("createServerClient") || !file.content.includes("NEXT_PUBLIC_SUPABASE_URL")) return file
  if (file.content.includes("Public sites must keep working even when Supabase is not configured.")) return file

  let content = file.content

  const signature = "export async function proxy(request: NextRequest) {"
  if (!content.includes(signature)) return file

  content = content.replace(
    signature,
    `${signature}
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

  // Public sites must keep working even when Supabase is not configured.
  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.next({ request })
  }`,
  )

  content = content
    .replace(/process\.env\.NEXT_PUBLIC_SUPABASE_URL!/g, "supabaseUrl")
    .replace(/process\.env\.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!/g, "supabaseKey")

  return { ...file, content }
}

function prepareFilesForDeployment(files: ProjectFile[], uploadedImages?: UploadedImage[]) {
  const safe = files.map(makeSupabaseProxySafe)
  const withAssets = ensureUploadedAssets(safe, uploadedImages)
  return ensureTailwindSupport(withAssets)
}

function validateFiles(files: ProjectFile[]) {
  if (!Array.isArray(files) || files.length === 0) return "Projeto vazio."
  if (!files.some((file) => file.path === "package.json")) return "Falta package.json."
  if (!files.some((file) => file.path === "app/page.tsx")) return "Falta app/page.tsx."
  if (files.some((file) => !file.path || file.path.includes("..") || file.path.startsWith("/"))) {
    return "Existe um caminho de ficheiro inválido."
  }
  if (files.length > MAX_FILES) return "O projeto tem ficheiros a mais para publicação direta."
  if (files.some((file) => typeof file.content !== "string")) return "Existe conteúdo de ficheiro inválido."
  if (files.some((file) => file.encoding && file.encoding !== "base64")) return "Existe um encoding de ficheiro inválido."

  const totalBytes = files.reduce((sum, file) => {
    if (file.encoding === "base64") {
      const normalized = file.content.replace(/\s+/g, "")
      return sum + Math.ceil((normalized.length * 3) / 4)
    }
    return sum + Buffer.byteLength(file.content, "utf8")
  }, 0)

  if (totalBytes > MAX_TOTAL_BYTES) {
    return `O projeto excede o tamanho permitido para publicação direta (${(totalBytes / 1024 / 1024).toFixed(1)} MB).`
  }
  return null
}

function vercelApiUrl(path: string, teamId?: string | null) {
  const url = new URL(`https://api.vercel.com${path}`)
  if (teamId) url.searchParams.set("teamId", teamId)
  return url
}

async function getProject(token: string, teamId: string | undefined, name: string) {
  const response = await fetch(vercelApiUrl(`/v9/projects/${encodeURIComponent(name)}`, teamId), {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  })

  if (response.status === 404) return null
  const data = await response.json().catch(() => null)

  if (!response.ok) {
    throw new Error(data?.error?.message || data?.message || "Não foi possível verificar o projeto na Vercel.")
  }

  return data
}

async function ensureProject(token: string, teamId: string | undefined, name: string) {
  const existing = await getProject(token, teamId, name)
  if (existing?.id) return existing

  const response = await fetch(vercelApiUrl("/v11/projects", teamId), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name,
      framework: "nextjs",
      buildCommand: "npm run build",
      installCommand: "npm install",
      skipGitConnectDuringLink: true,
    }),
  })

  const data = await response.json().catch(() => null)
  if (!response.ok) {
    // Another request may have created the project between GET and POST.
    if (response.status === 409) {
      const raced = await getProject(token, teamId, name)
      if (raced?.id) return raced
    }
    throw new Error(data?.error?.message || data?.message || "Não foi possível criar o projeto na Vercel.")
  }

  return data
}

async function readDeployment(token: string, teamId: string | undefined, deploymentId: string) {
  const response = await fetch(vercelApiUrl(`/v13/deployments/${deploymentId}`, teamId), {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  })
  if (!response.ok) return null
  return response.json().catch(() => null)
}

async function waitForDeployment(token: string, teamId: string | undefined, deploymentId: string) {
  const startedAt = Date.now()
  let lastState = "QUEUED"
  let lastUrl: string | null = null

  while (Date.now() - startedAt < READY_TIMEOUT_MS) {
    const deployment = await readDeployment(token, teamId, deploymentId)
    if (deployment) {
      lastState = deployment.readyState || deployment.state || lastState
      lastUrl = deployment.url ? `https://${deployment.url}` : lastUrl

      if (lastState === "READY") {
        return { state: lastState, url: lastUrl, ready: true, timedOut: false }
      }
      if (["ERROR", "CANCELED"].includes(lastState)) {
        return { state: lastState, url: lastUrl, ready: false, timedOut: false }
      }
    }

    await new Promise((resolve) => setTimeout(resolve, READY_POLL_MS))
  }

  return { state: lastState, url: lastUrl, ready: false, timedOut: true }
}

// Safe diagnostics: returns booleans only, never secret values.
export async function GET() {
  return Response.json({
    vercelTokenConfigured: Boolean(process.env.VERCEL_TOKEN),
    vercelTeamIdConfigured: Boolean(process.env.VERCEL_TEAM_ID),
    publishWaitTimeoutMs: READY_TIMEOUT_MS,
  })
}

export async function POST(req: Request) {
  try {
    const token = process.env.VERCEL_TOKEN
    const teamId = process.env.VERCEL_TEAM_ID

    if (!token) {
      return Response.json(
        {
          error: "Publicação automática ainda não está ligada neste ambiente.",
          code: "VERCEL_NOT_CONFIGURED",
          setup: "Define VERCEL_TOKEN no ambiente do Lumin AI Studio. VERCEL_TEAM_ID é opcional.",
        },
        { status: 503 },
      )
    }

    const body = (await req.json()) as PublishRequest
    const files = prepareFilesForDeployment(body.files || [], body.uploadedImages)
    const validationError = validateFiles(files)
    if (validationError) return Response.json({ error: validationError }, { status: 400 })

    const name = slugify(body.name || "lumin-ai-studio-app")
    const target = body.target === "preview" ? undefined : "production"
    const project = await ensureProject(token, teamId, name)

    const deploymentResponse = await fetch(vercelApiUrl("/v13/deployments", teamId), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name,
        project: project?.id || name,
        files: files.map((file) => ({
          file: file.path,
          data: file.content,
          ...(file.encoding ? { encoding: file.encoding } : {}),
        })),
        projectSettings: {
          framework: "nextjs",
          buildCommand: "npm run build",
          installCommand: "npm install",
        },
        ...(target ? { target } : {}),
        meta: {
          generatedBy: "Lumin AI Studio",
          source: "webcraft-v2",
        },
      }),
    })

    const result = await deploymentResponse.json().catch(() => null)
    if (!deploymentResponse.ok) {
      console.error("[lumin-studio] Vercel publish failed", result)
      return Response.json(
        {
          error: result?.error?.message || result?.message || "A Vercel recusou a publicação.",
          code: result?.error?.code || "VERCEL_DEPLOYMENT_FAILED",
        },
        { status: deploymentResponse.status },
      )
    }

    const deploymentId = result?.id as string | undefined
    const initialUrl = result?.url ? `https://${result.url}` : null

    if (!deploymentId) {
      return Response.json({
        ok: true,
        ready: false,
        id: null,
        url: initialUrl,
        state: result?.readyState || result?.state || "QUEUED",
        project: name,
        target: target || "preview",
      })
    }

    const final = await waitForDeployment(token, teamId, deploymentId)
    const deploymentUrl = final.url || initialUrl

    if (["ERROR", "CANCELED"].includes(final.state)) {
      return Response.json(
        {
          error: "A publicação foi criada, mas o build do projeto falhou na Vercel.",
          code: "VERCEL_BUILD_FAILED",
          id: deploymentId,
          url: deploymentUrl,
          state: final.state,
          project: name,
        },
        { status: 502 },
      )
    }

    return Response.json({
      ok: true,
      ready: final.ready,
      timedOut: final.timedOut,
      id: deploymentId,
      url: deploymentUrl,
      state: final.state,
      project: name,
      target: target || "preview",
      message: final.ready
        ? "Projeto publicado e pronto a abrir."
        : "Publicação criada. A Vercel ainda está a concluir o build.",
    })
  } catch (error: any) {
    console.error("[lumin-studio] publish error:", error)
    return Response.json({ error: error?.message || "Erro inesperado ao publicar." }, { status: 500 })
  }
}
