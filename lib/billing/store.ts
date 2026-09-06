/**
 * Billing Store - Temporary in-memory storage
 *
 * TODO: Replace with Supabase/PostgreSQL for production
 * This is a placeholder that stores subscription data in memory.
 * Data will be lost on server restart - only for development/demo.
 */

export interface Subscription {
  id: string
  email: string
  stripeCustomerId: string
  stripeSubscriptionId: string
  stripePriceId: string
  status: "active" | "canceled" | "past_due" | "incomplete" | "trialing"
  plan: "free" | "pro"
  currentPeriodStart: Date
  currentPeriodEnd: Date
  tokensPerDay: number
  createdAt: Date
  updatedAt: Date
}

const subscriptions = new Map<string, Subscription>()

export async function getSubscriptionByEmail(email: string): Promise<Subscription | null> {
  for (const sub of subscriptions.values()) {
    if (sub.email === email) return sub
  }
  return null
}

export async function getSubscriptionByCustomerId(customerId: string): Promise<Subscription | null> {
  for (const sub of subscriptions.values()) {
    if (sub.stripeCustomerId === customerId) return sub
  }
  return null
}

export async function getSubscriptionByStripeSubId(subId: string): Promise<Subscription | null> {
  return subscriptions.get(subId) || null
}

export async function createSubscription(data: Omit<Subscription, "id" | "createdAt" | "updatedAt">): Promise<Subscription> {
  const subscription: Subscription = {
    ...data,
    id: `sub_${Date.now()}_${Math.random().toString(36).substring(7)}`,
    createdAt: new Date(),
    updatedAt: new Date(),
  }
  subscriptions.set(data.stripeSubscriptionId, subscription)
  console.log("[Billing] Created subscription:", subscription.email, subscription.plan)
  return subscription
}

export async function updateSubscription(
  stripeSubscriptionId: string,
  data: Partial<Subscription>
): Promise<Subscription | null> {
  const existing = subscriptions.get(stripeSubscriptionId)
  if (!existing) return null

  const updated = { ...existing, ...data, updatedAt: new Date() }
  subscriptions.set(stripeSubscriptionId, updated)
  console.log("[Billing] Updated subscription:", updated.email, updated.status)
  return updated
}

export async function cancelSubscription(stripeSubscriptionId: string): Promise<boolean> {
  const existing = subscriptions.get(stripeSubscriptionId)
  if (!existing) return false

  existing.status = "canceled"
  existing.updatedAt = new Date()
  subscriptions.set(stripeSubscriptionId, existing)
  console.log("[Billing] Cancelled subscription:", existing.email)
  return true
}

export async function isUserPro(email: string): Promise<boolean> {
  const sub = await getSubscriptionByEmail(email)
  if (!sub) return false
  return sub.status === "active" && sub.plan === "pro"
}

export function getAllSubscriptions(): Subscription[] {
  return Array.from(subscriptions.values())
}
