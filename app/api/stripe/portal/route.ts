import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { getSubscriptionByEmail } from "@/lib/billing/store"
import { getLuminOrigin, getStripeMode, getStripeSecretKey, requiresLiveStripe } from "@/lib/stripe/config"

export const runtime = "nodejs"

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions as any)
    const email = String((session?.user as any)?.email || "").trim().toLowerCase()
    if (!email) {
      return NextResponse.json({ error: "Inicia sessão para gerir a subscrição." }, { status: 401 })
    }

    const secretKey = getStripeSecretKey()
    if (!secretKey) {
      return NextResponse.json({ error: "Stripe não está configurado.", code: "STRIPE_NOT_CONFIGURED" }, { status: 503 })
    }

    const mode = getStripeMode(secretKey)
    if (requiresLiveStripe() && mode !== "live") {
      return NextResponse.json(
        { error: "O ambiente de produção exige Stripe LIVE.", code: "STRIPE_LIVE_KEY_REQUIRED", mode },
        { status: 503 },
      )
    }

    const subscription = await getSubscriptionByEmail(email)
    if (!subscription?.stripeCustomerId) {
      return NextResponse.json({ error: "Não encontrei uma subscrição Stripe para esta conta." }, { status: 404 })
    }

    const params = new URLSearchParams()
    params.set("customer", subscription.stripeCustomerId)
    params.set("return_url", `${getLuminOrigin(req.headers.get("origin"))}/account`)

    const response = await fetch("https://api.stripe.com/v1/billing_portal/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
      cache: "no-store",
    })

    const data = await response.json()
    if (!response.ok || !data?.url) {
      console.error("[Lumin Stripe] portal error", data)
      return NextResponse.json(
        { error: data?.error?.message || "Não foi possível abrir o portal de faturação." },
        { status: response.status || 500 },
      )
    }

    return NextResponse.json({ url: data.url, mode })
  } catch (error) {
    console.error("[Lumin Stripe] portal unexpected error", error)
    return NextResponse.json({ error: "Erro interno ao abrir o portal de faturação." }, { status: 500 })
  }
}
