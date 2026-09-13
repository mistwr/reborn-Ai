"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Eye, Mic, Sparkles } from "lucide-react"

type AvatarState = "idle" | "seeing" | "thinking" | "speaking"

export function RebornLiveAvatar() {
  const [visible, setVisible] = useState(false)
  const [state, setState] = useState<AvatarState>("idle")
  const [caption, setCaption] = useState("")
  const [audioLevel, setAudioLevel] = useState(0)
  const pulseTimer = useRef<number | null>(null)

  const stopPulse = () => {
    if (pulseTimer.current) window.clearInterval(pulseTimer.current)
    pulseTimer.current = null
    setAudioLevel(0)
  }

  useEffect(() => {
    const onLiveState = (event: Event) => {
      const detail = (event as CustomEvent)?.detail || {}
      setVisible(true)
      if (detail.state === "seeing") setState("seeing")
      else if (detail.state === "thinking") setState("thinking")
      else if (detail.state === "idle") setState("idle")
    }

    window.addEventListener("reborn-live-state", onLiveState as EventListener)
    return () => window.removeEventListener("reborn-live-state", onLiveState as EventListener)
  }, [])

  useEffect(() => {
    const onNeuralSpeech = (event: Event) => {
      const detail = (event as CustomEvent)?.detail || {}

      if (detail.phase === "start") {
        setVisible(true)
        setState("speaking")
        setCaption(detail.text || "")
        setAudioLevel(0.18)
        return
      }

      if (detail.phase === "progress") {
        const level = Number(detail.audioLevel)
        if (Number.isFinite(level)) setAudioLevel(Math.max(0, Math.min(1, level)))
        return
      }

      if (detail.phase === "end") {
        stopPulse()
        setState("idle")
      }
    }

    window.addEventListener("reborn-neural-speech", onNeuralSpeech as EventListener)
    return () => window.removeEventListener("reborn-neural-speech", onNeuralSpeech as EventListener)
  }, [])

  useEffect(() => {
    if (!window.speechSynthesis) return
    const synth = window.speechSynthesis
    const originalSpeak = synth.speak.bind(synth)
    const originalCancel = synth.cancel.bind(synth)

    synth.speak = ((utterance: SpeechSynthesisUtterance) => {
      setVisible(true)
      setState("speaking")
      setCaption(utterance.text || "")

      const prevStart = utterance.onstart
      const prevEnd = utterance.onend
      const prevError = utterance.onerror

      utterance.onstart = (event) => {
        stopPulse()
        setState("speaking")
        pulseTimer.current = window.setInterval(() => {
          setAudioLevel(0.22 + Math.random() * 0.58)
        }, 90)
        prevStart?.call(utterance, event)
      }

      utterance.onend = (event) => {
        stopPulse()
        setState("idle")
        prevEnd?.call(utterance, event)
      }

      utterance.onerror = (event) => {
        stopPulse()
        setState("idle")
        prevError?.call(utterance, event)
      }

      return originalSpeak(utterance)
    }) as typeof synth.speak

    synth.cancel = (() => {
      stopPulse()
      setState("idle")
      return originalCancel()
    }) as typeof synth.cancel

    return () => {
      stopPulse()
      synth.speak = originalSpeak
      synth.cancel = originalCancel
    }
  }, [])

  const status = useMemo(() => {
    if (state === "speaking") return { label: "A falar", icon: Mic }
    if (state === "thinking") return { label: "A pensar", icon: Sparkles }
    if (state === "seeing") return { label: "A ver", icon: Eye }
    return { label: "Pronto", icon: Sparkles }
  }, [state])

  if (!visible) return null

  const StatusIcon = status.icon
  const glow = state === "speaking" ? 0.25 + audioLevel * 0.55 : state === "thinking" ? 0.42 : 0.22
  const scale = state === "speaking" ? 1 + audioLevel * 0.045 : state === "thinking" ? 1.025 : 1

  return (
    <div className="pointer-events-none fixed right-3 top-24 z-[95] w-[160px] sm:right-5 sm:top-24 sm:w-[196px]">
      <div
        className="overflow-hidden rounded-[28px] border border-[#d9aa4d]/25 bg-black/80 backdrop-blur-xl"
        style={{ boxShadow: `0 0 ${38 + audioLevel * 28}px rgba(217,170,77,${glow})` }}
      >
        <div className="relative aspect-square overflow-hidden bg-[radial-gradient(circle_at_50%_42%,rgba(49,35,18,.45),rgba(3,3,4,.98)_66%)]">
          <div className="absolute inset-[8%] animate-[spin_16s_linear_infinite] rounded-full border border-transparent border-r-violet-500/20 border-t-[#d9aa4d]/35" />
          <div className="absolute inset-[15%] animate-[spin_22s_linear_infinite_reverse] rounded-full border border-transparent border-b-[#d9aa4d]/20 border-l-violet-500/15" />

          <div
            className="absolute inset-[22%] rounded-full border border-white/15 transition-transform duration-100"
            style={{
              transform: `scale(${scale})`,
              boxShadow: `inset 0 0 42px rgba(255,255,255,.04), 0 0 ${32 + audioLevel * 36}px rgba(225,173,74,${0.2 + audioLevel * 0.34})`,
              background:
                "radial-gradient(circle at 32% 24%, rgba(255,255,255,.28), transparent 15%), radial-gradient(circle at 69% 72%, rgba(232,183,78,.22), transparent 24%), radial-gradient(circle at 48% 50%, rgba(28,23,31,.65), rgba(0,0,0,.98) 70%)",
            }}
          >
            <div className="absolute inset-[8%] rounded-full border border-[#efc86b]/10" />
            <div className="absolute left-[18%] top-[12%] h-[18%] w-[28%] rotate-[-24deg] rounded-full bg-white/10 blur-[5px]" />

            <div className="absolute inset-0 flex items-center justify-center">
              <div
                className="relative flex h-[42%] w-[42%] rotate-[-12deg] items-center justify-center rounded-[30%] border border-[#f4d47f]/25 bg-gradient-to-br from-[#ffe39a] via-[#bf8126] to-[#f4cb69] text-[28px] font-black text-black/85 shadow-[0_0_28px_rgba(235,190,88,.3)] sm:text-[34px]"
                style={{ transform: `rotate(-12deg) scale(${1 + audioLevel * 0.03})` }}
              >
                L
                <Sparkles className="absolute -right-2 -top-2 h-4 w-4 rotate-[12deg] text-[#ffe59b] drop-shadow-[0_0_8px_rgba(255,229,155,.8)]" />
              </div>
            </div>
          </div>

          {state === "thinking" && <div className="absolute inset-[19%] animate-pulse rounded-full ring-1 ring-[#e8bd61]/30" />}
          {state === "seeing" && <div className="absolute inset-[16%] animate-pulse rounded-full ring-1 ring-blue-300/20" />}
          {state === "speaking" && (
            <div
              className="absolute inset-[16%] rounded-full ring-1 ring-[#f1cd78]/30 transition-opacity duration-75"
              style={{ opacity: 0.35 + audioLevel * 0.6 }}
            />
          )}

          <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between rounded-full border border-white/10 bg-black/65 px-2.5 py-1.5 text-[10px] text-white backdrop-blur-md">
            <span className="font-medium text-[#edc66e]">Lumin AI</span>
            <span className="flex items-center gap-1 text-zinc-300">
              <StatusIcon className="h-3 w-3 text-[#edc66e]" />
              {status.label}
            </span>
          </div>
        </div>

        {state === "speaking" && caption && (
          <div className="max-h-[58px] overflow-hidden border-t border-white/10 bg-[#050505] px-3 py-2 text-[10px] leading-4 text-zinc-300">
            {caption.slice(0, 115)}{caption.length > 115 ? "…" : ""}
          </div>
        )}
      </div>
    </div>
  )
}
