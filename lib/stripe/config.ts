export type BillingPlan = "personal_pro" | "business" | "business_team"

const CANONICAL_LUMIN_URL = "https://rebornaaqi.vercel.app"

function safeOrigin(value: string | undefined | null) {
  if (!value) return null
  try {
    const url = new URL(value)
    if (url.protocol !== "https:" && url.protocol !== "http:") return null
    return url.origin
  } catch {
    return null
  }
}

export function getLuminOrigin(requestOrigin?: string | null) {
  return (
    safeOrigin(process.env.NEXTAUTH_URL) ||
    safeOrigin(process.env.NEXT_PUBLIC_SITE_URL) ||
    safeOrigin(process.env.LUMIN_AUTH_REDIRECT_URL) ||
    safeOrigin(requestOrigin) ||
    CANONICAL_LUMIN_URL
  )
}

export function getStripeSecretKey() {
  return process.env.STRIPE_SECRET_KEY?.trim() || ""
}

export function getStripeMode(secretKey = getStripeSecretKey()) {
  if (secretKey.startsWith("sk_live_")) return "live" as const
  if (secretKey.startsWith("sk_test_")) return "test" as const
  return secretKey ? ("unknown" as const) : ("missing" as const)
}

export function requiresLiveStripe() {
  return process.env.NODE_ENV === "production" && process.env.STRIPE_ALLOW_TEST_MODE_IN_PRODUCTION !== "true"
}

export function resolveStripePriceId(plan: BillingPlan) {
  if (plan === "business_team") {
    return (
      process.env.STRIPE_PRICE_BUSINESS_TEAM?.trim() ||
      process.env.STRIPE_PRICE_BUSINESS?.trim() ||
      process.env.STRIPE_PRICE_ID?.trim() ||
      ""
    )
  }
  if (plan === "business") {
    return process.env.STRIPE_PRICE_BUSINESS?.trim() || process.env.STRIPE_PRICE_ID?.trim() || ""
  }
  return process.env.STRIPE_PRICE_PERSONAL_PRO?.trim() || process.env.STRIPE_PRICE_ID?.trim() || ""
}

export function getStripeReadiness() {
  const secretKey = getStripeSecretKey()
  const mode = getStripeMode(secretKey)
  const webhookConfigured = Boolean(process.env.STRIPE_WEBHOOK_SECRET?.trim())
  const personalPriceConfigured = Boolean(resolveStripePriceId("personal_pro"))
  const businessPriceConfigured = Boolean(resolveStripePriceId("business"))
  const businessTeamPriceConfigured = Boolean(resolveStripePriceId("business_team"))
  const persistentBillingConfigured = Boolean(
    process.env.REBORN_SUPABASE_URL?.trim() && process.env.REBORN_SUPABASE_SERVICE_ROLE_KEY?.trim(),
  )

  return {
    configured: Boolean(secretKey),
    mode,
    liveRequired: requiresLiveStripe(),
    webhookConfigured,
    personalPriceConfigured,
    businessPriceConfigured,
    businessTeamPriceConfigured,
    persistentBillingConfigured,
    readyForLive:
      mode === "live" && webhookConfigured && personalPriceConfigured && persistentBillingConfigured,
  }
}
