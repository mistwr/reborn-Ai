const DEFAULT_PROJECT_ID = "prj_h0JhWRWBtf1DhpveHzsVDVdlQyV8"
const DEFAULT_TEAM_ID = "team_JnCeZC9Btsn8DLiOsbLMguxk"
const MAX_CODE_LENGTH = 12_000
const COMMAND_TIMEOUT_MS = 20_000

export type LuminSandboxLanguage = "node" | "python"

export type LuminSandboxResult = {
  ok: boolean
  language: LuminSandboxLanguage
  sessionId?: string
  stdout?: string
  stderr?: string
  exitCode?: number | null
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

function safeText(value: unknown, max = 24_000) {
  const text = typeof value === "string" ? value : JSON.stringify(value ?? "")
  return text.length > max ? `${text.slice(0, max)}\n…[truncado]` : text
}

function extractSessionId(data: any) {
  return (
    data?.sessionId ||
    data?.id ||
    data?.sandboxId ||
    data?.session?.id ||
    data?.sandbox?.currentSessionId ||
    ""
  )
}

function extractCommandResult(data: any) {
  const stdout = data?.stdout ?? data?.result?.stdout ?? data?.output?.stdout ?? data?.logs?.stdout ?? ""
  const stderr = data?.stderr ?? data?.result?.stderr ?? data?.output?.stderr ?? data?.logs?.stderr ?? ""
  const exitCode = data?.exitCode ?? data?.result?.exitCode ?? data?.output?.exitCode ?? null
  return { stdout: safeText(stdout), stderr: safeText(stderr), exitCode }
}

export async function executeLuminSandbox(input: {
  language: LuminSandboxLanguage
  code: string
}): Promise<LuminSandboxResult> {
  const language = input.language === "python" ? "python" : "node"
  const code = input.code.trim()

  if (!code) return { ok: false, language, error: "Código em falta" }
  if (code.length > MAX_CODE_LENGTH) {
    return { ok: false, language, error: `Código demasiado grande. Limite: ${MAX_CODE_LENGTH} caracteres.` }
  }

  const { token, projectId, teamId } = getConfig()
  if (!token) {
    return { ok: false, language, error: "Lumin Sandbox ainda não está configurada", code: "SANDBOX_NOT_CONFIGURED" }
  }

  try {
    const params = new URLSearchParams({ teamId })
    const create = await fetch(`https://api.vercel.com/v3/sandboxes?${params.toString()}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: `lumin-${crypto.randomUUID().slice(0, 8)}`,
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
      return { ok: false, language, error: "Não foi possível criar a sandbox" }
    }

    const sessionId = extractSessionId(createData)
    if (!sessionId) {
      console.error("[Lumin Sandbox] missing session id", createData)
      return { ok: false, language, error: "Sandbox criada sem identificador de sessão" }
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
        cwd: "/vercel/sandbox",
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
      return { ok: false, language, sessionId, error: "Falha ao executar na sandbox" }
    }

    const result = extractCommandResult(runData)
    return { ok: true, language, sessionId, ...result }
  } catch (error: any) {
    console.error("[Lumin Sandbox] error", error)
    return { ok: false, language, error: "Erro na sandbox do Lumin" }
  }
}
