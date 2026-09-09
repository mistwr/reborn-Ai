"use client"

import { useEffect, useRef, useState } from "react"
import { Hand, Mic, Waves, X } from "lucide-react"

type PermissionStateLike = "granted" | "denied" | "prompt" | "unknown"

function submitTranscriptToLive(text: string) {
  const clean = text.trim()
  if (!clean) return false

  const input = Array.from(document.querySelectorAll<HTMLInputElement>("input")).find((element) =>
    (element.placeholder || "").toLowerCase().includes("escreve ou fala"),
  )

  if (!input || input.disabled) return false

  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set
  if (setter) setter.call(input, clean)
  else input.value = clean

  input.dispatchEvent(new Event("input", { bubbles: true }))
  input.dispatchEvent(new Event("change", { bubbles: true }))

  window.setTimeout(() => {
    const form = input.closest("form")
    if (!form) return
    if (typeof form.requestSubmit === "function") form.requestSubmit()
    else form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }))
  }, 120)

  return true
}

export function LiveInterruptControl() {
  const [speaking, setSpeaking] = useState(false)
  const [autoListening, setAutoListening] = useState(false)
  const [voiceLevel, setVoiceLevel] = useState(0)
  const [capturing, setCapturing] = useState(false)
  const [capturedText, setCapturedText] = useState("")
  const lastLiveActivityRef = useRef(0)
  const interruptedRef = useRef(false)
  const recognitionRef = useRef<any>(null)
  const captureFinalRef = useRef("")

  useEffect(() => {
    const onSpeech = (event: Event) => {
      const detail = (event as CustomEvent)?.detail || {}
      if (detail.phase === "start") {
        interruptedRef.current = false
        setSpeaking(true)
      }
      if (detail.phase === "end") {
        setSpeaking(false)
        setAutoListening(false)
        setVoiceLevel(0)
      }
    }

    const onLiveState = (event: Event) => {
      const detail = (event as CustomEvent)?.detail || {}
      lastLiveActivityRef.current = Date.now()
      if (detail.state === "speaking") {
        interruptedRef.current = false
        setSpeaking(true)
      }
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
      try {
        recognitionRef.current?.abort?.()
      } catch {}
      recognitionRef.current = null
    }
  }, [])

  const stopCapture = () => {
    try {
      recognitionRef.current?.abort?.()
    } catch {}
    recognitionRef.current = null
    captureFinalRef.current = ""
    setCapturing(false)
    setCapturedText("")
  }

  const beginCapture = () => {
    if (recognitionRef.current) return
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) return

    const recognition = new SR()
    recognition.continuous = false
    recognition.interimResults = true
    recognition.lang = "pt-PT"
    recognition.maxAlternatives = 1

    captureFinalRef.current = ""
    setCapturedText("")
    setCapturing(true)
    recognitionRef.current = recognition

    recognition.onresult = (event: any) => {
      let interim = ""
      let finalText = captureFinalRef.current

      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i]
        const phrase = result?.[0]?.transcript || ""
        if (result.isFinal) finalText = `${finalText} ${phrase}`.trim()
        else interim += phrase
      }

      captureFinalRef.current = finalText
      setCapturedText((finalText || interim).trim())

      if (finalText.trim()) {
        const submitted = submitTranscriptToLive(finalText)
        if (submitted) {
          window.dispatchEvent(
            new CustomEvent("reborn-live-barge-in-captured", {
              detail: { text: finalText.trim() },
            }),
          )
          window.dispatchEvent(new CustomEvent("reborn-live-state", { detail: { state: "thinking" } }))
          try {
            recognition.stop()
          } catch {}
        }
      }
    }

    recognition.onerror = () => {
      recognitionRef.current = null
      setCapturing(false)
      setCapturedText("")
    }

    recognition.onend = () => {
      recognitionRef.current = null
      const pending = captureFinalRef.current.trim()
      if (pending) submitTranscriptToLive(pending)
      captureFinalRef.current = ""
      setCapturing(false)
      setCapturedText("")
    }

    try {
      recognition.start()
    } catch {
      recognitionRef.current = null
      setCapturing(false)
    }
  }

  const interrupt = (source: "user" | "voice" = "user") => {
    if (interruptedRef.current) return
    interruptedRef.current = true

    try {
      window.speechSynthesis?.cancel()
    } catch {}

    window.dispatchEvent(new CustomEvent("reborn-live-interrupt", { detail: { source } }))
    window.dispatchEvent(new CustomEvent("reborn-live-state", { detail: { state: "idle", interruptedBy: source } }))
    setSpeaking(false)
    setAutoListening(false)
    setVoiceLevel(0)

    // Capture the continuation immediately, so the user does not need to repeat
    // what they were saying after interrupting the Reborn response.
    window.setTimeout(beginCapture, source === "voice" ? 70 : 120)
  }

  useEffect(() => {
    if (!speaking) return

    let stream: MediaStream | null = null
    let context: AudioContext | null = null
    let raf = 0
    let cancelled = false
    let aboveSince = 0
    let noiseFloor = 0.012
    let calibrationSamples = 0
    const startedAt = performance.now()

    const getPermission = async (): Promise<PermissionStateLike> => {
      try {
        if (!navigator.permissions?.query) return "unknown"
        const result = await navigator.permissions.query({ name: "microphone" as PermissionName })
        return result.state as PermissionStateLike
      } catch {
        return "unknown"
      }
    }

    const startDetector = async () => {
      if (Date.now() - lastLiveActivityRef.current > 30_000) return

      const permission = await getPermission()
      if (permission !== "granted") return
      if (cancelled || !navigator.mediaDevices?.getUserMedia) return

      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            channelCount: 1,
          },
          video: false,
        })
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop())
          return
        }

        const AudioContextCtor = window.AudioContext || (window as any).webkitAudioContext
        if (!AudioContextCtor) return
        context = new AudioContextCtor()
        if (context.state === "suspended") await context.resume().catch(() => {})

        const source = context.createMediaStreamSource(stream)
        const analyser = context.createAnalyser()
        analyser.fftSize = 512
        analyser.smoothingTimeConstant = 0.45
        source.connect(analyser)

        const data = new Uint8Array(analyser.fftSize)
        setAutoListening(true)

        const sample = () => {
          if (cancelled || !analyser) return
          analyser.getByteTimeDomainData(data)

          let sum = 0
          let peak = 0
          for (let i = 0; i < data.length; i += 1) {
            const value = (data[i] - 128) / 128
            sum += value * value
            peak = Math.max(peak, Math.abs(value))
          }
          const rms = Math.sqrt(sum / data.length)
          const now = performance.now()

          if (now - startedAt < 650) {
            noiseFloor = calibrationSamples === 0 ? rms : noiseFloor * 0.82 + rms * 0.18
            calibrationSamples += 1
          } else if (rms < noiseFloor * 1.8) {
            noiseFloor = noiseFloor * 0.985 + rms * 0.015
          }

          const normalized = Math.max(0, Math.min(1, (rms - noiseFloor) / 0.14))
          setVoiceLevel((previous) => previous * 0.7 + normalized * 0.3)

          const threshold = Math.max(0.055, noiseFloor * 2.8 + 0.012)
          const looksLikeUserVoice = now - startedAt > 700 && rms > threshold && peak > 0.11

          if (looksLikeUserVoice) {
            if (!aboveSince) aboveSince = now
            if (now - aboveSince >= 230) {
              interrupt("voice")
              return
            }
          } else {
            aboveSince = 0
          }

          raf = requestAnimationFrame(sample)
        }

        raf = requestAnimationFrame(sample)
      } catch {
        setAutoListening(false)
      }
    }

    void startDetector()

    return () => {
      cancelled = true
      if (raf) cancelAnimationFrame(raf)
      stream?.getTracks().forEach((track) => track.stop())
      if (context && context.state !== "closed") void context.close().catch(() => {})
      setAutoListening(false)
      setVoiceLevel(0)
    }
  }, [speaking])

  if (!speaking && !capturing) return null

  if (capturing) {
    return (
      <button
        type="button"
        onClick={stopCapture}
        className="fixed bottom-24 left-1/2 z-[110] flex max-w-[88vw] -translate-x-1/2 items-center gap-2 rounded-full border border-emerald-300/25 bg-black/85 px-4 py-2.5 text-xs font-medium text-white shadow-[0_10px_35px_rgba(0,0,0,.35),0_0_30px_rgba(16,185,129,.16)] backdrop-blur-xl"
        aria-label="Parar captura de voz"
      >
        <span className="relative flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-200">
          <Mic className="h-3.5 w-3.5 animate-pulse" />
          <span className="absolute inset-0 animate-ping rounded-full border border-emerald-400/25" />
        </span>
        <span className="max-w-[58vw] truncate">{capturedText || "Estou a ouvir…"}</span>
        <X className="h-3.5 w-3.5 text-zinc-400" />
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={() => interrupt("user")}
      className="fixed bottom-24 left-1/2 z-[110] flex -translate-x-1/2 items-center gap-2 rounded-full border border-violet-300/25 bg-black/80 px-4 py-2.5 text-xs font-medium text-white shadow-[0_10px_35px_rgba(0,0,0,.35),0_0_30px_rgba(124,58,237,.18)] backdrop-blur-xl transition hover:bg-zinc-900 active:scale-[.98]"
      aria-label="Interromper Reborn AI"
    >
      <span className="relative flex h-6 w-6 items-center justify-center rounded-full bg-violet-500/15 text-violet-200">
        {autoListening ? <Waves className="h-3.5 w-3.5" /> : <Hand className="h-3.5 w-3.5" />}
        <span
          className="absolute inset-0 rounded-full border border-violet-400/25 transition-transform duration-75"
          style={{ transform: `scale(${1 + voiceLevel * 0.6})`, opacity: 0.3 + voiceLevel * 0.7 }}
        />
      </span>
      <span>{autoListening ? "Fala para interromper" : "Interromper"}</span>
      <Mic className={`h-3.5 w-3.5 ${autoListening ? "text-emerald-300" : "text-zinc-400"}`} />
    </button>
  )
}
