"use client"

import type { FormEvent, ReactNode } from "react"
import { Image as ImageIcon, Mic, Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface LuminShellComposerProps {
  value: string
  onChange: (value: string) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  onImage?: () => void
  onMic?: () => void
  disabled?: boolean
  placeholder?: string
  leading?: ReactNode
}

export function LuminShellComposer({
  value,
  onChange,
  onSubmit,
  onImage,
  onMic,
  disabled = false,
  placeholder = "Escreve uma mensagem...",
  leading,
}: LuminShellComposerProps) {
  return (
    <div className="shrink-0 border-t border-[#d6a84b]/10 bg-[#050504]/92 px-3 py-3 backdrop-blur-xl sm:px-4">
      <div className="mx-auto w-full max-w-3xl">
        <form onSubmit={onSubmit} className="flex items-center gap-2">
          {leading}
          {onImage ? (
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={onImage}
              className="h-9 w-9 shrink-0 border-[#d6a84b]/15 bg-black/20 text-zinc-500 hover:border-[#d6a84b]/35 hover:bg-[#d6a84b]/[.05] hover:text-[#f0c86b]"
              aria-label="Anexar imagem"
            >
              <ImageIcon className="h-4 w-4" />
            </Button>
          ) : null}
          {onMic ? (
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={onMic}
              className="h-9 w-9 shrink-0 border-[#d6a84b]/15 bg-black/20 text-zinc-500 hover:border-[#d6a84b]/35 hover:bg-[#d6a84b]/[.05] hover:text-[#f0c86b]"
              aria-label="Usar microfone"
            >
              <Mic className="h-4 w-4" />
            </Button>
          ) : null}

          <Input
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder={placeholder}
            className="h-10 flex-1 border-[#d6a84b]/12 bg-black/25 text-zinc-100 placeholder:text-zinc-600 focus-visible:border-[#d6a84b]/35 focus-visible:ring-[#d6a84b]/15"
          />

          <Button
            type="submit"
            disabled={disabled || !value.trim()}
            className="h-10 shrink-0 border border-[#e8bd61]/30 bg-[#d6a84b] px-3 text-[#080603] shadow-[0_0_22px_rgba(214,168,75,.14)] hover:bg-[#e5bc63] disabled:opacity-35"
            aria-label="Enviar mensagem"
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  )
}
