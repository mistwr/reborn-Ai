import { NextResponse } from "next/server"
import { grantBonusCredits } from "@/lib/credits"
import { getLuminOrigin, getStripeSecretKey } from "@/lib/stripe/config"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  const origin = getLuminOrigin(req.headers.get("origin"))
  const url = new URL(req.url)
  const sessionId = url.searchParams.get("session_id")?.trim() || ""
  const secretKey = getStripeSecretKey()

  if (!sessionId || !secretKey) {
    return NextResponse.redirect(`${origin}/billing/cancel?reason=credits`)
  }

  try {
    const response = await fetch(
      `https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}`,
      {
        headers: { Authorization: `Bearer ${secretKey}` },
        cache: "no-store",
      },
    )
    const session = await response.json().catch(() => ({}))

    if (!response.ok) throw new Error(session?.error?.message || `Stripe returned ${response.status}`)

    const metadata = session?.metadata || {}
    const email = String(metadata.email || session?.customer_details?.email || session?.customer_email || "")
      .trim()
      .toLowerCase()
    const credits = Number(metadata.credits || 0)
    const valid =
      session?.mode === "payment" &&
      session?.payment_status === "paid" &&
      metadata.product === "lumin-credits" &&
      email &&
      Number.isFinite(credits) &&
      credits > 0

    if (!valid) {
      return NextResponse.redirect(`${origin}/billing/cancel?reason=credits-not-paid`)
    }

    const result = await grantBonusCredits({
      email,
      amount: credits,
      sourceId: sessionId,
      amountTotal: Number(session?.amount_total || 0),
      currency: String(session?.currency || "eur"),
    })

    const destination = new URL(`${origin}/billing/success`)
    destination.searchParams.set("credits", "1")
    destination.searchParams.set("amount", String(credits))
    destination.searchParams.set("granted", result.granted ? "1" : "0")
    destination.searchParams.set("session_id", sessionId)
    return NextResponse.redirect(destination)
  } catch (error) {
    console.error("[Lumin Credits] fulfillment failed", error)
    return NextResponse.redirect(`${origin}/billing/cancel?reason=credits-fulfillment`)
  }
}
