export const maxDuration = 120

type OneClickRequest = {
  prompt?: string
  currentHtml?: string
  projectName?: string
  language?: string
  target?: "preview" | "production"
}

function forwardHeaders(req: Request) {
  const headers: Record<string, string> = { "Content-Type": "application/json" }
  const cookie = req.headers.get("cookie")
  const authorization = req.headers.get("authorization")
  if (cookie) headers.cookie = cookie
  if (authorization) headers.authorization = authorization
  return headers
}

async function readJson(response: Response) {
  return response.json().catch(() => null)
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as OneClickRequest
    const prompt = body.prompt?.trim()

    if (!prompt) {
      return Response.json({ error: "Falta a descrição do projeto." }, { status: 400 })
    }

    const origin = new URL(req.url).origin
    const headers = forwardHeaders(req)

    const projectResponse = await fetch(`${origin}/api/webcraft-v2/project`, {
      method: "POST",
      headers,
      cache: "no-store",
      body: JSON.stringify({
        prompt,
        currentHtml: body.currentHtml || "",
        projectName: body.projectName || prompt,
        language: body.language || "Português de Portugal (PT-PT)",
      }),
    })

    const project = await readJson(projectResponse)
    if (!projectResponse.ok || !project?.files?.length) {
      return Response.json(
        {
          error: project?.error || "Não foi possível criar a versão full-stack.",
          stage: "project",
        },
        { status: projectResponse.status || 502 },
      )
    }

    const publishResponse = await fetch(`${origin}/api/webcraft-v2/publish`, {
      method: "POST",
      headers,
      cache: "no-store",
      body: JSON.stringify({
        name: project.name,
        files: project.files,
        target: body.target === "preview" ? "preview" : "production",
      }),
    })

    const publication = await readJson(publishResponse)
    if (!publishResponse.ok) {
      return Response.json(
        {
          error: publication?.error || "O projeto foi criado, mas a publicação falhou.",
          code: publication?.code || "PUBLISH_FAILED",
          setup: publication?.setup,
          stage: "publish",
          project: {
            name: project.name,
            framework: project.framework,
            files: project.files,
          },
        },
        { status: publishResponse.status || 502 },
      )
    }

    return Response.json({
      ok: true,
      stage: "ready",
      project: {
        name: project.name,
        framework: project.framework,
        fileCount: project.files.length,
      },
      deployment: publication,
      url: publication?.url || null,
      state: publication?.state || "QUEUED",
    })
  } catch (error: any) {
    console.error("[lumin-studio] one-click error:", error)
    return Response.json(
      { error: error?.message || "Erro inesperado no fluxo criar e publicar.", stage: "unexpected" },
      { status: 500 },
    )
  }
}
