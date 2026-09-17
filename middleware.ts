import { NextResponse, type NextRequest } from "next/server"
import { getToken } from "next-auth/jwt"

const ROUTE_COSTS: Record<string, number> = {
  "/api/chat": 100,
  "/api/live": 250,
  "/api/live-tts": 50,
  "/api/vision": 500,
  "/api/generate-image": 1000,
  "/api/generate-video": 5000,
  "/api/webcraft-v2": 2000,
  "/api/generate-ebook": 2000,
  "/api/generate-presentation": 1500,
  "/api/generate-presentation-v2": 1500,
  "/api/clipper/transcribe": 750,
}

const FREE_LIMIT = 15000
const PRO_LIMIT = 50000

async function consume(email: string, amount: number, limit: number) {
  const url = process.env.REBORN_SUPABASE_URL?.replace(/\/$/, "")
  const key = process.env.REBORN_SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error("Credits storage not configured")

  const response = await fetch(`${url}/rest/v1/rpc/consume_lumin_credits`, {
    method: "POST",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      p_email: email.toLowerCase(),
      p_amount: amount,
      p_limit: limit,
    }),
    cache: "no-store",
  })

  if (!response.ok) throw new Error(`Credit ledger returned ${response.status}`)
  const rows = await response.json()
  return rows?.[0] as { allowed?: boolean; used?: number; remaining?: number } | undefined
}

export async function middleware(request: NextRequest) {
  if (request.method !== "POST") return NextResponse.next()

  const cost = ROUTE_COSTS[request.nextUrl.pathname]
  if (!cost) return NextResponse.next()

  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET }).catch(() => null)
  const email = typeof token?.email === "string" ? token.email.trim().toLowerCase() : ""

  if (!email) {
    return NextResponse.json(
      { error: "Inicia sessão no Lumin para utilizar ferramentas de IA.", code: "AUTH_REQUIRED" },
      { status: 401 },
    )
  }

  const isPro = Boolean((token as any)?.isPro || (token as any)?.plan === "pro" || (token as any)?.isFounder)
  const limit = isPro ? PRO_LIMIT : FREE_LIMIT

  try {
    const result = await consume(email, cost, limit)
    if (!result?.allowed) {
      return NextResponse.json(
        {
          error: "Créditos diários esgotados. O saldo renova automaticamente à meia-noite UTC.",
          code: "CREDITS_EXHAUSTED",
          used: Number(result?.used || limit),
          limit,
          remaining: Number(result?.remaining || 0),
        },
        { status: 402 },
      )
    }

    const response = NextResponse.next()
    response.headers.set("x-lumin-credit-cost", String(cost))
    response.headers.set("x-lumin-credits-remaining", String(result.remaining ?? Math.max(0, limit - Number(result.used || 0))))
    return response
  } catch (error) {
    console.error("[Lumin Credits] middleware failed", error)
    // Fail open for temporary storage problems so an infrastructure issue never bricks Lumin.
    return NextResponse.next()
  }
}

export const config = {
  matcher: [
    "/api/chat",
    "/api/live",
    "/api/live-tts",
    "/api/vision",
    "/api/generate-image",
    "/api/generate-video",
    "/api/webcraft-v2",
    "/api/generate-ebook",
    "/api/generate-presentation",
    "/api/generate-presentation-v2",
    "/api/clipper/transcribe",
  ],
}
