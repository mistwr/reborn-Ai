"use client"

import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  AppWindow,
  Check,
  Code2,
  Database,
  Download,
  ExternalLink,
  Globe2,
  Loader2,
  Monitor,
  PackageOpen,
  RefreshCw,
  Rocket,
  Send,
  Smartphone,
  Sparkles,
  Tablet,
} from "lucide-react"

type Mode = "website" | "app"
type ViewMode = "desktop" | "tablet" | "mobile"
type ProjectFile = { path: string; content: string }

type FullStackProject = {
  name: string
  framework: string
  files: ProjectFile[]
}

const EXAMPLES = [
  "CRM para imobiliária com login, clientes, imóveis e pipeline de vendas",
  "Landing page para clínica dentária com marcações e testemunhos",
  "Dashboard comercial com leads, vendas, follow-ups e ranking",
  "Loja online de roupa com catálogo, carrinho e checkout demonstrativo",
]

export function WebCraftStudioV2() {
  const [mode, setMode] = useState<Mode>("website")
  const [viewMode, setViewMode] = useState<ViewMode>("desktop")
  const [prompt, setPrompt] = useState("")
  const [refinement, setRefinement] = useState("")
  const [businessName, setBusinessName] = useState("")
  const [businessEmail, setBusinessEmail] = useState("")
  const [html, setHtml] = useState<string | null>(null)
  const [editableHtml, setEditableHtml] = useState("")
  const [editCode, setEditCode] = useState(false)
  const [loading, setLoading] = useState(false)
  const [fullStackLoading, setFullStackLoading] = useState(false)
  const [fullStackProject, setFullStackProject] = useState<FullStackProject | null>(null)
  const [error, setError] = useState<string | null>(null)

  const previewWidth = useMemo(() => {
    if (viewMode === "mobile") return "390px"
    if (viewMode === "tablet") return "820px"
    return "100%"
  }, [viewMode])

  async function streamProject(payload: Record<string, unknown>) {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/webcraft-v2", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => null)
        throw new Error(data?.error || "Não foi possível gerar o projeto")
      }

      if (!response.body) throw new Error("Resposta vazia")

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let output = ""

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        output += decoder.decode(value, { stream: true })
        const clean = output.replace(/^```html?\n?/i, "").replace(/\n?```$/i, "")
        setHtml(clean)
      }

      const clean = output.replace(/^```html?\n?/i, "").replace(/\n?```$/i, "")
      setHtml(clean)
      setEditableHtml(clean)
      setFullStackProject(null)
      return clean
    } catch (err: any) {
      setError(err?.message || "Erro inesperado")
      return null
    } finally {
      setLoading(false)
    }
  }

  async function generate() {
    if (!prompt.trim()) return
    setHtml(null)
    setEditCode(false)
    setFullStackProject(null)
    await streamProject({
      prompt,
      mode,
      businessName,
      businessEmail,
      language: "Português de Portugal (PT-PT)",
    })
  }

  async function refine() {
    if (!html || !refinement.trim()) return
    const current = html
    const instruction = refinement
    setRefinement("")
    await streamProject({
      mode,
      currentHtml: current,
      refinement: instruction,
      language: "Português de Portugal (PT-PT)",
    })
  }

  function downloadHtml() {
    if (!html) return
    const blob = new Blob([html], { type: "text/html;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${(businessName || "lumin-ai-studio").toLowerCase().replace(/[^a-z0-9]+/g, "-")}.html`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function downloadFullStackProject(project: FullStackProject) {
    const JSZip = (await import("jszip")).default
    const zip = new JSZip()
    project.files.forEach((file) => zip.file(file.path, file.content))
    const blob = await zip.generateAsync({ type: "blob" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${project.name}.zip`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function generateFullStack() {
    if (!html || !prompt.trim()) return
    setFullStackLoading(true)
    setError(null)
    try {
      const response = await fetch("/api/webcraft-v2/project", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          currentHtml: html,
          projectName: businessName || prompt,
          language: "Português de Portugal (PT-PT)",
        }),
      })
      const data = await response.json().catch(() => null)
      if (!response.ok) throw new Error(data?.error || "Não foi possível criar o projeto full-stack")
      const project = data as FullStackProject
      setFullStackProject(project)
      await downloadFullStackProject(project)
    } catch (err: any) {
      setError(err?.message || "Erro ao criar o projeto full-stack")
    } finally {
      setFullStackLoading(false)
    }
  }

  function openFullscreen() {
    if (!html) return
    const w = window.open("", "_blank")
    if (!w) return
    w.document.open()
    w.document.write(html)
    w.document.close()
  }

  if (!html) {
    return (
      <div className="flex-1 overflow-auto p-4 md:p-8">
        <div className="mx-auto max-w-5xl space-y-6">
          <div className="rounded-3xl border bg-card p-6 md:p-8 shadow-sm">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="mb-2 flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  <Badge variant="secondary">Lumin AI Studio</Badge>
                  <Badge variant="outline" className="gap-1"><Database className="h-3 w-3" /> Full-Stack</Badge>
                </div>
                <h2 className="text-2xl font-bold tracking-tight md:text-3xl">Descreve. Cria. Publica.</h2>
                <p className="mt-2 text-sm text-muted-foreground md:text-base">
                  Cria websites e aplicações por conversa, vê o preview e exporta um projeto Next.js + Supabase pronto para GitHub e deploy.
                </p>
              </div>
            </div>

            <div className="mb-5 grid grid-cols-2 gap-2 rounded-2xl bg-muted p-1.5">
              <button
                onClick={() => setMode("website")}
                className={`flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-medium transition ${mode === "website" ? "bg-background shadow" : "text-muted-foreground"}`}
              >
                <Globe2 className="h-4 w-4" /> Website
              </button>
              <button
                onClick={() => setMode("app")}
                className={`flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-medium transition ${mode === "app" ? "bg-background shadow" : "text-muted-foreground"}`}
              >
                <AppWindow className="h-4 w-4" /> App Web
              </button>
            </div>

            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={mode === "app" ? "Ex.: CRM para uma empresa de energia com login, leads, clientes, pipeline, dashboard e follow-ups..." : "Ex.: Website premium para um stand automóvel com viaturas, financiamento, contactos e formulário de leads..."}
              className="min-h-40 rounded-2xl text-base"
            />

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <Input value={businessName} onChange={(e) => setBusinessName(e.target.value)} placeholder="Nome do projeto/negócio (opcional)" />
              <Input value={businessEmail} onChange={(e) => setBusinessEmail(e.target.value)} placeholder="Email/contacto (opcional)" />
            </div>

            <Button onClick={generate} disabled={loading || !prompt.trim()} size="lg" className="mt-5 h-12 w-full gap-2 rounded-xl">
              {loading ? <><Loader2 className="h-5 w-5 animate-spin" /> A construir...</> : <><Rocket className="h-5 w-5" /> Gerar {mode === "app" ? "App" : "Website"}</>}
            </Button>

            {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
          </div>

          <div>
            <p className="mb-3 text-sm font-medium text-muted-foreground">Experimenta um destes pedidos</p>
            <div className="grid gap-3 md:grid-cols-2">
              {EXAMPLES.map((example) => (
                <button key={example} onClick={() => setPrompt(example)} className="rounded-2xl border bg-card p-4 text-left text-sm transition hover:border-primary/50 hover:bg-primary/5">
                  {example}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-card px-3 py-2 md:px-4">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => { setHtml(null); setPrompt(""); setEditCode(false); setFullStackProject(null) }} className="gap-2">
            <RefreshCw className="h-4 w-4" /> Novo
          </Button>
          <Badge variant="secondary">Lumin AI Studio</Badge>
          <Badge variant="outline">{mode === "app" ? "App Web" : "Website"}</Badge>
          {fullStackProject && <Badge variant="outline">{fullStackProject.files.length} ficheiros · {fullStackProject.framework}</Badge>}
        </div>

        <div className="flex items-center gap-1 rounded-lg bg-muted p-1">
          <button onClick={() => setViewMode("desktop")} className={`rounded-md p-1.5 ${viewMode === "desktop" ? "bg-background shadow" : "text-muted-foreground"}`}><Monitor className="h-4 w-4" /></button>
          <button onClick={() => setViewMode("tablet")} className={`rounded-md p-1.5 ${viewMode === "tablet" ? "bg-background shadow" : "text-muted-foreground"}`}><Tablet className="h-4 w-4" /></button>
          <button onClick={() => setViewMode("mobile")} className={`rounded-md p-1.5 ${viewMode === "mobile" ? "bg-background shadow" : "text-muted-foreground"}`}><Smartphone className="h-4 w-4" /></button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant={editCode ? "default" : "outline"} size="sm" onClick={() => { if (editCode) setHtml(editableHtml); else setEditableHtml(html); setEditCode(!editCode) }} className="gap-2">
            {editCode ? <><Check className="h-4 w-4" /> Guardar</> : <><Code2 className="h-4 w-4" /> Código</>}
          </Button>
          <Button variant="outline" size="sm" onClick={downloadHtml} className="gap-2"><Download className="h-4 w-4" /> HTML</Button>
          <Button size="sm" onClick={generateFullStack} disabled={fullStackLoading} className="gap-2">
            {fullStackLoading ? <><Loader2 className="h-4 w-4 animate-spin" /> Full-Stack...</> : <><PackageOpen className="h-4 w-4" /> Full-Stack ZIP</>}
          </Button>
          {fullStackProject && (
            <Button variant="outline" size="sm" onClick={() => downloadFullStackProject(fullStackProject)} className="gap-2">
              <Download className="h-4 w-4" /> Repetir ZIP
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={openFullscreen}><ExternalLink className="h-4 w-4" /></Button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        <aside className="order-2 w-full shrink-0 border-t bg-card p-4 md:order-1 md:w-80 md:border-r md:border-t-0">
          <div className="space-y-3">
            <div>
              <h3 className="font-semibold">Pede alterações</h3>
              <p className="mt-1 text-xs text-muted-foreground">O Lumin AI Studio mantém o projeto e altera apenas o que pedires.</p>
            </div>
            <Textarea
              value={refinement}
              onChange={(e) => setRefinement(e.target.value)}
              placeholder="Ex.: mete o menu fixo, acrescenta login e muda os cartões para um estilo mais premium..."
              className="min-h-32"
              disabled={loading}
            />
            <Button onClick={refine} disabled={loading || !refinement.trim()} className="w-full gap-2">
              {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> A alterar...</> : <><Send className="h-4 w-4" /> Aplicar alteração</>}
            </Button>
            {error && <p className="text-xs text-destructive">{error}</p>}
            <div className="rounded-xl border bg-muted/40 p-3 text-xs text-muted-foreground">
              Quando estiver como queres, usa <strong>Full-Stack ZIP</strong>. O Lumin AI Studio gera Next.js 16, Supabase SSR, .env.example, migrações SQL/RLS quando necessárias e estrutura pronta para GitHub/Vercel.
            </div>
          </div>
        </aside>

        <main className="order-1 flex min-h-[60vh] min-w-0 flex-1 items-start justify-center overflow-auto bg-muted/30 p-3 md:order-2 md:p-5">
          {editCode ? (
            <Textarea value={editableHtml} onChange={(e) => setEditableHtml(e.target.value)} className="min-h-[75vh] w-full resize-none bg-card font-mono text-xs" />
          ) : (
            <div className="overflow-hidden rounded-xl bg-white shadow-xl transition-all" style={{ width: previewWidth, minHeight: "75vh" }}>
              <iframe srcDoc={html} title="Lumin AI Studio Preview" className="h-[78vh] w-full border-0" sandbox="allow-scripts allow-forms allow-modals allow-popups" />
            </div>
          )}
        </main>
      </div>
    </div>
  )
}