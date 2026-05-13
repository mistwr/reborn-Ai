import { NextRequest, NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"
import { 
  createSubscription, 
  updateSubscription, 
  cancelSubscription,
  getSubscriptionByStripeSubId 
} from "@/lib/billing/store"
import { PRO_PLAN } from "@/lib/plans"
import Stripe from "stripe"

export async function POST(req: NextRequest) {
  const body = await req.text()
  const signature = req.headers.get("stripe-signature")

  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 })
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err) {
    console.error("[Stripe Webhook] Signature verification failed:", err)
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
  }

  console.log("[Stripe Webhook] Event:", event.type)

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session
        
        if (session.mode === "subscription" && session.subscription) {
          const subscription = await stripe.subscriptions.retrieve(
            session.subscription as string
          )
          
          await createSubscription({
            email: session.customer_email || session.customer_details?.email || "",
            stripeCustomerId: session.customer as string,
            stripeSubscriptionId: subscription.id,
            stripePriceId: subscription.items.data[0]?.price.id || "",
            status: "active",
            plan: "pro",
            currentPeriodStart: new Date(subscription.current_period_start * 1000),
            currentPeriodEnd: new Date(subscription.current_period_end * 1000),
            tokensPerDay: PRO_PLAN.tokensPerDay,
          })
          
          console.log("[Stripe Webhook] Subscription created for:", session.customer_email)
        }
        break
      }

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription
        const existing = await getSubscriptionByStripeSubId(subscription.id)
        
        if (existing) {
          await updateSubscription(subscription.id, {
            status: subscription.status as "active" | "canceled" | "past_due" | "incomplete" | "trialing",
            currentPeriodStart: new Date(subscription.current_period_start * 1000),
            currentPeriodEnd: new Date(subscription.current_period_end * 1000),
          })
        }
        break
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription
        await cancelSubscription(subscription.id)
        console.log("[Stripe Webhook] Subscription cancelled:", subscription.id)
        break
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice
        if (invoice.subscription) {
          await updateSubscription(invoice.subscription as string, {
            status: "active",
          })
        }
        break
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice
        if (invoice.subscription) {
          await updateSubscription(invoice.subscription as string, {
            status: "past_due",
          })
        }
        console.log("[Stripe Webhook] Payment failed for subscription:", invoice.subscription)
        break
      }
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error("[Stripe Webhook] Error processing event:", error)
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 })
  }
}
