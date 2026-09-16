"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Eye, Mic, Sparkles } from "lucide-react"

type AvatarState = "idle" | "seeing" | "thinking" | "speaking"

const BARS = [0.42, 0.72, 1, 0.78, 0.55]

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
  const orbScale = speaking ? 1 + energy * 0.08 : state === "thinking" ? 1.025 : 1

  return (
    <div className="pointer-events-none fixed right-3 top-[86px] z-[95] flex w-[112px] flex-col items-center gap-2 sm:right-5 sm:top-24 sm:w-[132px]">
      <div className="relative flex h-[104px] w-[104px] items-center justify-center sm:h-[122px] sm:w-[122px]">
        <div
          className="absolute inset-0 rounded-full border border-[#e7bd61]/20 transition-all duration-100"
          style={{
            transform: `scale(${1.06 + energy * 0.08})`,
            boxShadow: `0 0 ${28 + energy * 46}px rgba(220,170,74,${0.16 + energy * 0.34})`,
            opacity: speaking ? 0.85 : 0.45,
          }}
        />
        <div className="absolute inset-[7%] animate-[spin_10s_linear_infinite] rounded-full border border-transparent border-r-[#d9aa4d]/18 border-t-[#f2cc73]/38" />
        <div className="absolute inset-[14%] animate-[spin_15s_linear_infinite_reverse] rounded-full border border-transparent border-b-[#d9aa4d]/24 border-l-[#f2cc73]/12" />

        {speaking && (
          <>
            <div
              className="absolute inset-[2%] rounded-full border border-[#f1cb72]/24 transition-all duration-75"
              style={{ transform: `scale(${1 + energy * 0.11})`, opacity: 0.24 + energy * 0.58 }}
            />
            <div
              className="absolute inset-[17%] rounded-full border border-[#f1cb72]/20 transition-all duration-75"
              style={{ transform: `scale(${1 + energy * 0.08})`, opacity: 0.2 + energy * 0.52 }}
            />
          </>
        )}

        <div
          className="relative flex h-[70%] w-[70%] items-center justify-center rounded-full border border-white/10 bg-black/88 backdrop-blur-xl transition-all duration-75"
          style={{
            transform: `scale(${orbScale})`,
            boxShadow: `inset 0 0 28px rgba(255,255,255,.035), 0 0 ${24 + energy * 40}px rgba(218,168,73,${0.18 + energy * 0.38})`,
            background:
              "radial-gradient(circle at 35% 28%, rgba(255,255,255,.16), transparent 15%), radial-gradient(circle at 68% 70%, rgba(218,168,73,.18), transparent 27%), radial-gradient(circle at 50% 50%, rgba(22,18,13,.94), rgba(2,2,2,.99) 72%)",
          }}
        >
          <div className="absolute inset-[9%] rounded-full border border-[#efc86b]/10" />
          <div className="absolute left-[18%] top-[15%] h-[16%] w-[27%] rounded-full bg-white/8 blur-[5px]" />

          <div className="relative flex h-[42%] w-[42%] items-center justify-center rounded-full border border-[#f2d27d]/20 bg-[radial-gradient(circle_at_35%_30%,#ffe59c,#d29b3d_55%,#8c5d15_100%)] text-[27px] font-black leading-none text-black/90 shadow-[0_0_24px_rgba(232,185,84,.28)] sm:text-[32px]">
            L
            <Sparkles className="absolute -right-1.5 -top-1.5 h-3.5 w-3.5 text-[#ffe89d] drop-shadow-[0_0_7px_rgba(255,232,157,.75)]" />
          </div>

          {speaking && (
            <div className="absolute bottom-[10%] left-1/2 flex -translate-x-1/2 items-end gap-[2px]">
              {BARS.map((weight, index) => {
                const height = 3 + energy * 14 * weight
                return (
                  <span
                    key={index}
                    className="w-[2px] rounded-full bg-gradient-to-t from-[#9b6419] via-[#e8b95d] to-[#ffe59b] transition-[height,opacity] duration-75"
                    style={{ height: `${height}px`, opacity: 0.48 + energy * 0.52 }}
                  />
                )
              })}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1.5 rounded-full border border-[#e4b958]/18 bg-black/78 px-2.5 py-1 text-[9px] text-zinc-300 backdrop-blur-md sm:text-[10px]">
        <StatusIcon className={`h-3 w-3 text-[#edc66e] ${speaking ? "animate-pulse" : ""}`} />
        <span className={speaking ? "font-medium text-[#ffe19a]" : ""}>{status.label}</span>
      </div>

      {speaking && caption && (
        <div className="max-h-[44px] w-[150px] overflow-hidden rounded-xl border border-white/8 bg-black/76 px-2.5 py-1.5 text-center text-[9px] leading-3.5 text-zinc-400 backdrop-blur-md sm:w-[180px]">
          {caption.slice(0, 92)}{caption.length > 92 ? "…" : ""}
        </div>
      )}
    </div>
  )
}
