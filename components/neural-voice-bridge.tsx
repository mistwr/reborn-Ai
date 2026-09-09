"use client"

import { useEffect } from "react"

type SpeechDetail = {
  phase: "start" | "progress" | "end"
  text?: string
  currentTime?: number
  duration?: number
  provider?: "neural"
}

function emitSpeech(detail: SpeechDetail) {
  window.dispatchEvent(new CustomEvent("reborn-neural-speech", { detail }))
}

export function NeuralVoiceBridge() {
  useEffect(() => {
    if (!window.speechSynthesis) return

    const synth = window.speechSynthesis
    const originalSpeak = synth.speak.bind(synth)
    const originalCancel = synth.cancel.bind(synth)
    let activeAudio: HTMLAudioElement | null = null
    let activeUrl: string | null = null
    let generation = 0

    const cleanupAudio = () => {
      if (activeAudio) {
        activeAudio.pause()
        activeAudio.src = ""
        activeAudio = null
      }
      if (activeUrl) {
        URL.revokeObjectURL(activeUrl)
        activeUrl = null
      }
    }

    synth.speak = ((utterance: SpeechSynthesisUtterance) => {
      const myGeneration = ++generation
      const text = (utterance.text || "").trim()

      if (!text) {
        originalSpeak(utterance)
        return
      }

      void (async () => {
        try {
          const response = await fetch("/api/live-tts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              text,
              speed: Math.min(1.2, Math.max(0.75, Number(utterance.rate) || 1)),
              language: utterance.lang || "pt-PT",
            }),
          })

          if (!response.ok || myGeneration !== generation) {
            if (myGeneration === generation) originalSpeak(utterance)
            return
          }

          const blob = await response.blob()
          if (!blob.size || myGeneration !== generation) {
            if (myGeneration === generation) originalSpeak(utterance)
            return
          }

          cleanupAudio()
          activeUrl = URL.createObjectURL(blob)
          const audio = new Audio(activeUrl)
          activeAudio = audio
          audio.preload = "auto"
          audio.playbackRate = 1

          audio.onloadedmetadata = () => {
            emitSpeech({
              phase: "start",
              text,
              duration: Number.isFinite(audio.duration) ? audio.duration : undefined,
              provider: "neural",
            })
          }

          audio.ontimeupdate = () => {
            emitSpeech({
              phase: "progress",
              text,
              currentTime: audio.currentTime,
              duration: Number.isFinite(audio.duration) ? audio.duration : undefined,
              provider: "neural",
            })
          }

          audio.onended = () => {
            if (myGeneration !== generation) return
            emitSpeech({ phase: "end", text, provider: "neural" })
            cleanupAudio()
            utterance.onend?.(new Event("end") as any)
          }

          audio.onerror = () => {
            if (myGeneration !== generation) return
            cleanupAudio()
            originalSpeak(utterance)
          }

          try {
            await audio.play()
            utterance.onstart?.(new Event("start") as any)
          } catch {
            cleanupAudio()
            if (myGeneration === generation) originalSpeak(utterance)
          }
        } catch {
          if (myGeneration === generation) originalSpeak(utterance)
        }
      })()
    }) as typeof synth.speak

    synth.cancel = (() => {
      generation += 1
      if (activeAudio) emitSpeech({ phase: "end", provider: "neural" })
      cleanupAudio()
      return originalCancel()
    }) as typeof synth.cancel

    return () => {
      generation += 1
      cleanupAudio()
      synth.speak = originalSpeak
      synth.cancel = originalCancel
    }
  }, [])

  return null
}
