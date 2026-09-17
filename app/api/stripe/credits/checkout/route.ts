import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { getLuminOrigin, getStripeMode, getStripeSecretKey, requiresLiveStripe } from "@/lib/stripe/config"

export const runtime = "nodejs"

const CREDIT_PACKS = {
  starter: {
    name: "20.000 créditos",
    credits: 20_000,
    priceEnv: "STRIPE_PRICE_CREDITS_20K",
  },
  boost: {
    name: "60.000 créditos",
    credits: 60_000,
    priceEnv: "STRIPE_PRICE_CREDITS_60K",
  },
  max: {
    name: "150.000 créditos",
    credits: 150_000,
    priceEnv: "STRIPE_PRICE_CREDITS_150K",
  },
} as const

type PackId = keyof typeof CREDIT_PACKS

function packPrice(packId: PackId) {
  return process.env[CREDIT_PACKS[packId].priceEnv]?.trim() || ""
}

export async function GET() {
  return NextResponse.json({
    packs: Object.entries(CREDIT_PACKS).map(([id, pack]) => ({
      id,
      name: pack.name,
      credits: pack.credits,
      available: Boolean(process.env[pack.priceEnv]?.trim()),
    })),
  })
}

export async function POST(req: Request) {
  try {
    const secretKey = getStripeSecretKey()
    if (!secretKey) {
      return NextResponse.json({ error: "Stripe ainda não está configurado." }, { status: 503 })
    }

    const stripeMode = getStripeMode(secretKey)
    if (requiresLiveStripe() && stripeMode !== "live") {
      return NextResponse.json({ error: "O ambiente de produção exige Stripe LIVE." }, { status: 503 })
    }

    const session = await getServerSession(authOptions as any)
    const user = (session?.user || {}) as any
    const email = String(user?.email || "").trim().toLowerCase()
    if (!email) return NextResponse.json({ error: "Inicia sessão para comprar créditos." }, { status: 401 })

    const body = await req.json().catch(() => ({}))
    const packId = String(body?.pack || "") as PackId
    if (!(packId in CREDIT_PACKS)) {
      return NextResponse.json({ error: "Pack de créditos inválido." }, { status: 400 })
    }

    const pack = CREDIT_PACKS[packId]
    const priceId = packPrice(packId)
    if (!priceId) {
      return NextResponse.json(
        { error: `O preço Stripe ${pack.priceEnv} ainda não está configurado.`, code: "CREDIT_PACK_PRICE_NOT_CONFIGURED" },
        { status: 503 },
      )
    }

    const origin = getLuminOrigin(req.headers.get("origin"))
    const params = new URLSearchParams()
    params.set("mode", "payment")
    params.set("line_items[0][price]", priceId)
    params.set("line_items[0][quantity]", "1")
    params.set("success_url", `${origin}/api/stripe/credits/fulfill?session_id={CHECKOUT_SESSION_ID}`)
    params.set("cancel_url", `${origin}/billing/cancel`)
    params.set("customer_email", email)
    params.set("metadata[product]", "lumin-credits")
    params.set("metadata[credit_pack]", packId)
    params.set("metadata[credits]", String(pack.credits))
    params.set("metadata[email]", email)
    if (user?.id) params.set("client_reference_id", String(user.id))

    const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
      cache: "no-store",
    })

    const data = await response.json().catch(() => ({}))
    if (!response.ok || !data?.url) {
      console.error("[Lumin Credits] Stripe checkout error", data)
      return NextResponse.json(
        { error: data?.error?.message || "Não foi possível iniciar a compra de créditos." },
        { status: response.status || 500 },
      )
    }

    return NextResponse.json({ url: data.url, id: data.id, pack: packId, credits: pack.credits, mode: stripeMode })
  } catch (error) {
    console.error("[Lumin Credits] checkout failed", error)
    return NextResponse.json({ error: "Erro interno ao iniciar a compra de créditos." }, { status: 500 })
  }
}
