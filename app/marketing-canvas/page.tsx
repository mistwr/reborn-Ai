import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { MarketingStudioCanvas } from "@/components/marketing-studio-canvas"

export default function MarketingCanvasPage() {
  return (
    <main className="min-h-screen bg-background">
      <div className="sticky top-0 z-20 border-b border-border/50 bg-background/90 backdrop-blur-xl px-4 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Button asChild variant="ghost" size="sm">
            <Link href="/" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Reborn AI
            </Link>
          </Button>
          <div className="text-right">
            <p className="text-sm font-semibold">Marketing Canvas</p>
            <p className="text-[10px] text-muted-foreground">Legacy engine recuperado</p>
          </div>
        </div>
      </div>
      <MarketingStudioCanvas />
    </main>
  )
}
