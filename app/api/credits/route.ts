import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { getCreditStatus } from "@/lib/credits"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET() {
  const session = await getServerSession(authOptions as any)
  const email = session?.user?.email
  if (!email) return NextResponse.json({ error: "Sessão necessária" }, { status: 401 })

  try {
    const status = await getCreditStatus(email)
    return NextResponse.json(status, { headers: { "Cache-Control": "no-store" } })
  } catch (error) {
    console.error("[credits] status failed", error)
    return NextResponse.json({ error: "Não foi possível carregar os créditos" }, { status: 503 })
  }
}
