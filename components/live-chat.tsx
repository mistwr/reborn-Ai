"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Mic,
  MicOff,
  Camera,
  CameraOff,
  X,
  Send,
  Loader2,
  Brain,
  Sparkles,
  Globe,
  ImagePlus,
  Presentation,
  BookOpen,
  MessageSquare,
  Zap,
  Video,
  Bot,
  Eye,
} from "lucide-react"

// ── Slides ────────────────────────────────────────────────────────────────────
const SLIDES = [
  {
    tag: "Chat com IA",
    title: "Reborn AI",
    subtitle: "Conversa inteligente, respostas instantâneas.",
    icon: MessageSquare,
    h1: 220,
    h2: 250,
  },
  {
    tag: "Geração de Imagens",
    title: "Cria sem limites",
    subtitle: "Transforma ideias em imagens únicas com IA.",
    icon: ImagePlus,
    h1: 270,
    h2: 300,
  },
  {
    tag: "WebCraft",
    title: "Sites em segundos",
    subtitle: "Websites completos gerados pela inteligência artificial.",
    icon: Globe,
    h1: 190,
    h2: 210,
  },
  {
    tag: "Apresentações",
    title: "Slides profissionais",
    subtitle: "Apresentações de impacto criadas automaticamente.",
    icon: Presentation,
    h1: 150,
    h2: 170,
  },
  {
    tag: "Ebooks",
    title: "Publica o teu livro",
    subtitle: "Livros digitais completos, escritos por IA.",
    icon: BookOpen,
    h1: 50,
    h2: 30,
  },
  {
    tag: "Visao AI",
    title: "Vê tudo",
    subtitle: "OCR, análise de imagens e PDFs em segundos.",
    icon: Eye,
    h1: 130,
    h2: 160,
  },
  {
    tag: "Modo Live",
    title: "Ao vivo contigo",
    subtitle: "Câmara, voz e IA em tempo real.",
    icon: Video,
    h1: 10,
    h2: 340,
  },
  {
    tag: "Inteligencia Total",
    title: "O futuro é agora",
    subtitle: "Uma plataforma. Infinitas possibilidades.",
    icon: Zap,
    h1: 240,
    h2: 280,
  },
]

type ChatMessage = {
  id: string
  role: "user" | "assistant"
  content: string
}

interface LiveChatProps {
  onStop: () => void
  isCameraOn: boolean
  isMicOn: boolean
  onToggleCamera: () => void
  onToggleMic: () => void
}

export function LiveChat({
  onStop,
  isCameraOn,
  isMicOn,
  onToggleCamera,
  onToggleMic,
}: LiveChatProps) {
  const [slideIndex, setSlideIndex] = useState(0)
  const [slideIn, setSlideIn] = useState(true)
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
  const currentSlide = SLIDES[slideIndex]
  const SlideIcon = currentSlide.icon

  // ── Camera ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (isCameraOn) {
      if (!mediaStreamRef.current) {
        navigator.mediaDevices
          .getUserMedia({ video: { facingMode: "user" }, audio: isMicOn })
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
  }, [isCameraOn]) // eslint-disable-line

  useEffect(() => {
    return () => {
      mediaStreamRef.current?.getTracks().forEach((t) => t.stop())
      mediaStreamRef.current = null
      window.speechSynthesis?.cancel()
      stopVoice()
      abortRef.current?.abort()
    }
  }, []) // eslint-disable-line

  // ── Slideshow ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const id = setInterval(() => {
      setSlideIn(false)
      setTimeout(() => {
        setSlideIndex((i) => (i + 1) % SLIDES.length)
        setSlideIn(true)
      }, 500)
    }, 4500)
    return () => clearInterval(id)
  }, [])

  // ── Scroll ────────────────────────────────────────────────────────────────
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
  const sendToAI = useCallback(
    async (userText: string) => {
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
    },
    [isStreaming, messages, isCameraOn, speak],
  )

  // ── Voice ─────────────────────────────────────────────────────────────────
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
    r.onend = () => {
      if (recognitionRef.current) { try { r.start() } catch {} }
      else setIsListening(false)
    }
    r.start()
    recognitionRef.current = r
    setIsListening(true)
  }, [sendToAI])

  useEffect(() => {
    if (isMicOn) startVoice()
    else stopVoice()
  }, [isMicOn]) // eslint-disable-line

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault()
    if (!textInput.trim() || isStreaming) return
    sendToAI(textInput)
    setTextInput("")
  }

  const goToSlide = (i: number) => {
    setSlideIn(false)
    setTimeout(() => { setSlideIndex(i); setSlideIn(true) }, 300)
  }

  return (
    <div className="relative w-full h-full flex flex-col overflow-hidden bg-[oklch(0.04_0.01_260)]">

      {/* ── Animated Background ─────────────────────────────────────────────── */}
      <div
        className="absolute inset-0 pointer-events-none select-none"
        style={{ opacity: hasMessages ? 0.25 : 1, transition: "opacity 0.8s ease" }}
        aria-hidden
      >
        {/* Deep background gradient */}
        <div
          className="absolute inset-0"
          style={{
            background: `
              radial-gradient(ellipse 80% 60% at 20% 40%,
                oklch(0.18 0.15 ${currentSlide.h1} / 0.45) 0%,
                transparent 55%),
              radial-gradient(ellipse 60% 70% at 80% 70%,
                oklch(0.14 0.12 ${currentSlide.h2} / 0.35) 0%,
                transparent 50%),
              radial-gradient(ellipse 40% 40% at 50% 10%,
                oklch(0.12 0.10 ${currentSlide.h1 + 30} / 0.2) 0%,
                transparent 60%)
            `,
            transition: "background 1.2s ease",
          }}
        />
        {/* Subtle dot-grid */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `radial-gradient(oklch(0.55 0.18 ${currentSlide.h1} / 0.12) 1px, transparent 1px)`,
            backgroundSize: "28px 28px",
            opacity: 0.6,
          }}
        />
        {/* Large primary orb */}
        <div
          className="absolute rounded-full blur-[120px]"
          style={{
            width: "clamp(280px, 55vw, 700px)",
            height: "clamp(280px, 55vw, 700px)",
            top: "5%",
            left: "-10%",
            background: `oklch(0.55 0.28 ${currentSlide.h1})`,
            opacity: slideIn ? 0.22 : 0.0,
            transition: "opacity 1.2s ease, background 1.4s ease",
          }}
        />
        {/* Secondary orb */}
        <div
          className="absolute rounded-full blur-[100px]"
          style={{
            width: "clamp(200px, 40vw, 500px)",
            height: "clamp(200px, 40vw, 500px)",
            bottom: "10%",
            right: "-5%",
            background: `oklch(0.50 0.24 ${currentSlide.h2})`,
            opacity: slideIn ? 0.18 : 0.0,
            transition: "opacity 1.2s ease 0.3s, background 1.4s ease",
          }}
        />
        {/* Accent ring */}
        <div
          className="absolute rounded-full"
          style={{
            width: "clamp(150px, 30vw, 380px)",
            height: "clamp(150px, 30vw, 380px)",
            top: "35%",
            right: "20%",
            border: `1px solid oklch(0.60 0.20 ${currentSlide.h1} / 0.12)`,
            boxShadow: `0 0 80px oklch(0.60 0.20 ${currentSlide.h1} / 0.08)`,
            transition: "border-color 1.4s ease",
          }}
        />
      </div>

      {/* ── Slideshow Hero (hidden when chat is active) ──────────────────────── */}
      {!hasMessages && (
        <div
          className="absolute inset-0 z-10 flex flex-col items-center justify-center px-6 sm:px-10"
          style={{
            paddingBottom: "clamp(120px, 22vh, 180px)",
            opacity: slideIn ? 1 : 0,
            transform: slideIn ? "translateY(0)" : "translateY(12px)",
            transition: "opacity 0.5s ease, transform 0.5s ease",
          }}
          aria-live="polite"
        >
          {/* Tag pill */}
          <div
            className="mb-5 sm:mb-6 inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold tracking-widest uppercase"
            style={{
              background: `oklch(0.60 0.22 ${currentSlide.h1} / 0.12)`,
              border: `1px solid oklch(0.60 0.22 ${currentSlide.h1} / 0.28)`,
              color: `oklch(0.78 0.20 ${currentSlide.h1})`,
            }}
          >
            <SlideIcon className="w-3 h-3" aria-hidden />
            {currentSlide.tag}
          </div>

          {/* Main title */}
          <h2
            className="text-center font-bold leading-none tracking-tight text-balance"
            style={{
              fontSize: "clamp(2.4rem, 9vw, 6.5rem)",
              color: "oklch(0.97 0 0)",
              textShadow: `0 0 80px oklch(0.60 0.22 ${currentSlide.h1} / 0.35)`,
            }}
          >
            {currentSlide.title}
          </h2>

          {/* Brand name below */}
          <p
            className="mt-2 sm:mt-3 font-bold tracking-[0.25em] uppercase"
            style={{
              fontSize: "clamp(0.6rem, 1.8vw, 0.9rem)",
              color: `oklch(0.70 0.22 ${currentSlide.h1})`,
            }}
          >
            Reborn AI
          </p>

          {/* Subtitle */}
          <p
            className="mt-4 sm:mt-5 text-center max-w-sm sm:max-w-lg text-balance"
            style={{
              fontSize: "clamp(0.9rem, 2.2vw, 1.15rem)",
              color: "oklch(0.65 0 0)",
              lineHeight: 1.6,
            }}
          >
            {currentSlide.subtitle}
          </p>

          {/* Dot indicators */}
          <div className="mt-8 sm:mt-10 flex gap-2 pointer-events-auto" role="tablist" aria-label="Funcionalidades">
            {SLIDES.map((s, i) => (
              <button
                key={i}
                role="tab"
                aria-selected={i === slideIndex}
                aria-label={s.tag}
                className="rounded-full transition-all duration-400 focus:outline-none"
                style={{
                  height: "5px",
                  width: i === slideIndex ? "28px" : "5px",
                  background: i === slideIndex
                    ? `oklch(0.70 0.22 ${currentSlide.h1})`
                    : "oklch(0.35 0 0)",
                }}
                onClick={() => goToSlide(i)}
              />
            ))}
          </div>

          {/* CTA hint */}
          <p
            className="mt-6 flex items-center gap-2 text-xs"
            style={{ color: "oklch(0.42 0 0)" }}
          >
            <Mic className="w-3 h-3" aria-hidden />
            Fala ou escreve para começar a conversa
          </p>
        </div>
      )}

      {/* ── Camera PiP ───────────────────────────────────────────────────────── */}
      {isCameraOn && (
        <div className="absolute top-3 right-3 z-30 rounded-xl overflow-hidden shadow-2xl border border-white/10"
          style={{ width: "clamp(80px, 18vw, 140px)", height: "clamp(60px, 13.5vw, 105px)" }}>
          <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
        </div>
      )}
      {!isCameraOn && <video ref={videoRef} className="hidden" />}
      <canvas ref={canvasRef} className="hidden" />

      {/* ── Status badges ────────────────────────────────────────────────────── */}
      <div className="absolute top-3 left-3 z-30 flex flex-col gap-1.5">
        {isStreaming && (
          <div className="flex items-center gap-1.5 bg-black/60 backdrop-blur-sm rounded-full px-3 py-1 border border-white/10 text-xs text-white/70">
            <Loader2 className="w-3 h-3 animate-spin text-primary" />
            A processar...
          </div>
        )}
        {isMicOn && isListening && !isStreaming && (
          <div className="flex items-center gap-1.5 bg-black/60 backdrop-blur-sm rounded-full px-3 py-1 border border-red-500/30 text-xs text-white/70">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            Ao vivo
          </div>
        )}
      </div>

      {/* ── Messages ─────────────────────────────────────────────────────────── */}
      {hasMessages && (
        <div className="relative z-10 flex-1 min-h-0 overflow-hidden pt-14 pb-2 px-3 sm:px-4 md:px-6">
          <ScrollArea className="h-full">
            <div className="space-y-3 py-2 max-w-2xl mx-auto">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex gap-2 items-end animate-fade-in ${m.role === "user" ? "flex-row-reverse" : "flex-row"}`}
                >
                  {m.role === "assistant" && (
                    <div className="w-7 h-7 rounded-full bg-primary/15 border border-primary/25 flex items-center justify-center flex-shrink-0">
                      <Bot className="w-3.5 h-3.5 text-primary" />
                    </div>
                  )}
                  <div
                    className={`max-w-[80%] sm:max-w-[72%] px-3 py-2 rounded-2xl text-sm leading-relaxed ${
                      m.role === "user"
                        ? "bg-primary text-primary-foreground rounded-tr-sm"
                        : "bg-white/8 backdrop-blur-sm text-foreground rounded-tl-sm border border-white/10"
                    }`}
                  >
                    {m.content}
                  </div>
                </div>
              ))}

              {streamingText && (
                <div className="flex gap-2 items-end animate-fade-in">
                  <div className="w-7 h-7 rounded-full bg-primary/15 border border-primary/25 flex items-center justify-center flex-shrink-0">
                    <Brain className="w-3.5 h-3.5 text-primary" />
                  </div>
                  <div className="max-w-[80%] sm:max-w-[72%] px-3 py-2 rounded-2xl rounded-tl-sm bg-white/8 backdrop-blur-sm text-foreground border border-white/10 text-sm leading-relaxed typing-cursor">
                    {streamingText}
                  </div>
                </div>
              )}

              {isStreaming && !streamingText && (
                <div className="flex gap-2 items-end animate-fade-in">
                  <div className="w-7 h-7 rounded-full bg-primary/15 border border-primary/25 flex items-center justify-center flex-shrink-0">
                    <Loader2 className="w-3.5 h-3.5 text-primary animate-spin" />
                  </div>
                  <div className="bg-white/8 backdrop-blur-sm rounded-2xl rounded-tl-sm border border-white/10 px-3 py-2">
                    <div className="flex gap-1 items-center h-4">
                      <span className="w-1.5 h-1.5 rounded-full bg-white/40 animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-white/40 animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-white/40 animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>
        </div>
      )}

      {/* ── Voice transcript ─────────────────────────────────────────────────── */}
      {transcript && (
        <div className="absolute z-30 left-3 right-3 bottom-[calc(var(--controls-h,160px)+8px)]" aria-live="polite">
          <div className="max-w-xl mx-auto bg-black/70 backdrop-blur-md rounded-xl px-3 py-2 border border-white/10 text-sm text-white/60 italic">
            &ldquo;{transcript}&rdquo;
          </div>
        </div>
      )}

      {/* ── Bottom Controls ───────────────────────────────────────────────────── */}
      <div
        className="relative z-20 mt-auto shrink-0"
        style={{ background: "linear-gradient(to top, oklch(0.04 0.01 260) 60%, transparent)" }}
      >
        <div className="px-3 sm:px-4 md:px-6 pb-4 sm:pb-5 pt-6 space-y-3 max-w-2xl mx-auto w-full">
          {/* Text input */}
          <form onSubmit={handleSend} className="flex gap-2">
            <Input
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="Escreve uma mensagem..."
              className="flex-1 bg-white/6 backdrop-blur-sm border-white/12 text-sm h-11 rounded-xl placeholder:text-white/30 focus:border-primary/50"
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
              className="h-12 w-12 rounded-full shadow-xl border-white/15"
              onClick={onToggleCamera}
              aria-label={isCameraOn ? "Desligar câmara" : "Ligar câmara"}
              aria-pressed={isCameraOn}
            >
              {isCameraOn ? <Camera className="h-5 w-5" /> : <CameraOff className="h-5 w-5" />}
            </Button>

            {/* Brand pill */}
            <div
              className="flex items-center gap-1.5 px-3 py-2 rounded-full border"
              style={{
                background: `oklch(0.60 0.22 ${currentSlide.h1} / 0.10)`,
                borderColor: `oklch(0.60 0.22 ${currentSlide.h1} / 0.22)`,
              }}
            >
              <Sparkles className="w-3.5 h-3.5" style={{ color: `oklch(0.72 0.20 ${currentSlide.h1})` }} />
              <span className="text-xs font-semibold" style={{ color: `oklch(0.72 0.20 ${currentSlide.h1})` }}>Reborn AI</span>
            </div>

            {/* Exit */}
            <Button
              variant="outline"
              size="icon"
              className="h-12 w-12 rounded-full shadow-xl border-white/15 hover:bg-destructive hover:text-destructive-foreground hover:border-destructive"
              onClick={onStop}
              aria-label="Sair do modo live"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
