import { NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"

export const runtime = "nodejs"
export const maxDuration = 60

const DEFAULT_PROJECT_ID = "prj_h0JhWRWBtf1DhpveHzsVDVdlQyV8"
const DEFAULT_TEAM_ID = "team_JnCeZC9Btsn8DLiOsbLMguxk"
const MAX_CODE_LENGTH = 12_000
const COMMAND_TIMEOUT_MS = 20_000

type Language = "node" | "python"

function getConfig() {
  return {
    token: process.env.VERCEL_TOKEN || "",
    projectId: process.env.LUMIN_VERCEL_PROJECT_ID || DEFAULT_PROJECT_ID,
    teamId: process.env.LUMIN_VERCEL_TEAM_ID || DEFAULT_TEAM_ID,
  }
}

function safeText(value: unknown, max = 24_000) {
  const text = typeof value === "string" ? value : JSON.stringify(value ?? "")
  return text.length > max ? `${text.slice(0, max)}\n…[truncado]` : text
}

function extractSessionId(data: any) {
  return data?.sessionId || data?.id || data?.sandboxId || data?.session?.id || ""
}

function extractCommandResult(data: any) {
  const stdout = data?.stdout ?? data?.result?.stdout ?? data?.output?.stdout ?? data?.logs?.stdout ?? ""
  const stderr = data?.stderr ?? data?.result?.stderr ?? data?.output?.stderr ?? data?.logs?.stderr ?? ""
  const exitCode = data?.exitCode ?? data?.result?.exitCode ?? data?.output?.exitCode ?? null
  return {
    stdout: safeText(stdout),
    stderr: safeText(stderr),
    exitCode,
  }
}

export async function POST(req: Request) {
  try {
    const auth = await getToken({ req: req as any, secret: process.env.NEXTAUTH_SECRET }).catch(() => null)
    if (!auth?.sub && process.env.NODE_ENV === "production") {
      return NextResponse.json({ error: "Autenticação necessária" }, { status: 401 })
    }

    const body = await req.json().catch(() => ({}))
    const language: Language = body?.language === "python" ? "python" : "node"
    const code = typeof body?.code === "string" ? body.code.trim() : ""

    if (!code) return NextResponse.json({ error: "Código em falta" }, { status: 400 })
    if (code.length > MAX_CODE_LENGTH) {
      return NextResponse.json({ error: `Código demasiado grande. Limite: ${MAX_CODE_LENGTH} caracteres.` }, { status: 413 })
    }

    const { token, projectId, teamId } = getConfig()
    if (!token) {
      return NextResponse.json(
        { error: "Lumin Sandbox ainda não está configurada", code: "SANDBOX_NOT_CONFIGURED" },
        { status: 503 },
      )
    }

    const params = new URLSearchParams({ teamId })
    const create = await fetch(`https://api.vercel.com/v3/sandboxes?${params.toString()}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        projectId,
        runtime: language === "python" ? "python3.13" : "node24",
        timeout: "60000",
        persistent: false,
        networkPolicy: {
          mode: "custom",
          allowedDomains: [],
          allowedCIDRs: [],
          deniedCIDRs: ["0.0.0.0/0", "::/0"],
          injectionRules: [],
        },
        resources: { vcpus: "2", memory: "2048" },
        tags: { product: "lumin-ai", purpose: "assistant-execution" },
      }),
      signal: AbortSignal.timeout(15_000),
    })

    const createData = await create.json().catch(() => ({}))
    if (!create.ok) {
      console.error("[Lumin Sandbox] create failed", create.status, createData)
      return NextResponse.json({ error: "Não foi possível criar a sandbox" }, { status: 502 })
    }

    const sessionId = extractSessionId(createData)
    if (!sessionId) {
      console.error("[Lumin Sandbox] missing session id", createData)
      return NextResponse.json({ error: "Sandbox criada sem identificador de sessão" }, { status: 502 })
    }

    const cmdId = crypto.randomUUID()
    const command = language === "python" ? "python3" : "node"
    const args = language === "python" ? ["-c", code] : ["-e", code]
    const commandUrl = `https://api.vercel.com/v2/sandboxes/sessions/${encodeURIComponent(sessionId)}/cmd?cmdId=${encodeURIComponent(cmdId)}&teamId=${encodeURIComponent(teamId)}`

    const run = await fetch(commandUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        command,
        args,
        cwd: "/home/vercel-sandbox",
        env: {},
        sudo: false,
        wait: true,
        logs: true,
        timeout: String(COMMAND_TIMEOUT_MS),
      }),
      signal: AbortSignal.timeout(30_000),
    })

    const runData = await run.json().catch(() => ({}))
    if (!run.ok) {
      console.error("[Lumin Sandbox] command failed", run.status, runData)
      return NextResponse.json({ error: "Falha ao executar na sandbox", sessionId }, { status: 502 })
    }

    const result = extractCommandResult(runData)
    return NextResponse.json({
      ok: true,
      language,
      sessionId,
      ...result,
    })
  } catch (error: any) {
    console.error("[Lumin Sandbox] error", error)
    return NextResponse.json({ error: "Erro na sandbox do Lumin" }, { status: 500 })
  }
}
