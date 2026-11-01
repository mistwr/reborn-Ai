import { getToken } from "next-auth/jwt"
import { NextResponse } from "next/server"
import { generateLuminText } from "@/lib/lumin-ai-runtime"
import { comandoContextForAI, isComandoAdmin, loadComandoData } from "@/lib/comando/data"

export const dynamic = "force-dynamic"
export const maxDuration = 60

async function adminEmail(req: Request) {
  const token: any = await getToken({ req: req as any, secret: process.env.NEXTAUTH_SECRET }).catch(() => null)
  const email = token?.email || token?.user?.email || null
  return isComandoAdmin(email) ? String(email) : null
}

export async function GET(req: Request) {
  if (!(await adminEmail(req))) return NextResponse.json({ error: "Acesso reservado ao administrador." }, { status: 403 })
  return NextResponse.json(await loadComandoData())
}

const SYSTEM = `És o LUMIN Comando, o braço direito do Miguel (dono da LUMIN AI, do SD Dialer e da Soluções Diferentes, Porto).
Respondes em português de Portugal, informal, direto e curto (máx. 8 linhas, listas quando ajuda).
Usas APENAS os dados do bloco DADOS para números; se um dado não existir ou falhou ao ler, dizes isso em vez de inventar.
Quando fizer sentido, terminas com a próxima ação concreta (ex.: "liga à SNU 219 248 241").
Nesta fase só tens acesso de leitura: se te pedirem para alterar algo (preços, reembolsos, planos, publicar, enviar mensagens), explica o que farias e diz que essa ação ainda tem de ser feita no Claude ou no painel respetivo.`

export async function POST(req: Request) {
  if (!(await adminEmail(req))) return NextResponse.json({ error: "Acesso reservado ao administrador." }, { status: 403 })
  const body = await req.json().catch(() => ({}))
  const history = Array.isArray(body?.messages) ? body.messages.slice(-10) : []
  const question = String(body?.message || "").slice(0, 2000)
  if (!question.trim()) return NextResponse.json({ error: "Escreve uma pergunta." }, { status: 400 })

  const data = await loadComandoData()
  try {
    const result = await generateLuminText({
      system: `${SYSTEM}\n\nDADOS (${new Date().toLocaleString("pt-PT", { timeZone: "Europe/Lisbon" })}):\n${comandoContextForAI(data)}`,
      messages: [
        ...history
          .filter((m: any) => (m?.role === "user" || m?.role === "assistant") && typeof m?.content === "string")
          .map((m: any) => ({ role: m.role, content: String(m.content).slice(0, 2000) })),
        { role: "user", content: question },
      ],
      maxOutputTokens: 900,
      temperature: 0.3,
    })
    return NextResponse.json({ reply: result.text, model: result.model })
  } catch (e: any) {
    return NextResponse.json({ error: "A IA não respondeu agora. Os números do painel continuam atualizados.", detail: String(e?.message || e).slice(0, 200) }, { status: 502 })
  }
}
