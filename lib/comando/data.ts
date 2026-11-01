// LUMIN Comando — dados do negócio só para administradores (leitura).
// Usa o mesmo acesso ao Supabase que o resto da app (REBORN_SUPABASE_URL + chave do proxy).

const CAMPANHA_BROKERS = "dbd5fe40-d44e-4e9f-a448-20e61036f880"
const DEFAULT_ADMINS = "miguelferreiranoss@gmail.com"

export function isComandoAdmin(email?: string | null) {
  if (!email) return false
  const list = (process.env.COMANDO_ADMIN_EMAILS || DEFAULT_ADMINS).split(",").map(e => e.trim().toLowerCase()).filter(Boolean)
  return list.includes(email.trim().toLowerCase())
}

async function rest<T = any>(path: string): Promise<T> {
  const url = process.env.REBORN_SUPABASE_URL?.replace(/\/$/, "")
  const key = process.env.REBORN_SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error("Base de dados não configurada")
  const response = await fetch(`${url}/rest/v1/${path}`, {
    headers: { apikey: key, Authorization: `Bearer ${key}`, Accept: "application/json" },
    cache: "no-store",
  })
  if (!response.ok) throw new Error(`${path.split("?")[0]}: ${response.status}`)
  return response.json()
}

export async function restWrite(path: string, method: "POST" | "PATCH", body: unknown) {
  const url = process.env.REBORN_SUPABASE_URL?.replace(/\/$/, "")
  const key = process.env.REBORN_SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error("Base de dados não configurada")
  const response = await fetch(`${url}/rest/v1/${path}`, {
    method,
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", Accept: "application/json", Prefer: "return=representation" },
    body: JSON.stringify(body),
    cache: "no-store",
  })
  const text = await response.text()
  if (!response.ok) throw new Error(`${path.split("?")[0]}: ${response.status} ${text.slice(0, 160)}`)
  return text ? JSON.parse(text) : null
}

export { rest as restRead }

async function safe<T>(fn: () => Promise<T>, fallback: T, errors: string[], label: string): Promise<T> {
  try {
    return await fn()
  } catch (e: any) {
    errors.push(`${label}: ${String(e?.message || e).slice(0, 120)}`)
    return fallback
  }
}

export type ComandoData = Awaited<ReturnType<typeof loadComandoData>>

export async function loadComandoData() {
  const errors: string[] = []
  const since30 = new Date(Date.now() - 30 * 86400_000).toISOString()
  const since7 = Date.now() - 7 * 86400_000
  const since1 = Date.now() - 86400_000

  const [revenue, subs, companies, accounts, leads, vendas, resumo] = await Promise.all([
    safe(() => rest<any[]>(`lumin_revenue_events?select=event_type,amount,status,customer_email,occurred_at,metadata&occurred_at=gte.${since30}&order=occurred_at.desc&limit=200`), [], errors, "receita"),
    safe(() => rest<any[]>(`reborn_subscriptions?select=email,status,plan,billing_plan,current_period_end,updated_at&order=updated_at.desc&limit=200`), [], errors, "subscrições"),
    safe(() => rest<any[]>(`companies?select=name,status,plan,created_at&order=created_at.desc`), [], errors, "empresas SD Dialer"),
    safe(() => rest<any[]>(`lumin_accounts?select=account_type,created_at&limit=1000`), [], errors, "contas LUMIN"),
    safe(() => rest<any[]>(`leads?select=nome,telefone,status,priority,localidade,updated_at&campanha_id=eq.${CAMPANHA_BROKERS}&order=priority.asc`), [], errors, "prospeção"),
    safe(() => rest<any[]>(`vendas?select=status,operator,service_type,amount,sale_date,created_at&deleted_at=is.null&created_at=gte.${since30}&limit=1000`), [], errors, "vendas broker"),
    safe(() => restWrite("rpc/comando_resumo", "POST", {}), {} as any, errors, "resumo"),
  ])

  const real = revenue.filter(r => r.status !== "teste_interno" && !(r.metadata && r.metadata.teste))
  const sum = (rows: any[]) => Math.round(rows.reduce((t, r) => t + Number(r.amount || 0), 0) * 100) / 100
  const at = (r: any) => new Date(r.occurred_at).getTime()
  const productOf = (r: any) => String(r.metadata?.product || "lumin-ai")

  const byProduct: Record<string, { n: number; total: number }> = {}
  for (const r of real) {
    const p = productOf(r)
    byProduct[p] = byProduct[p] || { n: 0, total: 0 }
    byProduct[p].n++
    byProduct[p].total = Math.round((byProduct[p].total + Number(r.amount || 0)) * 100) / 100
  }

  const activeSubs = subs.filter(s => s.status === "active" || s.status === "trialing")
  const leadsByStatus: Record<string, number> = {}
  for (const l of leads) leadsByStatus[l.status || "?"] = (leadsByStatus[l.status || "?"] || 0) + 1
  const vendasByStatus: Record<string, number> = {}
  for (const v of vendas) vendasByStatus[v.status || "?"] = (vendasByStatus[v.status || "?"] || 0) + 1

  return {
    generatedAt: new Date().toISOString(),
    receita: {
      hoje: sum(real.filter(r => at(r) >= since1)),
      semana: sum(real.filter(r => at(r) >= since7)),
      mes: sum(real),
      vendas30d: real.length,
      porProduto: byProduct,
      ultimas: real.slice(0, 10).map(r => ({ quando: r.occurred_at, valor: Number(r.amount || 0), produto: productOf(r), cliente: r.customer_email || "", estado: r.status })),
    },
    lumin: {
      contas: accounts.length,
      subscricoesAtivas: activeSubs.length,
      pro: activeSubs.filter(s => s.billing_plan === "business").length,
      starter: activeSubs.filter(s => s.billing_plan !== "business").length,
    },
    sdDialer: {
      empresas: companies.length,
      lista: companies.map(c => ({ nome: c.name, estado: c.status, plano: c.plan })),
    },
    resumo: {
      leadsPorEmpresaOrigem30d: resumo?.leads_por_empresa_origem_30d || [],
      leadsSite: resumo?.leads_site || [],
      prospecao: resumo?.prospecao || [],
      empresas: resumo?.empresas || [],
    },
    prospecao: {
      total: leads.length,
      porEstado: leadsByStatus,
      proximas: leads.filter(l => (l.status || "novo") === "novo").slice(0, 8).map(l => ({ nome: l.nome, telefone: l.telefone, prioridade: l.priority, local: l.localidade })),
    },
    broker: {
      vendas30d: vendas.length,
      porEstado: vendasByStatus,
    },
    errors,
  }
}

// Versão sem dados pessoais para enviar ao modelo de IA.
export function comandoContextForAI(d: ComandoData) {
  return JSON.stringify({
    geradoEm: d.generatedAt,
    receita: { ...d.receita, ultimas: d.receita.ultimas.map(({ cliente, ...rest }) => rest) },
    lumin: d.lumin,
    sdDialer: d.sdDialer,
    prospecao: { porEstado: d.prospecao.porEstado, leads: d.resumo.prospecao },
    leadsDoSite: d.resumo.leadsSite,
    leadsNovasPorEmpresaEOrigem30d: d.resumo.leadsPorEmpresaOrigem30d,
    empresasSdDialer: d.resumo.empresas,
    broker: d.broker,
    falhasAoLerDados: d.errors,
    precos: { luminStarter: "9,99€/mês", luminPro: "69,99€/mês", packs: "19/49/99€", sdDialer: "70€/admin + 10€/utilizador, 14 dias grátis", rececionistaIA: "99€/mês", vendedorIA: "249€/mês", agenteMedida: "desde 499€/mês" },
  })
}
