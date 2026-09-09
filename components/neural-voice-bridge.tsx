"use client"

import { useEffect } from "react"

type SpeechDetail = {
  phase: "start" | "progress" | "end"
  text?: string
  currentTime?: number
  duration?: number
  provider?: "neural" | "browser"
  voice?: string
  audioLevel?: number
}

function emitSpeech(detail: SpeechDetail) {
  window.dispatchEvent(new CustomEvent("reborn-neural-speech", { detail }))
}

function normalizeLang(value = "") {
  return value.toLowerCase().replace("_", "-")
}

function scoreVoice(voice: SpeechSynthesisVoice, requestedLang: string) {
  const lang = normalizeLang(voice.lang)
  const requested = normalizeLang(requestedLang || "pt-PT")
  const name = voice.name.toLowerCase()
  let score = 0

  if (lang === requested) score += 100
  else if (lang.startsWith("pt-pt")) score += 92
  else if (lang.startsWith("pt")) score += 55

  if (/duarte|raquel|fernanda/.test(name)) score += 35
  if (/microsoft/.test(name)) score += 24
  if (/google/.test(name)) score += 18
  if (/samsung/.test(name)) score += 12
  if (/natural|neural|premium|enhanced/.test(name)) score += 18
  if (/compact|espeak|robot|festival/.test(name)) score -= 25
  if (voice.localService) score += 3
  if (voice.default) score += 2

  return score
}

function pickBestBrowserVoice(synth: SpeechSynthesis, requestedLang = "pt-PT") {
  const voices = synth.getVoices()
  if (!voices.length) return undefined

  return [...voices]
    .map((voice) => ({ voice, score: scoreVoice(voice, requestedLang) }))
    .sort((a, b) => b.score - a.score)[0]?.voice
}

function prepareBrowserUtterance(synth: SpeechSynthesis, utterance: SpeechSynthesisUtterance) {
  const requestedLang = utterance.lang || "pt-PT"
  const bestVoice = pickBestBrowserVoice(synth, requestedLang)

  utterance.lang = normalizeLang(bestVoice?.lang || requestedLang).startsWith("pt")
    ? bestVoice?.lang || "pt-PT"
    : "pt-PT"

  if (bestVoice) utterance.voice = bestVoice

  const currentRate = Number(utterance.rate) || 1
  const currentPitch = Number(utterance.pitch) || 1
  if (Math.abs(currentRate - 1) < 0.16) utterance.rate = 0.96
  if (Math.abs(currentPitch - 1) < 0.16) utterance.pitch = 0.98
  utterance.volume = Math.min(1, Math.max(0.2, Number(utterance.volume) || 1))

  return bestVoice
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
    let audioContext: AudioContext | null = null
    let analyser: AnalyserNode | null = null
    let sourceNode: MediaElementAudioSourceNode | null = null
    let animationFrame = 0

    synth.getVoices()
    const warmVoices = () => synth.getVoices()
    synth.addEventListener?.("voiceschanged", warmVoices)

    const stopAnalyser = () => {
      if (animationFrame) cancelAnimationFrame(animationFrame)
      animationFrame = 0
      try {
        sourceNode?.disconnect()
      } catch {}
      try {
        analyser?.disconnect()
      } catch {}
      sourceNode = null
      analyser = null
    }

    const cleanupAudio = () => {
      stopAnalyser()
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

    const attachAudioAnalyser = (audio: HTMLAudioElement, text: string, myGeneration: number) => {
      try {
        audioContext ||= new AudioContext()
        analyser = audioContext.createAnalyser()
        analyser.fftSize = 512
        analyser.smoothingTimeConstant = 0.72
        sourceNode = audioContext.createMediaElementSource(audio)
        sourceNode.connect(analyser)
        analyser.connect(audioContext.destination)
        const samples = new Uint8Array(analyser.fftSize)

        const tick = () => {
          if (!analyser || myGeneration !== generation || !activeAudio) return
          analyser.getByteTimeDomainData(samples)
          let sum = 0
          for (let i = 0; i < samples.length; i += 1) {
            const normalized = (samples[i] - 128) / 128
            sum += normalized * normalized
          }
          const rms = Math.sqrt(sum / samples.length)
          const level = Math.max(0, Math.min(1, (rms - 0.018) * 9.5))
          emitSpeech({
            phase: "progress",
            text,
            currentTime: audio.currentTime,
            duration: Number.isFinite(audio.duration) ? audio.duration : undefined,
            provider: "neural",
            audioLevel: level,
          })
          animationFrame = requestAnimationFrame(tick)
        }

        animationFrame = requestAnimationFrame(tick)
      } catch {
        stopAnalyser()
      }
    }

    const speakWithBrowser = (utterance: SpeechSynthesisUtterance) => {
      const voice = prepareBrowserUtterance(synth, utterance)
      const previousStart = utterance.onstart
      const previousEnd = utterance.onend
      const previousError = utterance.onerror

      utterance.onstart = (event) => {
        emitSpeech({ phase: "start", text: utterance.text, provider: "browser", voice: voice?.name })
        previousStart?.call(utterance, event)
      }
      utterance.onend = (event) => {
        emitSpeech({ phase: "end", text: utterance.text, provider: "browser", voice: voice?.name })
        previousEnd?.call(utterance, event)
      }
      utterance.onerror = (event) => {
        emitSpeech({ phase: "end", text: utterance.text, provider: "browser", voice: voice?.name })
        previousError?.call(utterance, event)
      }

      originalSpeak(utterance)
    }

    synth.speak = ((utterance: SpeechSynthesisUtterance) => {
      const myGeneration = ++generation
      const text = (utterance.text || "").trim()

      if (!text) {
        speakWithBrowser(utterance)
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
            if (myGeneration === generation) speakWithBrowser(utterance)
            return
          }

          const blob = await response.blob()
          if (!blob.size || myGeneration !== generation) {
            if (myGeneration === generation) speakWithBrowser(utterance)
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
              audioLevel: 0,
            })
          }

          audio.onended = () => {
            if (myGeneration !== generation) return
            emitSpeech({ phase: "end", text, provider: "neural", audioLevel: 0 })
            cleanupAudio()
            utterance.onend?.(new Event("end") as any)
          }

          audio.onerror = () => {
            if (myGeneration !== generation) return
            cleanupAudio()
            speakWithBrowser(utterance)
          }

          try {
            if (audioContext?.state === "suspended") await audioContext.resume().catch(() => undefined)
            attachAudioAnalyser(audio, text, myGeneration)
            await audio.play()
            utterance.onstart?.(new Event("start") as any)
          } catch {
            cleanupAudio()
            if (myGeneration === generation) speakWithBrowser(utterance)
          }
        } catch {
          if (myGeneration === generation) speakWithBrowser(utterance)
        }
      })()
    }) as typeof synth.speak

    synth.cancel = (() => {
      generation += 1
      if (activeAudio) emitSpeech({ phase: "end", provider: "neural", audioLevel: 0 })
      cleanupAudio()
      return originalCancel()
    }) as typeof synth.cancel

    return () => {
      generation += 1
      cleanupAudio()
      synth.removeEventListener?.("voiceschanged", warmVoices)
      synth.speak = originalSpeak
      synth.cancel = originalCancel
      void audioContext?.close().catch(() => undefined)
    }
  }, [])

  return null
}
