import { createHmac, timingSafeEqual } from "node:crypto"
import { NextResponse } from "next/server"
import {
  createSubscription,
  getSubscriptionByCustomerId,
  type SubscriptionStatus,
} from "@/lib/billing/store"

export const runtime = "nodejs"

const PRO_TOKENS_PER_DAY = 50_000
const FREE_TOKENS_PER_DAY = 15_000
const SIGNATURE_TOLERANCE_SECONDS = 300

function verifyStripeSignature(payload: string, header: string, secret: string) {
  const parts = header.split(",")
  const timestamp = parts.find((part) => part.startsWith("t="))?.slice(2)
  const signatures = parts.filter((part) => part.startsWith("v1=")).map((part) => part.slice(3))

  if (!timestamp || signatures.length === 0) return false

  const timestampNumber = Number(timestamp)
  if (!Number.isFinite(timestampNumber)) return false

  const age = Math.abs(Math.floor(Date.now() / 1000) - timestampNumber)
  if (age > SIGNATURE_TOLERANCE_SECONDS) return false

  const expected = createHmac("sha256", secret).update(`${timestamp}.${payload}`).digest("hex")
  const expectedBuffer = Buffer.from(expected, "hex")

  return signatures.some((signature) => {
    try {
      const signatureBuffer = Buffer.from(signature, "hex")
      return signatureBuffer.length === expectedBuffer.length && timingSafeEqual(signatureBuffer, expectedBuffer)
    } catch {
      return false
    }
  })
}

async function stripeGet(path: string, secretKey: string) {
  const response = await fetch(`https://api.stripe.com/v1/${path}`, {
    headers: { Authorization: `Bearer ${secretKey}` },
    cache: "no-store",
  })

  const data = await response.json()
  if (!response.ok) {
    throw new Error(data?.error?.message || `Stripe request failed (${response.status})`)
  }
  return data
}

function normalizeStatus(status: string): SubscriptionStatus {
  if (status === "trialing") return "trialing"
  if (status === "past_due" || status === "unpaid") return "past_due"
  if (status === "incomplete" || status === "incomplete_expired") return "incomplete"
  if (status === "canceled") return "canceled"
  return "active"
}

async function resolveCustomerEmail(customerId: string, secretKey: string) {
  const existing = await getSubscriptionByCustomerId(customerId)
  if (existing?.email) return existing.email

  const customer = await stripeGet(`customers/${encodeURIComponent(customerId)}`, secretKey)
  return typeof customer?.email === "string" ? customer.email.trim().toLowerCase() : ""
}

async function persistStripeSubscription(subscription: any, secretKey: string, emailHint?: string) {
  const customerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer?.id
  const subscriptionId = subscription.id
  const item = subscription.items?.data?.[0]
  const priceId = item?.price?.id || process.env.STRIPE_PRICE_ID || ""

  if (!customerId || !subscriptionId || !priceId) {
    throw new Error("Stripe subscription is missing customer, subscription, or price id")
  }

  const email = (emailHint || (await resolveCustomerEmail(customerId, secretKey))).trim().toLowerCase()
  if (!email) throw new Error("Could not resolve customer email for Reborn subscription")

  const status = normalizeStatus(subscription.status)
  const isPro = status === "active" || status === "trialing"

  const periodStart = Number(subscription.current_period_start || Math.floor(Date.now() / 1000))
  const periodEnd = Number(subscription.current_period_end || periodStart + 30 * 24 * 60 * 60)

  await createSubscription({
    email,
    stripeCustomerId: customerId,
    stripeSubscriptionId: subscriptionId,
    stripePriceId: priceId,
    status,
    plan: isPro ? "pro" : "free",
    currentPeriodStart: new Date(periodStart * 1000),
    currentPeriodEnd: new Date(periodEnd * 1000),
    tokensPerDay: isPro ? PRO_TOKENS_PER_DAY : FREE_TOKENS_PER_DAY,
  })
}

export async function POST(req: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  const secretKey = process.env.STRIPE_SECRET_KEY

  if (!webhookSecret || !secretKey) {
    return NextResponse.json({ error: "Stripe webhook is not configured" }, { status: 503 })
  }

  const payload = await req.text()
  const signature = req.headers.get("stripe-signature") || ""

  if (!verifyStripeSignature(payload, signature, webhookSecret)) {
    return NextResponse.json({ error: "Invalid Stripe signature" }, { status: 400 })
  }

  try {
    const event = JSON.parse(payload)

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data?.object
        const subscriptionId = typeof session?.subscription === "string" ? session.subscription : session?.subscription?.id
        const email = session?.customer_details?.email || session?.customer_email || ""

        if (subscriptionId) {
          const subscription = await stripeGet(`subscriptions/${encodeURIComponent(subscriptionId)}`, secretKey)
          await persistStripeSubscription(subscription, secretKey, email)
        }
        break
      }

      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        await persistStripeSubscription(event.data?.object, secretKey)
        break
      }

      default:
        break
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error("[Reborn Stripe] webhook error", error)
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 })
  }
}
