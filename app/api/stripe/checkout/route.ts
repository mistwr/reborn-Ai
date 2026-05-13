import { NextRequest, NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"
import { PRO_PLAN } from "@/lib/plans"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const { email } = body as { email?: string }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://rebornai.vercel.app"

    // Create Stripe Checkout Session for subscription
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: PRO_PLAN.currency,
            product_data: {
              name: `Reborn AI ${PRO_PLAN.name}`,
              description: PRO_PLAN.description,
            },
            unit_amount: PRO_PLAN.priceInCents,
            recurring: {
              interval: PRO_PLAN.interval,
            },
          },
          quantity: 1,
        },
      ],
      success_url: `${baseUrl}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/billing/cancel`,
      allow_promotion_codes: true,
      billing_address_collection: "auto",
      customer_email: email || undefined,
      metadata: {
        plan: "pro",
        tokensPerDay: PRO_PLAN.tokensPerDay.toString(),
      },
    })

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error("[Stripe Checkout] Error:", error)
    return NextResponse.json(
      { error: "Nao foi possivel criar a sessao de pagamento. Tenta novamente." },
      { status: 500 }
    )
  }
}
