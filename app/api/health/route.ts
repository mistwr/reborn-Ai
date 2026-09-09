import { NextResponse } from "next/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function configured(...keys: string[]) {
  return keys.every((key) => Boolean(process.env[key]?.trim()))
}

export async function GET() {
  const vercelOidcAvailable = Boolean(process.env.VERCEL_OIDC_TOKEN?.trim())
  const explicitGatewayKey = configured("AI_GATEWAY_API_KEY")
  const googleKey = configured("GOOGLE_GENERATIVE_AI_API_KEY")
  const vercelManagedGateway = Boolean(process.env.VERCEL_ENV)

  const aiAvailable = vercelManagedGateway || vercelOidcAvailable || explicitGatewayKey || googleKey

  const checks = {
    auth:
      configured("NEXTAUTH_SECRET") &&
      (configured("GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET") || process.env.NODE_ENV !== "production"),
    founder: configured("REBORN_OWNER_EMAILS"),
    ai: aiAvailable,
    aiAuth: vercelOidcAvailable
      ? "vercel_oidc"
      : explicitGatewayKey
        ? "gateway_api_key"
        : googleKey
          ? "google_api_key"
          : vercelManagedGateway
            ? "vercel_managed_gateway"
            : "missing",
    stripeCheckout: configured("STRIPE_SECRET_KEY", "STRIPE_PRICE_ID"),
    stripeWebhook: configured("STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET"),
    billingStore: configured("REBORN_SUPABASE_URL", "REBORN_SUPABASE_SERVICE_ROLE_KEY"),
    clipperTranscription: configured("ASSEMBLYAI_API_KEY"),
    metaPixel: configured("NEXT_PUBLIC_META_PIXEL_ID"),
    metaCapi: configured("META_PIXEL_ID", "META_CAPI_ACCESS_TOKEN"),
    supportWhatsApp: configured("NEXT_PUBLIC_SUPPORT_WHATSAPP"),
  }

  const required = ["auth", "ai", "stripeCheckout", "stripeWebhook", "billingStore"] as const
  const readyForPaidLaunch = required.every((key) => checks[key] === true)

  return NextResponse.json(
    {
      service: "reborn-ai",
      environment: process.env.VERCEL_ENV || process.env.NODE_ENV || "unknown",
      readyForPaidLaunch,
      checks,
      timestamp: new Date().toISOString(),
    },
    {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    },
  )
}
