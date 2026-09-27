import { NextRequest, NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type Scope = {
  type: "user" | "organization"
  id: string
  createdBy: string
}

function config() {
  const url = process.env.REBORN_SUPABASE_URL?.replace(/\/$/, "")
  const serviceRoleKey = process.env.REBORN_SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceRoleKey) {
    throw new Error("Lumin voice cloud storage is not configured")
  }
  return { url, serviceRoleKey }
}

async function db(path: string, init?: RequestInit) {
  const { url, serviceRoleKey } = config()
  const response = await fetch(`${url}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
    cache: "no-store",
  })

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`Voice storage error (${response.status}): ${body}`)
  }

  if (response.status === 204) return null
  return response.json()
}

async function resolveScope(req: NextRequest): Promise<Scope | null> {
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  })

  const userId = String(token?.sub || "").trim()
  if (!userId) return null

  const organizationId = String((token as any)?.organizationId || "").trim()
  if (organizationId) {
    return {
      type: "organization",
      id: organizationId,
      createdBy: userId,
    }
  }

  return {
    type: "user",
    id: userId,
    createdBy: userId,
  }
}

function safeArray(value: unknown, maxItems: number) {
  if (!Array.isArray(value)) return []
  return value.slice(0, maxItems)
}

function validatePayloadSize(value: unknown, maxBytes = 900_000) {
  const bytes = Buffer.byteLength(JSON.stringify(value || null), "utf8")
  if (bytes > maxBytes) throw new Error("Voice workspace payload is too large")
}

export async function GET(req: NextRequest) {
  try {
    const scope = await resolveScope(req)
    if (!scope) {
      return NextResponse.json({ authenticated: false }, { status: 401 })
    }

    const rows = await db(
      `lumin_voice_workspaces?scope_type=eq.${encodeURIComponent(scope.type)}&scope_id=eq.${encodeURIComponent(scope.id)}&select=agents,history,updated_at&limit=1`,
    )

    const row = Array.isArray(rows) ? rows[0] : null

    return NextResponse.json({
      authenticated: true,
      scope: scope.type,
      exists: Boolean(row),
      agents: safeArray(row?.agents, 100),
      history: safeArray(row?.history, 100),
      updatedAt: row?.updated_at || null,
    })
  } catch (error: any) {
    console.error("[Lumin Voice] workspace read failed", error)
    return NextResponse.json(
      { error: error?.message || "Could not load voice workspace" },
      { status: 500 },
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const scope = await resolveScope(req)
    if (!scope) {
      return NextResponse.json({ authenticated: false }, { status: 401 })
    }

    const body = await req.json().catch(() => ({}))
    const agents = safeArray(body?.agents, 100)
    const history = safeArray(body?.history, 100)

    validatePayloadSize({ agents, history })

    const rows = await db(
      "lumin_voice_workspaces?on_conflict=scope_type,scope_id",
      {
        method: "POST",
        headers: {
          Prefer: "resolution=merge-duplicates,return=representation",
        },
        body: JSON.stringify({
          scope_type: scope.type,
          scope_id: scope.id,
          agents,
          history,
          created_by: scope.createdBy,
          updated_at: new Date().toISOString(),
        }),
      },
    )

    const row = Array.isArray(rows) ? rows[0] : null

    return NextResponse.json({
      ok: true,
      scope: scope.type,
      updatedAt: row?.updated_at || new Date().toISOString(),
    })
  } catch (error: any) {
    console.error("[Lumin Voice] workspace write failed", error)
    const message = error?.message || "Could not save voice workspace"
    const status = message.includes("too large") ? 413 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
