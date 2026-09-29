import { NextRequest, NextResponse } from "next/server"

export const maxDuration = 60

const DEFAULT_GATEWAY = "https://lumin-voice-gateway-production.up.railway.app"

function isAllowedPath(path: string) {
  return (
    path === "token" ||
    path === "api/platform/login" ||
    path === "api/platform/call" ||
    path === "api/platform/avatar" ||
    path === "api/platform/voice-preview" ||
    path === "api/platform/voice-catalog" ||
    /^api\/platform\/call\/[^/]+$/.test(path) ||
    /^api\/platform\/avatar\/[0-9a-f]{32}$/.test(path) ||
    /^api\/platform\/avatar\/[0-9a-f]{32}\/video$/.test(path)
  )
}

async function forward(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path = [] } = await context.params
  const targetPath = path.join("/")

  if (!isAllowedPath(targetPath)) {
    return NextResponse.json({ error: "Voice gateway route not allowed" }, { status: 404 })
  }

  const upstreamBase = (process.env.LUMIN_VOICE_GATEWAY_URL || DEFAULT_GATEWAY).replace(/\/$/, "")
  const upstreamUrl = `${upstreamBase}/${targetPath}`

  const headers = new Headers()
  const contentType = request.headers.get("content-type")
  const authorization = request.headers.get("authorization")
  if (contentType) headers.set("content-type", contentType)
  if (authorization) headers.set("authorization", authorization)

  const method = request.method.toUpperCase()
  const body = method === "GET" || method === "HEAD" ? undefined : await request.arrayBuffer()

  try {
    const upstream = await fetch(upstreamUrl, {
      method,
      headers,
      body,
      cache: "no-store",
      redirect: "manual",
    })

    const responseHeaders = new Headers()
    const upstreamContentType = upstream.headers.get("content-type")
    if (upstreamContentType) responseHeaders.set("content-type", upstreamContentType)
    responseHeaders.set("cache-control", "no-store")

    return new NextResponse(await upstream.arrayBuffer(), {
      status: upstream.status,
      headers: responseHeaders,
    })
  } catch (error) {
    console.error("[voice-gateway] upstream error", error)
    return NextResponse.json(
      { error: "Voice gateway temporarily unavailable" },
      { status: 502 },
    )
  }
}

export const dynamic = "force-dynamic"

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  return forward(request, context)
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  return forward(request, context)
}
