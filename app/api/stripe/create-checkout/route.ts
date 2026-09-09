import { POST as createCheckoutSession } from "@/app/api/stripe/checkout/route"

export const runtime = "nodejs"

// Compatibility route for older Reborn clients.
// Never return a hardcoded Stripe Payment Link here: all purchases must go
// through the canonical Checkout Session flow so price validation, metadata,
// success/cancel URLs and webhook-based Pro activation stay consistent.
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}))
  const headers = new Headers({ "Content-Type": "application/json" })
  const origin = request.headers.get("origin")
  if (origin) headers.set("origin", origin)

  const canonicalRequest = new Request(new URL("/api/stripe/checkout", request.url), {
    method: "POST",
    headers,
    body: JSON.stringify({
      email: typeof body?.email === "string" ? body.email : undefined,
      attribution: body?.attribution && typeof body.attribution === "object" ? body.attribution : undefined,
    }),
  })

  return createCheckoutSession(canonicalRequest)
}
