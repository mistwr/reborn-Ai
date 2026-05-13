/**
 * Simple Analytics Tracking
 * 
 * TODO: Connect to Vercel Analytics or PostHog for production
 * Currently logs to console for development
 */

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

interface EventPayload {
  [key: string]: string | number | boolean | undefined
}

export function trackEvent(eventName: EventName, payload?: EventPayload): void {
  // TODO: Replace with real analytics (Vercel Analytics, PostHog, etc.)
  if (typeof window !== "undefined") {
    console.log(`[Analytics] ${eventName}`, payload || {})
    
    // If Vercel Analytics is available
    if (typeof (window as unknown as { va?: (event: string, data?: EventPayload) => void }).va === "function") {
      (window as unknown as { va: (event: string, data?: EventPayload) => void }).va(eventName, payload)
    }
  }
}

export function trackPageView(path: string): void {
  console.log(`[Analytics] Page View: ${path}`)
}
