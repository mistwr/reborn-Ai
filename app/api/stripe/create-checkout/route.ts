import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const { priceId, userId } = await request.json()

    const checkoutUrl = "https://buy.stripe.com/eVqdR93RbaHQ4ecbk95Rm00"

    return NextResponse.json({ url: checkoutUrl })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
