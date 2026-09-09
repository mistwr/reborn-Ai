"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Eye, Mic, Sparkles } from "lucide-react"

type AvatarState = "idle" | "seeing" | "thinking" | "speaking"

const AVATAR_SRC =
  "https://image.pollinations.ai/prompt/ultra%20realistic%20cinematic%20portrait%20of%20REBORN%20AI%20humanoid%20robot%2C%20humanlike%20male%20face%2C%20subtle%20futuristic%20synthetic%20skin%2C%20dark%20graphite%20and%20violet%20details%2C%20front%20facing%2C%20symmetrical%20face%2C%20calm%20intelligent%20expression%2C%20looking%20directly%20at%20camera%2C%20mouth%20closed%2C%20cinematic%20soft%20lighting%2C%20black%20background%2C%20photorealistic%2C%20high%20detail%2C%20no%20text?width=768&height=1024&model=flux&nologo=true&seed=260428"

export function RebornLiveAvatar() {
  const [visible, setVisible] = useState(false)
  const [state, setState] = useState<AvatarState>("idle")
  const [mouthOpen, setMouthOpen] = useState(false)
  const [caption, setCaption] = useState("")
  const mouthTimer = useRef<number | null>(null)

  const stopMouth = () => {
    if (mouthTimer.current) window.clearInterval(mouthTimer.current)
    mouthTimer.current = null
    setMouthOpen(false)
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
        setState("speaking")
        stopMouth()
        mouthTimer.current = window.setInterval(() => {
          setMouthOpen((v) => !v)
        }, 105)
        prevStart?.call(utterance, event)
      }

      utterance.onboundary = (event) => {
        if ((event as SpeechSynthesisEvent).name === "word") {
          setMouthOpen(true)
          window.setTimeout(() => setMouthOpen(false), 80)
        }
        prevBoundary?.call(utterance, event)
      }

      utterance.onend = (event) => {
        stopMouth()
        setState("idle")
        prevEnd?.call(utterance, event)
      }

      utterance.onerror = (event) => {
        stopMouth()
        setState("idle")
        prevError?.call(utterance, event)
      }

      return originalSpeak(utterance)
    }) as typeof synth.speak

    synth.cancel = (() => {
      stopMouth()
      setState("idle")
      return originalCancel()
    }) as typeof synth.cancel

    return () => {
      stopMouth()
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

  return (
    <div className="pointer-events-none fixed right-3 top-28 z-[95] w-[156px] sm:w-[190px]">
      <div className="overflow-hidden rounded-[28px] border border-violet-400/30 bg-black/75 shadow-[0_0_50px_rgba(124,58,237,.28)] backdrop-blur-xl">
        <div className="relative aspect-[3/4] overflow-hidden bg-black">
          <img
            src={AVATAR_SRC}
            alt="Reborn AI humanoide"
            className={`h-full w-full object-cover object-top transition duration-500 ${state === "thinking" ? "scale-[1.018] brightness-110" : state === "speaking" ? "scale-[1.012]" : "scale-100"}`}
          />

          <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-violet-500/5" />

          <div
            className={`absolute left-1/2 top-[57.4%] -translate-x-1/2 rounded-[50%] bg-black/85 shadow-[0_0_10px_rgba(0,0,0,.8)] transition-all duration-75 ${
              mouthOpen && state === "speaking" ? "h-[7px] w-[25px] sm:h-[8px] sm:w-[30px]" : "h-[2px] w-[22px] sm:w-[26px]"
            }`}
          />

          <div className={`absolute left-[35.5%] top-[33.5%] h-[3px] w-[8px] rounded-full bg-violet-300/80 blur-[1px] ${state === "seeing" ? "animate-pulse" : ""}`} />
          <div className={`absolute right-[35.5%] top-[33.5%] h-[3px] w-[8px] rounded-full bg-violet-300/80 blur-[1px] ${state === "seeing" ? "animate-pulse" : ""}`} />

          {state === "thinking" && (
            <div className="absolute inset-0 animate-pulse ring-1 ring-inset ring-violet-400/40" />
          )}

          <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between rounded-full border border-white/10 bg-black/65 px-2.5 py-1.5 text-[10px] text-white backdrop-blur-md">
            <span className="font-medium">Reborn AI</span>
            <span className="flex items-center gap-1 text-violet-200">
              <StatusIcon className="h-3 w-3" />
              {status.label}
            </span>
          </div>
        </div>

        {state === "speaking" && caption && (
          <div className="max-h-[56px] overflow-hidden border-t border-white/10 px-3 py-2 text-[10px] leading-4 text-zinc-200">
            {caption.slice(0, 115)}{caption.length > 115 ? "…" : ""}
          </div>
        )}
      </div>
    </div>
  )
}
