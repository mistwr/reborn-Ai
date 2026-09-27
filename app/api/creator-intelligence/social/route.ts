import { getToken } from "next-auth/jwt"
import { NextResponse } from "next/server"

export const maxDuration = 180

const ALLOWED_PLATFORMS = new Set(["auto", "instagram", "tiktok", "linkedin"])

function numberValue(value: unknown) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0
  const raw = String(value ?? "").trim().toLowerCase().replace(/\s/g, "").replace(",", ".")
  if (!raw) return 0
  const multiplier = raw.endsWith("m") ? 1_000_000 : raw.endsWith("k") ? 1_000 : 1
  const base = Number(raw.replace(/[km]$/, ""))
  return Number.isFinite(base) ? base * multiplier : 0
}

function firstValue(item: any, keys: string[]) {
  for (const key of keys) {
    const value = item?.[key]
    if (value !== undefined && value !== null && value !== "") return value
  }
  return undefined
}

function normalizePost(item: any) {
  return {
    plays: numberValue(firstValue(item, ["plays", "play_count", "views", "view_count", "video_views", "reproducoes"])),
    likes: numberValue(firstValue(item, ["likes", "like_count", "digg_count", "gostos"])),
    comments: numberValue(firstValue(item, ["comments", "comment_count", "comentarios"])),
    shares: numberValue(firstValue(item, ["shares", "share_count", "partilhas"])),
    saves: numberValue(firstValue(item, ["saves", "save_count", "collect_count", "bookmarks", "guardados"])),
    caption: String(firstValue(item, ["caption", "text", "description", "title", "content"]) ?? "").trim().slice(0, 1600),
    url: String(firstValue(item, ["url", "source_url", "post_url", "video_url"]) ?? "").trim(),
    author: String(firstValue(item, ["author", "username", "handle", "creator", "profile_username"]) ?? "").trim(),
  }
}

function collectItems(payload: any) {
  if (Array.isArray(payload?.result?.items)) return payload.result.items
  if (Array.isArray(payload?.items)) return payload.items
  if (Array.isArray(payload?.results)) return payload.results
  return []
}

function publicError(error: unknown) {
  return String((error as any)?.message || error || "Erro no Creator Intelligence social").slice(0, 800)
}

export async function GET(req: Request) {
  const token = await getToken({ req: req as any, secret: process.env.NEXTAUTH_SECRET }).catch(() => null)
  if (!token) return NextResponse.json({ error: "Inicia sessão no Lumin." }, { status: 401 })

  const base = (process.env.JEV_SOCIAL_URL || "http://127.0.0.1:8766").replace(/\/$/, "")
  try {
    const response = await fetch(`${base}/api/status`, {
      headers: { Origin: base },
      signal: AbortSignal.timeout(5000),
      cache: "no-store",
    })
    const data = await response.json()
    return NextResponse.json(data, { status: response.status })
  } catch (error) {
    return NextResponse.json(
      { error: "O motor social local não está ligado nesta máquina.", details: publicError(error) },
      { status: 503 },
    )
  }
}

export async function POST(req: Request) {
  const token = await getToken({ req: req as any, secret: process.env.NEXTAUTH_SECRET }).catch(() => null)
  if (!token) return NextResponse.json({ error: "Inicia sessão no Lumin para usar o Creator Intelligence." }, { status: 401 })

  try {
    const body = await req.json()
    const query = String(body?.query ?? "").trim()
    const platform = String(body?.platform ?? "auto").toLowerCase()
    const limit = Math.max(1, Math.min(20, Number(body?.limit ?? 8)))
    const maxSteps = Math.max(1, Math.min(20, Number(body?.maxSteps ?? 12)))

    if (query.length < 2 || query.length > 800) {
      return NextResponse.json({ error: "Indica uma conta, URL ou objetivo de pesquisa." }, { status: 400 })
    }
    if (!ALLOWED_PLATFORMS.has(platform)) {
      return NextResponse.json({ error: "Plataforma inválida." }, { status: 400 })
    }

    const base = (process.env.JEV_SOCIAL_URL || "http://127.0.0.1:8766").replace(/\/$/, "")
    const response = await fetch(`${base}/api/search`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: base,
      },
      body: JSON.stringify({ query, platform, limit, maxSteps }),
      signal: AbortSignal.timeout(170000),
      cache: "no-store",
    })

    const rawText = await response.text()
    let data: any
    try {
      data = JSON.parse(rawText)
    } catch {
      data = { error: rawText.slice(0, 1200) || `Jev Social respondeu ${response.status}` }
    }

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status })
    }

    const posts = collectItems(data)
      .map(normalizePost)
      .filter((post: any) => post.plays > 0 || post.likes > 0 || post.comments > 0 || post.caption)

    return NextResponse.json({ ...data, posts, source: "jev-social-local" })
  } catch (error) {
    return NextResponse.json(
      { error: "Não consegui falar com o motor social local.", details: publicError(error) },
      { status: 503 },
    )
  }
}