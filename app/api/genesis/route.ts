import { getToken } from "next-auth/jwt"
import { planGenesisTask } from "@/lib/lumin-genesis"
import { analyzeGenesisObjective } from "@/lib/lumin-genesis-analysis"

export async function POST(req: Request) {
  const token = await getToken({ req: req as any, secret: process.env.NEXTAUTH_SECRET }).catch(() => null)
  if (!token?.sub) return Response.json({ error: "Autenticação necessária" }, { status: 401 })
  const body = await req.json().catch(() => null)
  if (typeof body?.objective !== "string" || !body.objective.trim() || body.objective.length > 1200) {
    return Response.json({ error: "Objetivo inválido" }, { status: 400 })
  }
  if (body.runAnalysis === true) {
    try {
      return Response.json(await analyzeGenesisObjective(body.objective), { headers: { "Cache-Control": "no-store" } })
    } catch {
      return Response.json({ error: "Análise indisponível" }, { status: 503 })
    }
  }
  return Response.json({ status: "planned", plan: planGenesisTask(body.objective) }, { headers: { "Cache-Control": "no-store" } })
}
