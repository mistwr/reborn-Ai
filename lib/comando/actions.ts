// LUMIN Comando — ações permitidas (só depois de o admin carregar em "Confirmar").
import { restRead, restWrite } from "@/lib/comando/data"

const CAMPANHA_BROKERS = "dbd5fe40-d44e-4e9f-a448-20e61036f880"
const EMPRESA_SD_DIALER = "e27c8324-989a-4a68-b3a3-902cba74696c"
const MIGUEL = "8c43ee2a-9c99-4493-a215-abcb0849b8bf"
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export const LEAD_STATUS = ["novo", "contactado", "vendido", "nao_interessado", "nao_atende", "numero_errado", "ligar_depois", "sem_cobertura", "outro", "desligado", "numero_nao_atribuido", "pertence_outra_pessoa"] as const

export type ComandoAction =
  | { tipo: "atualizar_lead"; lead_id: string; status?: string; nota?: string; resumo?: string }
  | { tipo: "nova_lead"; nome: string; telefone: string; email?: string; localidade?: string; nota?: string; resumo?: string }
  | { tipo: "aviso"; texto: string; resumo?: string }

const clean = (v: unknown, max = 300) => String(v ?? "").replace(/[\u0000-\u001f]/g, " ").trim().slice(0, max)
const stamp = () => new Date().toLocaleString("pt-PT", { timeZone: "Europe/Lisbon", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })

export function describeAction(a: ComandoAction) {
  if (a.tipo === "atualizar_lead") return a.resumo || `Atualizar lead${a.status ? ` para "${a.status}"` : ""}${a.nota ? ` com nota: ${a.nota}` : ""}`
  if (a.tipo === "nova_lead") return a.resumo || `Adicionar ${a.nome} (${a.telefone}) à prospeção`
  return a.resumo || `Enviar aviso para o telemóvel: ${a.texto}`
}

export function parseAction(raw: unknown): ComandoAction | null {
  const a: any = raw
  if (!a || typeof a !== "object") return null
  if (a.tipo === "atualizar_lead" && UUID.test(String(a.lead_id || ""))) {
    const status = a.status ? String(a.status) : undefined
    if (status && !LEAD_STATUS.includes(status as any)) return null
    if (!status && !a.nota) return null
    return { tipo: "atualizar_lead", lead_id: String(a.lead_id), status, nota: a.nota ? clean(a.nota, 500) : undefined, resumo: a.resumo ? clean(a.resumo, 160) : undefined }
  }
  if (a.tipo === "nova_lead") {
    const telefone = String(a.telefone || "").replace(/[^\d+]/g, "")
    if (!clean(a.nome) || telefone.replace(/\D/g, "").length < 9) return null
    return { tipo: "nova_lead", nome: clean(a.nome, 120), telefone, email: a.email ? clean(a.email, 120) : undefined, localidade: a.localidade ? clean(a.localidade, 80) : undefined, nota: a.nota ? clean(a.nota, 500) : undefined, resumo: a.resumo ? clean(a.resumo, 160) : undefined }
  }
  if (a.tipo === "aviso" && clean(a.texto)) return { tipo: "aviso", texto: clean(a.texto, 400), resumo: a.resumo ? clean(a.resumo, 160) : undefined }
  return null
}

export async function runAction(a: ComandoAction): Promise<string> {
  if (a.tipo === "atualizar_lead") {
    const rows = await restRead<any[]>(`leads?select=id,nome,observacoes,campanha_id,company_id,custom_fields&id=eq.${a.lead_id}&limit=1`)
    const lead = rows?.[0]
    if (!lead) throw new Error("Lead não encontrada.")
    // Só mexe em leads da prospeção ou das que vieram do site (nunca em leads de clientes do SD Dialer).
    const allowed = lead.campanha_id === CAMPANHA_BROKERS || lead.custom_fields?.source === "luminai.pt"
    if (!allowed) throw new Error("Esta lead não pertence à prospeção nem ao site; por segurança não lhe mexo.")
    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (a.status) patch.status = a.status
    if (a.nota) patch.observacoes = `${lead.observacoes ? lead.observacoes + "\n" : ""}[${stamp()}] ${a.nota}`
    await restWrite(`leads?id=eq.${a.lead_id}`, "PATCH", patch)
    return `Feito: ${lead.nome}${a.status ? ` → ${a.status}` : ""}${a.nota ? " (nota guardada)" : ""}.`
  }
  if (a.tipo === "nova_lead") {
    const dup = await restRead<any[]>(`leads?select=id,nome&company_id=eq.${EMPRESA_SD_DIALER}&telefone=eq.${encodeURIComponent(a.telefone)}&limit=1`)
    if (dup?.length) throw new Error(`Já existe uma lead com esse telefone (${dup[0].nome}).`)
    await restWrite("leads", "POST", {
      nome: a.nome, telefone: a.telefone, email: a.email || null, localidade: a.localidade || null,
      origem: "manual", status: "novo", priority: 2, company_id: EMPRESA_SD_DIALER, campanha_id: CAMPANHA_BROKERS,
      assigned_to: MIGUEL, skip_auto_assign: true, observacoes: a.nota ? `[${stamp()}] ${a.nota}` : "Adicionada pelo LUMIN Comando",
    })
    return `Feito: ${a.nome} adicionada à prospeção.`
  }
  const cfg = await restRead<any[]>("lumin_alert_config?select=ntfy_topic&id=eq.1")
  const topic = cfg?.[0]?.ntfy_topic
  if (!topic) throw new Error("Avisos ainda não configurados.")
  const r = await fetch(`https://ntfy.sh/${topic}`, { method: "POST", headers: { Title: "LUMIN Comando", Tags: "bell" }, body: a.texto })
  if (!r.ok) throw new Error(`Falhou o envio do aviso (${r.status}).`)
  return "Feito: aviso enviado para o telemóvel."
}
