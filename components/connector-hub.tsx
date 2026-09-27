"use client"

import { useEffect, useMemo, useState } from "react"
import {
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  Database,
  ExternalLink,
  KeyRound,
  Link2,
  Loader2,
  Plug,
  RefreshCw,
  Server,
  ShieldCheck,
  Unplug,
  XCircle,
  Zap,
} from "lucide-react"

type CatalogItem = {
  id: string
  name: string
  category: string
  description: string
  mode: "oauth" | "native" | "generic"
  capabilities: string[]
  enabledNow: boolean
}

type Connection = {
  id: string
  provider: string
  label?: string | null
  status: "disconnected" | "connected" | "error" | "pending"
  authType: string
  config: Record<string, any>
  capabilities: string[]
  hasSecret: boolean
  lastTestedAt?: string | null
  lastError?: string | null
}

const GENERIC = new Set(["rest", "openapi", "mcp"])

function rootProvider(value: string) {
  return value.split(":")[0]
}

function slug(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40) || "custom"
}

export function ConnectorHub() {
  const [catalog, setCatalog] = useState<CatalogItem[]>([])
  const [connections, setConnections] = useState<Connection[]>([])
  const [scope, setScope] = useState("")
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const [busy, setBusy] = useState("")
  const [editor, setEditor] = useState<"rest" | "openapi" | "mcp" | null>(null)
  const [label, setLabel] = useState("")
  const [url, setUrl] = useState("")
  const [defaultPath, setDefaultPath] = useState("")
  const [authType, setAuthType] = useState("none")
  const [headerName, setHeaderName] = useState("x-api-key")
  const [secret, setSecret] = useState("")

  const refresh = async () => {
    setLoading(true)
    setError("")
    try {
      const response = await fetch("/api/connectors", { cache: "no-store" })
      const data = await response.json()
      if (response.status === 401) throw new Error("Inicia sessão no Lumin para gerir os teus conectores.")
      if (!response.ok) throw new Error(data?.error || "Não foi possível carregar os conectores.")
      setCatalog(data.catalog || [])
      setConnections(data.connections || [])
      setScope(data.scope || "")
    } catch (e: any) {
      setError(e?.message || "Erro a carregar conectores.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void refresh() }, [])

  const connectedByRoot = useMemo(() => {
    const map = new Map<string, Connection[]>()
    for (const item of connections) {
      const root = rootProvider(item.provider)
      map.set(root, [...(map.get(root) || []), item])
    }
    return map
  }, [connections])

  const openGeneric = (type: "rest" | "openapi" | "mcp") => {
    setEditor(type)
    setLabel(type === "mcp" ? "Meu MCP" : type === "openapi" ? "Minha OpenAPI" : "Minha API")
    setUrl("")
    setDefaultPath("")
    setAuthType(type === "mcp" ? "mcp" : "none")
    setHeaderName("x-api-key")
    setSecret("")
    setError("")
    setMessage("")
  }

  const saveGeneric = async () => {
    if (!editor) return
    setBusy("save")
    setError("")
    setMessage("")
    try {
      const provider = `${editor}:${slug(label)}`
      const config: Record<string, any> = {}
      if (editor === "rest") {
        config.baseUrl = url
        if (defaultPath.trim()) config.defaultPath = defaultPath.trim()
        if (authType === "api_key") config.headerName = headerName || "x-api-key"
      } else if (editor === "openapi") {
        config.schemaUrl = url
        if (defaultPath.trim()) config.baseUrl = defaultPath.trim()
        if (authType === "api_key") config.headerName = headerName || "x-api-key"
      } else {
        config.serverUrl = url
      }

      const response = await fetch("/api/connectors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider,
          label,
          authType,
          config,
          secret: secret || undefined,
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data?.error || "Não foi possível guardar.")
      setMessage("Conector guardado. Agora vamos testar a ligação.")
      await refresh()
      await test(provider)
      setEditor(null)
    } catch (e: any) {
      setError(e?.message || "Erro a guardar conector.")
    } finally {
      setBusy("")
    }
  }

  const test = async (provider: string) => {
    setBusy(provider)
    setError("")
    setMessage("")
    try {
      const response = await fetch("/api/connectors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "test", provider }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data?.error || "O teste falhou.")
      setMessage(data?.result?.detail || "Ligação testada com sucesso.")
      await refresh()
    } catch (e: any) {
      setError(e?.message || "Falha no teste.")
      await refresh()
    } finally {
      setBusy("")
    }
  }

  const disconnect = async (provider: string) => {
    setBusy(provider)
    setError("")
    setMessage("")
    try {
      const response = await fetch("/api/connectors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "disconnect", provider }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data?.error || "Não foi possível desligar.")
      setMessage("Conector desligado.")
      await refresh()
    } catch (e: any) {
      setError(e?.message || "Erro ao desligar.")
    } finally {
      setBusy("")
    }
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <header className="sticky top-0 z-30 border-b border-amber-300/10 bg-[#050505]/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-4 sm:px-6">
          <button
            onClick={() => window.location.assign("/")}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[.03] text-zinc-400 hover:text-white"
            aria-label="Voltar ao Lumin"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-amber-300/20 bg-amber-300/[.08]">
            <Plug className="h-5 w-5 text-amber-300" />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] font-semibold uppercase tracking-[.22em] text-amber-300/70">LUMIN CONNECT</div>
            <h1 className="truncate text-lg font-semibold">Conectores</h1>
          </div>
          <div className="ml-auto hidden items-center gap-2 rounded-full border border-white/[.07] bg-white/[.025] px-3 py-1.5 text-xs text-zinc-500 sm:flex">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
            Segredos encriptados no Vault
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-7 sm:px-6">
        <section className="overflow-hidden rounded-[28px] border border-amber-300/10 bg-gradient-to-br from-amber-300/[.07] via-white/[.02] to-violet-500/[.04] p-6 sm:p-8">
          <div className="max-w-3xl">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-400/15 bg-emerald-400/[.06] px-3 py-1.5 text-xs text-emerald-300">
              <Zap className="h-3.5 w-3.5" />
              {scope === "organization" ? "Ligações partilhadas pela empresa" : "Ligações da tua conta"}
            </div>
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">Liga as ferramentas. O Lumin usa-as.</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400">
              MCP, OpenAPI e REST já podem ser ligados aqui. O runtime do Lumin só executa leitura nesta primeira camada; ações que alterem dados ficam bloqueadas até existir confirmação explícita.
            </p>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <QuickCard icon={Server} title="MCP remoto" subtitle="Liga servidores MCP e expõe ferramentas ao Lumin." onClick={() => openGeneric("mcp")} />
            <QuickCard icon={Database} title="OpenAPI" subtitle="Importa endpoints GET de um openapi.json." onClick={() => openGeneric("openapi")} />
            <QuickCard icon={Link2} title="REST API" subtitle="Liga uma API HTTPS pública ou autenticada." onClick={() => openGeneric("rest")} />
          </div>
        </section>

        {(message || error) && (
          <div className={`mt-5 rounded-2xl border px-4 py-3 text-sm ${error ? "border-red-400/20 bg-red-400/[.06] text-red-200" : "border-emerald-400/20 bg-emerald-400/[.06] text-emerald-200"}`}>
            {error || message}
          </div>
        )}

        {editor && (
          <section className="mt-6 rounded-[26px] border border-amber-300/15 bg-[#0a0a0a] p-5 sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-xs uppercase tracking-[.18em] text-amber-300/70">Novo conector</div>
                <h3 className="mt-1 text-xl font-semibold">{editor === "mcp" ? "Servidor MCP" : editor === "openapi" ? "OpenAPI" : "REST API"}</h3>
              </div>
              <button onClick={() => setEditor(null)} className="rounded-xl border border-white/10 px-3 py-2 text-xs text-zinc-400 hover:text-white">Fechar</button>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <Field label="Nome">
                <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Ex.: CRM da empresa" className="input" />
              </Field>
              <Field label={editor === "mcp" ? "URL do servidor MCP" : editor === "openapi" ? "URL do openapi.json" : "Base URL"}>
                <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://..." className="input" />
              </Field>

              {editor === "rest" && (
                <Field label="Endpoint GET padrão (opcional)">
                  <input value={defaultPath} onChange={(e) => setDefaultPath(e.target.value)} placeholder="/v1/customers" className="input" />
                </Field>
              )}

              {editor === "openapi" && (
                <Field label="Base URL (opcional se vier no OpenAPI)">
                  <input value={defaultPath} onChange={(e) => setDefaultPath(e.target.value)} placeholder="https://api.exemplo.com" className="input" />
                </Field>
              )}

              <Field label="Autenticação">
                <select value={authType} onChange={(e) => setAuthType(e.target.value)} className="input">
                  <option value={editor === "mcp" ? "mcp" : "none"}>{editor === "mcp" ? "Bearer / MCP token" : "Sem autenticação"}</option>
                  {editor !== "mcp" && <option value="bearer">Bearer token</option>}
                  {editor !== "mcp" && <option value="api_key">API Key em header</option>}
                  {editor !== "mcp" && <option value="basic">Basic (user:password)</option>}
                </select>
              </Field>

              {authType === "api_key" && (
                <Field label="Nome do header">
                  <input value={headerName} onChange={(e) => setHeaderName(e.target.value)} placeholder="x-api-key" className="input" />
                </Field>
              )}

              {authType !== "none" && (
                <Field label="Segredo / token">
                  <input type="password" value={secret} onChange={(e) => setSecret(e.target.value)} placeholder="Guardado encriptado no Vault" className="input" />
                </Field>
              )}
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <button
                onClick={saveGeneric}
                disabled={busy === "save" || !label.trim() || !url.trim()}
                className="inline-flex items-center gap-2 rounded-xl bg-amber-300 px-4 py-2.5 text-sm font-semibold text-black disabled:opacity-40"
              >
                {busy === "save" ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
                Guardar e testar
              </button>
              <p className="text-xs text-zinc-600">Apenas HTTPS. Redes locais e localhost são bloqueados.</p>
            </div>
          </section>
        )}

        <section className="mt-8">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-xl font-semibold">As tuas ligações</h3>
              <p className="mt-1 text-sm text-zinc-500">MCP, OpenAPI e REST ficam disponíveis ao chat para consultas de leitura.</p>
            </div>
            <button onClick={() => void refresh()} className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-xs text-zinc-400 hover:text-white">
              <RefreshCw className="h-3.5 w-3.5" /> Atualizar
            </button>
          </div>

          {loading ? (
            <div className="flex items-center gap-2 rounded-2xl border border-white/[.07] p-5 text-sm text-zinc-500">
              <Loader2 className="h-4 w-4 animate-spin" /> A carregar...
            </div>
          ) : connections.length ? (
            <div className="grid gap-3 lg:grid-cols-2">
              {connections.map((connection) => (
                <div key={connection.id} className="rounded-2xl border border-white/[.07] bg-white/[.02] p-4">
                  <div className="flex items-start gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/[.07] bg-black/40">
                      <Plug className="h-4 w-4 text-amber-300" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="font-medium">{connection.label || connection.provider}</h4>
                        <Status status={connection.status} />
                      </div>
                      <p className="mt-1 truncate text-xs text-zinc-600">{connection.provider}</p>
                      {connection.lastError && <p className="mt-2 text-xs text-red-300/80">{connection.lastError}</p>}
                    </div>
                  </div>
                  <div className="mt-4 flex gap-2">
                    <button
                      onClick={() => void test(connection.provider)}
                      disabled={busy === connection.provider}
                      className="inline-flex items-center gap-2 rounded-xl border border-emerald-400/15 bg-emerald-400/[.05] px-3 py-2 text-xs text-emerald-300 disabled:opacity-40"
                    >
                      {busy === connection.provider ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5" />}
                      Testar
                    </button>
                    <button
                      onClick={() => void disconnect(connection.provider)}
                      disabled={busy === connection.provider}
                      className="inline-flex items-center gap-2 rounded-xl border border-white/[.07] px-3 py-2 text-xs text-zinc-500 hover:text-red-300"
                    >
                      <Unplug className="h-3.5 w-3.5" /> Desligar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-white/10 p-7 text-center text-sm text-zinc-600">
              Ainda não ligaste nenhum conector.
            </div>
          )}
        </section>

        <section className="mt-9">
          <div className="mb-4">
            <h3 className="text-xl font-semibold">Catálogo Lumin</h3>
            <p className="mt-1 text-sm text-zinc-500">A base para os conectores nativos. Os universais já estão operacionais; os OAuth entram por fornecedor.</p>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {catalog.map((item) => {
              const current = connectedByRoot.get(item.id) || []
              const isGeneric = GENERIC.has(item.id)
              return (
                <button
                  key={item.id}
                  onClick={() => isGeneric ? openGeneric(item.id as any) : undefined}
                  className={`group rounded-2xl border p-4 text-left transition ${isGeneric ? "border-amber-300/10 bg-amber-300/[.025] hover:border-amber-300/25" : "border-white/[.06] bg-white/[.015]"}`}
                >
                  <div className="flex items-start gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/[.07] bg-black/30">
                      {item.enabledNow ? <Zap className="h-4 w-4 text-amber-300" /> : <Plug className="h-4 w-4 text-zinc-500" />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-zinc-200">{item.name}</h4>
                        {current.some((x) => x.status === "connected") && <CheckCircle2 className="h-4 w-4 text-emerald-400" />}
                      </div>
                      <p className="mt-1 text-xs leading-5 text-zinc-600">{item.description}</p>
                      <div className="mt-3 flex items-center justify-between">
                        <span className="text-[10px] uppercase tracking-[.14em] text-zinc-700">{item.category}</span>
                        <span className={`flex items-center gap-1 text-xs ${item.enabledNow ? "text-amber-300/80" : "text-zinc-700"}`}>
                          {item.enabledNow ? "Ligar" : "OAuth a preparar"} {item.enabledNow && <ChevronRight className="h-3.5 w-3.5" />}
                        </span>
                      </div>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </section>
      </main>

      <style jsx global>{`
        .input {
          width: 100%;
          border: 1px solid rgba(255,255,255,.09);
          background: rgba(255,255,255,.025);
          color: #fff;
          border-radius: 12px;
          padding: 11px 12px;
          outline: none;
          font-size: 14px;
        }
        .input:focus { border-color: rgba(252,211,77,.3); box-shadow: 0 0 0 3px rgba(252,211,77,.05); }
        .input option { background: #0a0a0a; color: #fff; }
      `}</style>
    </div>
  )
}

function QuickCard({ icon: Icon, title, subtitle, onClick }: any) {
  return (
    <button onClick={onClick} className="group flex items-center gap-3 rounded-2xl border border-white/[.07] bg-black/25 p-4 text-left transition hover:border-amber-300/20 hover:bg-black/35">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-amber-300/10 bg-amber-300/[.06]">
        <Icon className="h-5 w-5 text-amber-300" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium">{title}</span>
        <span className="mt-1 block text-xs leading-5 text-zinc-600">{subtitle}</span>
      </span>
      <ChevronRight className="h-4 w-4 text-zinc-700 transition group-hover:text-amber-300" />
    </button>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-zinc-500">{label}</span>
      {children}
    </label>
  )
}

function Status({ status }: { status: Connection["status"] }) {
  const map = {
    connected: { label: "Ligado", cls: "border-emerald-400/15 bg-emerald-400/[.06] text-emerald-300", icon: CheckCircle2 },
    error: { label: "Erro", cls: "border-red-400/15 bg-red-400/[.06] text-red-300", icon: XCircle },
    pending: { label: "Por testar", cls: "border-amber-300/15 bg-amber-300/[.06] text-amber-200", icon: Loader2 },
    disconnected: { label: "Desligado", cls: "border-white/10 bg-white/[.03] text-zinc-500", icon: Unplug },
  } as const
  const item = map[status] || map.disconnected
  const Icon = item.icon
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${item.cls}`}>
      <Icon className="h-3 w-3" /> {item.label}
    </span>
  )
}
