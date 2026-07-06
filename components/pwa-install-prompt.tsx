"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { X, Download, Smartphone, Monitor, Share } from "lucide-react"

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
    // Check if already installed
    const isInStandaloneMode = window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true
    setIsStandalone(isInStandaloneMode)

    // Check if iOS
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream
    setIsIOS(isIOSDevice)

    // Check if dismissed recently
    const dismissedAt = localStorage.getItem("pwa-install-dismissed")
    if (dismissedAt) {
      const dismissedTime = parseInt(dismissedAt, 10)
      const dayInMs = 24 * 60 * 60 * 1000
      if (Date.now() - dismissedTime < dayInMs * 3) {
        return // Don't show for 3 days after dismissal
      }
    }

    // Listen for the beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      
      // Show prompt after a short delay
      setTimeout(() => {
        setShowPrompt(true)
      }, 3000)
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt)

    // For iOS, show after delay
    if (isIOSDevice && !isInStandaloneMode) {
      setTimeout(() => {
        setShowPrompt(true)
      }, 5000)
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt)
    }
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) return

    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice

    if (outcome === "accepted") {
      console.log("[PWA] User accepted the install prompt")
    } else {
      console.log("[PWA] User dismissed the install prompt")
    }

    setDeferredPrompt(null)
    setShowPrompt(false)
  }

  const handleDismiss = () => {
    setShowPrompt(false)
    localStorage.setItem("pwa-install-dismissed", Date.now().toString())
  }

  // Don't show if already installed
  if (isStandalone || !showPrompt) return null

  return (
    <div className="fixed bottom-20 sm:bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-80 z-50 animate-in slide-in-from-bottom-4 duration-300">
      <div 
        className="rounded-2xl border border-white/10 shadow-2xl overflow-hidden"
        style={{ background: "rgba(10, 10, 15, 0.95)", backdropFilter: "blur(20px)" }}
      >
        <div className="p-4">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-violet-500 flex items-center justify-center flex-shrink-0">
              {isIOS ? (
                <Smartphone className="h-6 w-6 text-white" />
              ) : (
                <Download className="h-6 w-6 text-white" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-white mb-1">Instalar Reborn AI</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                {isIOS 
                  ? "Adiciona ao Ecra Inicial para acesso rapido"
                  : "Instala a app para usar offline e acesso rapido"
                }
              </p>
            </div>
            <button
              onClick={handleDismiss}
              className="h-8 w-8 rounded-full flex items-center justify-center text-zinc-500 hover:text-white hover:bg-white/10 transition-colors flex-shrink-0"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {isIOS ? (
            <div className="mt-4 p-3 rounded-xl bg-white/5 space-y-2">
              <p className="text-xs text-zinc-300 flex items-center gap-2">
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary/20 text-primary text-[10px] font-bold">1</span>
                Toca em <Share className="h-4 w-4 text-blue-400 inline mx-1" /> Partilhar
              </p>
              <p className="text-xs text-zinc-300 flex items-center gap-2">
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary/20 text-primary text-[10px] font-bold">2</span>
                Seleciona "Adicionar ao Ecra Inicial"
              </p>
              <p className="text-xs text-zinc-300 flex items-center gap-2">
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary/20 text-primary text-[10px] font-bold">3</span>
                Toca em "Adicionar"
              </p>
            </div>
          ) : (
            <div className="mt-4 flex gap-2">
              <Button
                onClick={handleInstall}
                className="flex-1 bg-gradient-to-r from-primary to-violet-600 hover:opacity-90 text-white font-medium"
              >
                <Download className="h-4 w-4 mr-2" />
                Instalar App
              </Button>
              <Button
                onClick={handleDismiss}
                variant="outline"
                className="border-white/10 text-zinc-400 hover:text-white hover:bg-white/10"
              >
                Agora nao
              </Button>
            </div>
          )}
        </div>

        {/* Features */}
        <div className="px-4 pb-4 pt-0">
          <div className="flex items-center justify-center gap-4 text-[10px] text-zinc-500">
            <span className="flex items-center gap-1">
              <Monitor className="h-3 w-3" />
              Funciona Offline
            </span>
            <span className="flex items-center gap-1">
              <Smartphone className="h-3 w-3" />
              Acesso Rapido
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
