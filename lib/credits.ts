import { FREE_PLAN, PRO_PLAN } from "@/lib/plans"
import { getSubscriptionByEmail, isUserPro } from "@/lib/billing/store"

export type CreditStatus = {
  plan: "free" | "pro"
  limit: number
  used: number
  remaining: number
  resetAt: string
}

function supabaseConfig() {
  const url = process.env.REBORN_SUPABASE_URL?.replace(/\/$/, "")
  const serviceRoleKey = process.env.REBORN_SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceRoleKey) throw new Error("Lumin credits storage is not configured")
  return { url, serviceRoleKey }
}

function utcDateString(date = new Date()) {
  return date.toISOString().slice(0, 10)
}

function nextUtcMidnight() {
  const now = new Date()
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1)).toISOString()
}

async function request(path: string, init?: RequestInit) {
  const { url, serviceRoleKey } = supabaseConfig()
  const response = await fetch(`${url}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
    cache: "no-store",
  })
  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Lumin credits storage error (${response.status}): ${text}`)
  }
  return response.status === 204 ? null : response.json()
}

async function planFor(email: string) {
  const pro = await isUserPro(email)
  if (pro) return { plan: "pro" as const, limit: PRO_PLAN.tokensPerDay }

  // Preserve any future custom daily allowance stored with the subscription.
  const subscription = await getSubscriptionByEmail(email).catch(() => null)
  if (subscription?.tokensPerDay && subscription.tokensPerDay > FREE_PLAN.tokensPerDay && subscription.status !== "canceled") {
    return { plan: "pro" as const, limit: subscription.tokensPerDay }
  }
  return { plan: "free" as const, limit: FREE_PLAN.tokensPerDay }
}

export async function getCreditStatus(email: string): Promise<CreditStatus> {
  const normalized = email.trim().toLowerCase()
  const { plan, limit } = await planFor(normalized)
  const rows = await request(
    `lumin_credit_usage?email=eq.${encodeURIComponent(normalized)}&usage_date=eq.${utcDateString()}&select=credits_used&limit=1`,
  )
  const used = Math.max(0, Number(rows?.[0]?.credits_used || 0))
  return {
    plan,
    limit,
    used,
    remaining: Math.max(0, limit - used),
    resetAt: nextUtcMidnight(),
  }
}

export async function consumeCredits(email: string, amount: number): Promise<CreditStatus & { allowed: boolean }> {
  const normalized = email.trim().toLowerCase()
  const safeAmount = Math.max(1, Math.ceil(amount))
  const { plan, limit } = await planFor(normalized)
  const rows = await request("rpc/consume_lumin_credits", {
    method: "POST",
    body: JSON.stringify({ p_email: normalized, p_amount: safeAmount, p_limit: limit }),
  })
  const row = rows?.[0] || {}
  const used = Math.max(0, Number(row.used || 0))
  const remaining = Math.max(0, Number(row.remaining ?? limit - used))
  return {
    allowed: Boolean(row.allowed),
    plan,
    limit,
    used,
    remaining,
    resetAt: nextUtcMidnight(),
  }
}

export const CREDIT_COSTS = {
  image: 1000,
  video: 5000,
  webcraft: 2000,
  ebook: 2000,
  presentation: 1500,
  vision: 500,
  live: 250,
} as const

export function estimateTextCredits(input: string, output = "") {
  return Math.max(1, Math.ceil((input.length + output.length) / 4))
}
