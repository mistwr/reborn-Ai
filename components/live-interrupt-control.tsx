"use client"

import { useEffect, useState } from "react"
import { Hand, Mic } from "lucide-react"

export function LiveInterruptControl() {
  const [speaking, setSpeaking] = useState(false)

  useEffect(() => {
    const onSpeech = (event: Event) => {
      const detail = (event as CustomEvent)?.detail || {}
      if (detail.phase === "start") setSpeaking(true)
      if (detail.phase === "end") setSpeaking(false)
    }

    const onLiveState = (event: Event) => {
      const detail = (event as CustomEvent)?.detail || {}
      if (detail.state === "speaking") setSpeaking(true)
      if (detail.state === "idle" || detail.state === "seeing" || detail.state === "thinking") {
        if (!window.speechSynthesis?.speaking) setSpeaking(false)
      }
    }

    window.addEventListener("reborn-neural-speech", onSpeech as EventListener)
    window.addEventListener("reborn-live-state", onLiveState as EventListener)

    const poll = window.setInterval(() => {
      if (!window.speechSynthesis) return
      if (window.speechSynthesis.speaking) setSpeaking(true)
    }, 350)

    return () => {
      window.removeEventListener("reborn-neural-speech", onSpeech as EventListener)
      window.removeEventListener("reborn-live-state", onLiveState as EventListener)
      window.clearInterval(poll)
    }
  }, [])

  const interrupt = () => {
    try {
      window.speechSynthesis?.cancel()
    } catch {}

    window.dispatchEvent(new CustomEvent("reborn-live-interrupt", { detail: { source: "user" } }))
    window.dispatchEvent(new CustomEvent("reborn-live-state", { detail: { state: "idle" } }))
    setSpeaking(false)
  }

  if (!speaking) return null

  return (
    <button
      type="button"
      onClick={interrupt}
      className="fixed bottom-24 left-1/2 z-[110] flex -translate-x-1/2 items-center gap-2 rounded-full border border-violet-300/25 bg-black/80 px-4 py-2.5 text-xs font-medium text-white shadow-[0_10px_35px_rgba(0,0,0,.35),0_0_30px_rgba(124,58,237,.18)] backdrop-blur-xl transition hover:bg-zinc-900 active:scale-[.98]"
      aria-label="Interromper Reborn AI"
    >
      <span className="relative flex h-6 w-6 items-center justify-center rounded-full bg-violet-500/15 text-violet-200">
        <Hand className="h-3.5 w-3.5" />
        <span className="absolute inset-0 animate-ping rounded-full border border-violet-400/25" />
      </span>
      <span>Interromper</span>
      <Mic className="h-3.5 w-3.5 text-emerald-300" />
    </button>
  )
}
