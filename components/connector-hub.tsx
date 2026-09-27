"use client"

import { useEffect, useMemo, useState } from "react"
import {
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  Database,
  KeyRound,
  Link2,
  Loader2,
  Plug,
  RefreshCw,
  Settings,
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
  mode: "oauth" | "credentials" | "generic"
  authProvider?: string
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

type OAuthStatus = {
  id: string
  label?: string
  configured: boolean
  callbackPath: string
  callbackUrl?: string | null
  source?: "vault" | "env" | "missing"
  clientIdPreview?: string
  hasVaultSecret?: boolean
  updatedAt?: string | null
}

const GENERIC = new Set(["rest", "openapi", "mcp"])

const AUTH_TYPES: Record<string, string> = {
  metricool: "api_key",
  vercel: "bearer",
  supabase: "bearer",
  stripe: "bearer",
  twilio: "basic",
  close: "api_key",
  resend: "bearer",
  railway: "bearer",
  whatsapp: "bearer",
}

const SECRET_LABELS: Record<string, string> = {
  metricool: "API access token",
  vercel: "Vercel access token",
  supabase: "Supabase Personal Access Token",
  stripe: "Stripe restricted/secret key",
  twilio: "Twilio Auth Token",
  close: "Close API key",
  resend: "Resend API key",
  railway: "Railway account token",
  whatsapp: "WhatsApp Cloud API access token",
}

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
  const [oauthProviders, setOauthProviders] = useState<OAuthStatus[]>([])
  const [scope, setScope] = useState("")
  const [isOwner, setIsOwner] = useState(false)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const [busy, setBusy] = useState("")

  const [editor, setEditor] = useState<"rest" | "openapi" | "mcp" | null>(null)
  const [credentialItem, setCredentialItem] = useState<CatalogItem | null>(null)
  const [label, setLabel] = useState("")
  const [url, setUrl] = useState("")
  const [defaultPath, setDefaultPath] = useState("")
  const [authType, setAuthType] = useState("none")
  const [headerName, setHeaderName] = useState("x-api-key")
  const [secret, setSecret] = useState("")
  const [userId, setUserId] = useState("")
  const [blogId, setBlogId] = useState("")
  const [accountSid, setAccountSid] = useState("")
  const [phoneNumberId, setPhoneNumberId] = useState("")
  const [providerEditor, setProviderEditor] = useState<OAuthStatus | null>(null)
  const [providerClientId, setProviderClientId] = useState("")
  const [providerSecret, setProviderSecret] = useState("")

  const refresh = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/connectors", { cache: "no-store" })
      const data = await response.json()
      if (response.status === 401) throw new Error("Inicia sessão no Lumin para gerir os teus conectores.")
      if (!response.ok) throw new Error(data?.error || "Não foi possível carregar os conectores.")
      setCatalog(data.catalog || [])
      setConnections(data.connections || [])
      setOauthProviders(data.oauthProviders || [])
      setScope(data.scope || "")
      setIsOwner(Boolean(data.isOwner))
    } catch (e: any) {
      setError(e?.message || "Erro a carregar conectores.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const qs = new URLSearchParams(window.location.search)
    const oauth = qs.get("oauth")
    const provider = qs.get("provider") || ""
    const reason = qs.get("reason") || ""
    if (oauth === "success") setMessage(`${provider || "Conta"} ligada ao Lumin com sucesso.`)
    if (oauth === "not_configured") setError(`A app OAuth de ${provider} ainda não está configurada pelo administrador do Lumin.`)
    if (oauth === "denied") setError(`Autorização ${provider} recusada${reason ? `: ${reason}` : "."}`)
    if (oauth === "error" || oauth === "session_expired") setError(reason || "A ligação OAuth não foi concluída.")
    if (oauth) window.history.replaceState({}, "", "/connectors")
    void refresh()
  }, [])

  const oauthStatus = useMemo(
    () => new Map(oauthProviders.map((item) => [item.id, item])),
    [oauthProviders],
  )

  const connectionMap = useMemo(() => {
    const map = new Map<string, Connection>()
    for (const item of connections) map.set(item.provider, item)
    return map
  }, [connections])

  const resetEditors = () => {
    setEditor(null)
    setCredentialItem(null)
    setLabel("")
    setUrl("")
    setDefaultPath("")
    setAuthType("none")
    setHeaderName("x-api-key")
    setSecret("")
    setUserId("")
    setBlogId("")
    setAccountSid("")
    setPhoneNumberId("")
    setProviderEditor(null)
    setProviderClientId("")
    setProviderSecret("")
  }

  const openGeneric = (type: "rest" | "openapi" | "mcp") => {
    resetEditors()
    setEditor(type)
    setLabel(type === "mcp" ? "Meu MCP" : type === "openapi" ? "Minha OpenAPI" : "Minha API")
    setAuthType(type === "mcp" ? "mcp" : "none")
    setError("")
    setMessage("")
  }

  const openCredentials = (item: CatalogItem) => {
    resetEditors()
    setCredentialItem(item)
    setLabel(item.name)
    setAuthType(AUTH_TYPES[item.id] || "bearer")
    setError("")
    setMessage("")
  }

  const openProviderSettings = (status: OAuthStatus) => {
    resetEditors()
    setProviderEditor(status)
    setProviderClientId("")
    setProviderSecret("")
    setError("")
    setMessage("")
  }

  const saveProviderSettings = async () => {
    if (!providerEditor) return
    setBusy("provider-save")
    setError("")
    setMessage("")
    try {
      if (!providerClientId.trim()) throw new Error("Indica o Client ID.")
      const response = await fetch("/api/connectors/providers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: providerEditor.id,
          clientId: providerClientId.trim(),
          clientSecret: providerSecret.trim() || undefined,
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data?.error || "Não foi possível guardar a app OAuth.")
      setOauthProviders(data.providers || [])
      setMessage(`App OAuth ${providerEditor.id} guardada. Confirma agora o callback no fornecedor e testa Ligar.`)
      setProviderEditor(null)
      setProviderClientId("")
      setProviderSecret("")
      await refresh()
    } catch (e: any) {
      setError(e?.message || "Erro a configurar app OAuth.")
    } finally {
      setBusy("")
    }
  }

  const startOAuth = (item: CatalogItem) => {
    const provider = item.authProvider || item.id
    const status = oauthStatus.get(provider)
    setError("")
    setMessage("")
    if (!status?.configured) {
      setError(
        `${item.name} já tem o fluxo OAuth no Lumin, mas falta configurar a app ${status?.label || provider} no servidor. Callback: ${window.location.origin}${status?.callbackPath || `/api/connectors/oauth/callback/${provider}`}`,
      )
      return
    }
    window.location.assign(`/api/connectors/oauth/start/${provider}`)
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

      await saveAndTest({
        provider,
        label,
        authType,
        config,
        secret: secret || undefined,
      })
      resetEditors()
    } catch (e: any) {
      setError(e?.message || "Erro a guardar conector.")
    } finally {
      setBusy("")
    }
  }

  const saveCredentials = async () => {
    if (!credentialItem) return
    setBusy("save")
    setError("")
    setMessage("")
    try {
      const config: Record<string, any> = {}
      if (credentialItem.id === "metricool") {
        config.userId = userId.trim()
        if (blogId.trim()) config.blogId = blogId.trim()
      }
      if (credentialItem.id === "twilio") config.accountSid = accountSid.trim()
      if (credentialItem.id === "whatsapp") config.phoneNumberId = phoneNumberId.trim()

      await saveAndTest({
        provider: credentialItem.id,
        label: credentialItem.name,
        authType: AUTH_TYPES[credentialItem.id] || "bearer",
        config,
        secret,
      })
      resetEditors()
    } catch (e: any) {
      setError(e?.message || "Erro a guardar conector.")
    } finally {
      setBusy("")
    }
  }

  const saveAndTest = async (payload: any) => {
    const response = await fetch("/api/connectors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
    const data = await response.json()
    if (!response.ok) throw new Error(data?.error || "Não foi possível guardar.")
    await refresh()
    await test(payload.provider)
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
      throw e
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
      setMessage("Conector desligado e credencial removida do Vault.")
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
            Credenciais encriptadas no Vault
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
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">Liga a tua conta. O Lumin trabalha com ela.</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400">
              OAuth para contas pessoais, tokens/API keys quando o fornecedor assim funciona, e MCP/OpenAPI/REST para qualquer sistema compatível. Cada utilizador liga apenas as suas próprias contas.
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

        {isOwner && (
          <section className="mt-6 rounded-[26px] border border-violet-400/15 bg-violet-400/[.025] p-5 sm:p-6">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-violet-400/15 bg-violet-400/[.07]">
                <Settings className="h-4 w-4 text-violet-300" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-[10px] font-semibold uppercase tracking-[.18em] text-violet-300/70">Admin do Lumin</div>
                <h3 className="mt-1 text-lg font-semibold">Apps OAuth dos fornecedores</h3>
                <p className="mt-1 text-sm leading-6 text-zinc-500">
                  Configura uma vez Google, Meta, GitHub, Canva, Figma e Netlify. Depois qualquer utilizador só carrega em Ligar e autoriza a própria conta.
                </p>
              </div>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {oauthProviders.map((provider) => (
                <button
                  key={provider.id}
                  onClick={() => openProviderSettings(provider)}
                  className="rounded-2xl border border-white/[.07] bg-black/25 p-4 text-left hover:border-violet-400/20"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium capitalize">{provider.id}</span>
                    <span className={`text-[10px] ${provider.configured ? "text-emerald-400" : "text-amber-300"}`}>
                      {provider.configured ? `CONFIGURADO · ${provider.source || ""}` : "POR CONFIGURAR"}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-zinc-600">
                    {provider.clientIdPreview ? `Client ID: ${provider.clientIdPreview}` : "Sem Client ID ativo"}
                  </p>
                  <p className="mt-2 break-all text-[10px] leading-4 text-zinc-700">
                    {provider.callbackUrl || `${window.location.origin}${provider.callbackPath}`}
                  </p>
                </button>
              ))}
            </div>
          </section>
        )}

        {providerEditor && (
          <section className="mt-6 rounded-[26px] border border-violet-400/20 bg-[#0a0a0a] p-5 sm:p-6">
            <EditorHeader eyebrow="Configuração da app OAuth" title={providerEditor.id.toUpperCase()} onClose={resetEditors} />
            <div className="mt-4 rounded-xl border border-white/[.07] bg-white/[.02] p-3">
              <div className="text-[10px] uppercase tracking-[.14em] text-zinc-600">Callback obrigatório no fornecedor</div>
              <div className="mt-1 break-all text-xs text-amber-200">
                {providerEditor.callbackUrl || `${window.location.origin}${providerEditor.callbackPath}`}
              </div>
            </div>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <Field label="Client ID / App ID">
                <input
                  value={providerClientId}
                  onChange={(e) => setProviderClientId(e.target.value)}
                  placeholder={providerEditor.clientIdPreview || "Client ID"}
                  className="input"
                />
              </Field>
              <Field label="Client Secret / App Secret">
                <input
                  type="password"
                  value={providerSecret}
                  onChange={(e) => setProviderSecret(e.target.value)}
                  placeholder={providerEditor.hasVaultSecret ? "Deixa vazio para manter o secret atual" : "Client Secret"}
                  className="input"
                />
              </Field>
            </div>
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <button
                onClick={saveProviderSettings}
                disabled={busy === "provider-save" || !providerClientId.trim()}
                className="inline-flex items-center gap-2 rounded-xl bg-violet-300 px-4 py-2.5 text-sm font-semibold text-black disabled:opacity-40"
              >
                {busy === "provider-save" ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                Guardar app OAuth
              </button>
              <span className="text-xs text-zinc-600">O secret é cifrado no Vault e nunca volta ao browser.</span>
            </div>
          </section>
        )}

        {editor && (
          <section className="mt-6 rounded-[26px] border border-amber-300/15 bg-[#0a0a0a] p-5 sm:p-6">
            <EditorHeader
              eyebrow="Conector universal"
              title={editor === "mcp" ? "Servidor MCP" : editor === "openapi" ? "OpenAPI" : "REST API"}
              onClose={resetEditors}
            />
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
            <SaveButton
              onClick={saveGeneric}
              disabled={busy === "save" || !label.trim() || !url.trim()}
              busy={busy === "save"}
            />
          </section>
        )}

        {credentialItem && (
          <section className="mt-6 rounded-[26px] border border-amber-300/15 bg-[#0a0a0a] p-5 sm:p-6">
            <EditorHeader eyebrow="Ligação por credencial" title={credentialItem.name} onClose={resetEditors} />
            <p className="mt-2 text-sm text-zinc-500">
              A credencial fica cifrada no Supabase Vault e nunca é devolvida ao browser depois de guardada.
            </p>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {credentialItem.id === "metricool" && (
                <>
                  <Field label="Metricool userId">
                    <input value={userId} onChange={(e) => setUserId(e.target.value)} placeholder="Ex.: 1234567" className="input" />
                  </Field>
                  <Field label="blogId / marca (opcional)">
                    <input value={blogId} onChange={(e) => setBlogId(e.target.value)} placeholder="Ex.: 6895405" className="input" />
                  </Field>
                </>
              )}
              {credentialItem.id === "twilio" && (
                <Field label="Account SID">
                  <input value={accountSid} onChange={(e) => setAccountSid(e.target.value)} placeholder="AC..." className="input" />
                </Field>
              )}
              {credentialItem.id === "whatsapp" && (
                <Field label="Phone Number ID">
                  <input value={phoneNumberId} onChange={(e) => setPhoneNumberId(e.target.value)} placeholder="ID do número no WhatsApp Cloud API" className="input" />
                </Field>
              )}
              <Field label={SECRET_LABELS[credentialItem.id] || "Token / API key"}>
                <input type="password" value={secret} onChange={(e) => setSecret(e.target.value)} placeholder="Cola aqui a credencial" className="input" />
              </Field>
            </div>
            <SaveButton
              onClick={saveCredentials}
              disabled={busy === "save" || !secret.trim() || (credentialItem.id === "metricool" && !userId.trim()) || (credentialItem.id === "twilio" && !accountSid.trim()) || (credentialItem.id === "whatsapp" && !phoneNumberId.trim())}
              busy={busy === "save"}
            />
          </section>
        )}

        <section className="mt-8">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-xl font-semibold">As tuas ligações</h3>
              <p className="mt-1 text-sm text-zinc-500">O Lumin só vê contas que este utilizador ou esta empresa autorizou.</p>
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
                      onClick={() => void test(connection.provider).catch(() => null)}
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
            <p className="mt-1 text-sm text-zinc-500">OAuth, API keys e conectores universais — sem contas partilhadas entre utilizadores.</p>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {catalog.map((item) => {
              const providerKey = item.authProvider || item.id
              const current = connectionMap.get(providerKey)
              const isGeneric = GENERIC.has(item.id)
              const oauth = item.mode === "oauth" ? oauthStatus.get(providerKey) : null
              const actionable = isGeneric || item.mode === "credentials" || Boolean(oauth?.configured)

              return (
                <button
                  key={item.id}
                  onClick={() => {
                    if (isGeneric) openGeneric(item.id as any)
                    else if (item.mode === "oauth") startOAuth(item)
                    else openCredentials(item)
                  }}
                  className={`group rounded-2xl border p-4 text-left transition ${actionable ? "border-amber-300/10 bg-amber-300/[.025] hover:border-amber-300/25" : "border-white/[.06] bg-white/[.015]"}`}
                >
                  <div className="flex items-start gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/[.07] bg-black/30">
                      {current?.status === "connected" ? <CheckCircle2 className="h-4 w-4 text-emerald-400" /> : <Plug className={`h-4 w-4 ${actionable ? "text-amber-300" : "text-zinc-600"}`} />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-zinc-200">{item.name}</h4>
                        {current?.status === "connected" && <span className="text-[10px] text-emerald-400">LIGADO</span>}
                      </div>
                      <p className="mt-1 text-xs leading-5 text-zinc-600">{item.description}</p>
                      <div className="mt-3 flex items-center justify-between gap-2">
                        <span className="text-[10px] uppercase tracking-[.14em] text-zinc-700">{item.category}</span>
                        <span className={`flex items-center gap-1 text-xs ${actionable ? "text-amber-300/80" : "text-zinc-700"}`}>
                          {current?.status === "connected"
                            ? "Reconectar"
                            : item.mode === "oauth" && !oauth?.configured
                              ? "Falta app OAuth"
                              : "Ligar"}
                          <ChevronRight className="h-3.5 w-3.5" />
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

function EditorHeader({ eyebrow, title, onClose }: { eyebrow: string; title: string; onClose: () => void }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <div className="text-xs uppercase tracking-[.18em] text-amber-300/70">{eyebrow}</div>
        <h3 className="mt-1 text-xl font-semibold">{title}</h3>
      </div>
      <button onClick={onClose} className="rounded-xl border border-white/10 px-3 py-2 text-xs text-zinc-400 hover:text-white">Fechar</button>
    </div>
  )
}

function SaveButton({ onClick, disabled, busy }: { onClick: () => void; disabled: boolean; busy: boolean }) {
  return (
    <div className="mt-5 flex flex-wrap items-center gap-3">
      <button
        onClick={onClick}
        disabled={disabled}
        className="inline-flex items-center gap-2 rounded-xl bg-amber-300 px-4 py-2.5 text-sm font-semibold text-black disabled:opacity-40"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
        Guardar e testar
      </button>
      <p className="text-xs text-zinc-600">O Lumin só marca como ligado depois de validar a credencial.</p>
    </div>
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
