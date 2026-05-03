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
  Play,
} from "lucide-react"

// ── Slides ─────────────────────────────────────────────────────────────────────
const SLIDES = [
  {
    tag: "Chat com IA",
    title: "Reborn AI",
    subtitle: "Conversa inteligente com respostas instantâneas e contexto total.",
    icon: MessageSquare,
    h1: 220,
    h2: 250,
  },
  {
    tag: "Geração de Imagens",
    title: "Cria sem limites",
    subtitle: "Transforma qualquer ideia em imagens únicas com inteligência artificial.",
    icon: ImagePlus,
    h1: 270,
    h2: 300,
  },
  {
    tag: "WebCraft",
    title: "Sites em segundos",
    subtitle: "Websites completos e responsivos gerados automaticamente pela IA.",
    icon: Globe,
    h1: 190,
    h2: 210,
  },
  {
    tag: "Apresentações",
    title: "Slides profissionais",
    subtitle: "Apresentações de impacto criadas em segundos, prontas a usar.",
    icon: Presentation,
    h1: 150,
    h2: 170,
  },
  {
    tag: "Ebooks & Conteúdo",
    title: "Publica o teu livro",
    subtitle: "Livros digitais completos e artigos profissionais escritos por IA.",
    icon: BookOpen,
    h1: 50,
    h2: 30,
  },
  {
    tag: "Visao AI",
    title: "Vê e entende tudo",
    subtitle: "OCR, análise de imagens, PDFs e documentos em segundos.",
    icon: Eye,
    h1: 130,
    h2: 160,
  },
  {
    tag: "Modo Live",
    title: "Ao vivo contigo",
    subtitle: "Câmara, voz e inteligência artificial em conversa real e contínua.",
    icon: Video,
    h1: 10,
    h2: 340,
  },
  {
    tag: "Inteligencia Total",
    title: "O futuro é agora",
    subtitle: "Uma plataforma completa. Infinitas possibilidades. Zero limites.",
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
  onStart: () => void
  isActive: boolean
  isCameraOn: boolean
  isMicOn: boolean
  onToggleCamera: () => void
  onToggleMic: () => void
}

export function LiveChat({
  onStop,
  onStart,
  isActive,
  isCameraOn,
  isMicOn,
  onToggleCamera,
  onToggleMic,
}: LiveChatProps) {
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

  // ── Slideshow — always runs ────────────────────────────────────────────────
  useEffect(() => {
    const id = setInterval(() => {
      setSlideVisible(false)
      setTimeout(() => {
        setSlideIndex((i) => (i + 1) % SLIDES.length)
        setSlideVisible(true)
      }, 450)
    }, 4500)
    return () => clearInterval(id)
  }, [])

  // ── Camera ────────────────────────────────────────────────────────────────
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

  // ── Cleanup on unmount ────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      mediaStreamRef.current?.getTracks().forEach((t) => t.stop())
      mediaStreamRef.current = null
      window.speechSynthesis?.cancel()
      stopVoice()
      abortRef.current?.abort()
    }
  }, []) // eslint-disable-line

  // ── Scroll ────────────────────────────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, streamingText])

  // ── TTS ───────────────────────────────────────────────────────────────────
  const speak = useCallback((text: string) => {
    if (!text || !window.speechSynthesis) return
    window.speechSynthesis.cancel()
    const u = new SpeechSynthesisUtterance(text.slice(0, 500))
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
        setMessages((prev) => [
          ...prev,
          { id: (Date.now() + 1).toString(), role: "assistant", content: full },
        ])
        setStreamingText("")
        speak(full)
      } catch (e: any) {
        if (e?.name !== "AbortError") {
          setMessages((prev) => [
            ...prev,
            {
              id: (Date.now() + 1).toString(),
              role: "assistant",
              content: "Desculpa, ocorreu um erro. Tenta novamente.",
            },
          ])
          setStreamingText("")
        }
      } finally {
        setIsStreaming(false)
        abortRef.current = null
      }
    },
    [isStreaming, messages, isCameraOn, speak],
  )

  // ── Voice recognition ─────────────────────────────────────────────────────
  const stopVoice = useCallback(() => {
    if (recognitionRef.current) {
      const r = recognitionRef.current
      recognitionRef.current = null
      try {
        r.stop()
      } catch {}
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
      if (last.isFinal && t.trim()) {
        setTranscript("")
        sendToAI(t)
      }
    }
    r.onerror = () => {
      setIsListening(false)
      recognitionRef.current = null
    }
    r.onend = () => {
      if (recognitionRef.current) {
        try {
          r.start()
        } catch {}
      } else setIsListening(false)
    }
    r.start()
    recognitionRef.current = r
    setIsListening(true)
  }, [sendToAI])

  useEffect(() => {
    if (!isActive) return
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
    setTimeout(() => {
      setSlideIndex(i)
      setSlideVisible(true)
    }, 300)
  }

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div
      className="relative w-full h-full overflow-hidden flex flex-col"
      style={{ background: "oklch(0.04 0.01 260)" }}
    >
      {/* ── Animated background — always visible, dims during chat ──────────── */}
      <div
        className="absolute inset-0 pointer-events-none select-none"
        style={{
          opacity: hasMessages && isActive ? 0.18 : 1,
          transition: "opacity 1s ease",
        }}
        aria-hidden
      >
        {/* Gradient background */}
        <div
          className="absolute inset-0"
          style={{
            background: `
              radial-gradient(ellipse 80% 60% at 15% 35%,
                oklch(0.18 0.15 ${slide.h1} / 0.5) 0%, transparent 55%),
              radial-gradient(ellipse 65% 70% at 82% 72%,
                oklch(0.14 0.12 ${slide.h2} / 0.4) 0%, transparent 50%),
              radial-gradient(ellipse 45% 45% at 52% 8%,
                oklch(0.12 0.10 ${slide.h1 + 30} / 0.25) 0%, transparent 60%)
            `,
            transition: "background 1.4s ease",
          }}
        />
        {/* Dot grid */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `radial-gradient(oklch(0.55 0.18 ${slide.h1} / 0.10) 1px, transparent 1px)`,
            backgroundSize: "26px 26px",
          }}
        />
        {/* Primary orb */}
        <div
          className="absolute rounded-full"
          style={{
            width: "clamp(260px, 50vw, 680px)",
            height: "clamp(260px, 50vw, 680px)",
            top: "0%",
            left: "-12%",
            background: `oklch(0.52 0.28 ${slide.h1})`,
            filter: "blur(120px)",
            opacity: slideVisible ? 0.22 : 0,
            transition: "opacity 1.3s ease, background 1.5s ease",
          }}
        />
        {/* Secondary orb */}
        <div
          className="absolute rounded-full"
          style={{
            width: "clamp(180px, 38vw, 460px)",
            height: "clamp(180px, 38vw, 460px)",
            bottom: "8%",
            right: "-6%",
            background: `oklch(0.48 0.24 ${slide.h2})`,
            filter: "blur(100px)",
            opacity: slideVisible ? 0.18 : 0,
            transition: "opacity 1.3s ease 0.3s, background 1.5s ease",
          }}
        />
        {/* Accent ring (desktop only) */}
        <div
          className="absolute rounded-full hidden sm:block"
          style={{
            width: "clamp(140px, 28vw, 360px)",
            height: "clamp(140px, 28vw, 360px)",
            top: "30%",
            right: "18%",
            border: `1px solid oklch(0.60 0.20 ${slide.h1} / 0.14)`,
            boxShadow: `0 0 80px oklch(0.60 0.20 ${slide.h1} / 0.07)`,
            transition: "border-color 1.4s ease",
          }}
        />
      </div>

      {/* ── Slideshow hero — ALWAYS shows, fades when messages present ──────── */}
      <div
        className="absolute inset-0 z-10 flex flex-col items-center justify-center px-5 sm:px-10"
        style={{
          paddingBottom: isActive
            ? "clamp(150px, 26vh, 210px)"
            : "clamp(40px, 8vh, 80px)",
          opacity: hasMessages && isActive ? 0 : 1,
          pointerEvents: hasMessages && isActive ? "none" : "auto",
          transition: "opacity 0.7s ease, padding-bottom 0.5s ease",
        }}
        aria-live="polite"
      >
        {/* Tag pill */}
        <div
          className="mb-4 sm:mb-5 inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 rounded-full text-xs font-semibold tracking-widest uppercase"
          style={{
            background: `oklch(0.60 0.22 ${slide.h1} / 0.12)`,
            border: `1px solid oklch(0.60 0.22 ${slide.h1} / 0.28)`,
            color: `oklch(0.78 0.20 ${slide.h1})`,
            opacity: slideVisible ? 1 : 0,
            transform: slideVisible ? "translateY(0)" : "translateY(10px)",
            transition: "opacity 0.45s ease, transform 0.45s ease",
          }}
        >
          <SlideIcon className="w-3 h-3 flex-shrink-0" aria-hidden />
          {slide.tag}
        </div>

        {/* Main title */}
        <h2
          className="text-center font-bold leading-none tracking-tight text-balance"
          style={{
            fontSize: "clamp(2.6rem, 10vw, 7rem)",
            color: "oklch(0.97 0 0)",
            textShadow: `0 0 100px oklch(0.60 0.22 ${slide.h1} / 0.40)`,
            opacity: slideVisible ? 1 : 0,
            transform: slideVisible ? "translateY(0)" : "translateY(14px)",
            transition: "opacity 0.45s ease 0.05s, transform 0.45s ease 0.05s, text-shadow 1.4s ease",
          }}
        >
          {slide.title}
        </h2>

        {/* Brand label */}
        <p
          className="mt-2 sm:mt-3 font-bold tracking-[0.28em] uppercase"
          style={{
            fontSize: "clamp(0.55rem, 1.6vw, 0.85rem)",
            color: `oklch(0.68 0.22 ${slide.h1})`,
            opacity: slideVisible ? 1 : 0,
            transition: "opacity 0.45s ease 0.10s, color 1.4s ease",
          }}
        >
          Reborn AI
        </p>

        {/* Subtitle */}
        <p
          className="mt-4 sm:mt-5 text-center max-w-xs sm:max-w-md text-balance leading-relaxed"
          style={{
            fontSize: "clamp(0.85rem, 2vw, 1.1rem)",
            color: "oklch(0.58 0 0)",
            opacity: slideVisible ? 1 : 0,
            transform: slideVisible ? "translateY(0)" : "translateY(8px)",
            transition: "opacity 0.45s ease 0.12s, transform 0.45s ease 0.12s",
          }}
        >
          {slide.subtitle}
        </p>

        {/* Dot indicators */}
        <div
          className="mt-7 sm:mt-8 flex gap-2 pointer-events-auto"
          role="tablist"
          aria-label="Funcionalidades"
        >
          {SLIDES.map((s, i) => (
            <button
              key={i}
              role="tab"
              aria-selected={i === slideIndex}
              aria-label={s.tag}
              className="rounded-full focus:outline-none focus-visible:ring-2"
              style={{
                height: "5px",
                width: i === slideIndex ? "30px" : "5px",
                background:
                  i === slideIndex
                    ? `oklch(0.70 0.22 ${slide.h1})`
                    : "oklch(0.28 0 0)",
                transition: "width 0.35s ease, background 0.35s ease",
              }}
              onClick={() => goToSlide(i)}
            />
          ))}
        </div>

        {/* CTA button — shown only before starting */}
        {!isActive && (
          <div
            className="mt-8 sm:mt-10 flex flex-col items-center gap-3"
            style={{
              opacity: slideVisible ? 1 : 0,
              transition: "opacity 0.45s ease 0.15s",
            }}
          >
            <Button
              size="lg"
              className="rounded-full h-12 px-8 text-sm font-semibold gap-2 shadow-2xl border-0"
              style={{
                background: `oklch(0.58 0.22 ${slide.h1})`,
                boxShadow: `0 0 40px oklch(0.58 0.22 ${slide.h1} / 0.40)`,
                color: "oklch(0.97 0 0)",
              }}
              onClick={onStart}
            >
              <Play className="w-4 h-4 fill-current" />
              Iniciar Modo Live
            </Button>
            <p className="flex items-center gap-1.5 text-xs" style={{ color: "oklch(0.38 0 0)" }}>
              <Mic className="w-3 h-3" aria-hidden />
              Câmara, voz e IA em tempo real
            </p>
          </div>
        )}

        {/* Hint when active but no messages yet */}
        {isActive && !hasMessages && (
          <p
            className="mt-6 flex items-center gap-2 text-xs"
            style={{
              color: "oklch(0.42 0 0)",
              opacity: slideVisible ? 1 : 0,
              transition: "opacity 0.45s ease 0.15s",
            }}
          >
            <Mic className="w-3 h-3" aria-hidden />
            Fala ou escreve para começar
          </p>
        )}
      </div>

      {/* ── Camera PiP ───────────────────────────────────────────────────────── */}
      {isActive && isCameraOn && (
        <div
          className="absolute top-3 right-3 z-30 rounded-xl overflow-hidden shadow-2xl"
          style={{
            width: "clamp(80px, 18vw, 140px)",
            height: "clamp(60px, 13.5vw, 105px)",
            border: "1px solid oklch(1 0 0 / 0.10)",
          }}
        >
          <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
        </div>
      )}
      {(!isActive || !isCameraOn) && <video ref={videoRef} className="hidden" aria-hidden />}
      <canvas ref={canvasRef} className="hidden" aria-hidden />

      {/* ── Status badges ─────────────────────────────────────────────────────── */}
      {isActive && (
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
      )}

      {/* ── Messages ─────────────────────────────────────────────────────────── */}
      {isActive && hasMessages && (
        <div
          className="absolute inset-0 z-10 pt-12 px-3 sm:px-4 md:px-6"
          style={{ paddingBottom: "clamp(150px, 26vh, 210px)" }}
        >
          <ScrollArea className="h-full">
            <div className="space-y-3 py-2 max-w-2xl mx-auto">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex gap-2 items-end animate-fade-in ${
                    m.role === "user" ? "flex-row-reverse" : "flex-row"
                  }`}
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
                      <span
                        className="w-1.5 h-1.5 rounded-full bg-white/40 animate-bounce"
                        style={{ animationDelay: "0ms" }}
                      />
                      <span
                        className="w-1.5 h-1.5 rounded-full bg-white/40 animate-bounce"
                        style={{ animationDelay: "150ms" }}
                      />
                      <span
                        className="w-1.5 h-1.5 rounded-full bg-white/40 animate-bounce"
                        style={{ animationDelay: "300ms" }}
                      />
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
      {isActive && transcript && (
        <div
          className="absolute z-30 left-3 right-3"
          style={{ bottom: "clamp(158px, 27vh, 215px)" }}
          aria-live="polite"
        >
          <div className="max-w-xl mx-auto bg-black/70 backdrop-blur-md rounded-xl px-3 py-2 border border-white/10 text-sm text-white/60 italic">
            &ldquo;{transcript}&rdquo;
          </div>
        </div>
      )}

      {/* ── Bottom controls — only when active ───────────────────────────────── */}
      {isActive && (
        <div
          className="absolute bottom-0 left-0 right-0 z-20"
          style={{
            background: "linear-gradient(to top, oklch(0.04 0.01 260) 65%, transparent)",
          }}
        >
          <div className="px-3 sm:px-5 pb-safe-or-4 pb-4 sm:pb-5 pt-6 space-y-3 max-w-2xl mx-auto w-full">
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

            {/* Media controls row */}
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
                  background: `oklch(0.60 0.22 ${slide.h1} / 0.10)`,
                  borderColor: `oklch(0.60 0.22 ${slide.h1} / 0.22)`,
                }}
              >
                <Sparkles
                  className="w-3.5 h-3.5"
                  style={{ color: `oklch(0.72 0.20 ${slide.h1})` }}
                />
                <span
                  className="text-xs font-semibold"
                  style={{ color: `oklch(0.72 0.20 ${slide.h1})` }}
                >
                  Reborn AI
                </span>
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
      )}
    </div>
  )
}
