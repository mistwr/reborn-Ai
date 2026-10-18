"use client"

import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Download, Monitor, Share2, Smartphone, Sparkles, X } from "lucide-react"

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showPrompt, setShowPrompt] = useState(false)
  const [showInstructions, setShowInstructions] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [isAndroid, setIsAndroid] = useState(false)
  const [isSamsungBrowser, setIsSamsungBrowser] = useState(false)
  const [isStandalone, setIsStandalone] = useState(false)
  const dismissedForVisit = useRef(false)
  const promptTimer = useRef<number | undefined>(undefined)

  useEffect(() => {
    const userAgent = navigator.userAgent
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true
    const isIPadOS = /Macintosh/i.test(userAgent) && navigator.maxTouchPoints > 1
    const ios = (/iPad|iPhone|iPod/.test(userAgent) || isIPadOS) && !(window as Window & { MSStream?: unknown }).MSStream
    const android = /Android/i.test(userAgent)

    setIsStandalone(standalone)
    setIsIOS(ios)
    setIsAndroid(android)
    setIsSamsungBrowser(/SamsungBrowser/i.test(userAgent))

    if (standalone) return

    try {
      if (localStorage.getItem("lumin-pwa-installed") === "1") return
      const dismissedAt = Number(localStorage.getItem("lumin-pwa-install-dismissed") || 0)
      if (dismissedAt && Date.now() - dismissedAt < 3 * 24 * 60 * 60 * 1000) return
    } catch {
      // The install prompt should still work when storage is unavailable.
    }

    const supportsInstallUi = ios || android || /Chrome|Chromium|CriOS|Edg\//i.test(userAgent)
    promptTimer.current = supportsInstallUi
      ? window.setTimeout(() => {
          promptTimer.current = undefined
          if (!dismissedForVisit.current) setShowPrompt(true)
        }, 3500)
      : undefined

    const handleBeforeInstallPrompt = (event: Event) => {
      if (dismissedForVisit.current) return
      event.preventDefault()
      setDeferredPrompt(event as BeforeInstallPromptEvent)
      setShowPrompt(true)
    }

    const handleInstalled = () => {
      dismissedForVisit.current = true
      try {
        localStorage.setItem("lumin-pwa-installed", "1")
      } catch {
        // Do not show the prompt again during this visit if storage is unavailable.
      }
      setShowPrompt(false)
      setDeferredPrompt(null)
      setShowInstructions(false)
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt)
    window.addEventListener("appinstalled", handleInstalled)

    return () => {
      if (promptTimer.current !== undefined) window.clearTimeout(promptTimer.current)
      promptTimer.current = undefined
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt)
      window.removeEventListener("appinstalled", handleInstalled)
    }
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) {
      setShowInstructions(true)
      return
    }

    const installPrompt = deferredPrompt
    setDeferredPrompt(null)
    setShowInstructions(false)
    setShowPrompt(false)

    try {
      await installPrompt.prompt()
      const { outcome } = await installPrompt.userChoice
      if (outcome === "accepted") {
        dismissedForVisit.current = true
        try {
          localStorage.setItem("lumin-pwa-installed", "1")
        } catch {
          // The app is installed even if browser storage is unavailable.
        }
        setShowPrompt(false)
      } else {
        dismissedForVisit.current = true
        try {
          localStorage.setItem("lumin-pwa-install-dismissed", Date.now().toString())
        } catch {
          // Keep the card dismissed for this visit if storage is unavailable.
        }
        setShowPrompt(false)
      }
    } catch {
      setShowPrompt(true)
      setShowInstructions(true)
    }
  }

  const handleDismiss = () => {
    dismissedForVisit.current = true
    if (promptTimer.current !== undefined) window.clearTimeout(promptTimer.current)
    promptTimer.current = undefined
    setShowPrompt(false)
    try {
      localStorage.setItem("lumin-pwa-install-dismissed", Date.now().toString())
    } catch {
      // Dismiss the card for this visit even if storage is unavailable.
    }
  }

  if (isStandalone || !showPrompt) return null

  return (
    <aside
      role="complementary"
      aria-label="Instalar Lumin AI"
      className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] left-3 right-3 z-[100] animate-in slide-in-from-bottom-4 duration-300 sm:bottom-4 sm:left-auto sm:right-4 sm:w-80"
    >
      <div
        className="overflow-hidden rounded-2xl border border-[#d6a84b]/20 shadow-2xl"
        style={{ background: "rgba(7, 7, 8, 0.97)", backdropFilter: "blur(22px)" }}
      >
        <div className="p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-[#d6a84b]/20 bg-[#d6a84b]/10 text-[#e1b95f]">
              <Sparkles className="h-6 w-6" aria-hidden="true" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="mb-1 text-sm font-semibold text-white">Instalar Lumin AI</h3>
              <p className="text-xs leading-relaxed text-zinc-400">
                Adiciona a app ao ecrã inicial para a abrir rapidamente com o ícone da Lumin.
              </p>
            </div>
            <button
              onClick={handleDismiss}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-zinc-500 transition-colors hover:bg-white/10 hover:text-white active:scale-95"
              aria-label="Fechar instalação do Lumin AI"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          {showInstructions ? (
            <div className="mt-4 space-y-2 rounded-xl bg-white/5 p-3" aria-live="polite">
              {isIOS ? (
                <>
                  <p className="flex items-center gap-2 text-xs text-zinc-300">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#d6a84b]/15 text-[10px] font-bold text-[#e1b95f]">1</span>
                    Toca em <Share2 className="mx-1 inline h-4 w-4 text-[#e1b95f]" aria-label="Partilhar" /> Partilhar.
                  </p>
                  <p className="flex items-center gap-2 text-xs text-zinc-300">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#d6a84b]/15 text-[10px] font-bold text-[#e1b95f]">2</span>
                    Escolhe “Adicionar ao ecrã principal” e confirma.
                  </p>
                </>
              ) : (
                <>
                  <p className="text-xs leading-relaxed text-zinc-300">
                    {isSamsungBrowser
                      ? "No Samsung Internet, abre o menu ☰ e escolhe “Adicionar página a” e depois “Ecrã inicial”."
                      : "Abre o menu ⋮ do navegador e escolhe “Instalar app” ou “Adicionar ao ecrã inicial”."}
                  </p>
                  {isAndroid && !isSamsungBrowser && (
                    <p className="text-[11px] leading-relaxed text-zinc-500">
                      Se estiveres noutra app, abre primeiro esta página no Chrome.
                    </p>
                  )}
                </>
              )}
            </div>
          ) : null}

          <div className="mt-4 grid grid-cols-[1fr_auto] gap-2">
            <Button
              onClick={handleInstall}
              className="min-h-11 bg-gradient-to-r from-[#7b561c] via-[#c49135] to-[#7a5118] font-medium text-white hover:opacity-95 active:scale-[.99]"
            >
              <Download className="mr-2 h-4 w-4" aria-hidden="true" />
              {deferredPrompt ? "Instalar app" : isIOS ? "Como instalar" : "Ver como instalar"}
            </Button>
            <Button
              onClick={handleDismiss}
              variant="outline"
              className="min-h-11 border-white/10 bg-transparent px-4 text-zinc-400 hover:bg-white/10 hover:text-white"
            >
              Agora não
            </Button>
          </div>
        </div>

        <div className="px-4 pb-4 pt-0">
          <div className="flex items-center justify-center gap-4 text-[10px] text-zinc-500">
            <span className="flex items-center gap-1"><Monitor className="h-3 w-3" aria-hidden="true" /> Modo app</span>
            <span className="flex items-center gap-1"><Smartphone className="h-3 w-3" aria-hidden="true" /> Acesso rápido</span>
          </div>
        </div>
      </div>
    </aside>
  )
}
