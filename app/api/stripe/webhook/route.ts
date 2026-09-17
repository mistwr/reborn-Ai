import { createHash, createHmac, timingSafeEqual } from "node:crypto"
import { NextResponse } from "next/server"
import {
  createSubscription,
  getSubscriptionByCustomerId,
  type SubscriptionStatus,
} from "@/lib/billing/store"
import { grantBonusCredits } from "@/lib/credits"

export const runtime = "nodejs"

const PRO_TOKENS_PER_DAY = 50_000
const FREE_TOKENS_PER_DAY = 15_000
const SIGNATURE_TOLERANCE_SECONDS = 300

type BillingPlan = "personal_pro" | "business" | "business_team"

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
  if (!response.ok) throw new Error(data?.error?.message || `Stripe request failed (${response.status})`)
  return data
}

async function stripePost(path: string, secretKey: string, params: URLSearchParams) {
  const response = await fetch(`https://api.stripe.com/v1/${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
    cache: "no-store",
  })
  const data = await response.json()
  if (!response.ok) throw new Error(data?.error?.message || `Stripe request failed (${response.status})`)
  return data
}

function normalizeStatus(status: unknown): SubscriptionStatus {
  if (status === "active") return "active"
  if (status === "trialing") return "trialing"
  if (status === "past_due" || status === "unpaid") return "past_due"
  if (status === "canceled") return "canceled"
  return "incomplete"
}

function configuredPrices() {
  return {
    personal_pro: process.env.STRIPE_PRICE_PERSONAL_PRO?.trim() || process.env.STRIPE_PRICE_ID?.trim() || "",
    business: process.env.STRIPE_PRICE_BUSINESS?.trim() || process.env.STRIPE_PRICE_ID?.trim() || "",
    business_team:
      process.env.STRIPE_PRICE_BUSINESS_TEAM?.trim() ||
      process.env.STRIPE_PRICE_BUSINESS?.trim() ||
      process.env.STRIPE_PRICE_ID?.trim() || "",
  } satisfies Record<BillingPlan, string>
}

function resolveBillingPlan(subscription: any, priceId: string): BillingPlan | null {
  const metadataPlan = subscription?.metadata?.billing_plan
  if (metadataPlan === "personal_pro" || metadataPlan === "business" || metadataPlan === "business_team") return metadataPlan
  const prices = configuredPrices()
  if (prices.business_team && priceId === prices.business_team && prices.business_team !== prices.business) return "business_team"
  if (prices.business && priceId === prices.business && prices.business !== prices.personal_pro) return "business"
  if (prices.personal_pro && priceId === prices.personal_pro) return "personal_pro"
  return null
}

async function resolveCustomerEmail(customerId: string, secretKey: string) {
  const existing = await getSubscriptionByCustomerId(customerId)
  if (existing?.email) return existing.email
  const customer = await stripeGet(`customers/${encodeURIComponent(customerId)}`, secretKey)
  return typeof customer?.email === "string" ? customer.email.trim().toLowerCase() : ""
}

async function updateOrganizationBilling(params: {
  organizationId?: string | null
  billingPlan?: BillingPlan | null
  customerId: string
  subscriptionId: string
  active: boolean
}) {
  if (!params.organizationId) return
  const url = process.env.REBORN_SUPABASE_URL?.replace(/\/$/, "")
  const key = process.env.REBORN_SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return
  const plan = params.active ? params.billingPlan || "business" : "business_free"
  const response = await fetch(`${url}/rest/v1/lumin_organizations?id=eq.${encodeURIComponent(params.organizationId)}`, {
    method: "PATCH",
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      plan,
      stripe_customer_id: params.customerId,
      stripe_subscription_id: params.subscriptionId,
      updated_at: new Date().toISOString(),
    }),
    cache: "no-store",
  })
  if (!response.ok) console.error("[Lumin Stripe] could not update organization billing", await response.text())
}

async function persistStripeSubscription(subscription: any, secretKey: string, emailHint?: string) {
  const customerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer?.id
  const subscriptionId = subscription.id
  const item = subscription.items?.data?.[0]
  const priceId = item?.price?.id || ""
  if (!customerId || !subscriptionId || !priceId) throw new Error("Stripe subscription is missing customer, subscription, or price id")

  const email = (emailHint || (await resolveCustomerEmail(customerId, secretKey))).trim().toLowerCase()
  if (!email) throw new Error("Could not resolve customer email for Lumin subscription")

  const status = normalizeStatus(subscription.status)
  const billingPlan = resolveBillingPlan(subscription, priceId)
  const allowedPriceIds = new Set(Object.values(configuredPrices()).filter(Boolean))
  const metadataPlan = subscription?.metadata?.billing_plan
  const trustedPaymentLinkPlan = metadataPlan === "personal_pro"
  const active = Boolean(billingPlan) && (trustedPaymentLinkPlan || allowedPriceIds.has(priceId)) && (status === "active" || status === "trialing")
  const metadata = subscription?.metadata || {}
  const userId = typeof metadata.user_id === "string" && metadata.user_id ? metadata.user_id : null
  const organizationId = typeof metadata.organization_id === "string" && metadata.organization_id ? metadata.organization_id : null
  const periodStart = Number(subscription.current_period_start || Math.floor(Date.now() / 1000))
  const periodEnd = Number(subscription.current_period_end || periodStart + 30 * 24 * 60 * 60)

  await createSubscription({
    email,
    stripeCustomerId: customerId,
    stripeSubscriptionId: subscriptionId,
    stripePriceId: priceId,
    status,
    plan: active ? "pro" : "free",
    userId,
    organizationId,
    billingPlan,
    currentPeriodStart: new Date(periodStart * 1000),
    currentPeriodEnd: new Date(periodEnd * 1000),
    tokensPerDay: active ? PRO_TOKENS_PER_DAY : FREE_TOKENS_PER_DAY,
  })

  await updateOrganizationBilling({ organizationId, billingPlan, customerId, subscriptionId, active })
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
    event_id: String(session?.id || `lumin-${eventTime}`),
    action_source: "website",
    user_data: userData,
    custom_data: { currency, value, content_name: `Lumin AI ${metadata.billing_plan || "Pro"}`, content_type: "product" },
  }
  if (eventSourceUrl) event.event_source_url = eventSourceUrl
  const apiVersion = process.env.META_GRAPH_API_VERSION?.trim() || "v23.0"
  const response = await fetch(`https://graph.facebook.com/${apiVersion}/${encodeURIComponent(pixelId)}/events?access_token=${encodeURIComponent(accessToken)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ data: [event] }),
    cache: "no-store",
  })
  if (!response.ok) console.error(`[Lumin Meta] CAPI Purchase failed (${response.status})`, await response.text())
}

function parseLuminReference(value: unknown) {
  const ref = String(value || "")
  const definitions = [
    ["lumin_pro_", "pro", 0],
    ["lumin_credits20_", "credits", 20_000],
    ["lumin_credits60_", "credits", 60_000],
    ["lumin_credits150_", "credits", 150_000],
  ] as const
  for (const [prefix, kind, credits] of definitions) {
    if (ref.startsWith(prefix)) return { kind, credits, userId: ref.slice(prefix.length) }
  }
  return null
}

export async function POST(req: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  const secretKey = process.env.STRIPE_SECRET_KEY
  if (!webhookSecret || !secretKey) return NextResponse.json({ error: "Stripe webhook is not configured" }, { status: 503 })

  const payload = await req.text()
  const signature = req.headers.get("stripe-signature") || ""
  if (!verifyStripeSignature(payload, signature, webhookSecret)) return NextResponse.json({ error: "Invalid Stripe signature" }, { status: 400 })

  try {
    const event = JSON.parse(payload)
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data?.object
        const subscriptionId = typeof session?.subscription === "string" ? session.subscription : session?.subscription?.id
        const email = String(session?.customer_details?.email || session?.customer_email || "").trim().toLowerCase()
        const luminRef = parseLuminReference(session?.client_reference_id)

        if (subscriptionId) {
          if (luminRef?.kind === "pro") {
            const metadataParams = new URLSearchParams()
            metadataParams.set("metadata[product]", "lumin-ai")
            metadataParams.set("metadata[billing_plan]", "personal_pro")
            if (luminRef.userId) metadataParams.set("metadata[user_id]", luminRef.userId)
            await stripePost(`subscriptions/${encodeURIComponent(subscriptionId)}`, secretKey, metadataParams)
          }
          const subscription = await stripeGet(`subscriptions/${encodeURIComponent(subscriptionId)}`, secretKey)
          await persistStripeSubscription(subscription, secretKey, email)
        } else if (luminRef?.kind === "credits" && session?.mode === "payment" && session?.payment_status === "paid" && email) {
          await grantBonusCredits({
            email,
            amount: luminRef.credits,
            sourceId: String(session?.id || event.id),
            amountTotal: Number(session?.amount_total || 0),
            currency: String(session?.currency || "eur"),
          })
        }

        try {
          await sendMetaPurchase(session)
        } catch (metaError) {
          console.error("[Lumin Meta] unexpected CAPI error", metaError)
        }
        break
      }

      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
        await persistStripeSubscription(event.data?.object, secretKey)
        break
      default:
        break
    }
    return NextResponse.json({ received: true })
  } catch (error) {
    console.error("[Lumin Stripe] webhook error", error)
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 })
  }
}
