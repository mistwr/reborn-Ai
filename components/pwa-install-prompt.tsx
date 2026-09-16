"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { X, Download, Smartphone, Monitor, Share, Sparkles } from "lucide-react"

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showPrompt, setShowPrompt] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [isStandalone, setIsStandalone] = useState(false)

  useEffect(() => {
    const isInStandaloneMode = window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true
    setIsStandalone(isInStandaloneMode)

    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream
    setIsIOS(isIOSDevice)

    const dismissedAt = localStorage.getItem("pwa-install-dismissed")
    if (dismissedAt) {
      const dismissedTime = parseInt(dismissedAt, 10)
      const dayInMs = 24 * 60 * 60 * 1000
      if (Date.now() - dismissedTime < dayInMs * 3) return
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      window.setTimeout(() => setShowPrompt(true), 3000)
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt)

    if (isIOSDevice && !isInStandaloneMode) {
      window.setTimeout(() => setShowPrompt(true), 5000)
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt)
    }
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) return

    // Hide our card before Android shows its native install sheet.
    // This avoids the double-prompt effect visible behind the system dialog.
    setShowPrompt(false)
    await deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice

    if (outcome === "accepted") {
      console.log("[Lumin PWA] User accepted the install prompt")
    } else {
      console.log("[Lumin PWA] User dismissed the install prompt")
      localStorage.setItem("pwa-install-dismissed", Date.now().toString())
    }

    setDeferredPrompt(null)
  }

  const handleDismiss = () => {
    setShowPrompt(false)
    localStorage.setItem("pwa-install-dismissed", Date.now().toString())
  }

  if (isStandalone || !showPrompt) return null

  return (
    <div className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] left-3 right-3 z-50 animate-in slide-in-from-bottom-4 duration-300 sm:bottom-4 sm:left-auto sm:right-4 sm:w-80">
      <div
        className="overflow-hidden rounded-2xl border border-[#d6a84b]/20 shadow-2xl"
        style={{ background: "rgba(7, 7, 8, 0.96)", backdropFilter: "blur(22px)" }}
      >
        <div className="p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-[#d6a84b]/20 bg-[#d6a84b]/10 text-[#e1b95f]">
              <Sparkles className="h-6 w-6" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="mb-1 text-sm font-semibold text-white">Instalar Lumin AI</h3>
              <p className="text-xs leading-relaxed text-zinc-400">
                {isIOS
                  ? "Adiciona ao Ecrã Principal para abrir o Lumin como uma app."
                  : "Instala o Lumin para acesso rápido e uma experiência de app."}
              </p>
            </div>
            <button
              onClick={handleDismiss}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-zinc-500 transition-colors hover:bg-white/10 hover:text-white active:scale-95"
              aria-label="Fechar instalação do Lumin AI"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {isIOS ? (
            <div className="mt-4 space-y-2 rounded-xl bg-white/5 p-3">
              <p className="flex items-center gap-2 text-xs text-zinc-300">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#d6a84b]/15 text-[10px] font-bold text-[#e1b95f]">1</span>
                Toca em <Share className="mx-1 inline h-4 w-4 text-[#e1b95f]" /> Partilhar
              </p>
              <p className="flex items-center gap-2 text-xs text-zinc-300">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#d6a84b]/15 text-[10px] font-bold text-[#e1b95f]">2</span>
                Seleciona “Adicionar ao Ecrã Principal”
              </p>
              <p className="flex items-center gap-2 text-xs text-zinc-300">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#d6a84b]/15 text-[10px] font-bold text-[#e1b95f]">3</span>
                Toca em “Adicionar”
              </p>
            </div>
          ) : (
            <div className="mt-4 grid grid-cols-[1fr_auto] gap-2">
              <Button
                onClick={handleInstall}
                className="min-h-11 bg-gradient-to-r from-[#7b561c] via-[#c49135] to-[#7a5118] font-medium text-white hover:opacity-95 active:scale-[.99]"
              >
                <Download className="mr-2 h-4 w-4" />
                Instalar App
              </Button>
              <Button
                onClick={handleDismiss}
                variant="outline"
                className="min-h-11 border-white/10 bg-transparent px-4 text-zinc-400 hover:bg-white/10 hover:text-white"
              >
                Agora não
              </Button>
            </div>
          )}
        </div>

        <div className="px-4 pb-4 pt-0">
          <div className="flex items-center justify-center gap-4 text-[10px] text-zinc-500">
            <span className="flex items-center gap-1">
              <Monitor className="h-3 w-3" />
              Modo app
            </span>
            <span className="flex items-center gap-1">
              <Smartphone className="h-3 w-3" />
              Acesso rápido
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
