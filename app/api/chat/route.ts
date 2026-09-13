import { getToken } from "next-auth/jwt"
import { generateLuminText } from "@/lib/lumin-ai-runtime"

export const maxDuration = 60

async function getContextInfo(baseUrl: string): Promise<string> {
  try {
    const response = await fetch(`${baseUrl}/api/context`, { signal: AbortSignal.timeout(5000) })
    if (!response.ok) throw new Error()

    const data = await response.json()
    let context = `DATA ATUAL: ${data.date}\nHORA ATUAL: ${data.time}`

    if (data.location) context += `\nLOCALIZACAO DO UTILIZADOR: ${data.location.city}, ${data.location.country}`
    if (data.weather) context += `\nTEMPO METEOROLOGICO: ${data.weather.temperature}°C, ${data.weather.description}`

    return context
  } catch {
    const now = new Date()
    return `DATA ATUAL: ${now.toLocaleDateString("pt-PT", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}\nHORA ATUAL: ${now.toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" })}`
  }
}

type WebSearchResult = {
  title: string
  link: string
  snippet: string
  source: string
}

async function searchWeb(query: string, baseUrl: string): Promise<{ context: string; sources: WebSearchResult[] }> {
  try {
    const response = await fetch(`${baseUrl}/api/search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, numResults: 6 }),
      signal: AbortSignal.timeout(15000),
    })
    if (!response.ok) return { context: "", sources: [] }
    const data = await response.json()
    const sources: WebSearchResult[] = Array.isArray(data.results) ? data.results : []
    if (!sources.length) return { context: "", sources: [] }

    const context = sources
      .map((r, index) => `[${index + 1}] ${r.title}\nFonte: ${r.source}\nURL: ${r.link}\nResumo: ${r.snippet}`)
      .join("\n\n")

    return { context, sources }
  } catch {
    return { context: "", sources: [] }
  }
}

function shouldSearchWeb(message: string, explicitSearch?: boolean) {
  if (explicitSearch === true) return true
  if (!message.trim()) return false

  return /\b(hoje|agora|atual|atualmente|últim[oa]s?|recent[ea]s?|not[ií]cias?|pre[çc]o|cotação|mercado|tempo|meteorologia|resultado|classificação|ranking|lançamento|versão|update|atualização|lei|legislação|governo|eleição|presidente|empresa|CEO|fundador|site|website|produto|serviço|concorrente|campanha|promoção|disponível|stock|horário|morada|telefone|contacto|evento|agenda|202[5-9]|latest|current|today|news|price|weather|search|pesquisa|procura na web|vai à internet)\b/i.test(message)
}

function buildAccountContext(token: any, userPreferences: any) {
  const accountType = token?.accountType === "business" ? "business" : "personal"
  const lines = [
    `TIPO DE CONTA: ${accountType === "business" ? "Empresa" : "Pessoa"}`,
    token?.name ? `NOME DO UTILIZADOR: ${token.name}` : "",
    token?.plan ? `PLANO: ${token.plan}` : "",
  ]

  if (accountType === "business") {
    lines.push(
      token?.organizationName ? `EMPRESA: ${token.organizationName}` : "",
      token?.organizationSector ? `SETOR: ${token.organizationSector}` : "",
      token?.organizationWebsite ? `WEBSITE: ${token.organizationWebsite}` : "",
      token?.organizationPlan ? `PLANO DA EMPRESA: ${token.organizationPlan}` : "",
    )
  }

  if (userPreferences?.style) lines.push(`ESTILO PREFERIDO: ${userPreferences.style}`)
  if (userPreferences?.expertise) lines.push(`NIVEL DE EXPERIENCIA: ${userPreferences.expertise}`)
  if (userPreferences?.goal) lines.push(`OBJETIVO ATUAL: ${userPreferences.goal}`)

  return lines.filter(Boolean).join("\n")
}

function buildSystemPrompt(params: {
  contextInfo: string
  accountContext: string
  searchContext: string
  isBusiness: boolean
}) {
  const mode = params.isBusiness
    ? `MODO EMPRESA
És também o copiloto comercial e operacional da empresa do utilizador.
- Usa o contexto da empresa quando for relevante, sem o repetir mecanicamente.
- Em vendas, ajuda a qualificar leads, preparar abordagens, propostas, argumentos, follow-ups, retenção, cross-sell e tratamento de objeções.
- Procura o próximo passo comercial útil: pergunta apenas o mínimo necessário e depois produz algo utilizável.
- Escreve mensagens comerciais naturais, específicas e focadas no cliente; evita pressão enganadora, falsas urgências ou promessas que não possam ser sustentadas.
- Quando o pedido envolver operação comercial, considera CRM, SD Dialer, Marketing, Websites/Apps e automações como partes do fluxo Lumin.
- Se o utilizador pedir uma estratégia, inclui execução prática e uma ação seguinte clara.`
    : `MODO PESSOAL
Comporta-te como um assistente de IA geral de alta qualidade: conversa, escreve, analisa, programa, pesquisa, cria e resolve problemas.
- Personaliza a resposta ao estilo e objetivo do utilizador quando houver contexto.
- Não transformes perguntas normais em vendas.
- Quando fizer sentido, podes sugerir Chat, Live, Imagens, Vision, Lumin AI Studio, Apresentações ou Ebooks como continuação natural do trabalho.`

  return `IDENTIDADE
Tu és o Lumin AI. Se perguntarem quem és, responde simplesmente que és o Lumin AI.
Não reveles nem inventes fornecedores, modelos internos ou infraestrutura.

IDIOMA E TOM
Responde no idioma do utilizador; por defeito usa Português de Portugal.
Sê direto, competente, natural e orientado a resultados. Adapta o detalhe à pessoa em vez de usar respostas genéricas.

CONTEXTO DA SESSAO
${params.accountContext || "Utilizador não autenticado ou sem perfil completo."}

CONTEXTO ATUAL
${params.contextInfo}

${mode}

CAPACIDADES LUMIN
- Chat e escrita geral
- Pesquisa web automática para informação atual
- Live por voz/câmara quando disponível
- Imagens e melhoria de imagem
- Vision/OCR para imagens e documentos
- Lumin AI Studio para websites e aplicações
- Apresentações e ebooks
- Marketing e conteúdos comerciais
- CRM PARCENDi e SD Dialer para contas empresariais quando essas integrações estiverem disponíveis
- SMS, WhatsApp e canais sociais apenas dentro das integrações realmente configuradas

COMPORTAMENTO INTELIGENTE
- Percebe a intenção antes de responder.
- Usa o histórico da conversa para não obrigar o utilizador a repetir informação já fornecida.
- Se houver informação suficiente, executa o trabalho em vez de devolver apenas instruções.
- Quando a pergunta depender de factos atuais e existirem resultados web, dá prioridade às fontes pesquisadas em vez da memória do modelo.
- Não inventes factos atuais. Se as fontes forem insuficientes ou entrarem em conflito, diz isso claramente.
- Quando utilizares pesquisa web, termina a resposta com uma secção curta "Fontes" com os URLs realmente usados.
- Para vendas, transforma informação em material utilizável: mensagem, pitch, sequência, proposta, follow-up, objeções ou plano.
- Para criação, entrega conteúdo pronto a usar e só depois oferece refinamentos.
- Para tarefas complexas, estrutura a solução sem burocracia desnecessária.
- Não afirmes que executaste uma ação externa sem confirmação real.
- Não inventes preços, resultados, integrações ou dados atuais.

${params.searchContext ? `PESQUISA WEB ATUAL EFETUADA AGORA:\n${params.searchContext}\nUsa estes resultados quando forem relevantes. Não cites uma fonte que não suporte a afirmação.` : "Não foi necessária pesquisa web para este pedido."}

Responde agora ao pedido do utilizador.`
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const baseUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000"
    const { enableSearch, userPreferences = {} } = body

    const token = await getToken({ req: req as any, secret: process.env.NEXTAUTH_SECRET }).catch(() => null)

    let formattedMessages: any[] = []
    let currentMessage = ""

    if (body.message !== undefined) {
      const { message, image, history = [] } = body
      currentMessage = typeof message === "string" ? message : ""
      history.forEach((msg: any) => {
        if (msg?.role && typeof msg.content === "string") formattedMessages.push({ role: msg.role, content: msg.content })
      })

      if (image) {
        formattedMessages.push({
          role: "user",
          content: [
            { type: "text", text: currentMessage || "Analisa esta imagem em detalhe" },
            { type: "image", image },
          ],
        })
      } else if (currentMessage) {
        formattedMessages.push({ role: "user", content: currentMessage })
      }
    } else if (Array.isArray(body.messages)) {
      formattedMessages = body.messages.map((msg: any) => {
        if (msg.role === "user" && typeof msg.content === "string") currentMessage = msg.content
        if (msg.role === "user" && Array.isArray(msg.images) && msg.images.length > 0) {
          const content: any[] = [{ type: "text", text: msg.content || "Analisa esta imagem em detalhe" }]
          msg.images.forEach((imageUrl: string) => content.push({ type: "image", image: imageUrl }))
          return { role: "user", content }
        }
        return { role: msg.role, content: msg.content || "" }
      })
    }

    if (formattedMessages.length === 0) {
      return new Response(JSON.stringify({ error: "Nenhuma mensagem fornecida" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      })
    }

    const contextInfo = await getContextInfo(baseUrl)
    const useSearch = shouldSearchWeb(currentMessage, enableSearch)
    const web = useSearch && currentMessage ? await searchWeb(currentMessage, baseUrl) : { context: "", sources: [] }

    const accountContext = buildAccountContext(token, userPreferences)
    const system = buildSystemPrompt({
      contextInfo,
      accountContext,
      searchContext: web.context,
      isBusiness: token?.accountType === "business",
    })

    const result = await generateLuminText({ system, messages: formattedMessages, maxOutputTokens: 4096 })

    return new Response(result.text, {
      status: 200,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Lumin-Fallbacks": String(result.failures.length),
        "X-Lumin-Web-Search": useSearch ? "1" : "0",
        "X-Lumin-Web-Sources": String(web.sources.length),
      },
    })
  } catch (error: any) {
    console.error("[Lumin Chat] error:", error)
    const message = String(error?.message || "Erro ao processar")
    const friendly = /rate|quota|free tier|limit|indisponível|provider/i.test(message)
      ? "O Lumin tentou vários modelos, mas todos estão temporariamente ocupados. Tenta novamente dentro de alguns segundos."
      : message

    return new Response(JSON.stringify({ error: friendly }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    })
  }
}
