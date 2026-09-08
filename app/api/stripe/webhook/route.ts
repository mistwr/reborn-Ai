import { createHash, createHmac, timingSafeEqual } from "node:crypto"
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

function normalizeStatus(status: unknown): SubscriptionStatus {
  if (status === "active") return "active"
  if (status === "trialing") return "trialing"
  if (status === "past_due" || status === "unpaid") return "past_due"
  if (status === "canceled") return "canceled"

  // Stripe can introduce or return non-access states such as paused,
  // incomplete_expired, or future statuses. Unknown must fail closed.
  return "incomplete"
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
  const priceId = item?.price?.id || ""
  const configuredProPriceId = process.env.STRIPE_PRICE_ID?.trim() || ""

  if (!customerId || !subscriptionId || !priceId) {
    throw new Error("Stripe subscription is missing customer, subscription, or price id")
  }

  if (!configuredProPriceId) {
    throw new Error("STRIPE_PRICE_ID is not configured")
  }

  const email = (emailHint || (await resolveCustomerEmail(customerId, secretKey))).trim().toLowerCase()
  if (!email) throw new Error("Could not resolve customer email for Reborn subscription")

  const status = normalizeStatus(subscription.status)
  const matchesRebornProPrice = priceId === configuredProPriceId
  const isPro = matchesRebornProPrice && (status === "active" || status === "trialing")

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

function sha256(value: string) {
  return createHash("sha256").update(value.trim().toLowerCase()).digest("hex")
}

function getEventSourceUrl() {
  const raw = process.env.NEXTAUTH_URL?.trim()
  if (!raw) return undefined

  try {
    const url = new URL(raw)
    if (url.protocol !== "http:" && url.protocol !== "https:") return undefined
    url.pathname = "/billing/success"
    url.search = ""
    url.hash = ""
    return url.toString()
  } catch {
    return undefined
  }
}

async function sendMetaPurchase(session: any) {
  const pixelId = process.env.META_PIXEL_ID?.trim()
  const accessToken = process.env.META_CAPI_ACCESS_TOKEN?.trim()
  if (!pixelId || !accessToken || session?.payment_status !== "paid") return

  const email = String(session?.customer_details?.email || session?.customer_email || "").trim().toLowerCase()
  if (!email) return

  const eventTime = Math.floor(Date.now() / 1000)
  const metadata = session?.metadata || {}
  const fbclid = typeof metadata.fbclid === "string" ? metadata.fbclid.trim() : ""
  const value = Number(session?.amount_total || 0) / 100
  const currency = String(session?.currency || "eur").toUpperCase()
  const eventSourceUrl = getEventSourceUrl()

  const userData: Record<string, unknown> = { em: [sha256(email)] }
  if (fbclid) userData.fbc = `fb.1.${eventTime}.${fbclid}`

  const event: Record<string, unknown> = {
    event_name: "Purchase",
    event_time: eventTime,
    event_id: String(session?.id || `reborn-${eventTime}`),
    action_source: "website",
    user_data: userData,
    custom_data: {
      currency,
      value,
      content_name: "Reborn AI Pro",
      content_type: "product",
      utm_source: metadata.utm_source || undefined,
      utm_medium: metadata.utm_medium || undefined,
      utm_campaign: metadata.utm_campaign || undefined,
      utm_content: metadata.utm_content || undefined,
      utm_term: metadata.utm_term || undefined,
    },
  }

  if (eventSourceUrl) event.event_source_url = eventSourceUrl

  const body = { data: [event] }

  const apiVersion = process.env.META_GRAPH_API_VERSION?.trim() || "v23.0"
  const response = await fetch(
    `https://graph.facebook.com/${apiVersion}/${encodeURIComponent(pixelId)}/events?access_token=${encodeURIComponent(accessToken)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    },
  )

  if (!response.ok) {
    const text = await response.text()
    console.error(`[Reborn Meta] CAPI Purchase failed (${response.status})`, text)
  }
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

        // Conversion tracking is best-effort and must never block subscription activation.
        try {
          await sendMetaPurchase(session)
        } catch (metaError) {
          console.error("[Reborn Meta] unexpected CAPI error", metaError)
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
