import { getToken } from "next-auth/jwt"
import { NextResponse } from "next/server"
import { isComandoAdmin } from "@/lib/comando/data"
import { parseAction, runAction } from "@/lib/comando/actions"

export const dynamic = "force-dynamic"

export async function POST(req: Request) {
  const token: any = await getToken({ req: req as any, secret: process.env.NEXTAUTH_SECRET }).catch(() => null)
  if (!isComandoAdmin(token?.email || token?.user?.email)) return NextResponse.json({ error: "Acesso reservado ao administrador." }, { status: 403 })
  const action = parseAction(await req.json().catch(() => null))
  if (!action) return NextResponse.json({ error: "Ação inválida ou não permitida." }, { status: 400 })
  try {
    return NextResponse.json({ ok: true, message: await runAction(action) })
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message || e).slice(0, 240) }, { status: 400 })
  }
}
