export type SubscriptionStatus = "active" | "canceled" | "past_due" | "incomplete" | "trialing"

export interface Subscription {
  id: string
  email: string
  stripeCustomerId: string
  stripeSubscriptionId: string
  stripePriceId: string
  status: SubscriptionStatus
  plan: "free" | "pro"
  currentPeriodStart: Date
  currentPeriodEnd: Date
  tokensPerDay: number
  createdAt: Date
  updatedAt: Date
}

type SubscriptionInput = Omit<Subscription, "id" | "createdAt" | "updatedAt">

const memoryStore = new Map<string, Subscription>()

function supabaseConfig() {
  const url = process.env.REBORN_SUPABASE_URL?.replace(/\/$/, "")
  const serviceRoleKey = process.env.REBORN_SUPABASE_SERVICE_ROLE_KEY
  return url && serviceRoleKey ? { url, serviceRoleKey } : null
}

function fromRow(row: any): Subscription {
  return {
    id: row.id,
    email: row.email,
    stripeCustomerId: row.stripe_customer_id,
    stripeSubscriptionId: row.stripe_subscription_id,
    stripePriceId: row.stripe_price_id,
    status: row.status,
    plan: row.plan,
    currentPeriodStart: new Date(row.current_period_start),
    currentPeriodEnd: new Date(row.current_period_end),
    tokensPerDay: row.tokens_per_day,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  }
}

function toRow(data: SubscriptionInput) {
  return {
    email: data.email.toLowerCase(),
    stripe_customer_id: data.stripeCustomerId,
    stripe_subscription_id: data.stripeSubscriptionId,
    stripe_price_id: data.stripePriceId,
    status: data.status,
    plan: data.plan,
    current_period_start: data.currentPeriodStart.toISOString(),
    current_period_end: data.currentPeriodEnd.toISOString(),
    tokens_per_day: data.tokensPerDay,
    updated_at: new Date().toISOString(),
  }
}

function newestSubscription(subscriptions: Subscription[]) {
  return [...subscriptions].sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())[0] || null
}

async function supabaseRequest(path: string, init?: RequestInit) {
  const config = supabaseConfig()
  if (!config) return null

  const response = await fetch(`${config.url}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: config.serviceRoleKey,
      Authorization: `Bearer ${config.serviceRoleKey}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
      ...(init?.headers || {}),
    },
    cache: "no-store",
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Reborn billing storage error (${response.status}): ${text}`)
  }

  if (response.status === 204) return []
  return response.json()
}

export function isPersistentBillingConfigured() {
  return Boolean(supabaseConfig())
}

export async function getSubscriptionByEmail(email: string): Promise<Subscription | null> {
  const normalizedEmail = email.trim().toLowerCase()
  const config = supabaseConfig()
  if (!config) {
    return newestSubscription(
      Array.from(memoryStore.values()).filter((s) => s.email.toLowerCase() === normalizedEmail),
    )
  }

  const rows = await supabaseRequest(
    `reborn_subscriptions?email=eq.${encodeURIComponent(normalizedEmail)}&order=updated_at.desc&limit=1`,
  )
  return rows?.[0] ? fromRow(rows[0]) : null
}

export async function getSubscriptionByCustomerId(customerId: string): Promise<Subscription | null> {
  const config = supabaseConfig()
  if (!config) {
    return newestSubscription(
      Array.from(memoryStore.values()).filter((s) => s.stripeCustomerId === customerId),
    )
  }

  const rows = await supabaseRequest(
    `reborn_subscriptions?stripe_customer_id=eq.${encodeURIComponent(customerId)}&order=updated_at.desc&limit=1`,
  )
  return rows?.[0] ? fromRow(rows[0]) : null
}

export async function getSubscriptionByStripeSubId(subId: string): Promise<Subscription | null> {
  const config = supabaseConfig()
  if (!config) return memoryStore.get(subId) || null

  const rows = await supabaseRequest(`reborn_subscriptions?stripe_subscription_id=eq.${encodeURIComponent(subId)}&limit=1`)
  return rows?.[0] ? fromRow(rows[0]) : null
}

export async function createSubscription(data: SubscriptionInput): Promise<Subscription> {
  const config = supabaseConfig()
  if (!config) {
    const now = new Date()
    const subscription: Subscription = {
      ...data,
      id: `sub_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      createdAt: now,
      updatedAt: now,
    }
    memoryStore.set(data.stripeSubscriptionId, subscription)
    return subscription
  }

  const rows = await supabaseRequest("reborn_subscriptions?on_conflict=stripe_subscription_id", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=representation" },
    body: JSON.stringify(toRow(data)),
  })
  return fromRow(rows[0])
}

export async function updateSubscription(
  stripeSubscriptionId: string,
  data: Partial<Subscription>,
): Promise<Subscription | null> {
  const existing = await getSubscriptionByStripeSubId(stripeSubscriptionId)
  if (!existing) return null

  const merged: SubscriptionInput = {
    email: data.email ?? existing.email,
    stripeCustomerId: data.stripeCustomerId ?? existing.stripeCustomerId,
    stripeSubscriptionId,
    stripePriceId: data.stripePriceId ?? existing.stripePriceId,
    status: data.status ?? existing.status,
    plan: data.plan ?? existing.plan,
    currentPeriodStart: data.currentPeriodStart ?? existing.currentPeriodStart,
    currentPeriodEnd: data.currentPeriodEnd ?? existing.currentPeriodEnd,
    tokensPerDay: data.tokensPerDay ?? existing.tokensPerDay,
  }

  if (!supabaseConfig()) {
    const updated = { ...existing, ...merged, updatedAt: new Date() }
    memoryStore.set(stripeSubscriptionId, updated)
    return updated
  }

  const rows = await supabaseRequest(
    `reborn_subscriptions?stripe_subscription_id=eq.${encodeURIComponent(stripeSubscriptionId)}`,
    { method: "PATCH", body: JSON.stringify(toRow(merged)) },
  )
  return rows?.[0] ? fromRow(rows[0]) : null
}

export async function cancelSubscription(stripeSubscriptionId: string): Promise<boolean> {
  const updated = await updateSubscription(stripeSubscriptionId, { status: "canceled", plan: "free", tokensPerDay: 15000 })
  return Boolean(updated)
}

export async function isUserPro(email: string): Promise<boolean> {
  const sub = await getSubscriptionByEmail(email)
  if (!sub) return false

  const paidStatus = sub.status === "active" || sub.status === "trialing"
  const periodStillValid = Number.isFinite(sub.currentPeriodEnd.getTime()) && sub.currentPeriodEnd.getTime() > Date.now()

  return paidStatus && sub.plan === "pro" && periodStillValid
}

export async function getAllSubscriptions(): Promise<Subscription[]> {
  if (!supabaseConfig()) return Array.from(memoryStore.values()).sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
  const rows = await supabaseRequest("reborn_subscriptions?order=updated_at.desc")
  return (rows || []).map(fromRow)
}