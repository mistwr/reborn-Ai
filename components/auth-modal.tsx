"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { signIn } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import { X, Mail, Shield, User, Smartphone, ArrowLeft, Check, Copy, Sparkles } from "lucide-react"

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
}

export function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const [step, setStep] = useState<"email" | "code" | "name">("email")
  const [email, setEmail] = useState("")
  const [name, setName] = useState("")
  const [code, setCode] = useState("")
  const [generatedCode, setGeneratedCode] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [countdown, setCountdown] = useState(0)
  const [codeCopied, setCodeCopied] = useState(false)

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [countdown])

  if (!isOpen) return null

  const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString()

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return
    setLoading(true)
    setError("")

    try {
      const users = JSON.parse(localStorage.getItem("rebornai-users") || "[]")
      const newCode = generateOTP()
      setGeneratedCode(newCode)
      localStorage.setItem("rebornai-otp", JSON.stringify({
        email,
        code: newCode,
        expires: Date.now() + 5 * 60 * 1000,
      }))
      setStep("code")
      setCountdown(60)
    } catch {
      setError("Erro ao enviar código. Tenta novamente.")
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!code) return
    setLoading(true)
    setError("")

    try {
      const otpData = JSON.parse(localStorage.getItem("rebornai-otp") || "{}")
      if (otpData.email !== email) {
        setError("Sessão expirada. Tenta novamente.")
        setStep("email")
        return
      }
      if (Date.now() > otpData.expires) {
        setError("Código expirado. Solicita um novo.")
        return
      }
      if (otpData.code !== code) {
        setError("Código incorreto. Verifica e tenta novamente.")
        return
      }

      localStorage.removeItem("rebornai-otp")
      const users = JSON.parse(localStorage.getItem("rebornai-users") || "[]")
      const existingUser = users.find((u: any) => u.email === email)

      if (!existingUser) {
        setStep("name")
      } else {
        await signIn("credentials", { email, password: "otp-verified", redirect: false })
        onClose()
      }
    } catch {
      setError("Erro ao verificar código.")
    } finally {
      setLoading(false)
    }
  }

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name) return
    setLoading(true)
    setError("")

    try {
      const users = JSON.parse(localStorage.getItem("rebornai-users") || "[]")
      users.push({ id: Date.now().toString(), email, name, createdAt: new Date().toISOString() })
      localStorage.setItem("rebornai-users", JSON.stringify(users))
      await signIn("credentials", { email, password: "otp-verified", redirect: false })
      onClose()
    } catch {
      setError("Erro ao criar conta.")
    } finally {
      setLoading(false)
    }
  }

  const handleResendCode = () => {
    if (countdown > 0) return
    const newCode = generateOTP()
    setGeneratedCode(newCode)
    localStorage.setItem("rebornai-otp", JSON.stringify({
      email,
      code: newCode,
      expires: Date.now() + 5 * 60 * 1000,
    }))
    setCountdown(60)
    setCode("")
  }

  const copyCode = () => {
    navigator.clipboard.writeText(generatedCode)
    setCodeCopied(true)
    setTimeout(() => setCodeCopied(false), 2000)
  }

  const resetForm = () => {
    setStep("email")
    setEmail("")
    setName("")
    setCode("")
    setError("")
    setGeneratedCode("")
  }

  const title = step === "email" ? "Entrar no Lumin AI" : step === "code" ? "Verificar código" : "Criar conta"
  const subtitle = step === "email"
    ? "Acede ao teu espaço com um código seguro."
    : step === "code"
      ? `Código enviado para ${email}`
      : "Só falta dizeres-nos como te devemos chamar."

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-xl p-4 sm:p-6">
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_50%_18%,rgba(245,190,80,0.14),transparent_34%),radial-gradient(circle_at_80%_80%,rgba(109,40,217,0.10),transparent_30%)]" />

      <Card className="relative w-full max-w-[430px] overflow-hidden rounded-[28px] border border-amber-300/15 bg-[#09090b]/95 shadow-[0_30px_100px_rgba(0,0,0,.65),0_0_70px_rgba(217,164,65,.08)]">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-300/70 to-transparent" />

        <div className="p-5 sm:p-7">
          <div className="mb-6 flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              {step !== "email" && (
                <button
                  onClick={() => setStep(step === "name" ? "code" : "email")}
                  className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] text-zinc-400 transition hover:border-amber-300/30 hover:text-amber-200"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
              )}

              <div className="flex gap-3">
                <div className="relative mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-amber-300/25 bg-gradient-to-br from-amber-300/10 to-black shadow-[inset_0_0_24px_rgba(255,194,85,.08)]">
                  <div className="absolute inset-2 rounded-full border border-amber-200/15" />
                  <Sparkles className="h-5 w-5 text-amber-300" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold tracking-tight text-white sm:text-2xl">{title}</h2>
                  <p className="mt-1 text-xs leading-relaxed text-zinc-500 sm:text-sm">{subtitle}</p>
                </div>
              </div>
            </div>

            <button
              onClick={() => { onClose(); resetForm() }}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-zinc-500 transition hover:bg-white/[0.05] hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {error && (
            <div className="mb-4 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          )}

          {step === "email" && (
            <form onSubmit={handleSendCode} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-500">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-600" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="teu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-12 rounded-2xl border-white/10 bg-white/[0.035] pl-11 text-white placeholder:text-zinc-600 focus-visible:border-amber-300/40 focus-visible:ring-amber-300/20"
                    required
                    autoFocus
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="h-12 w-full rounded-2xl border border-amber-200/30 bg-gradient-to-r from-[#6b4a16] via-[#b87a22] to-[#6a4514] font-semibold text-white shadow-[0_10px_35px_rgba(214,153,48,.18)] transition hover:brightness-110"
                disabled={loading}
              >
                {loading ? (
                  <span className="flex items-center gap-2"><span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />A enviar...</span>
                ) : (
                  <span className="flex items-center gap-2"><Smartphone className="h-4 w-4" />Enviar código</span>
                )}
              </Button>

              <div className="grid grid-cols-3 gap-2 pt-2 text-center">
                {[
                  [Shield, "Seguro"],
                  [Check, "Sem password"],
                  [Sparkles, "Rápido"],
                ].map(([Icon, text]: any) => (
                  <div key={text} className="rounded-2xl border border-white/[0.06] bg-white/[0.025] px-2 py-3">
                    <Icon className="mx-auto mb-1.5 h-4 w-4 text-amber-300/80" />
                    <span className="text-[10px] text-zinc-500 sm:text-xs">{text}</span>
                  </div>
                ))}
              </div>
            </form>
          )}

          {step === "code" && (
            <form onSubmit={handleVerifyCode} className="space-y-4">
              <div className="rounded-2xl border border-amber-300/15 bg-gradient-to-br from-amber-300/[0.07] via-white/[0.02] to-violet-500/[0.05] p-4">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-xs text-zinc-500">Código de verificação</p>
                  <button type="button" onClick={copyCode} className="flex items-center gap-1.5 text-xs text-amber-300 transition hover:text-amber-200">
                    {codeCopied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    {codeCopied ? "Copiado" : "Copiar"}
                  </button>
                </div>
                <p className="text-center font-mono text-2xl font-semibold tracking-[0.45em] text-white sm:text-3xl">{generatedCode}</p>
                <p className="mt-3 text-center text-[10px] text-zinc-600">Modo de teste: em produção este código é enviado por email/SMS.</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="code" className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-500">Introduz o código</Label>
                <div className="relative">
                  <Shield className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-600" />
                  <Input
                    id="code"
                    type="text"
                    placeholder="000000"
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    className="h-12 rounded-2xl border-white/10 bg-white/[0.035] pl-11 text-center font-mono text-xl tracking-[0.3em] text-white placeholder:text-zinc-700 focus-visible:border-amber-300/40 focus-visible:ring-amber-300/20"
                    maxLength={6}
                    required
                    autoFocus
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="h-12 w-full rounded-2xl border border-amber-200/30 bg-gradient-to-r from-[#6b4a16] via-[#b87a22] to-[#6a4514] font-semibold text-white shadow-[0_10px_35px_rgba(214,153,48,.18)] transition hover:brightness-110"
                disabled={loading || code.length !== 6}
              >
                {loading ? "A verificar..." : <span className="flex items-center gap-2"><Check className="h-4 w-4" />Verificar código</span>}
              </Button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={handleResendCode}
                  disabled={countdown > 0}
                  className={`text-sm ${countdown > 0 ? "text-zinc-700" : "text-amber-300 hover:text-amber-200"}`}
                >
                  {countdown > 0 ? `Reenviar código em ${countdown}s` : "Reenviar código"}
                </button>
              </div>
            </form>
          )}

          {step === "name" && (
            <form onSubmit={handleCreateAccount} className="space-y-4">
              <div className="mx-auto mb-2 flex h-20 w-20 items-center justify-center rounded-full border border-amber-300/20 bg-[radial-gradient(circle_at_35%_30%,rgba(255,219,145,.28),rgba(15,15,18,.95)_48%,rgba(179,121,29,.15)_80%)] shadow-[0_0_35px_rgba(229,170,63,.15)]">
                <Sparkles className="h-8 w-8 text-amber-300" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="name" className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-500">O teu nome</Label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-600" />
                  <Input
                    id="name"
                    type="text"
                    placeholder="Como te devemos chamar?"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="h-12 rounded-2xl border-white/10 bg-white/[0.035] pl-11 text-white placeholder:text-zinc-600 focus-visible:border-amber-300/40 focus-visible:ring-amber-300/20"
                    required
                    autoFocus
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="h-12 w-full rounded-2xl border border-amber-200/30 bg-gradient-to-r from-[#6b4a16] via-[#b87a22] to-[#6a4514] font-semibold text-white shadow-[0_10px_35px_rgba(214,153,48,.18)] transition hover:brightness-110"
                disabled={loading || !name}
              >
                {loading ? "A criar conta..." : <span className="flex items-center gap-2"><Sparkles className="h-4 w-4" />Entrar no Lumin AI</span>}
              </Button>

              <p className="text-center text-xs leading-relaxed text-zinc-600">Ao continuar, aceitas os Termos de Serviço e a Política de Privacidade.</p>
            </form>
          )}
        </div>
      </Card>
    </div>
  )
}
