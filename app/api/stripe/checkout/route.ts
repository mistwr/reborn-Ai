import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import {
  getLuminOrigin,
  getStripeMode,
  getStripeSecretKey,
  requiresLiveStripe,
  resolveStripePriceId,
  type BillingPlan,
} from "@/lib/stripe/config"

export const runtime = "nodejs"

const META_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "fbclid"] as const

function safeMeta(value: unknown) {
  return typeof value === "string" ? value.trim().slice(0, 200) : ""
}

export async function POST(req: Request) {
  try {
    const secretKey = getStripeSecretKey()
    if (!secretKey) {
      return NextResponse.json(
        { error: "Stripe ainda não está configurado neste ambiente.", code: "STRIPE_NOT_CONFIGURED" },
        { status: 503 },
      )
    }

    const stripeMode = getStripeMode(secretKey)
    if (requiresLiveStripe() && stripeMode !== "live") {
      return NextResponse.json(
        {
          error: "O ambiente de produção exige uma chave Stripe LIVE.",
          code: "STRIPE_LIVE_KEY_REQUIRED",
          mode: stripeMode,
        },
        { status: 503 },
      )
    }

    const session = await getServerSession(authOptions as any)
    const sessionUser = (session?.user || {}) as any
    if (!sessionUser?.email) {
      return NextResponse.json({ error: "Inicia sessão antes de escolher um plano." }, { status: 401 })
    }

    const body = await req.json().catch(() => ({}))
    const requestedPlan: BillingPlan =
      body?.plan === "business_team" ? "business_team" : body?.plan === "business" ? "business" : "personal_pro"

    const isBusinessAccount = sessionUser.accountType === "business"
    if ((requestedPlan === "business" || requestedPlan === "business_team") && !isBusinessAccount) {
      return NextResponse.json({ error: "Este plano requer uma conta Empresa." }, { status: 400 })
    }

    const priceId = resolveStripePriceId(requestedPlan)
    if (!priceId) {
      return NextResponse.json(
        { error: "O preço Stripe deste plano ainda não está configurado.", code: "STRIPE_PRICE_NOT_CONFIGURED" },
        { status: 503 },
      )
    }

    const attribution = body?.attribution && typeof body.attribution === "object" ? body.attribution : {}
    const origin = getLuminOrigin(req.headers.get("origin"))
    const email = String(sessionUser.email).trim().toLowerCase()
    const userId = String(sessionUser.id || "").trim()
    const organizationId = String(sessionUser.organizationId || "").trim()

    const params = new URLSearchParams()
    params.set("mode", "subscription")
    params.set("line_items[0][price]", priceId)
    params.set("line_items[0][quantity]", "1")
    params.set("success_url", `${origin}/billing/success?session_id={CHECKOUT_SESSION_ID}`)
    params.set("cancel_url", `${origin}/billing/cancel`)
    params.set("allow_promotion_codes", "true")
    params.set("customer_email", email)
    if (userId) params.set("client_reference_id", userId)

    const metadata: Record<string, string> = {
      product: "lumin-ai",
      billing_plan: requestedPlan,
      account_type: isBusinessAccount ? "business" : "personal",
      stripe_mode: stripeMode,
    }
    if (userId) metadata.user_id = userId
    if (organizationId) metadata.organization_id = organizationId

    for (const [key, value] of Object.entries(metadata)) {
      params.set(`metadata[${key}]`, value)
      params.set(`subscription_data[metadata][${key}]`, value)
    }

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
      console.error("[Lumin Stripe] checkout error", data)
      return NextResponse.json(
        { error: data?.error?.message || "Não foi possível criar o checkout." },
        { status: stripeResponse.status || 500 },
      )
    }

    return NextResponse.json({ url: data.url, id: data.id, plan: requestedPlan, mode: stripeMode })
  } catch (error) {
    console.error("[Lumin Stripe] unexpected error", error)
    return NextResponse.json({ error: "Erro interno ao iniciar o pagamento." }, { status: 500 })
  }
}
