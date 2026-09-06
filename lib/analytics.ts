import { track } from "@vercel/analytics"

type EventName =
  | "paywall_opened"
  | "checkout_started"
  | "checkout_error"
  | "pricing_viewed"
  | "pro_feature_clicked"
  | "whatsapp_clicked"
  | "payment_success_viewed"
  | "payment_cancel_viewed"
  | "subscription_created"
  | "subscription_cancelled"
  | "account_viewed"
  | "feature_used"
  | "signup_started"
  | "signup_completed"

export interface EventPayload {
  [key: string]: string | number | boolean | undefined
}

export function trackEvent(eventName: EventName, payload: EventPayload = {}): void {
  if (typeof window === "undefined") return

  try {
    track(eventName, payload)
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.debug(`[Analytics] ${eventName}`, payload, error)
    }
  }
}

export function trackPageView(path: string): void {
  trackEvent("feature_used", { feature: "page_view", path })
}
