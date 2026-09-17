import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"

export const runtime = "nodejs"

const CREDIT_PACKS = {
  starter: {
    name: "20.000 créditos",
    credits: 20_000,
    paymentLink: "https://buy.stripe.com/6oU7sL5Zj03c8us1Jz5Rm0d",
    refPrefix: "lumin_credits20_",
  },
  boost: {
    name: "60.000 créditos",
    credits: 60_000,
    paymentLink: "https://buy.stripe.com/8x23cv4Vf5nw8usbk95Rm0b",
    refPrefix: "lumin_credits60_",
  },
  max: {
    name: "150.000 créditos",
    credits: 150_000,
    paymentLink: "https://buy.stripe.com/5kQcN53Rb3fo7qo1Jz5Rm0c",
    refPrefix: "lumin_credits150_",
  },
} as const

type PackId = keyof typeof CREDIT_PACKS

function safeRef(value: unknown) {
  return String(value || "").replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 160)
}

export async function GET() {
  return NextResponse.json({
    packs: Object.entries(CREDIT_PACKS).map(([id, pack]) => ({
      id,
      name: pack.name,
      credits: pack.credits,
      available: true,
    })),
  })
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions as any)
    const user = (session?.user || {}) as any
    const email = String(user?.email || "").trim().toLowerCase()
    if (!email) return NextResponse.json({ error: "Inicia sessão para comprar créditos." }, { status: 401 })

    const body = await req.json().catch(() => ({}))
    const packId = String(body?.pack || "") as PackId
    if (!(packId in CREDIT_PACKS)) {
      return NextResponse.json({ error: "Pack de créditos inválido." }, { status: 400 })
    }

    const pack = CREDIT_PACKS[packId]
    const userId = safeRef(user?.id)
    const url = new URL(pack.paymentLink)
    url.searchParams.set("locked_prefilled_email", email)
    if (userId) url.searchParams.set("client_reference_id", `${pack.refPrefix}${userId}`)

    return NextResponse.json({
      url: url.toString(),
      pack: packId,
      credits: pack.credits,
      mode: "payment_link",
    })
  } catch (error) {
    console.error("[Lumin Credits] checkout failed", error)
    return NextResponse.json({ error: "Erro interno ao iniciar a compra de créditos." }, { status: 500 })
  }
}
