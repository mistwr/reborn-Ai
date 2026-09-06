import { NextResponse } from "next/server"

export const runtime = "nodejs"

const META_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "fbclid"] as const

function safeMeta(value: unknown) {
  return typeof value === "string" ? value.trim().slice(0, 200) : ""
}

export async function POST(req: Request) {
  try {
    const secretKey = process.env.STRIPE_SECRET_KEY
    const priceId = process.env.STRIPE_PRICE_ID

    if (!secretKey || !priceId) {
      return NextResponse.json(
        {
          error: "Stripe ainda nao esta configurado neste ambiente.",
          code: "STRIPE_NOT_CONFIGURED",
        },
        { status: 503 },
      )
    }

    const body = await req.json().catch(() => ({}))
    const email = typeof body?.email === "string" ? body.email.trim() : ""
    const attribution = body?.attribution && typeof body.attribution === "object" ? body.attribution : {}
    const origin = req.headers.get("origin") || process.env.NEXTAUTH_URL || "http://localhost:3000"

    const params = new URLSearchParams()
    params.set("mode", "subscription")
    params.set("line_items[0][price]", priceId)
    params.set("line_items[0][quantity]", "1")
    params.set("success_url", `${origin}/billing/success?session_id={CHECKOUT_SESSION_ID}`)
    params.set("cancel_url", `${origin}/billing/cancel`)
    params.set("allow_promotion_codes", "true")
    if (email) params.set("customer_email", email)
    params.set("metadata[product]", "reborn-ai-pro")

    for (const key of META_KEYS) {
      const value = safeMeta(attribution[key])
      if (value) params.set(`metadata[${key}]`, value)
    }

    const stripeResponse = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
      cache: "no-store",
    })

    const data = await stripeResponse.json()

    if (!stripeResponse.ok || !data?.url) {
      console.error("[Reborn Stripe] checkout error", data)
      return NextResponse.json(
        { error: data?.error?.message || "Nao foi possivel criar o checkout." },
        { status: stripeResponse.status || 500 },
      )
    }

    return NextResponse.json({ url: data.url, id: data.id })
  } catch (error) {
    console.error("[Reborn Stripe] unexpected error", error)
    return NextResponse.json({ error: "Erro interno ao iniciar o pagamento." }, { status: 500 })
  }
}
