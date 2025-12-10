import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const { priceId, userId } = await request.json()

    const checkoutUrl = "https://buy.stripe.com/test_9B64gz3XY0WNfuA9AV"

    return NextResponse.json({ url: checkoutUrl })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
