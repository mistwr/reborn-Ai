import { NextRequest, NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"
import { randomUUID } from "crypto"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const BUCKET = "lumin-agent-assets"
const MAX_IMAGE_BYTES = 4 * 1024 * 1024
const MAX_AUDIO_BYTES = 8 * 1024 * 1024

type Scope = {
  type: "user" | "organization"
  id: string
}

function config() {
  const url = process.env.REBORN_SUPABASE_URL?.replace(/\/$/, "")
  const serviceRoleKey = process.env.REBORN_SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceRoleKey) throw new Error("Lumin agent asset storage is not configured")
  return { url, serviceRoleKey }
}

async function resolveScope(req: NextRequest): Promise<Scope | null> {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET }).catch(() => null)
  const userId = String(token?.sub || "").trim()
  if (!userId) return null
  const organizationId = String((token as any)?.organizationId || "").trim()
  return organizationId
    ? { type: "organization", id: organizationId }
    : { type: "user", id: userId }
}

function safeExt(file: File) {
  const byType: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "audio/webm": "webm",
    "video/webm": "webm",
    "audio/wav": "wav",
    "audio/x-wav": "wav",
    "audio/mpeg": "mp3",
    "audio/ogg": "ogg",
    "audio/mp4": "m4a",
    "audio/x-m4a": "m4a",
  }
  return byType[file.type] || "bin"
}

function classify(file: File) {
  if (file.type.startsWith("image/")) return "avatar"
  if (file.type.startsWith("audio/") || file.type === "video/webm") return "voice"
  return ""
}

function allowed(file: File, kind: string) {
  if (kind === "avatar") {
    return ["image/jpeg", "image/png", "image/webp"].includes(file.type) && file.size <= MAX_IMAGE_BYTES
  }
  if (kind === "voice") {
    return [
      "audio/webm",
      "video/webm",
      "audio/wav",
      "audio/x-wav",
      "audio/mpeg",
      "audio/ogg",
      "audio/mp4",
      "audio/x-m4a",
    ].includes(file.type) && file.size <= MAX_AUDIO_BYTES
  }
  return false
}

function pathFor(scope: Scope, kind: string, file: File) {
  return `${scope.type}/${scope.id}/${kind}/${randomUUID()}.${safeExt(file)}`
}

function encodeObjectPath(path: string) {
  return path.split("/").map(encodeURIComponent).join("/")
}

async function signPath(path: string, expiresIn = 3600) {
  const { url, serviceRoleKey } = config()
  const response = await fetch(
    `${url}/storage/v1/object/sign/${BUCKET}/${encodeObjectPath(path)}`,
    {
      method: "POST",
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ expiresIn }),
      cache: "no-store",
    },
  )
  const body = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(body?.message || body?.error || "Could not sign voice asset")
  const signed = String(body?.signedURL || body?.signedUrl || "")
  if (!signed) throw new Error("Storage did not return a signed URL")
  return signed.startsWith("http") ? signed : `${url}/storage/v1${signed}`
}

export async function GET(req: NextRequest) {
  try {
    const scope = await resolveScope(req)
    if (!scope) return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 })

    const path = String(req.nextUrl.searchParams.get("path") || "")
    const prefix = `${scope.type}/${scope.id}/`
    if (!path || !path.startsWith(prefix)) {
      return NextResponse.json({ error: "Invalid asset path" }, { status: 403 })
    }

    const signedUrl = await signPath(path, 3600)
    return NextResponse.json({ ok: true, path, signedUrl, expiresIn: 3600 })
  } catch (error: any) {
    console.error("[Lumin Voice Assets] sign failed", error)
    return NextResponse.json({ error: error?.message || "Could not sign asset" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const scope = await resolveScope(req)
    if (!scope) return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 })

    const form = await req.formData()
    const rawFile = form.get("file")
    if (!(rawFile instanceof File)) {
      return NextResponse.json({ error: "Missing file" }, { status: 400 })
    }

    const requestedKind = String(form.get("kind") || "").trim()
    const detectedKind = classify(rawFile)
    const kind = requestedKind === detectedKind ? detectedKind : detectedKind
    if (!kind || !allowed(rawFile, kind)) {
      return NextResponse.json(
        { error: kind === "avatar" ? "Imagem inválida ou demasiado grande" : "Áudio inválido ou demasiado grande" },
        { status: 400 },
      )
    }

    const { url, serviceRoleKey } = config()
    const path = pathFor(scope, kind, rawFile)
    const bytes = Buffer.from(await rawFile.arrayBuffer())

    const upload = await fetch(
      `${url}/storage/v1/object/${BUCKET}/${encodeObjectPath(path)}`,
      {
        method: "POST",
        headers: {
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
          "Content-Type": rawFile.type || "application/octet-stream",
          "x-upsert": "false",
        },
        body: bytes,
      },
    )

    const uploadBody = await upload.json().catch(() => ({}))
    if (!upload.ok) {
      throw new Error(uploadBody?.message || uploadBody?.error || `Storage upload failed (${upload.status})`)
    }

    const signedUrl = await signPath(path, 3600)
    return NextResponse.json({
      ok: true,
      kind,
      path,
      signedUrl,
      mimeType: rawFile.type,
      bytes: rawFile.size,
    })
  } catch (error: any) {
    console.error("[Lumin Voice Assets] upload failed", error)
    return NextResponse.json({ error: error?.message || "Could not upload asset" }, { status: 500 })
  }
}
