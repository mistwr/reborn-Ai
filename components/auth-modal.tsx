"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { signIn } from "next-auth/react"
import { Building2, Check, Mail, Shield, Sparkles, User, Users, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

type Step = "email" | "code" | "type" | "profile"
type AccountType = "personal" | "business"

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
}

export function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const [step, setStep] = useState<Step>("email")
  const [email, setEmail] = useState("")
  const [code, setCode] = useState("")
  const [displayName, setDisplayName] = useState("")
  const [accountType, setAccountType] = useState<AccountType>("personal")
  const [companyName, setCompanyName] = useState("")
  const [sector, setSector] = useState("")
  const [website, setWebsite] = useState("")
  const [accessToken, setAccessToken] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [countdown, setCountdown] = useState(0)
  const [callbackActive, setCallbackActive] = useState(false)

  const reset = () => {
    setStep("email")
    setEmail("")
    setCode("")
    setDisplayName("")
    setAccountType("personal")
    setCompanyName("")
    setSector("")
    setWebsite("")
    setAccessToken("")
    setError("")
    setCountdown(0)
  }

  const finishSession = async (token: string) => {
    const result = await signIn("credentials", { accessToken: token, redirect: false })
    if (result?.error || result?.ok === false) throw new Error("Não foi possível criar a sessão Lumin.")
    setCallbackActive(false)
    onClose()
    reset()
    window.location.reload()
  }

  useEffect(() => {
    if (countdown <= 0) return
    const timer = window.setTimeout(() => setCountdown((value) => value - 1), 1000)
    return () => window.clearTimeout(timer)
  }, [countdown])

  useEffect(() => {
    let cancelled = false

    const handleMagicLink = async () => {
      const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""))
      const token = hash.get("access_token")
      const authError = hash.get("error_description") || hash.get("error")

      if (!token && !authError) return

      setCallbackActive(true)
      setLoading(true)
      setError("")
      window.history.replaceState({}, document.title, `${window.location.pathname}${window.location.search}`)

      if (authError) {
        if (!cancelled) {
          setLoading(false)
          setStep("email")
          setError(decodeURIComponent(authError.replace(/\+/g, " ")))
        }
        return
      }

      try {
        const response = await fetch("/api/lumin-auth/otp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "inspect", accessToken: token }),
        })
        const data = await response.json().catch(() => ({}))
        if (!response.ok) throw new Error(data?.error || "O link de acesso é inválido ou expirou.")
        if (cancelled) return

        setAccessToken(token || "")
        setEmail(data?.user?.email || "")
        setDisplayName(data?.account?.display_name || data?.user?.name || "")

        if (data?.needsOnboarding) {
          setStep("type")
          setLoading(false)
          return
        }

        await finishSession(token || "")
      } catch (err: any) {
        if (!cancelled) {
          setLoading(false)
          setStep("email")
          setError(err?.message || "Não foi possível concluir o acesso pelo link.")
        }
      }
    }

    void handleMagicLink()
    return () => {
      cancelled = true
    }
  }, [])

  const sendCode = async () => {
    const response = await fetch("/api/lumin-auth/otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "send", email }),
    })
    const data = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(data?.error || "Não foi possível enviar o acesso.")
    setStep("code")
    setCountdown(60)
  }

  const handleSendCode = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!email.trim()) return
    setLoading(true)
    setError("")
    try {
      await sendCode()
    } catch (err: any) {
      setError(err?.message || "Erro ao enviar o acesso.")
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyCode = async (event: React.FormEvent) => {
    event.preventDefault()
    if (code.length !== 6) return
    setLoading(true)
    setError("")
    try {
      const response = await fetch("/api/lumin-auth/otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "verify", email, token: code }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok || !data?.accessToken) throw new Error(data?.error || "Código inválido ou expirado.")

      setAccessToken(data.accessToken)
      setDisplayName(data?.account?.display_name || data?.user?.name || "")

      if (!data?.needsOnboarding) {
        await finishSession(data.accessToken)
        return
      }
      setStep("type")
    } catch (err: any) {
      setError(err?.message || "Não foi possível verificar o código.")
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    if (countdown > 0 || loading) return
    setLoading(true)
    setError("")
    try {
      await sendCode()
      setCode("")
    } catch (err: any) {
      setError(err?.message || "Não foi possível reenviar o acesso.")
    } finally {
      setLoading(false)
    }
  }

  const handleOnboarding = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!accessToken || !displayName.trim()) return
    if (accountType === "business" && !companyName.trim()) return

    setLoading(true)
    setError("")
    try {
      const response = await fetch("/api/lumin-auth/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessToken, displayName, accountType, companyName, sector, website }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data?.error || "Não foi possível concluir o registo.")
      await finishSession(accessToken)
    } catch (err: any) {
      setError(err?.message || "Erro ao concluir o registo.")
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen && !callbackActive) return null

  const title = step === "email"
    ? "Entrar no Lumin AI"
    : step === "code"
      ? "Confirma o teu email"
      : step === "type"
        ? "Como vais usar o Lumin?"
        : accountType === "business"
          ? "Configura a tua empresa"
          : "Cria o teu espaço"

  const subtitle = step === "email"
    ? "Recebe um código ou link seguro e entra sem password."
    : step === "code"
      ? `Se recebeste um código, introduz os 6 dígitos enviados para ${email}. Se recebeste um link, basta abri-lo.`
      : step === "type"
        ? "O menu e o assistente adaptam-se automaticamente ao teu perfil."
        : accountType === "business"
          ? "O Lumin vai usar este contexto para trabalhar contigo e com a tua equipa."
          : "O teu assistente pessoal com Chat, Live, imagens, documentos e Lumin AI Studio."

  const close = () => {
    setCallbackActive(false)
    onClose()
    reset()
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-4 backdrop-blur-xl sm:p-6">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_15%,rgba(230,177,75,.15),transparent_34%),radial-gradient(circle_at_85%_85%,rgba(92,54,170,.10),transparent_30%)]" />
      <Card className="relative max-h-[92dvh] w-full max-w-[500px] overflow-y-auto rounded-[28px] border border-amber-300/15 bg-[#08080b]/95 shadow-[0_30px_100px_rgba(0,0,0,.68)]">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-300/70 to-transparent" />
        <div className="p-5 sm:p-7">
          <div className="mb-6 flex items-start justify-between gap-4">
            <div className="flex gap-3">
              <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-amber-300/20 bg-amber-300/[.06]">
                <Sparkles className="h-5 w-5 text-amber-300" />
              </div>
              <div>
                <h2 className="text-xl font-semibold tracking-tight text-white sm:text-2xl">{title}</h2>
                <p className="mt-1 text-xs leading-relaxed text-zinc-500 sm:text-sm">{subtitle}</p>
              </div>
            </div>
            <button onClick={close} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-zinc-500 transition hover:bg-white/[.05] hover:text-white" aria-label="Fechar">
              <X className="h-4 w-4" />
            </button>
          </div>

          {error && <div className="mb-4 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div>}

          {loading && callbackActive && step === "email" && (
            <div className="rounded-2xl border border-amber-300/15 bg-amber-300/[.04] px-4 py-5 text-center text-sm text-zinc-300">
              A validar o teu acesso ao Lumin...
            </div>
          )}

          {step === "email" && !(loading && callbackActive) && (
            <form onSubmit={handleSendCode} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="lumin-email" className="text-xs uppercase tracking-[.16em] text-zinc-500">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-600" />
                  <Input id="lumin-email" type="email" required autoFocus value={email} onChange={(e) => setEmail(e.target.value)} placeholder="teu@email.com" className="h-12 rounded-2xl border-white/10 bg-white/[.035] pl-11 text-white placeholder:text-zinc-600" />
                </div>
              </div>
              <Button type="submit" disabled={loading} className="h-12 w-full rounded-2xl border border-amber-200/25 bg-gradient-to-r from-[#6b4a16] via-[#b87a22] to-[#6a4514] font-semibold text-white">
                {loading ? "A enviar..." : "Enviar acesso"}
              </Button>
              <div className="grid grid-cols-3 gap-2 pt-1 text-center text-[11px] text-zinc-500">
                <div className="rounded-xl border border-white/[.06] p-3"><Shield className="mx-auto mb-1.5 h-4 w-4 text-amber-300" />Seguro</div>
                <div className="rounded-xl border border-white/[.06] p-3"><Check className="mx-auto mb-1.5 h-4 w-4 text-amber-300" />Sem password</div>
                <div className="rounded-xl border border-white/[.06] p-3"><Sparkles className="mx-auto mb-1.5 h-4 w-4 text-amber-300" />Lumin</div>
              </div>
            </form>
          )}

          {step === "code" && (
            <form onSubmit={handleVerifyCode} className="space-y-4">
              <div className="rounded-2xl border border-white/[.07] bg-white/[.025] px-4 py-3 text-xs leading-relaxed text-zinc-500">
                Verifica o teu email. O Supabase pode enviar um código de 6 dígitos ou um link seguro. Se recebeste o link, abre-o e o Lumin entra automaticamente.
              </div>
              <div className="space-y-2">
                <Label htmlFor="lumin-code" className="text-xs uppercase tracking-[.16em] text-zinc-500">Código</Label>
                <Input id="lumin-code" inputMode="numeric" autoComplete="one-time-code" autoFocus maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="000000" className="h-14 rounded-2xl border-white/10 bg-white/[.035] text-center font-mono text-2xl tracking-[.35em] text-white" />
              </div>
              <Button type="submit" disabled={loading || code.length !== 6} className="h-12 w-full rounded-2xl bg-gradient-to-r from-[#6b4a16] via-[#b87a22] to-[#6a4514] text-white">
                {loading ? "A verificar..." : "Confirmar código"}
              </Button>
              <button type="button" disabled={countdown > 0 || loading} onClick={handleResend} className="w-full text-center text-sm text-amber-300 disabled:text-zinc-700">
                {countdown > 0 ? `Reenviar em ${countdown}s` : "Reenviar acesso"}
              </button>
            </form>
          )}

          {step === "type" && (
            <div className="grid gap-3 sm:grid-cols-2">
              <button onClick={() => { setAccountType("personal"); setStep("profile") }} className="group rounded-3xl border border-white/10 bg-white/[.025] p-5 text-left transition hover:border-amber-300/35 hover:bg-amber-300/[.04]">
                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-500/10 text-violet-300"><User className="h-6 w-6" /></div>
                <div className="text-lg font-semibold text-white">Para mim</div>
                <p className="mt-2 text-sm leading-relaxed text-zinc-500">Chat tipo GPT, Live, imagens, documentos, websites, apps e todas as ferramentas criativas.</p>
              </button>
              <button onClick={() => { setAccountType("business"); setStep("profile") }} className="group rounded-3xl border border-amber-300/20 bg-amber-300/[.025] p-5 text-left transition hover:border-amber-300/45 hover:bg-amber-300/[.05]">
                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-300/10 text-amber-300"><Building2 className="h-6 w-6" /></div>
                <div className="text-lg font-semibold text-white">Para a empresa</div>
                <p className="mt-2 text-sm leading-relaxed text-zinc-500">Lumin empresarial com CRM, SD Dialer, leads, vendas, marketing, websites, equipa e automações.</p>
              </button>
            </div>
          )}

          {step === "profile" && (
            <form onSubmit={handleOnboarding} className="space-y-4">
              <div className="flex items-center gap-2 rounded-2xl border border-white/[.07] bg-white/[.025] px-4 py-3 text-sm text-zinc-400">
                {accountType === "business" ? <Building2 className="h-4 w-4 text-amber-300" /> : <Users className="h-4 w-4 text-violet-300" />}
                {accountType === "business" ? "Conta Empresa" : "Conta Pessoal"}
                <button type="button" onClick={() => setStep("type")} className="ml-auto text-xs text-amber-300">Alterar</button>
              </div>

              <div className="space-y-2">
                <Label htmlFor="display-name" className="text-xs uppercase tracking-[.16em] text-zinc-500">O teu nome</Label>
                <Input id="display-name" required autoFocus value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Como te devemos chamar?" className="h-12 rounded-2xl border-white/10 bg-white/[.035] text-white" />
              </div>

              {accountType === "business" && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="company-name" className="text-xs uppercase tracking-[.16em] text-zinc-500">Empresa</Label>
                    <Input id="company-name" required value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Nome da empresa" className="h-12 rounded-2xl border-white/10 bg-white/[.035] text-white" />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Input value={sector} onChange={(e) => setSector(e.target.value)} placeholder="Setor (opcional)" className="h-11 rounded-2xl border-white/10 bg-white/[.035] text-white" />
                    <Input value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="Website (opcional)" className="h-11 rounded-2xl border-white/10 bg-white/[.035] text-white" />
                  </div>
                </>
              )}

              <Button type="submit" disabled={loading || !displayName.trim() || (accountType === "business" && !companyName.trim())} className="h-12 w-full rounded-2xl bg-gradient-to-r from-[#6b4a16] via-[#b87a22] to-[#6a4514] text-white">
                {loading ? "A preparar o teu Lumin..." : accountType === "business" ? "Criar espaço da empresa" : "Entrar no Lumin"}
              </Button>
            </form>
          )}
        </div>
      </Card>
    </div>
  )
}
