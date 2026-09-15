type ProjectFile = { path: string; content: string }

type PublishRequest = {
  name?: string
  files?: ProjectFile[]
  target?: "preview" | "production"
}

const MAX_FILES = 80
const MAX_TOTAL_BYTES = 2_500_000
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

function validateFiles(files: ProjectFile[]) {
  if (!Array.isArray(files) || files.length === 0) return "Projeto vazio."
  if (!files.some((file) => file.path === "package.json")) return "Falta package.json."
  if (!files.some((file) => file.path === "app/page.tsx")) return "Falta app/page.tsx."
  if (files.some((file) => !file.path || file.path.includes("..") || file.path.startsWith("/"))) {
    return "Existe um caminho de ficheiro inválido."
  }
  if (files.length > MAX_FILES) return "O projeto tem ficheiros a mais para publicação direta."
  if (files.some((file) => typeof file.content !== "string")) return "Existe conteúdo de ficheiro inválido."

  const totalBytes = files.reduce((sum, file) => sum + Buffer.byteLength(file.content, "utf8"), 0)
  if (totalBytes > MAX_TOTAL_BYTES) return "O projeto excede o tamanho permitido para publicação direta."
  return null
}

function vercelApiUrl(path: string, teamId?: string | null) {
  const url = new URL(`https://api.vercel.com${path}`)
  if (teamId) url.searchParams.set("teamId", teamId)
  return url
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
    const files = body.files || []
    const validationError = validateFiles(files)
    if (validationError) return Response.json({ error: validationError }, { status: 400 })

    const name = slugify(body.name || "lumin-ai-studio-app")
    const target = body.target === "preview" ? undefined : "production"

    const deploymentResponse = await fetch(vercelApiUrl("/v13/deployments", teamId), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name,
        project: name,
        files: files.map((file) => ({ file: file.path, data: file.content })),
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
