"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Cookie, X } from "lucide-react"

export function GDPRBanner() {
  const [showBanner, setShowBanner] = useState(false)

  useEffect(() => {
    const consent = localStorage.getItem("gdpr-consent")
    if (!consent) {
      setShowBanner(true)
    }
  }, [])

  const acceptCookies = () => {
    localStorage.setItem("gdpr-consent", "accepted")
    setShowBanner(false)
  }

  const rejectCookies = () => {
    localStorage.setItem("gdpr-consent", "rejected")
    setShowBanner(false)
  }

  if (!showBanner) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[90] p-4">
      <Card className="max-w-2xl mx-auto bg-card/95 backdrop-blur-xl border-border shadow-2xl">
        <div className="p-4 sm:p-6">
          <div className="flex items-start gap-4">
            <div className="shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Cookie className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 space-y-3">
              <h3 className="font-semibold text-lg">Cookies e Privacidade</h3>
              <p className="text-sm text-muted-foreground">
                Utilizamos cookies essenciais para garantir o funcionamento adequado do site e cookies analíticos para
                melhorar a sua experiência. Os seus dados são processados de acordo com o RGPD.
              </p>
              <div className="flex flex-col sm:flex-row gap-2">
                <Button onClick={acceptCookies} className="flex-1 sm:flex-none">
                  Aceitar Tudo
                </Button>
                <Button onClick={rejectCookies} variant="outline" className="flex-1 sm:flex-none bg-transparent">
                  Apenas Essenciais
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setShowBanner(false)} className="sm:ml-auto">
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}
