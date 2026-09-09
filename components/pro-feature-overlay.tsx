"use client"

import { Lock, Sparkles, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { trackEvent } from "@/lib/analytics"

interface ProFeatureOverlayProps {
  feature: string
  description?: string
  onUpgrade: () => void
}

export function ProFeatureOverlay({ feature, description, onUpgrade }: ProFeatureOverlayProps) {
  const handleUpgrade = () => {
    trackEvent("pro_feature_clicked", { feature })
    onUpgrade()
  }

  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-background/80 backdrop-blur-sm rounded-xl p-4">
      <div className="max-w-sm text-center space-y-4">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center">
          <Lock className="w-7 h-7 text-primary" />
        </div>
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-medium text-primary bg-primary/10 rounded-full px-2.5 py-1 mb-2">
            <Sparkles className="w-3 h-3" />
            Reborn AI Pro
          </div>
          <h3 className="font-semibold text-lg">{feature}</h3>
          <p className="text-sm text-muted-foreground mt-1">
            {description || "Esta funcionalidade faz parte do Reborn AI Pro."}
          </p>
        </div>
        <Button onClick={handleUpgrade} className="gap-2">
          Desbloquear Pro
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  )
}
