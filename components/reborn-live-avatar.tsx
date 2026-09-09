"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Eye, Mic, Sparkles } from "lucide-react"

type AvatarState = "idle" | "seeing" | "thinking" | "speaking"
type Viseme = "closed" | "open" | "wide" | "round" | "bite"

type VisemeCue = {
  at: number
  viseme: Viseme
}

const AVATAR_SRC =
  "https://image.pollinations.ai/prompt/ultra%20realistic%20cinematic%20portrait%20of%20REBORN%20AI%20humanoid%20robot%2C%20humanlike%20male%20face%2C%20subtle%20futuristic%20synthetic%20skin%2C%20dark%20graphite%20and%20violet%20details%2C%20front%20facing%2C%20symmetrical%20face%2C%20calm%20intelligent%20expression%2C%20looking%20directly%20at%20camera%2C%20mouth%20closed%2C%20cinematic%20soft%20lighting%2C%20black%20background%2C%20photorealistic%2C%20high%20detail%2C%20no%20text?width=768&height=1024&model=flux&nologo=true&seed=260428"

function charToViseme(char: string): Viseme {
  const c = char.toLowerCase()
  if (/[bmp]/.test(c)) return "closed"
  if (/[fv]/.test(c)) return "bite"
  if (/[ouóôõ]/.test(c)) return "round"
  if (/[eiéêí]/.test(c)) return "wide"
  if (/[aáàâã]/.test(c)) return "open"
  return "closed"
}

function buildVisemeTimeline(text: string, rate = 1): VisemeCue[] {
  const cues: VisemeCue[] = []
  let t = 0
  const base = Math.max(45, 78 / Math.max(0.65, rate))

  for (const raw of text) {
    const char = raw.toLowerCase()

    if (/\s/.test(char)) {
      cues.push({ at: t, viseme: "closed" })
      t += base * 0.45
      continue
    }

    if (/[,.!?;:]/.test(char)) {
      cues.push({ at: t, viseme: "closed" })
      t += /[.!?]/.test(char) ? base * 2.4 : base * 1.45
      continue
    }

    cues.push({ at: t, viseme: charToViseme(char) })
    t += /[aeiouáàâãéêíóôõú]/.test(char) ? base * 1.18 : base * 0.82
  }

  cues.push({ at: t + base * 0.5, viseme: "closed" })
  return cues
}

export function RebornLiveAvatar() {
  const [visible, setVisible] = useState(false)
  const [state, setState] = useState<AvatarState>("idle")
  const [viseme, setViseme] = useState<Viseme>("closed")
  const [caption, setCaption] = useState("")
  const [blink, setBlink] = useState(false)
  const [headPhase, setHeadPhase] = useState(0)
  const visemeTimer = useRef<number | null>(null)
  const headTimer = useRef<number | null>(null)

  const stopMouth = () => {
    if (visemeTimer.current) window.clearInterval(visemeTimer.current)
    visemeTimer.current = null
    setViseme("closed")
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
    let timer = 0
    const scheduleBlink = () => {
      const delay = 2400 + Math.random() * 3200
      timer = window.setTimeout(() => {
        setBlink(true)
        window.setTimeout(() => setBlink(false), 120)
        scheduleBlink()
      }, delay)
    }
    scheduleBlink()
    return () => window.clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (headTimer.current) window.clearInterval(headTimer.current)
    headTimer.current = window.setInterval(
      () => setHeadPhase((v) => (v + 1) % 8),
      state === "speaking" ? 320 : state === "thinking" ? 620 : 980,
    )
    return () => {
      if (headTimer.current) window.clearInterval(headTimer.current)
      headTimer.current = null
    }
  }, [state])

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

        const timeline = buildVisemeTimeline(utterance.text || "", utterance.rate || 1)
        const startedAt = performance.now()
        let cueIndex = 0

        visemeTimer.current = window.setInterval(() => {
          const elapsed = performance.now() - startedAt
          while (cueIndex + 1 < timeline.length && timeline[cueIndex + 1].at <= elapsed) {
            cueIndex += 1
          }
          setViseme(timeline[cueIndex]?.viseme || "closed")
        }, 42)

        prevStart?.call(utterance, event)
      }

      utterance.onboundary = (event) => {
        const boundary = event as SpeechSynthesisEvent
        const start = Math.max(0, boundary.charIndex || 0)
        const sample = (utterance.text || "").slice(start, start + Math.max(1, boundary.charLength || 1))
        const strongest = [...sample].find((c) => /[aeioubmpfváàâãéêíóôõú]/i.test(c))
        if (strongest) setViseme(charToViseme(strongest))
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

  const headTransform = useMemo(() => {
    const x = [0, 0.6, 1.1, 0.4, 0, -0.5, -1.1, -0.4][headPhase]
    const y = state === "speaking" ? [0, -0.45, 0, 0.35, 0, -0.25, 0, 0.2][headPhase] : 0
    const r = state === "speaking" ? x * 0.28 : state === "thinking" ? x * 0.16 : x * 0.08
    return `translate3d(${x}px, ${y}px, 0) rotate(${r}deg) scale(${state === "thinking" ? 1.018 : state === "speaking" ? 1.014 : 1})`
  }, [headPhase, state])

  const mouthClass =
    viseme === "round"
      ? "h-[11px] w-[16px] rounded-full sm:h-[13px] sm:w-[19px]"
      : viseme === "wide"
        ? "h-[6px] w-[31px] rounded-[45%] sm:h-[7px] sm:w-[35px]"
        : viseme === "open"
          ? "h-[12px] w-[24px] rounded-[45%] sm:h-[14px] sm:w-[29px]"
          : viseme === "bite"
            ? "h-[4px] w-[24px] rounded-[45%] border-t border-white/25 sm:w-[28px]"
            : "h-[2px] w-[22px] rounded-full sm:w-[26px]"

  if (!visible) return null
  const StatusIcon = status.icon

  return (
    <div className="pointer-events-none fixed right-3 top-28 z-[95] w-[156px] sm:w-[190px]">
      <div className="overflow-hidden rounded-[28px] border border-violet-400/30 bg-black/75 shadow-[0_0_50px_rgba(124,58,237,.28)] backdrop-blur-xl">
        <div className="relative aspect-[3/4] overflow-hidden bg-black">
          <img
            src={AVATAR_SRC}
            alt="Reborn AI humanoide"
            className="h-full w-full object-cover object-top transition-[filter,transform] duration-300 will-change-transform"
            style={{ transform: headTransform, filter: state === "thinking" ? "brightness(1.1)" : "none" }}
          />

          <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-violet-500/5" />
          <div className={`absolute left-1/2 top-[57.4%] -translate-x-1/2 bg-black/88 shadow-[0_0_12px_rgba(0,0,0,.9)] transition-all duration-75 ${mouthClass}`} />

          <div className={`absolute left-[35.2%] top-[33.2%] w-[9px] rounded-full bg-violet-300/80 blur-[1px] transition-all duration-75 ${blink ? "h-[1px] opacity-20" : "h-[3px] opacity-90"} ${state === "seeing" ? "animate-pulse" : ""}`} />
          <div className={`absolute right-[35.2%] top-[33.2%] w-[9px] rounded-full bg-violet-300/80 blur-[1px] transition-all duration-75 ${blink ? "h-[1px] opacity-20" : "h-[3px] opacity-90"} ${state === "seeing" ? "animate-pulse" : ""}`} />

          {state === "thinking" && <div className="absolute inset-0 animate-pulse ring-1 ring-inset ring-violet-400/40" />}

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
