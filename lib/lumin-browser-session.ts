type BrowserSessionStatus = "active" | "waiting_approval" | "completed" | "cancelled" | "error"

type BrowserSessionRow = {
  id: string
  user_id: string
  organization_id?: string | null
  status: BrowserSessionStatus
  current_url?: string | null
  task: string
  history: unknown[]
  cookies: unknown[]
  storage_state: Record<string, unknown>
  pending_action?: Record<string, unknown> | null
  last_result: Record<string, unknown>
  expires_at: string
  created_at: string
  updated_at: string
}

const SUPABASE_URL = process.env.REBORN_SUPABASE_URL || process.env.NEXT_PUBLIC_LUMIN_SUPABASE_URL || "https://yqninaripblwhcfcwwnr.supabase.co"
const SERVICE_ROLE_KEY = process.env.REBORN_SUPABASE_SERVICE_ROLE_KEY || ""
const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_LUMIN_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_zlhSNpfeS3gjBDPsxOPiCQ_DYkKwgb_"

type BrowserDbAuth = { accessToken?: string | null }

function resolveAuth(auth?: BrowserDbAuth) {
  if (SERVICE_ROLE_KEY) return { apikey: SERVICE_ROLE_KEY, bearer: SERVICE_ROLE_KEY }
  if (auth?.accessToken) return { apikey: PUBLISHABLE_KEY, bearer: auth.accessToken }
  return null
}

async function db(path: string, init: RequestInit = {}, auth?: BrowserDbAuth) {
  const credentials = resolveAuth(auth)
  if (!credentials) throw new Error("browser_session_store_not_configured")

  const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: credentials.apikey,
      Authorization: `Bearer ${credentials.bearer}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
      ...(init.headers || {}),
    },
    cache: "no-store",
  })

  const text = await response.text()
  const data = text ? JSON.parse(text) : null
  if (!response.ok) {
    console.error("[Lumin Browser Session] database error", response.status, data)
    throw new Error("browser_session_store_failed")
  }
  return data
}

export async function createBrowserSession(input: {
  userId: string
  organizationId?: string | null
  task: string
  currentUrl?: string | null
  accessToken?: string | null
}) {
  const payload = {
    user_id: input.userId,
    organization_id: input.organizationId || null,
    status: "active",
    task: input.task.slice(0, 4000),
    current_url: input.currentUrl || null,
    history: [],
    cookies: [],
    storage_state: {},
    pending_action: null,
    last_result: {},
  }
  const rows = await db("lumin_browser_sessions", { method: "POST", body: JSON.stringify(payload) }, { accessToken: input.accessToken })
  return Array.isArray(rows) ? (rows[0] as BrowserSessionRow) : (rows as BrowserSessionRow)
}

export async function getBrowserSession(id: string, userId: string, accessToken?: string | null) {
  const rows = await db(
    `lumin_browser_sessions?id=eq.${encodeURIComponent(id)}&user_id=eq.${encodeURIComponent(userId)}&limit=1`,
    { method: "GET" },
    { accessToken },
  )
  return Array.isArray(rows) && rows.length ? (rows[0] as BrowserSessionRow) : null
}

export async function getActiveBrowserSession(userId: string, accessToken?: string | null) {
  const rows = await db(
    `lumin_browser_sessions?user_id=eq.${encodeURIComponent(userId)}&status=in.(active,waiting_approval)&order=updated_at.desc&limit=1`,
    { method: "GET" },
    { accessToken },
  )
  return Array.isArray(rows) && rows.length ? (rows[0] as BrowserSessionRow) : null
}

export async function updateBrowserSession(
  id: string,
  userId: string,
  patch: Partial<Pick<BrowserSessionRow, "status" | "current_url" | "history" | "cookies" | "storage_state" | "pending_action" | "last_result">>,
  accessToken?: string | null,
) {
  const rows = await db(
    `lumin_browser_sessions?id=eq.${encodeURIComponent(id)}&user_id=eq.${encodeURIComponent(userId)}`,
    {
      method: "PATCH",
      body: JSON.stringify({ ...patch, updated_at: new Date().toISOString() }),
    },
    { accessToken },
  )
  return Array.isArray(rows) && rows.length ? (rows[0] as BrowserSessionRow) : null
}

export async function appendBrowserHistory(
  session: BrowserSessionRow,
  userId: string,
  event: Record<string, unknown>,
  accessToken?: string | null,
) {
  const history = Array.isArray(session.history) ? session.history.slice(-39) : []
  history.push({ ...event, at: new Date().toISOString() })
  return updateBrowserSession(session.id, userId, { history }, accessToken)
}

export async function setPendingBrowserAction(input: {
  session: BrowserSessionRow
  userId: string
  action: Record<string, unknown>
  accessToken?: string | null
}) {
  return updateBrowserSession(
    input.session.id,
    input.userId,
    {
      status: "waiting_approval",
      pending_action: { ...input.action, requestedAt: new Date().toISOString() },
    },
    input.accessToken,
  )
}

export async function clearPendingBrowserAction(session: BrowserSessionRow, userId: string, accessToken?: string | null) {
  return updateBrowserSession(
    session.id,
    userId,
    {
      status: "active",
      pending_action: null,
    },
    accessToken,
  )
}

export async function closeBrowserSession(
  session: BrowserSessionRow,
  userId: string,
  status: "completed" | "cancelled" | "error",
  accessToken?: string | null,
) {
  return updateBrowserSession(
    session.id,
    userId,
    {
      status,
      pending_action: null,
    },
    accessToken,
  )
}

export type { BrowserSessionRow, BrowserSessionStatus }
