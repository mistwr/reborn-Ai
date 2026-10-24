"use client"

import { useState } from "react"

type Result = { status?: string; plan?: { steps: { id: string; role: string; goal: string }[] }; results?: { role: string; response: string }[]; error?: string }

export default function GenesisPage() {
  const [objective, setObjective] = useState("")
  const [data, setData] = useState<Result | null>(null)
  const [busy, setBusy] = useState(false)
  async function submit(runAnalysis: boolean) {
    if (!objective.trim() || busy) return
    setBusy(true)
    setData(null)
    try {
      const response = await fetch("/api/genesis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ objective, runAnalysis }),
      })
      const result = await response.json()
      setData(response.ok ? result : { error: result.error || "Pedido falhou" })
    } catch {
      setData({ error: "Não foi possível contactar o Genesis." })
    } finally {
      setBusy(false)
    }
  }
  return <main style={{ maxWidth: 780, margin: "40px auto", padding: 24, fontFamily: "system-ui" }}>
    <h1>LUMIN GENESIS 0.2</h1>
    <p>Planeamento e análise multiagente. Não executa alterações externas.</p>
    <label htmlFor="objective">Objetivo</label>
    <textarea id="objective" value={objective} maxLength={1200} onChange={e => setObjective(e.target.value)} rows={5} style={{ display: "block", width: "100%", margin: "12px 0", padding: 12 }} />
    <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
      <button disabled={busy || !objective.trim()} onClick={() => submit(false)}>Criar plano</button>
      <button disabled={busy || !objective.trim()} onClick={() => submit(true)}>Executar análise IA</button>
    </div>
    {busy && <p role="status">A processar…</p>}
    {data?.error && <p role="alert">{data.error}</p>}
    {data?.plan && <section><h2>Plano</h2><ol>{data.plan.steps.map(step => <li key={step.id}><strong>{step.role}</strong>: {step.goal}</li>)}</ol></section>}
    {data?.results && <section><h2>Resultados</h2>{data.results.map((item, index) => <article key={index}><h3>{item.role}</h3><pre style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{item.response}</pre></article>)}</section>}
  </main>
}
