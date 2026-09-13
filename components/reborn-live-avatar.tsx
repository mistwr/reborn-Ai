"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Eye, Mic, Sparkles } from "lucide-react"

type AvatarState = "idle" | "seeing" | "thinking" | "speaking"

const BARS = [0.42, 0.72, 1, 0.78, 0.55, 0.9, 0.62]

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
        setAudioLevel(0.2)
        return
      }

      if (detail.phase === "progress") {
        const level = Number(detail.audioLevel)
        if (Number.isFinite(level)) {
          const next = Math.max(0, Math.min(1, level))
          setAudioLevel((previous) => previous * 0.42 + next * 0.58)
        }
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
      const prevBoundary = utterance.onboundary

      utterance.onstart = (event) => {
        stopPulse()
        setState("speaking")
        pulseTimer.current = window.setInterval(() => {
          setAudioLevel((previous) => {
            const target = 0.28 + Math.random() * 0.64
            return previous * 0.35 + target * 0.65
          })
        }, 72)
        prevStart?.call(utterance, event)
      }

      utterance.onboundary = (event) => {
        setAudioLevel(0.72 + Math.random() * 0.25)
        prevBoundary?.call(utterance, event)
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
  const speaking = state === "speaking"
  const energy = speaking ? Math.max(0.12, audioLevel) : state === "thinking" ? 0.28 : 0.08
  const glow = speaking ? 0.3 + energy * 0.62 : state === "thinking" ? 0.46 : 0.2
  const coreScale = speaking ? 1 + energy * 0.115 : state === "thinking" ? 1.035 : 1
  const outerScale = speaking ? 1 + energy * 0.085 : 1

  return (
    <div className="pointer-events-none fixed right-3 top-24 z-[95] w-[176px] sm:right-5 sm:top-24 sm:w-[214px]">
      <div
        className="overflow-hidden rounded-[30px] border border-[#d9aa4d]/30 bg-black/85 backdrop-blur-xl transition-shadow duration-100"
        style={{ boxShadow: `0 0 ${42 + energy * 62}px rgba(217,170,77,${glow})` }}
      >
        <div className="relative aspect-square overflow-hidden bg-[radial-gradient(circle_at_50%_42%,rgba(49,35,18,.5),rgba(3,3,4,.98)_68%)]">
          <div
            className="absolute inset-[4%] rounded-full border border-[#f0c86b]/18 transition-transform duration-75"
            style={{
              transform: `scale(${outerScale})`,
              boxShadow: speaking ? `0 0 ${18 + energy * 34}px rgba(239,196,95,${0.16 + energy * 0.36})` : undefined,
              opacity: speaking ? 0.48 + energy * 0.5 : 0.35,
            }}
          />
          <div className="absolute inset-[9%] animate-[spin_9s_linear_infinite] rounded-full border border-transparent border-r-violet-500/25 border-t-[#d9aa4d]/45" />
          <div className="absolute inset-[16%] animate-[spin_14s_linear_infinite_reverse] rounded-full border border-transparent border-b-[#d9aa4d]/30 border-l-violet-500/20" />

          {speaking && (
            <>
              <div
                className="absolute inset-[12%] rounded-full border border-[#f4cf78]/40 transition-all duration-75"
                style={{
                  transform: `scale(${1 + energy * 0.16})`,
                  opacity: 0.2 + energy * 0.72,
                }}
              />
              <div
                className="absolute inset-[18%] rounded-full border border-[#f4cf78]/25 transition-all duration-75"
                style={{
                  transform: `scale(${1 + energy * 0.09})`,
                  opacity: 0.25 + energy * 0.65,
                }}
              />
            </>
          )}

          <div
            className="absolute inset-[23%] rounded-full border border-white/15 transition-all duration-75"
            style={{
              transform: `scale(${coreScale})`,
              boxShadow: `inset 0 0 42px rgba(255,255,255,.05), 0 0 ${34 + energy * 58}px rgba(225,173,74,${0.22 + energy * 0.46})`,
              background:
                "radial-gradient(circle at 32% 24%, rgba(255,255,255,.30), transparent 15%), radial-gradient(circle at 69% 72%, rgba(232,183,78,.25), transparent 24%), radial-gradient(circle at 48% 50%, rgba(28,23,31,.65), rgba(0,0,0,.98) 70%)",
            }}
          >
            <div className="absolute inset-[8%] rounded-full border border-[#efc86b]/10" />
            <div className="absolute left-[18%] top-[12%] h-[18%] w-[28%] rotate-[-24deg] rounded-full bg-white/12 blur-[5px]" />

            <div className="absolute inset-0 flex items-center justify-center">
              <div
                className="relative flex h-[44%] w-[44%] rotate-[-12deg] items-center justify-center rounded-[30%] border border-[#f4d47f]/25 bg-gradient-to-br from-[#ffe39a] via-[#bf8126] to-[#f4cb69] text-[29px] font-black text-black/85 shadow-[0_0_28px_rgba(235,190,88,.35)] transition-transform duration-75 sm:text-[36px]"
                style={{ transform: `rotate(-12deg) scale(${1 + energy * 0.13})` }}
              >
                L
                <Sparkles className="absolute -right-2 -top-2 h-4 w-4 rotate-[12deg] text-[#ffe59b] drop-shadow-[0_0_8px_rgba(255,229,155,.8)]" />
              </div>
            </div>
          </div>

          {state === "thinking" && <div className="absolute inset-[19%] animate-pulse rounded-full ring-1 ring-[#e8bd61]/35" />}
          {state === "seeing" && <div className="absolute inset-[16%] animate-pulse rounded-full ring-1 ring-blue-300/25" />}

          {speaking && (
            <div className="absolute bottom-10 left-1/2 flex -translate-x-1/2 items-end gap-[3px] rounded-full border border-[#e8bd61]/15 bg-black/45 px-3 py-2 backdrop-blur-sm">
              {BARS.map((weight, index) => {
                const wave = 0.45 + Math.sin((index + 1) * 1.6 + energy * 8) * 0.2
                const height = 5 + Math.max(0.12, energy) * 27 * weight + wave * 4
                return (
                  <span
                    key={index}
                    className="w-[3px] rounded-full bg-gradient-to-t from-[#9b6419] via-[#e8b95d] to-[#ffe59b] transition-[height,opacity] duration-75"
                    style={{ height: `${height}px`, opacity: 0.48 + energy * 0.52 }}
                  />
                )
              })}
            </div>
          )}

          <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between rounded-full border border-white/10 bg-black/70 px-2.5 py-1.5 text-[10px] text-white backdrop-blur-md">
            <span className="font-medium text-[#edc66e]">Lumin AI</span>
            <span className={`flex items-center gap-1 ${speaking ? "font-semibold text-[#ffe19a]" : "text-zinc-300"}`}>
              <StatusIcon className={`h-3 w-3 text-[#edc66e] ${speaking ? "animate-pulse" : ""}`} />
              {status.label}
            </span>
          </div>
        </div>

        {speaking && caption && (
          <div className="max-h-[64px] overflow-hidden border-t border-white/10 bg-[#050505] px-3 py-2 text-[10px] leading-4 text-zinc-300">
            <span className="mr-1 text-[#e8bd61]">●</span>
            {caption.slice(0, 125)}{caption.length > 125 ? "…" : ""}
          </div>
        )}
      </div>
    </div>
  )
}
