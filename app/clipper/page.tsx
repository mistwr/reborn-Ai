"use client"

import Link from "next/link"
import { ArrowLeft, Scissors, Sparkles } from "lucide-react"
import { CliperAITab } from "@/components/pro/clipper-ai-tab"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

export default function ClipperPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b border-border bg-card/80 backdrop-blur-xl">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="sm" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Voltar
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#d6a84b]/30 bg-[#d6a84b]/10">
                <Scissors className="h-4 w-4 text-[#dfb75f]" />
              </div>
              <span className="text-lg font-semibold">Clipper AI</span>
            </div>
          </div>
          <div className="hidden items-center gap-2 text-sm text-muted-foreground sm:flex">
            <Sparkles className="h-4 w-4 text-[#dfb75f]" />
            Gerar ou cortar vídeos
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <CliperAITab />
      </main>
    </div>
  )
}
