import { NextResponse } from "next/server"
import { getStripeReadiness } from "@/lib/stripe/config"

export const runtime = "nodejs"

export async function GET() {
  const readiness = getStripeReadiness()
  return NextResponse.json({
    provider: "stripe",
    ...readiness,
  })
}
