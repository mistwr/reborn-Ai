import { NextRequest, NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"
import { generateLuminText } from "@/lib/lumin-ai-runtime"

export const runtime = "nodejs"
export const maxDuration = 60
export const dynamic = "force-dynamic"

type AgentProfile = {
  id?: string
  name?: string
  company?: string
  description?: string
  objective?: string
  product?: string
  offer?: string
  opening?: string
  objections?: string
  notes?: string
  tone?: string
}

type HistoryItem = {
  role?: "user" | "assistant"
  text?: string
}

function clean(value: unknown, limit: number) {
  return String(value || "").trim().slice(0, limit)
}

function systemPrompt(agent: AgentProfile) {
  const name = clean(agent.name, 80) || "Lumin"
  const company = clean(agent.company, 120) || "LUMIN AI"
  const sections = [
    ["DESCRIÇÃO / PERSONALIDADE", clean(agent.description, 900)],
    ["OBJETIVO", clean(agent.objective, 600)],
    ["PRODUTO / SERVIÇO", clean(agent.product, 1400)],
    ["OFERTA / CONDIÇÕES AUTORIZADAS", clean(agent.offer, 1400)],
    ["ABERTURA", clean(agent.opening, 900)],
    ["OBJEÇÕES", clean(agent.objections, 1800)],
    ["NOTAS / REGRAS", clean(agent.notes, 2200)],
    ["TOM", clean(agent.tone, 400)],
  ]
    .filter(([, value]) => value)
    .map(([title, value]) => `${title}:\n${value}`)
    .join("\n\n")

  return `Tu és ${name}, um agente virtual de inteligência artificial da ${company}, numa conversa de voz ao vivo.

REGRAS OBRIGATÓRIAS
- Identifica-te como assistente/agente de IA quando for apropriado; nunca finjas ser humano.
- Fala em Português de Portugal.
- Responde de forma curta, natural e conversacional: normalmente uma ou duas frases.
- Faz no máximo uma pergunta de cada vez.
- Mantém contexto e responde primeiro ao que a pessoa acabou de dizer.
- Não inventes preços, campanhas, resultados, clientes, condições ou capacidades.
- Se não souberes, diz que não queres inventar.
- Não uses pressão enganadora nem falsa urgência.
- Se a pessoa pedir para terminar, respeita imediatamente.
- Não uses markdown, listas longas ou linguagem de documento: isto vai ser falado por voz.

CONTEXTO DO AGENTE
${sections || "Sem contexto comercial adicional."}`.trim()
}

export async function POST(request: NextRequest) {
  try {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET }).catch(() => null)
    if (!token?.sub) {
      return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const agent = (body?.agent || {}) as AgentProfile
    const message = clean(body?.message, 1800)
    const history = Array.isArray(body?.history) ? (body.history as HistoryItem[]) : []

    if (!message) {
      return NextResponse.json({ error: "Mensagem em falta" }, { status: 400 })
    }

    const recent = history
      .slice(-8)
      .map((item) => {
        const role = item?.role === "assistant" ? "AGENTE" : "UTILIZADOR"
        return `${role}: ${clean(item?.text, 1000)}`
      })
      .filter(Boolean)
      .join("\n")

    const prompt = `${recent ? `CONVERSA ANTERIOR:\n${recent}\n\n` : ""}UTILIZADOR: ${message}\nAGENTE:`

    const result = await generateLuminText({
      system: systemPrompt(agent),
      prompt,
      maxOutputTokens: 260,
      temperature: 0.55,
      retryRounds: 2,
    })

    const text = clean(result.text, 1800)
    return NextResponse.json({
      ok: true,
      text,
      model: result.model,
    })
  } catch (error) {
    console.error("[Lumin Agent Live] failed", error)
    return NextResponse.json({ error: "Falha temporária no agente live" }, { status: 500 })
  }
}
