type ProjectFile = { path: string; content: string }

type PublishRequest = {
  name?: string
  files?: ProjectFile[]
  target?: "preview" | "production"
}

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
  if (files.some((file) => !file.path || file.path.includes(".."))) return "Existe um caminho de ficheiro inválido."
  if (files.length > 80) return "O projeto tem ficheiros a mais para publicação direta."
  return null
}

export async function GET() {
  return Response.json({
    vercelTokenConfigured: Boolean(process.env.VERCEL_TOKEN),
    vercelTeamIdConfigured: Boolean(process.env.VERCEL_TEAM_ID),
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
    const url = new URL("https://api.vercel.com/v13/deployments")
    if (teamId) url.searchParams.set("teamId", teamId)

    const deploymentResponse = await fetch(url, {
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

    const deploymentUrl = result?.url ? `https://${result.url}` : null
    return Response.json({
      ok: true,
      id: result?.id || null,
      url: deploymentUrl,
      state: result?.readyState || result?.state || "QUEUED",
      project: name,
      target: target || "preview",
    })
  } catch (error: any) {
    console.error("[lumin-studio] publish error:", error)
    return Response.json({ error: error?.message || "Erro inesperado ao publicar." }, { status: 500 })
  }
}
