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

function parseNdjson(raw: string) {
  return raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line)
      } catch {
        return { type: "raw", data: line }
      }
    })
}

function extractCommandResult(raw: string) {
  const events = parseNdjson(raw)
  const stdout: string[] = []
  const stderr: string[] = []
  let exitCode: number | null = null

  for (const event of events) {
    const command = event?.command || event?.result?.command || event?.data?.command
    const eventExit = command?.exitCode ?? event?.exitCode ?? event?.result?.exitCode
    if (eventExit !== undefined && eventExit !== null && Number.isFinite(Number(eventExit))) {
      exitCode = Number(eventExit)
    }

    const stream = String(event?.stream || event?.type || event?.channel || "").toLowerCase()
    const payload =
      event?.stdout ??
      event?.stderr ??
      event?.text ??
      event?.message ??
      event?.data?.text ??
      event?.data?.message ??
      (typeof event?.data === "string" ? event.data : "")

    if (payload !== undefined && payload !== null && String(payload).trim()) {
      if (stream.includes("stderr") || event?.stderr !== undefined) stderr.push(String(payload))
      else if (stream.includes("stdout") || event?.stdout !== undefined || stream.includes("log")) stdout.push(String(payload))
    }
  }

  if (!stdout.length && !stderr.length && raw.trim()) stdout.push(raw.trim())

  return {
    stdout: safeText(stdout.join("\n")),
    stderr: safeText(stderr.join("\n")),
    exitCode,
  }
}

async function cleanupSandbox(input: {
  name: string
  token: string
  projectId: string
  teamId: string
}) {
  try {
    const params = new URLSearchParams({ projectId: input.projectId, teamId: input.teamId })
    await fetch(`https://api.vercel.com/v2/sandboxes/${encodeURIComponent(input.name)}?${params.toString()}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${input.token}`,
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(10_000),
    })
  } catch (error) {
    console.warn("[Lumin Sandbox] cleanup skipped:", error)
  }
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

  const sandboxName = `lumin-${crypto.randomUUID().slice(0, 8)}`
  let created = false

  try {
    const params = new URLSearchParams({ teamId })
    const create = await fetch(`https://api.vercel.com/v3/sandboxes?${params.toString()}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: sandboxName,
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
        resources: { vcpus: "2", memory: "4096" },
        tags: { product: "lumin-ai", purpose: "assistant-execution" },
      }),
      signal: AbortSignal.timeout(15_000),
    })

    const createData = await create.json().catch(() => ({}))
    if (!create.ok) {
      console.error("[Lumin Sandbox] create failed", create.status, createData)
      return { ok: false, language, error: "Não foi possível criar a sandbox" }
    }
    created = true

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
        timeout: COMMAND_TIMEOUT_MS,
      }),
      signal: AbortSignal.timeout(30_000),
    })

    const runRaw = await run.text()
    if (!run.ok) {
      console.error("[Lumin Sandbox] command failed", run.status, runRaw)
      return { ok: false, language, sessionId, error: "Falha ao executar na sandbox" }
    }

    const result = extractCommandResult(runRaw)
    return { ok: true, language, sessionId, ...result }
  } catch (error: any) {
    console.error("[Lumin Sandbox] error", error)
    return { ok: false, language, error: "Erro na sandbox do Lumin" }
  } finally {
    if (created) {
      await cleanupSandbox({ name: sandboxName, token, projectId, teamId })
    }
  }
}
