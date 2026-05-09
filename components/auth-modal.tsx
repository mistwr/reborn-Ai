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
  const [isNewUser, setIsNewUser] = useState(false)
  const [codeCopied, setCodeCopied] = useState(false)

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [countdown])

  if (!isOpen) return null

  const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString()
  }

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return
    
    setLoading(true)
    setError("")

    try {
      // Check if user exists in localStorage
      const users = JSON.parse(localStorage.getItem("rebornai-users") || "[]")
      const existingUser = users.find((u: any) => u.email === email)
      setIsNewUser(!existingUser)

      // Generate 6-digit code
      const newCode = generateOTP()
      setGeneratedCode(newCode)
      
      // Store code temporarily (in production, send via email/SMS)
      localStorage.setItem("rebornai-otp", JSON.stringify({
        email,
        code: newCode,
        expires: Date.now() + 5 * 60 * 1000 // 5 minutes
      }))

      setStep("code")
      setCountdown(60)
    } catch (err) {
      setError("Erro ao enviar codigo. Tente novamente.")
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
        setError("Sessao expirada. Tente novamente.")
        setStep("email")
        return
      }

      if (Date.now() > otpData.expires) {
        setError("Codigo expirado. Solicite um novo.")
        return
      }

      if (otpData.code !== code) {
        setError("Codigo incorreto. Verifique e tente novamente.")
        return
      }

      // Code is valid - clear OTP
      localStorage.removeItem("rebornai-otp")

      // Check if new user needs name
      const users = JSON.parse(localStorage.getItem("rebornai-users") || "[]")
      const existingUser = users.find((u: any) => u.email === email)

      if (!existingUser) {
        setStep("name")
      } else {
        // Login existing user
        await signIn("credentials", {
          email,
          password: "otp-verified",
          redirect: false,
        })
        onClose()
      }
    } catch (err) {
      setError("Erro ao verificar codigo.")
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
      // Save new user to localStorage
      const users = JSON.parse(localStorage.getItem("rebornai-users") || "[]")
      users.push({
        id: Date.now().toString(),
        email,
        name,
        createdAt: new Date().toISOString()
      })
      localStorage.setItem("rebornai-users", JSON.stringify(users))

      // Sign in the new user
      await signIn("credentials", {
        email,
        password: "otp-verified",
        redirect: false,
      })
      
      onClose()
    } catch (err) {
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
      expires: Date.now() + 5 * 60 * 1000
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

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <Card className="w-full max-w-md bg-zinc-900 border-white/10 shadow-2xl overflow-hidden">
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-3">
              {step !== "email" && (
                <button 
                  onClick={() => setStep(step === "name" ? "code" : "email")}
                  className="h-8 w-8 rounded-full flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
              )}
              <div>
                <h2 className="text-xl font-bold text-white">
                  {step === "email" && "Entrar no Reborn AI"}
                  {step === "code" && "Verificar Codigo"}
                  {step === "name" && "Criar Conta"}
                </h2>
                <p className="text-sm text-zinc-500">
                  {step === "email" && "Recebe um codigo no teu email"}
                  {step === "code" && `Codigo enviado para ${email}`}
                  {step === "name" && "So mais um passo"}
                </p>
              </div>
            </div>
            <button 
              onClick={() => { onClose(); resetForm(); }}
              className="h-8 w-8 rounded-full flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Step 1: Email */}
          {step === "email" && (
            <form onSubmit={handleSendCode} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-zinc-300">Email ou Telemovel</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-zinc-500"
                    required
                    autoFocus
                  />
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full bg-gradient-to-r from-primary to-violet-600 hover:opacity-90 text-white font-medium"
                disabled={loading}
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Enviando...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Smartphone className="h-4 w-4" />
                    Enviar Codigo
                  </span>
                )}
              </Button>

              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-white/10"></div>
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-zinc-900 px-2 text-zinc-500">Seguro e rapido</span>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-lg bg-white/5 text-sm text-zinc-400">
                <Shield className="h-5 w-5 text-primary flex-shrink-0" />
                <p>Sem passwords. Recebe um codigo de 6 digitos para verificar a tua identidade.</p>
              </div>
            </form>
          )}

          {/* Step 2: Verify Code */}
          {step === "code" && (
            <form onSubmit={handleVerifyCode} className="space-y-4">
              {/* Demo: Show the code (in production, this would be sent via email/SMS) */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-primary/10 to-violet-500/10 border border-primary/20">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-zinc-400">O teu codigo de verificacao:</p>
                  <button 
                    type="button"
                    onClick={copyCode}
                    className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors"
                  >
                    {codeCopied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    {codeCopied ? "Copiado" : "Copiar"}
                  </button>
                </div>
                <p className="text-2xl font-mono font-bold text-white tracking-[0.5em] text-center">
                  {generatedCode}
                </p>
                <p className="text-[10px] text-zinc-500 mt-2 text-center">
                  Em producao, este codigo seria enviado por email/SMS
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="code" className="text-zinc-300">Introduz o codigo</Label>
                <div className="relative">
                  <Shield className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                  <Input
                    id="code"
                    type="text"
                    placeholder="000000"
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-zinc-500 text-center text-xl tracking-[0.3em] font-mono"
                    maxLength={6}
                    required
                    autoFocus
                  />
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full bg-gradient-to-r from-primary to-violet-600 hover:opacity-90 text-white font-medium"
                disabled={loading || code.length !== 6}
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Verificando...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Check className="h-4 w-4" />
                    Verificar Codigo
                  </span>
                )}
              </Button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={handleResendCode}
                  disabled={countdown > 0}
                  className={`text-sm ${countdown > 0 ? "text-zinc-600" : "text-primary hover:underline"}`}
                >
                  {countdown > 0 ? `Reenviar codigo em ${countdown}s` : "Reenviar codigo"}
                </button>
              </div>
            </form>
          )}

          {/* Step 3: Name (for new users) */}
          {step === "name" && (
            <form onSubmit={handleCreateAccount} className="space-y-4">
              <div className="flex items-center justify-center mb-4">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-violet-600 flex items-center justify-center">
                  <Sparkles className="h-8 w-8 text-white" />
                </div>
              </div>
              
              <p className="text-center text-zinc-400 text-sm mb-4">
                Bem-vindo ao Reborn AI! Como te podemos chamar?
              </p>

              <div className="space-y-2">
                <Label htmlFor="name" className="text-zinc-300">O teu nome</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                  <Input
                    id="name"
                    type="text"
                    placeholder="O teu nome"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-zinc-500"
                    required
                    autoFocus
                  />
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full bg-gradient-to-r from-primary to-violet-600 hover:opacity-90 text-white font-medium"
                disabled={loading || !name}
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Criando conta...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4" />
                    Comecar a usar Reborn AI
                  </span>
                )}
              </Button>

              <p className="text-center text-xs text-zinc-500">
                Ao criar conta, aceitas os Termos de Servico e Politica de Privacidade
              </p>
            </form>
          )}
        </div>
      </Card>
    </div>
  )
}
