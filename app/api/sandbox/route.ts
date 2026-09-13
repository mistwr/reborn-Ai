import { NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"
import { executeLuminSandbox } from "@/lib/lumin-sandbox"

export const runtime = "nodejs"
export const maxDuration = 60

export async function POST(req: Request) {
  try {
    const auth = await getToken({ req: req as any, secret: process.env.NEXTAUTH_SECRET }).catch(() => null)
    if (!auth?.sub && process.env.NODE_ENV === "production") {
      return NextResponse.json({ error: "Autenticação necessária" }, { status: 401 })
    }

    const body = await req.json().catch(() => ({}))
    const language = body?.language === "python" ? "python" : "node"
    const code = typeof body?.code === "string" ? body.code : ""
    const result = await executeLuminSandbox({ language, code })

    return NextResponse.json(result, { status: result.ok ? 200 : result.code === "SANDBOX_NOT_CONFIGURED" ? 503 : 400 })
  } catch (error) {
    console.error("[Lumin Sandbox API] error", error)
    return NextResponse.json({ error: "Erro na sandbox do Lumin" }, { status: 500 })
  }
}
