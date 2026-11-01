import { getToken } from "next-auth/jwt"
import { NextResponse } from "next/server"
import { generateLuminText } from "@/lib/lumin-ai-runtime"
import { comandoContextForAI, isComandoAdmin, loadComandoData } from "@/lib/comando/data"
import { describeAction, LEAD_STATUS, parseAction } from "@/lib/comando/actions"

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
Respondes em português de Portugal, informal, direto e curto (máx. 8 linhas; usa **negrito** e listas com "- " quando ajuda).
Usas APENAS os dados do bloco DADOS para números e factos; se um dado não existir, dizes isso em vez de inventar.
Origem das leads: "manual" = adicionada à mão (a prospeção de brokers foi criada pelo Claude a 1/11); "importacao" = ficheiro importado; "porta" = porta a porta; leadsDoSite = formulários do luminai.pt (análise gratuita / simulação). O "LUMIN Growth" é o playbook de crescimento (SEO + prospeção por email), não uma fonte de dados.
Quando fizer sentido, terminas com a próxima ação concreta.

AÇÕES: podes PROPOR (nunca executas tu) uma destas ações, e o Miguel confirma num botão:
- atualizar_lead: {"tipo":"atualizar_lead","lead_id":"<id da lista de prospeção ou leadsDoSite>","status":"<${LEAD_STATUS.join("|")}>","nota":"texto opcional","resumo":"frase curta"}
- nova_lead: {"tipo":"nova_lead","nome":"...","telefone":"9 dígitos","email":"opcional","localidade":"opcional","nota":"opcional","resumo":"frase curta"}
- aviso: {"tipo":"aviso","texto":"lembrete a enviar já para o telemóvel","resumo":"frase curta"}
Para propor, escreve a resposta normal e no fim UM bloco exatamente assim:
\`\`\`acao
{json numa só linha}
\`\`\`
Só uma ação por resposta, só quando o Miguel pede ou claramente quer (ex.: "a SNU não atendeu", "marca a NOX como interessada", "adiciona esta empresa", "lembra-me de ligar à Bergcom").
Fora destas ações (preços, reembolsos, planos pagos, publicar, mensagens a clientes, código) não tens acesso: explica o que é preciso e diz que se faz no Claude.`

function splitAction(text: string) {
  const m = text.match(/```acao\s*([\s\S]*?)```/i)
  if (!m) return { reply: text.trim(), action: null as any }
  let action = null
  try { action = parseAction(JSON.parse(m[1].trim())) } catch {}
  const reply = text.replace(m[0], "").trim()
  return { reply: reply || (action ? describeAction(action) : ""), action: action ? { ...action, descricao: describeAction(action) } : null }
}

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
      maxOutputTokens: 1100,
      temperature: 0.3,
    })
    const { reply, action } = splitAction(result.text)
    return NextResponse.json({ reply, action, model: result.model })
  } catch (e: any) {
    return NextResponse.json({ error: "A IA não respondeu agora. Os números do painel continuam atualizados.", detail: String(e?.message || e).slice(0, 200) }, { status: 502 })
  }
}
