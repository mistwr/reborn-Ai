"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Mic, MicOff, Camera, CameraOff, X, Send, Loader2,
  Brain, Sparkles, Globe, ImagePlus, Presentation,
  BookOpen, MessageSquare, Zap, Video, Bot, Eye,
} from "lucide-react"

const SLIDES = [
  {
    tag: "Chat Inteligente",
    title: "Reborn AI",
    subtitle: "Conversa natural com inteligência artificial avançada. Respostas instantâneas para qualquer pergunta.",
    icon: MessageSquare,
    color1: 220,
    color2: 250,
  },
  {
    tag: "Geração de Imagens",
    title: "Cria sem limites",
    subtitle: "Transforma texto em imagens únicas e profissionais com IA generativa de última geração.",
    icon: ImagePlus,
    color1: 280,
    color2: 310,
  },
  {
    tag: "WebCraft",
    title: "Sites em segundos",
    subtitle: "Websites completos, modernos e responsivos gerados automaticamente pela inteligência artificial.",
    icon: Globe,
    color1: 160,
    color2: 190,
  },
  {
    tag: "Apresentações",
    title: "Slides profissionais",
    subtitle: "Apresentações de impacto criadas automaticamente. Do tema ao design final em segundos.",
    icon: Presentation,
    color1: 30,
    color2: 50,
  },
  {
    tag: "Ebooks",
    title: "Publica o teu livro",
    subtitle: "Livros digitais completos escritos por IA. Do índice ao conteúdo, tudo automatizado.",
    icon: BookOpen,
    color1: 130,
    color2: 150,
  },
  {
    tag: "Visao AI",
    title: "Vê tudo",
    subtitle: "OCR avançado, análise de imagens e PDFs em segundos. Extrai texto e descreve qualquer ficheiro.",
    icon: Eye,
    color1: 200,
    color2: 230,
  },
  {
    tag: "Modo Live",
    title: "Ao vivo contigo",
    subtitle: "Câmara, voz e IA em tempo real. Fala naturalmente e recebe respostas imediatas.",
    icon: Video,
    color1: 10,
    color2: 340,
  },
  {
    tag: "Plataforma Total",
    title: "O futuro é agora",
    subtitle: "Uma plataforma. Marketing, SMS, Email, WhatsApp e infinitas possibilidades com IA.",
    icon: Zap,
    color1: 260,
    color2: 290,
  },
]

type ChatMessage = { id: string; role: "user" | "assistant"; content: string }

interface LiveChatProps {
  onStop: () => void
  onStart: () => void
  isActive: boolean
  isCameraOn: boolean
  isMicOn: boolean
  onToggleCamera: () => void
  onToggleMic: () => void
}

export function LiveChat({ onStop, onStart, isActive, isCameraOn, isMicOn, onToggleCamera, onToggleMic }: LiveChatProps) {
  const [slideIndex, setSlideIndex] = useState(0)
  const [slideVisible, setSlideVisible] = useState(true)
  const [textInput, setTextInput] = useState("")
  const [transcript, setTranscript] = useState("")
  const [isListening, setIsListening] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamingText, setStreamingText] = useState("")

  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const recognitionRef = useRef<any>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  const hasMessages = messages.length > 0 || !!streamingText
  const slide = SLIDES[slideIndex]
  const SlideIcon = slide.icon
  const c1 = slide.color1
  const c2 = slide.color2

  // ── Slideshow timer ───────────────────────────────────────────────────────
  useEffect(() => {
    const id = setInterval(() => {
      setSlideVisible(false)
      setTimeout(() => {
        setSlideIndex((i) => (i + 1) % SLIDES.length)
        setSlideVisible(true)
      }, 500)
    }, 5000)
    return () => clearInterval(id)
  }, [])

  // ── Camera stream ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isActive) return
    if (isCameraOn) {
      if (!mediaStreamRef.current) {
        navigator.mediaDevices
          .getUserMedia({ video: { facingMode: "user" }, audio: false })
          .then((stream) => {
            mediaStreamRef.current = stream
            if (videoRef.current) videoRef.current.srcObject = stream
          })
          .catch(() => onToggleCamera())
      } else {
        mediaStreamRef.current.getVideoTracks().forEach((t) => (t.enabled = true))
      }
    } else {
      mediaStreamRef.current?.getVideoTracks().forEach((t) => (t.enabled = false))
    }
  }, [isCameraOn, isActive]) // eslint-disable-line

  // ── Cleanup on unmount ───────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      mediaStreamRef.current?.getTracks().forEach((t) => t.stop())
      mediaStreamRef.current = null
      window.speechSynthesis?.cancel()
      stopVoice()
      abortRef.current?.abort()
    }
  }, []) // eslint-disable-line

  // ── Auto-scroll ───────────────────────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, streamingText])

  // ── TTS ───────────────────────────────────────────────────────────────────
  const speak = useCallback((text: string) => {
    if (!text || !window.speechSynthesis) return
    window.speechSynthesis.cancel()
    const u = new SpeechSynthesisUtterance(text)
    u.lang = "pt-PT"
    u.rate = 1.05
    window.speechSynthesis.speak(u)
  }, [])

  // ── Send to AI ────────────────────────────────────────────────────────────
  const sendToAI = useCallback(async (userText: string) => {
    if (!userText.trim() || isStreaming) return
    const msg: ChatMessage = { id: Date.now().toString(), role: "user", content: userText.trim() }
    setMessages((prev) => [...prev, msg])
    setIsStreaming(true)
    setStreamingText("")
    const history = [...messages, msg].map((m) => ({ role: m.role, content: m.content }))
    abortRef.current = new AbortController()
    try {
      const res = await fetch("/api/live", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userText.trim(),
          conversationHistory: history.slice(0, -1),
          mode: isCameraOn ? "both" : "voice",
        }),
        signal: abortRef.current.signal,
      })
      if (!res.ok || !res.body) throw new Error()
      const reader = res.body.getReader()
      const dec = new TextDecoder()
      let full = ""
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        full += dec.decode(value, { stream: true })
        setStreamingText(full)
      }
      setMessages((prev) => [...prev, { id: (Date.now() + 1).toString(), role: "assistant", content: full }])
      setStreamingText("")
      speak(full)
    } catch (e: any) {
      if (e?.name !== "AbortError") {
        setMessages((prev) => [...prev, { id: (Date.now() + 1).toString(), role: "assistant", content: "Desculpa, ocorreu um erro. Tenta novamente." }])
        setStreamingText("")
      }
    } finally {
      setIsStreaming(false)
      abortRef.current = null
    }
  }, [isStreaming, messages, isCameraOn, speak])

  // ── Voice recognition ─────────────────────────────────────────────────────
  const stopVoice = useCallback(() => {
    if (recognitionRef.current) {
      const r = recognitionRef.current
      recognitionRef.current = null
      try { r.stop() } catch {}
    }
    setIsListening(false)
    setTranscript("")
  }, [])

  const startVoice = useCallback(() => {
    if (!("webkitSpeechRecognition" in window) && !("SpeechRecognition" in window)) return
    if (recognitionRef.current) return
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    const r = new SR()
    r.continuous = true
    r.interimResults = true
    r.lang = "pt-PT"
    r.onresult = (e: any) => {
      const last = e.results[e.results.length - 1]
      const t = last[0].transcript
      setTranscript(t)
      if (last.isFinal && t.trim()) { setTranscript(""); sendToAI(t) }
    }
    r.onerror = () => { setIsListening(false); recognitionRef.current = null }
    r.onend = () => { if (recognitionRef.current) { try { r.start() } catch {} } else setIsListening(false) }
    r.start()
    recognitionRef.current = r
    setIsListening(true)
  }, [sendToAI])

  useEffect(() => {
    if (!isActive) { stopVoice(); return }
    if (isMicOn) startVoice()
    else stopVoice()
  }, [isMicOn, isActive]) // eslint-disable-line

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault()
    if (!textInput.trim() || isStreaming) return
    sendToAI(textInput)
    setTextInput("")
  }

  const goToSlide = (i: number) => {
    setSlideVisible(false)
    setTimeout(() => { setSlideIndex(i); setSlideVisible(true) }, 300)
  }

  return (
    <div
      className="relative w-full h-full flex flex-col overflow-hidden"
      style={{ background: "oklch(0.04 0.015 260)" }}
    >
      {/* ── Animated background ───────────────────────────────────────────── */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ opacity: hasMessages && isActive ? 0.20 : 1, transition: "opacity 1s ease" }}
        aria-hidden
      >
        {/* Base radial gradients */}
        <div
          className="absolute inset-0"
          style={{
            background: `
              radial-gradient(ellipse 90% 70% at 15% 35%, oklch(0.20 0.18 ${c1} / 0.50) 0%, transparent 55%),
              radial-gradient(ellipse 70% 80% at 85% 65%, oklch(0.16 0.14 ${c2} / 0.40) 0%, transparent 50%),
              radial-gradient(ellipse 50% 50% at 50% 5%,  oklch(0.14 0.12 ${c1 + 20} / 0.25) 0%, transparent 60%)
            `,
            transition: "background 1.4s ease",
          }}
        />
        {/* Dot grid */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `radial-gradient(oklch(0.55 0.18 ${c1} / 0.10) 1px, transparent 1px)`,
            backgroundSize: "30px 30px",
          }}
        />
        {/* Large orb left */}
        <div
          className="absolute rounded-full"
          style={{
            width: "clamp(300px, 60vw, 800px)",
            height: "clamp(300px, 60vw, 800px)",
            top: "-10%", left: "-15%",
            background: `oklch(0.55 0.30 ${c1})`,
            filter: "blur(130px)",
            opacity: slideVisible ? 0.20 : 0,
            transition: "opacity 1.4s ease, background 1.4s ease",
          }}
        />
        {/* Orb right */}
        <div
          className="absolute rounded-full"
          style={{
            width: "clamp(200px, 45vw, 600px)",
            height: "clamp(200px, 45vw, 600px)",
            bottom: "0%", right: "-10%",
            background: `oklch(0.50 0.26 ${c2})`,
            filter: "blur(110px)",
            opacity: slideVisible ? 0.16 : 0,
            transition: "opacity 1.4s ease 0.3s, background 1.4s ease",
          }}
        />
        {/* Decorative ring */}
        <div
          className="absolute rounded-full"
          style={{
            width: "clamp(180px, 35vw, 450px)",
            height: "clamp(180px, 35vw, 450px)",
            top: "30%", right: "18%",
            border: `1px solid oklch(0.60 0.20 ${c1} / 0.14)`,
            boxShadow: `0 0 100px oklch(0.60 0.20 ${c1} / 0.06)`,
            transition: "border-color 1.4s ease",
          }}
        />
      </div>

      {/* ── SLIDESHOW HERO — always visible when no messages or not active ─── */}
      <div
        className="absolute inset-0 z-10 flex flex-col items-center justify-center px-5 sm:px-8 md:px-16 text-center"
        style={{
          paddingBottom: "clamp(130px, 24vh, 200px)",
          opacity: hasMessages && isActive ? 0 : 1,
          pointerEvents: hasMessages && isActive ? "none" : "auto",
          transition: "opacity 0.6s ease",
        }}
        aria-live="polite"
      >
        {/* Feature tag pill */}
        <div
          className="mb-5 inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold tracking-widest uppercase"
          style={{
            opacity: slideVisible ? 1 : 0,
            transform: slideVisible ? "translateY(0)" : "translateY(8px)",
            transition: "opacity 0.5s ease, transform 0.5s ease",
            background: `oklch(0.58 0.22 ${c1} / 0.14)`,
            border: `1px solid oklch(0.58 0.22 ${c1} / 0.32)`,
            color: `oklch(0.80 0.20 ${c1})`,
          }}
        >
          <SlideIcon className="w-3.5 h-3.5" aria-hidden />
          {slide.tag}
        </div>

        {/* Giant title */}
        <h1
          className="font-extrabold leading-none tracking-tight text-balance"
          style={{
            fontSize: "clamp(2.8rem, 10vw, 7rem)",
            color: "oklch(0.97 0 0)",
            textShadow: `0 0 100px oklch(0.58 0.22 ${c1} / 0.40), 0 2px 40px oklch(0 0 0 / 0.60)`,
            opacity: slideVisible ? 1 : 0,
            transform: slideVisible ? "translateY(0)" : "translateY(14px)",
            transition: "opacity 0.5s ease 0.05s, transform 0.5s ease 0.05s",
          }}
        >
          {slide.title}
        </h1>

        {/* Brand label */}
        <p
          className="mt-3 font-black tracking-[0.3em] uppercase"
          style={{
            fontSize: "clamp(0.6rem, 1.6vw, 0.85rem)",
            color: `oklch(0.68 0.22 ${c1})`,
            opacity: slideVisible ? 1 : 0,
            transition: "opacity 0.5s ease 0.1s",
          }}
        >
          Reborn AI
        </p>

        {/* Subtitle */}
        <p
          className="mt-5 max-w-xs sm:max-w-md md:max-w-lg text-balance leading-relaxed"
          style={{
            fontSize: "clamp(0.9rem, 2.4vw, 1.15rem)",
            color: "oklch(0.62 0.02 260)",
            opacity: slideVisible ? 1 : 0,
            transform: slideVisible ? "translateY(0)" : "translateY(8px)",
            transition: "opacity 0.5s ease 0.12s, transform 0.5s ease 0.12s",
          }}
        >
          {slide.subtitle}
        </p>

        {/* Dot indicators */}
        <div className="mt-8 flex gap-2" role="tablist" aria-label="Funcionalidades">
          {SLIDES.map((_, i) => (
            <button
              key={i}
              role="tab"
              aria-selected={i === slideIndex}
              aria-label={SLIDES[i].tag}
              onClick={() => goToSlide(i)}
              className="rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
              style={{
                height: "5px",
                width: i === slideIndex ? "32px" : "5px",
                background: i === slideIndex ? `oklch(0.72 0.22 ${c1})` : "oklch(0.30 0 0)",
                transition: "width 0.4s ease, background 0.4s ease",
              }}
            />
          ))}
        </div>

        {/* CTA — start live or hint */}
        <div className="mt-8 flex flex-col items-center gap-3">
          {!isActive ? (
            <Button
              onClick={onStart}
              size="lg"
              className="h-12 px-8 rounded-full text-sm font-semibold shadow-2xl gap-2"
              style={{
                background: `oklch(0.58 0.24 ${c1})`,
                boxShadow: `0 0 40px oklch(0.58 0.24 ${c1} / 0.40)`,
              }}
            >
              <Video className="w-4 h-4" />
              Iniciar Modo Live
            </Button>
          ) : null}
          <p
            className="flex items-center gap-1.5 text-xs"
            style={{ color: "oklch(0.40 0 0)" }}
          >
            <Mic className="w-3 h-3" aria-hidden />
            {isActive ? "Fala ou escreve para começar" : "Câmara e voz em tempo real"}
          </p>
        </div>
      </div>

      {/* ── Camera PiP ────────────────────────────────────────────────────────── */}
      {isActive && isCameraOn && (
        <div
          className="absolute top-3 right-3 z-30 rounded-xl overflow-hidden shadow-2xl"
          style={{
            width: "clamp(80px, 18vw, 150px)",
            height: "clamp(60px, 13.5vw, 112px)",
            border: "1px solid oklch(1 0 0 / 0.12)",
          }}
        >
          <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
        </div>
      )}
      {(!isActive || !isCameraOn) && <video ref={videoRef} className="hidden" />}
      <canvas ref={canvasRef} className="hidden" />

      {/* ── Status badges ─────────────────────────────────────────────────────── */}
      {isActive && (
        <div className="absolute top-3 left-3 z-30 flex flex-col gap-1.5">
          {isStreaming && (
            <div className="flex items-center gap-1.5 rounded-full px-3 py-1 text-xs text-white/70"
              style={{ background: "oklch(0 0 0 / 0.60)", backdropFilter: "blur(8px)", border: "1px solid oklch(1 0 0 / 0.10)" }}>
              <Loader2 className="w-3 h-3 animate-spin text-primary" />
              A processar...
            </div>
          )}
          {isMicOn && isListening && !isStreaming && (
            <div className="flex items-center gap-1.5 rounded-full px-3 py-1 text-xs text-white/70"
              style={{ background: "oklch(0 0 0 / 0.60)", backdropFilter: "blur(8px)", border: "1px solid oklch(0.65 0.25 25 / 0.35)" }}>
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              Ao vivo
            </div>
          )}
        </div>
      )}

      {/* ── Messages ──────────────────────────────────────────────────────────── */}
      {hasMessages && isActive && (
        <div className="relative z-10 flex-1 min-h-0 overflow-hidden pt-14 pb-2 px-3 sm:px-5 md:px-8">
          <ScrollArea className="h-full">
            <div className="space-y-3 py-2 max-w-2xl mx-auto">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex gap-2.5 items-end animate-fade-in ${m.role === "user" ? "flex-row-reverse" : "flex-row"}`}
                >
                  {m.role === "assistant" && (
                    <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ background: `oklch(0.58 0.22 ${c1} / 0.16)`, border: `1px solid oklch(0.58 0.22 ${c1} / 0.28)` }}>
                      <Bot className="w-3.5 h-3.5 text-primary" />
                    </div>
                  )}
                  <div
                    className={`max-w-[80%] sm:max-w-[72%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
                      m.role === "user"
                        ? "bg-primary text-primary-foreground rounded-tr-sm"
                        : "rounded-tl-sm text-foreground"
                    }`}
                    style={m.role === "assistant" ? {
                      background: "oklch(1 0 0 / 0.07)",
                      backdropFilter: "blur(8px)",
                      border: "1px solid oklch(1 0 0 / 0.10)",
                    } : {}}
                  >
                    {m.content}
                  </div>
                </div>
              ))}

              {streamingText && (
                <div className="flex gap-2.5 items-end animate-fade-in">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ background: `oklch(0.58 0.22 ${c1} / 0.16)`, border: `1px solid oklch(0.58 0.22 ${c1} / 0.28)` }}>
                    <Brain className="w-3.5 h-3.5 text-primary" />
                  </div>
                  <div
                    className="max-w-[80%] sm:max-w-[72%] px-3.5 py-2.5 rounded-2xl rounded-tl-sm text-foreground text-sm leading-relaxed typing-cursor"
                    style={{ background: "oklch(1 0 0 / 0.07)", backdropFilter: "blur(8px)", border: "1px solid oklch(1 0 0 / 0.10)" }}
                  >
                    {streamingText}
                  </div>
                </div>
              )}

              {isStreaming && !streamingText && (
                <div className="flex gap-2.5 items-end animate-fade-in">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ background: "oklch(1 0 0 / 0.07)", border: "1px solid oklch(1 0 0 / 0.10)" }}>
                    <Loader2 className="w-3.5 h-3.5 text-primary animate-spin" />
                  </div>
                  <div
                    className="px-3.5 py-2.5 rounded-2xl rounded-tl-sm"
                    style={{ background: "oklch(1 0 0 / 0.07)", border: "1px solid oklch(1 0 0 / 0.10)" }}
                  >
                    <div className="flex gap-1 items-center h-4">
                      {[0, 150, 300].map((d) => (
                        <span key={d} className="w-1.5 h-1.5 rounded-full bg-white/40 animate-bounce" style={{ animationDelay: `${d}ms` }} />
                      ))}
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>
        </div>
      )}

      {/* ── Voice transcript overlay ──────────────────────────────────────────── */}
      {transcript && (
        <div className="absolute z-30 left-3 right-3 bottom-36 sm:bottom-40" aria-live="polite">
          <div
            className="max-w-xl mx-auto rounded-xl px-3 py-2 text-sm text-white/55 italic"
            style={{ background: "oklch(0 0 0 / 0.70)", backdropFilter: "blur(12px)", border: "1px solid oklch(1 0 0 / 0.09)" }}
          >
            &ldquo;{transcript}&rdquo;
          </div>
        </div>
      )}

      {/* ── Bottom controls bar ──────────────────────────────────────────────── */}
      {isActive && (
        <div
          className="relative z-20 mt-auto shrink-0"
          style={{ background: "linear-gradient(to top, oklch(0.04 0.015 260) 55%, transparent)" }}
        >
          <div className="px-3 sm:px-5 md:px-8 pb-4 sm:pb-6 pt-8 space-y-3 max-w-2xl mx-auto w-full">
            {/* Text input */}
            <form onSubmit={handleSend} className="flex gap-2">
              <Input
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="Escreve uma mensagem..."
                className="flex-1 h-11 rounded-xl text-sm placeholder:text-white/30 focus:border-primary/50"
                style={{ background: "oklch(1 0 0 / 0.06)", border: "1px solid oklch(1 0 0 / 0.12)", backdropFilter: "blur(8px)" }}
                disabled={isStreaming}
                aria-label="Mensagem para o Reborn AI"
              />
              <Button
                type="submit"
                size="icon"
                className="h-11 w-11 rounded-xl flex-shrink-0"
                disabled={isStreaming || !textInput.trim()}
                aria-label="Enviar mensagem"
              >
                {isStreaming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </Button>
            </form>

            {/* Media controls */}
            <div className="flex items-center justify-center gap-3 flex-wrap">
              {/* Mic */}
              <div className="relative">
                {isMicOn && isListening && (
                  <span className="absolute inset-0 rounded-full border-2 border-primary/40 animate-ping pointer-events-none" />
                )}
                <Button
                  variant={isMicOn ? "default" : "destructive"}
                  size="icon"
                  className="h-12 w-12 rounded-full shadow-xl"
                  onClick={onToggleMic}
                  aria-label={isMicOn ? "Desligar microfone" : "Ligar microfone"}
                  aria-pressed={isMicOn}
                >
                  {isMicOn ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
                </Button>
              </div>

              {/* Camera */}
              <Button
                variant={isCameraOn ? "default" : "outline"}
                size="icon"
                className="h-12 w-12 rounded-full shadow-xl"
                style={!isCameraOn ? { border: "1px solid oklch(1 0 0 / 0.15)" } : {}}
                onClick={onToggleCamera}
                aria-label={isCameraOn ? "Desligar câmara" : "Ligar câmara"}
                aria-pressed={isCameraOn}
              >
                {isCameraOn ? <Camera className="h-5 w-5" /> : <CameraOff className="h-5 w-5" />}
              </Button>

              {/* Brand pill */}
              <div
                className="flex items-center gap-1.5 px-4 py-2 rounded-full"
                style={{
                  background: `oklch(0.58 0.22 ${c1} / 0.12)`,
                  border: `1px solid oklch(0.58 0.22 ${c1} / 0.24)`,
                }}
              >
                <Sparkles className="w-3.5 h-3.5" style={{ color: `oklch(0.74 0.20 ${c1})` }} />
                <span className="text-xs font-bold" style={{ color: `oklch(0.74 0.20 ${c1})` }}>Reborn AI</span>
              </div>

              {/* Exit */}
              <Button
                variant="outline"
                size="icon"
                className="h-12 w-12 rounded-full shadow-xl hover:bg-destructive hover:text-destructive-foreground hover:border-destructive"
                style={{ border: "1px solid oklch(1 0 0 / 0.15)" }}
                onClick={onStop}
                aria-label="Sair do modo live"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
