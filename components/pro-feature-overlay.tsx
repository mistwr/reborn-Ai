"use client"

import { Lock, Sparkles, Zap, Target, TrendingUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { trackEvent } from "@/lib/analytics"
import { formatPrice, PRO_PLAN } from "@/lib/plans"

interface ProFeatureOverlayProps {
  featureName: string
  onUnlock: () => void
}

export function ProFeatureOverlay({ featureName, onUnlock }: ProFeatureOverlayProps) {
  const handleUnlock = () => {
    trackEvent("pro_feature_clicked", { feature: featureName })
    onUnlock()
  }

  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-background/80 backdrop-blur-md rounded-2xl">
      <div className="text-center space-y-4 p-6 max-w-sm">
        {/* Lock Icon */}
        <div className="w-16 h-16 mx-auto bg-gradient-to-br from-primary/20 to-violet-500/20 rounded-2xl flex items-center justify-center border border-primary/20">
          <Lock className="w-8 h-8 text-primary" />
        </div>

        {/* Title */}
        <div className="space-y-2">
          <h3 className="text-xl font-bold text-foreground">
            Ferramenta Pro
          </h3>
          <p className="text-sm text-muted-foreground">
            Esta funcionalidade esta disponivel no Reborn AI Pro.
          </p>
        </div>

        {/* Quick benefits */}
        <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Zap className="w-3 h-3 text-primary" />
            Mais criacao
          </span>
          <span className="flex items-center gap-1">
            <Target className="w-3 h-3 text-primary" />
            Mais velocidade
          </span>
          <span className="flex items-center gap-1">
            <TrendingUp className="w-3 h-3 text-primary" />
            Mais vendas
          </span>
        </div>

        {/* CTA */}
        <div className="space-y-2 pt-2">
          <Button onClick={handleUnlock} className="w-full gap-2">
            <Sparkles className="w-4 h-4" />
            Desbloquear por {formatPrice(PRO_PLAN.priceInCents)}/mes
          </Button>
          <Button variant="ghost" size="sm" onClick={handleUnlock} className="w-full text-xs">
            Ver planos
          </Button>
        </div>
      </div>
    </div>
  )
}
