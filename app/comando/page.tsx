"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { ArrowLeft, Bot, Loader2, RefreshCw, Send } from "lucide-react"

type Action = { tipo: string; descricao: string; [k: string]: any }
type Msg = { role: "user" | "assistant"; content: string; action?: Action | null; actionState?: "pendente" | "feito" | "cancelado" | "erro"; actionResult?: string }

function Inline({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  return <>{parts.map((p, i) => (p.startsWith("**") && p.endsWith("**") ? <strong key={i} className="font-bold text-white">{p.slice(2, -2)}</strong> : <span key={i}>{p.replace(/\*\*/g, "")}</span>))}</>
}

function Markdown({ text }: { text: string }) {
  const lines = text.replace(/\r/g, "").split("\n")
  return (
    <div className="space-y-1">
      {lines.map((line, i) => {
        const t = line.trim()
        if (!t) return <div key={i} className="h-1" />
        const bullet = t.match(/^[-*•]\s+(.*)$/) || t.match(/^\d+[.)]\s+(.*)$/)
        if (bullet) return <div key={i} className="flex gap-2"><span className="text-[#e7b95f]">•</span><span><Inline text={bullet[1]} /></span></div>
        const h = t.match(/^#{1,4}\s+(.*)$/)
        if (h) return <div key={i} className="pt-1 font-bold text-[#ffdda0]"><Inline text={h[1]} /></div>
        return <div key={i}><Inline text={t} /></div>
      })}
    </div>
  )
}

const euro = (v?: number) => new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(Number(v || 0))
const NOMES: Record<string, string> = { "lumin-ai": "LUMIN AI", "sd-dialer": "SD Dialer", "agentes-ia": "Agentes IA" }
const SUGESTOES = ["Resume o estado do negócio", "A quem devo ligar hoje e o que digo?", "De onde vêm as minhas leads?", "A SNU não atendeu, marca para ligar depois", "Lembra-me de ligar à Bergcom amanhã às 10h"]

function Card({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <div className="text-[11px] uppercase tracking-[0.14em] text-white/50">{label}</div>
      <div className="mt-1 text-2xl font-black text-white">{value}</div>
      {hint ? <div className="mt-1 text-xs text-white/50">{hint}</div> : null}
    </div>
  )
}

export default function ComandoPage() {
  const [data, setData] = useState<any>(null)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(true)
  const [messages, setMessages] = useState<Msg[]>([])
  const [input, setInput] = useState("")
  const [thinking, setThinking] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError("")
    try {
      const r = await fetch("/api/comando", { cache: "no-store" })
      const d = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(d?.error || "Não foi possível carregar os dados.")
      setData(d)
    } catch (e: any) {
      setError(e?.message || "Erro a carregar.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }) }, [messages, thinking])

  async function ask(text: string) {
    const q = text.trim()
    if (!q || thinking) return
    const next: Msg[] = [...messages, { role: "user", content: q }]
    setMessages(next)
    setInput("")
    setThinking(true)
    try {
      const r = await fetch("/api/comando", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: q, messages: messages.map(m => ({ role: m.role, content: m.content + (m.actionResult ? `\n(${m.actionResult})` : "") })) }) })
      const d = await r.json().catch(() => ({}))
      setMessages([...next, { role: "assistant", content: r.ok ? d.reply : d?.error || "Sem resposta.", action: r.ok ? d.action : null, actionState: r.ok && d.action ? "pendente" : undefined }])
    } catch {
      setMessages([...next, { role: "assistant", content: "Falhou a ligação. Tenta outra vez." }])
    } finally {
      setThinking(false)
    }
  }

  async function decide(index: number, confirm: boolean) {
    const msg = messages[index]
    if (!msg?.action) return
    if (!confirm) {
      setMessages(ms => ms.map((m, i) => (i === index ? { ...m, actionState: "cancelado", actionResult: "Cancelado" } : m)))
      return
    }
    setMessages(ms => ms.map((m, i) => (i === index ? { ...m, actionResult: "A executar…" } : m)))
    try {
      const { descricao, ...action } = msg.action
      const r = await fetch("/api/comando/acao", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(action) })
      const d = await r.json().catch(() => ({}))
      setMessages(ms => ms.map((m, i) => (i === index ? { ...m, actionState: r.ok ? "feito" : "erro", actionResult: r.ok ? d.message : d?.error || "Falhou." } : m)))
      if (r.ok) load()
    } catch {
      setMessages(ms => ms.map((m, i) => (i === index ? { ...m, actionState: "erro", actionResult: "Falhou a ligação." } : m)))
    }
  }

  return (
    <main className="min-h-screen bg-[#05070d] text-white">
      <div className="mx-auto max-w-5xl px-4 pb-32 pt-6">
        <div className="mb-6 flex items-center justify-between gap-3">
          <a href="/" className="inline-flex items-center gap-2 text-sm text-white/60 hover:text-white"><ArrowLeft className="h-4 w-4" /> LUMIN</a>
          <button onClick={load} className="inline-flex items-center gap-2 rounded-full border border-white/15 px-3 py-1.5 text-xs text-white/70 hover:text-white">
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Atualizar
          </button>
        </div>
        <h1 className="text-4xl font-black tracking-tight">LUMIN <span className="text-[#e7b95f]">Comando</span></h1>
        <p className="mt-1 text-sm text-white/55">O teu negócio num ecrã. Pergunta o que quiseres em baixo.</p>

        {error ? <div className="mt-6 rounded-2xl border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-200">{error}</div> : null}

        {data ? (
          <>
            <section className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
              <Card label="Receita hoje" value={euro(data.receita.hoje)} />
              <Card label="Últimos 7 dias" value={euro(data.receita.semana)} />
              <Card label="Últimos 30 dias" value={euro(data.receita.mes)} hint={`${data.receita.vendas30d} vendas`} />
              <Card label="Subscrições LUMIN" value={String(data.lumin.subscricoesAtivas)} hint={`${data.lumin.pro} Pro · ${data.lumin.starter} Starter · ${data.lumin.contas} contas`} />
              <Card label="Empresas SD Dialer" value={String(data.sdDialer.empresas)} />
              <Card label="Prospeção" value={String(data.prospecao.total)} hint={Object.entries(data.prospecao.porEstado).map(([k, v]) => `${k}: ${v}`).join(" · ") || "sem leads"} />
              <Card label="Vendas broker (30d)" value={String(data.broker.vendas30d)} hint={Object.entries(data.broker.porEstado).slice(0, 3).map(([k, v]) => `${k}: ${v}`).join(" · ")} />
              <Card label="Atualizado" value={new Date(data.generatedAt).toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" })} />
            </section>

            <section className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <h2 className="text-sm font-bold text-[#ffdda0]">Últimas vendas</h2>
                {data.receita.ultimas.length ? (
                  <ul className="mt-3 space-y-2 text-sm">
                    {data.receita.ultimas.map((v: any, i: number) => (
                      <li key={i} className="flex justify-between gap-3 border-b border-white/5 pb-2">
                        <span className="truncate text-white/80">{NOMES[v.produto] || v.produto} · <span className="text-white/45">{v.cliente || "—"}</span></span>
                        <span className="shrink-0 font-bold">{euro(v.valor)}</span>
                      </li>
                    ))}
                  </ul>
                ) : <p className="mt-3 text-sm text-white/50">Ainda sem vendas nos últimos 30 dias.</p>}
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <h2 className="text-sm font-bold text-[#ffdda0]">Ligar hoje</h2>
                {data.prospecao.proximas.length ? (
                  <ul className="mt-3 space-y-2 text-sm">
                    {data.prospecao.proximas.map((l: any, i: number) => (
                      <li key={i} className="flex justify-between gap-3 border-b border-white/5 pb-2">
                        <span className="truncate text-white/80">{l.nome}</span>
                        <a href={`tel:${l.telefone}`} className="shrink-0 font-bold text-[#e7b95f]">{l.telefone}</a>
                      </li>
                    ))}
                  </ul>
                ) : <p className="mt-3 text-sm text-white/50">Sem leads por contactar.</p>}
              </div>
            </section>
            <section className="mt-4 grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <h2 className="text-sm font-bold text-[#ffdda0]">Leads do site luminai.pt</h2>
                {data.resumo?.leadsSite?.length ? (
                  <ul className="mt-3 space-y-2 text-sm">
                    {data.resumo.leadsSite.slice(0, 6).map((l: any) => (
                      <li key={l.id} className="border-b border-white/5 pb-2">
                        <div className="flex justify-between gap-2"><span className="truncate text-white/85">{l.nome}{l.empresa ? ` · ${l.empresa}` : ""}</span><span className="shrink-0 text-xs text-white/45">{new Date(l.quando).toLocaleDateString("pt-PT")}</span></div>
                        <div className="text-xs text-white/45">{l.status} · {l.formulario || "formulário"}{l.utm_source ? ` · ${l.utm_source}` : ""}</div>
                      </li>
                    ))}
                  </ul>
                ) : <p className="mt-3 text-sm text-white/50">Ainda não entraram leads pelo site.</p>}
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <h2 className="text-sm font-bold text-[#ffdda0]">Empresas no SD Dialer</h2>
                <ul className="mt-3 space-y-2 text-sm">
                  {(data.resumo?.empresas || []).map((c: any) => (
                    <li key={c.name} className="flex justify-between gap-2 border-b border-white/5 pb-2">
                      <span className="truncate text-white/85">{c.name} <span className="text-xs text-white/40">{c.plan}</span></span>
                      <span className="shrink-0 text-xs text-white/55">{new Intl.NumberFormat("pt-PT").format(c.leads)} leads · {c.vendas_30d} vendas</span>
                    </li>
                  ))}
                </ul>
              </div>
            </section>
            {data.errors?.length ? <p className="mt-3 text-xs text-amber-300/80">Não consegui ler: {data.errors.join(" · ")}</p> : null}
          </>
        ) : loading ? <div className="mt-10 flex items-center gap-2 text-white/60"><Loader2 className="h-4 w-4 animate-spin" /> A carregar…</div> : null}

        <section className="mt-8 rounded-2xl border border-[#e7b95f]/30 bg-[#e7b95f]/[0.04] p-4">
          <div className="flex items-center gap-2 text-sm font-bold"><Bot className="h-4 w-4 text-[#e7b95f]" /> Pergunta ao LUMIN</div>
          <div className="mt-3 space-y-3">
            {messages.map((m, i) =>
              m.role === "user" ? (
                <div key={i} className="ml-auto max-w-[85%] rounded-2xl bg-white/10 px-4 py-2 text-sm">{m.content}</div>
              ) : (
                <div key={i} className="max-w-[92%] rounded-2xl border border-white/10 bg-black/30 px-4 py-2 text-sm leading-relaxed text-white/85">
                  <Markdown text={m.content} />
                  {m.action ? (
                    <div className="mt-3 rounded-xl border border-[#e7b95f]/40 bg-[#e7b95f]/[0.07] p-3">
                      <div className="text-[11px] uppercase tracking-[0.14em] text-[#ffdda0]">Ação proposta</div>
                      <div className="mt-1 text-sm text-white">{m.action.descricao}</div>
                      {m.actionState === "pendente" && !m.actionResult ? (
                        <div className="mt-3 flex gap-2">
                          <button onClick={() => decide(i, true)} className="rounded-full bg-gradient-to-r from-[#ffdda0] to-[#e7b95f] px-4 py-1.5 text-xs font-bold text-black">Confirmar</button>
                          <button onClick={() => decide(i, false)} className="rounded-full border border-white/20 px-4 py-1.5 text-xs text-white/70">Cancelar</button>
                        </div>
                      ) : (
                        <div className={`mt-2 text-xs ${m.actionState === "erro" ? "text-red-300" : m.actionState === "feito" ? "text-emerald-300" : "text-white/60"}`}>{m.actionResult}</div>
                      )}
                    </div>
                  ) : null}
                </div>
              )
            )}
            {thinking ? <div className="flex items-center gap-2 text-sm text-white/50"><Loader2 className="h-4 w-4 animate-spin" /> A pensar…</div> : null}
            <div ref={endRef} />
          </div>
          {!messages.length ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {SUGESTOES.map(s => <button key={s} onClick={() => ask(s)} className="rounded-full border border-white/15 px-3 py-1.5 text-xs text-white/75 hover:border-[#e7b95f]/60 hover:text-white">{s}</button>)}
            </div>
          ) : null}
          <form onSubmit={e => { e.preventDefault(); ask(input) }} className="mt-4 flex gap-2">
            <input value={input} onChange={e => setInput(e.target.value)} placeholder="Ex.: quanto faturei esta semana?" className="flex-1 rounded-full border border-white/15 bg-black/40 px-4 py-2.5 text-sm outline-none focus:border-[#e7b95f]/60" />
            <button disabled={thinking || !input.trim()} className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-[#ffdda0] to-[#e7b95f] px-4 py-2.5 text-sm font-bold text-black disabled:opacity-40"><Send className="h-4 w-4" /></button>
          </form>
        </section>
      </div>
    </main>
  )
}
