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
} from "lucide-react"

// Slideshow slides showcasing Reborn AI features
const SLIDES = [
  {
    title: "Chat Inteligente",
    subtitle: "Conversa natural com IA avançada",
    icon: MessageSquare,
    hue: 220,
  },
  {
    title: "Geração de Imagens",
    subtitle: "Cria imagens únicas com IA",
    icon: ImagePlus,
    hue: 270,
  },
  {
    title: "WebCraft",
    subtitle: "Websites completos em segundos",
    icon: Globe,
    hue: 190,
  },
  {
    title: "Apresentações",
    subtitle: "Slides profissionais com IA",
    icon: Presentation,
    hue: 150,
  },
  {
    title: "Ebooks",
    subtitle: "Livros digitais gerados por IA",
    icon: BookOpen,
    hue: 50,
  },
  {
    title: "Modo Live",
    subtitle: "Conversa em tempo real com câmara e voz",
    icon: Video,
    hue: 10,
  },
  {
    title: "Reborn AI",
    subtitle: "O futuro da inteligência artificial",
    icon: Zap,
    hue: 240,
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
  videoRef: React.RefObject<HTMLVideoElement>
  canvasRef: React.RefObject<HTMLCanvasElement>
}

export function LiveChat({
  onStop,
  isCameraOn,
  isMicOn,
  onToggleCamera,
  onToggleMic,
  videoRef,
  canvasRef,
}: LiveChatProps) {
  const [slideIndex, setSlideIndex] = useState(0)
  const [slideVisible, setSlideVisible] = useState(true)
  const [textInput, setTextInput] = useState("")
  const [liveModeTranscript, setLiveModeTranscript] = useState("")
  const [isListeningVoice, setIsListeningVoice] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamingText, setStreamingText] = useState("")

  const recognitionRef = useRef<any>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  // Slideshow auto-advance
  useEffect(() => {
    const interval = setInterval(() => {
      setSlideVisible(false)
      setTimeout(() => {
        setSlideIndex((i) => (i + 1) % SLIDES.length)
        setSlideVisible(true)
      }, 600)
    }, 4000)
    return () => clearInterval(interval)
  }, [])

  // Auto-scroll messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, streamingText])

  // Speak AI response via TTS
  const speakResponse = useCallback((text: string) => {
    if (!text || typeof window === "undefined" || !window.speechSynthesis) return
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = "pt-PT"
    utterance.rate = 1.05
    utterance.pitch = 1
    window.speechSynthesis.speak(utterance)
  }, [])

  // Send message to API and stream response
  const sendToAI = useCallback(
    async (userText: string) => {
      if (!userText.trim() || isStreaming) return

      const userMessage: ChatMessage = {
        id: Date.now().toString(),
        role: "user",
        content: userText.trim(),
      }

      setMessages((prev) => [...prev, userMessage])
      setIsStreaming(true)
      setStreamingText("")

      const history = [...messages, userMessage].map((m) => ({
        role: m.role,
        content: m.content,
      }))

      abortRef.current = new AbortController()

      try {
        const response = await fetch("/api/live", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: userText.trim(),
            conversationHistory: history.slice(0, -1), // exclude the new user message
            mode: isCameraOn ? "both" : "voice",
          }),
          signal: abortRef.current.signal,
        })

        if (!response.ok) throw new Error("Erro na resposta")
        if (!response.body) throw new Error("Sem corpo de resposta")

        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        let fullText = ""

        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          const chunk = decoder.decode(value, { stream: true })
          fullText += chunk
          setStreamingText(fullText)
        }

        const assistantMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: fullText,
        }
        setMessages((prev) => [...prev, assistantMessage])
        setStreamingText("")
        speakResponse(fullText)
      } catch (err: any) {
        if (err?.name !== "AbortError") {
          const errorMessage: ChatMessage = {
            id: (Date.now() + 1).toString(),
            role: "assistant",
            content: "Desculpa, ocorreu um erro. Tenta novamente.",
          }
          setMessages((prev) => [...prev, errorMessage])
          setStreamingText("")
        }
      } finally {
        setIsStreaming(false)
        abortRef.current = null
      }
    },
    [isStreaming, messages, isCameraOn, speakResponse],
  )

  // Voice recognition
  const startVoiceRecognition = useCallback(() => {
    if (!("webkitSpeechRecognition" in window) && !("SpeechRecognition" in window)) return
    if (recognitionRef.current) return

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    const recognition = new SpeechRecognition()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = "pt-PT"

    recognition.onresult = (event: any) => {
      const lastResult = event.results[event.results.length - 1]
      const transcript = lastResult[0].transcript
      setLiveModeTranscript(transcript)

      if (lastResult.isFinal && transcript.trim()) {
        setLiveModeTranscript("")
        sendToAI(transcript)
      }
    }

    recognition.onerror = () => {
      setIsListeningVoice(false)
      recognitionRef.current = null
    }

    recognition.onend = () => {
      // Restart if mic is still on
      if (recognitionRef.current) {
        try {
          recognition.start()
        } catch {}
      } else {
        setIsListeningVoice(false)
      }
    }

    recognition.start()
    recognitionRef.current = recognition
    setIsListeningVoice(true)
  }, [sendToAI])

  const stopVoiceRecognition = useCallback(() => {
    if (recognitionRef.current) {
      const r = recognitionRef.current
      recognitionRef.current = null
      try {
        r.stop()
      } catch {}
    }
    setIsListeningVoice(false)
    setLiveModeTranscript("")
  }, [])

  // Start/stop voice based on mic state
  useEffect(() => {
    if (isMicOn) {
      startVoiceRecognition()
    } else {
      stopVoiceRecognition()
    }
  }, [isMicOn]) // eslint-disable-line react-hooks/exhaustive-deps

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      window.speechSynthesis?.cancel()
      stopVoiceRecognition()
      abortRef.current?.abort()
    }
  }, [stopVoiceRecognition])

  const handleTextSend = (e: React.FormEvent) => {
    e.preventDefault()
    if (!textInput.trim() || isStreaming) return
    sendToAI(textInput)
    setTextInput("")
  }

  const currentSlide = SLIDES[slideIndex]
  const SlideIcon = currentSlide.icon
  const hasMessages = messages.length > 0 || !!streamingText

  return (
    <div className="relative w-full h-full flex flex-col overflow-hidden rounded-lg bg-background">
      {/* ─── Background Slideshow ─── */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none select-none" aria-hidden>
        {/* Animated radial glow */}
        <div
          className="absolute inset-0 transition-opacity duration-700"
          style={{
            opacity: slideVisible ? 1 : 0,
            background: `radial-gradient(ellipse at 30% 50%, oklch(0.22 0.12 ${currentSlide.hue} / 0.4) 0%, transparent 60%), radial-gradient(ellipse at 70% 80%, oklch(0.14 0.08 ${currentSlide.hue + 20} / 0.25) 0%, transparent 50%)`,
          }}
        />
        {/* Subtle grid */}
        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage: `linear-gradient(oklch(0.65 0.22 220) 1px, transparent 1px), linear-gradient(90deg, oklch(0.65 0.22 220) 1px, transparent 1px)`,
            backgroundSize: "44px 44px",
          }}
        />
        {/* Primary orb */}
        <div
          className="absolute top-1/4 left-1/4 w-56 sm:w-80 h-56 sm:h-80 rounded-full blur-3xl transition-all duration-1000"
          style={{
            opacity: slideVisible ? 0.22 : 0,
            background: `oklch(0.65 0.22 ${currentSlide.hue})`,
            transform: `translate(-50%, -50%) scale(${isStreaming ? 1.3 : 1})`,
            transition: "transform 0.6s ease, opacity 1s ease",
          }}
        />
        {/* Secondary orb */}
        <div
          className="absolute bottom-1/3 right-1/4 w-36 sm:w-56 h-36 sm:h-56 rounded-full blur-3xl transition-all duration-1000"
          style={{
            opacity: slideVisible ? 0.15 : 0,
            background: `oklch(0.6 0.18 ${currentSlide.hue + 30})`,
          }}
        />
      </div>

      {/* ─── Slide Feature Card (no messages yet) ─── */}
      {!hasMessages && (
        <div
          className={`absolute inset-0 flex flex-col items-center justify-center gap-4 sm:gap-6 px-4 transition-all duration-500 z-10 ${
            slideVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"
          }`}
          aria-live="polite"
        >
          <div
            className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center"
            style={{
              background: `oklch(0.65 0.22 ${currentSlide.hue} / 0.15)`,
              border: `1px solid oklch(0.65 0.22 ${currentSlide.hue} / 0.3)`,
            }}
          >
            <SlideIcon
              className="w-8 h-8 sm:w-10 sm:h-10"
              style={{ color: `oklch(0.72 0.22 ${currentSlide.hue})` }}
              aria-hidden
            />
          </div>

          <div className="text-center">
            <h2 className="text-2xl sm:text-4xl font-bold text-balance">{currentSlide.title}</h2>
            <p className="mt-1.5 text-sm sm:text-base text-muted-foreground">{currentSlide.subtitle}</p>
          </div>

          {/* Dot indicators */}
          <div className="flex gap-1.5 pointer-events-auto" role="tablist" aria-label="Slides">
            {SLIDES.map((_, i) => (
              <button
                key={i}
                role="tab"
                aria-selected={i === slideIndex}
                className={`h-1 rounded-full transition-all duration-300 ${
                  i === slideIndex
                    ? "w-6 bg-primary"
                    : "w-1.5 bg-muted-foreground/30 hover:bg-muted-foreground/50"
                }`}
                onClick={() => {
                  setSlideVisible(false)
                  setTimeout(() => {
                    setSlideIndex(i)
                    setSlideVisible(true)
                  }, 300)
                }}
              />
            ))}
          </div>

          <p className="flex items-center gap-1.5 text-xs text-muted-foreground/60">
            <Mic className="w-3 h-3" aria-hidden />
            Fala ou escreve para começar
          </p>
        </div>
      )}

      {/* ─── Camera pip ─── */}
      {isCameraOn && (
        <div className="absolute top-3 right-3 w-24 h-[72px] sm:w-36 sm:h-28 rounded-xl overflow-hidden border border-border/40 z-20 shadow-xl">
          <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
        </div>
      )}
      <canvas ref={canvasRef} className="hidden" />

      {/* ─── Status badges ─── */}
      <div className="absolute top-3 left-3 z-20 flex flex-col gap-1.5">
        {isStreaming && (
          <div className="flex items-center gap-1.5 bg-card/80 backdrop-blur-sm rounded-full px-2.5 py-1 border border-border/40 text-xs text-muted-foreground">
            <Loader2 className="w-3 h-3 animate-spin text-primary" aria-hidden />
            A processar...
          </div>
        )}
        {isMicOn && isListeningVoice && !isStreaming && (
          <div className="flex items-center gap-1.5 bg-card/80 backdrop-blur-sm rounded-full px-2.5 py-1 border border-red-500/30 text-xs text-muted-foreground">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" aria-hidden />
            Ao vivo
          </div>
        )}
      </div>

      {/* ─── Messages ─── */}
      {hasMessages && (
        <div className="relative z-10 flex-1 overflow-hidden px-3 sm:px-4 pt-14 pb-2">
          <ScrollArea className="h-full">
            <div className="space-y-3 py-2">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-2 items-end animate-fade-in ${
                    message.role === "user" ? "flex-row-reverse" : "flex-row"
                  }`}
                >
                  {message.role === "assistant" && (
                    <div className="w-7 h-7 rounded-full bg-primary/15 border border-primary/25 flex items-center justify-center flex-shrink-0">
                      <Bot className="w-3.5 h-3.5 text-primary" aria-hidden />
                    </div>
                  )}
                  <div
                    className={`max-w-[80%] sm:max-w-[72%] px-3 py-2 rounded-2xl text-sm leading-relaxed ${
                      message.role === "user"
                        ? "bg-primary text-primary-foreground rounded-tr-sm"
                        : "bg-card/85 backdrop-blur-sm text-foreground rounded-tl-sm border border-border/40"
                    }`}
                  >
                    {message.content}
                  </div>
                </div>
              ))}

              {/* Streaming response bubble */}
              {streamingText && (
                <div className="flex gap-2 items-end animate-fade-in">
                  <div className="w-7 h-7 rounded-full bg-primary/15 border border-primary/25 flex items-center justify-center flex-shrink-0">
                    <Brain className="w-3.5 h-3.5 text-primary" aria-hidden />
                  </div>
                  <div className="max-w-[80%] sm:max-w-[72%] px-3 py-2 rounded-2xl rounded-tl-sm bg-card/85 backdrop-blur-sm text-foreground border border-border/40 text-sm leading-relaxed typing-cursor">
                    {streamingText}
                  </div>
                </div>
              )}

              {/* Typing indicator (while waiting for first token) */}
              {isStreaming && !streamingText && (
                <div className="flex gap-2 items-end animate-fade-in">
                  <div className="w-7 h-7 rounded-full bg-primary/15 border border-primary/25 flex items-center justify-center flex-shrink-0">
                    <Loader2 className="w-3.5 h-3.5 text-primary animate-spin" aria-hidden />
                  </div>
                  <div className="bg-card/85 backdrop-blur-sm rounded-2xl rounded-tl-sm border border-border/40 px-3 py-2">
                    <div className="flex gap-1 items-center h-4">
                      <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>
        </div>
      )}

      {/* ─── Voice transcript overlay ─── */}
      {liveModeTranscript && (
        <div className="absolute bottom-24 sm:bottom-28 left-3 right-3 z-20" aria-live="polite">
          <div className="bg-card/90 backdrop-blur-sm rounded-xl px-3 py-2 border border-border/40 text-sm text-muted-foreground italic">
            &ldquo;{liveModeTranscript}&rdquo;
          </div>
        </div>
      )}

      {/* ─── Bottom Controls ─── */}
      <div className="relative z-20 mt-auto p-3 sm:p-4 space-y-3">
        {/* Text input row */}
        <form onSubmit={handleTextSend} className="flex gap-2">
          <Input
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            placeholder="Escreve uma mensagem..."
            className="flex-1 bg-card/80 backdrop-blur-sm border-border/50 text-sm h-10"
            disabled={isStreaming}
            aria-label="Mensagem para o Reborn AI"
          />
          <Button
            type="submit"
            size="icon"
            className="h-10 w-10 flex-shrink-0"
            disabled={isStreaming || !textInput.trim()}
            aria-label="Enviar mensagem"
          >
            {isStreaming ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </form>

        {/* Media controls row */}
        <div className="flex items-center justify-center gap-3 relative">
          {/* Mic button */}
          <div className="relative">
            {isMicOn && isListeningVoice && (
              <span className="absolute inset-0 rounded-full border-2 border-primary/30 animate-ping pointer-events-none" />
            )}
            <Button
              variant={isMicOn ? "default" : "destructive"}
              size="icon"
              className="h-12 w-12 rounded-full shadow-lg relative"
              onClick={onToggleMic}
              aria-label={isMicOn ? "Desligar microfone" : "Ligar microfone"}
              aria-pressed={isMicOn}
            >
              {isMicOn ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
            </Button>
          </div>

          {/* Camera button */}
          <Button
            variant={isCameraOn ? "default" : "outline"}
            size="icon"
            className="h-12 w-12 rounded-full shadow-lg"
            onClick={onToggleCamera}
            aria-label={isCameraOn ? "Desligar câmara" : "Ligar câmara"}
            aria-pressed={isCameraOn}
          >
            {isCameraOn ? <Camera className="h-5 w-5" /> : <CameraOff className="h-5 w-5" />}
          </Button>

          {/* Brand pill */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20">
            <Sparkles className="w-3.5 h-3.5 text-primary" aria-hidden />
            <span className="text-xs text-primary font-medium">Reborn AI</span>
          </div>

          {/* Stop / exit button */}
          <Button
            variant="outline"
            size="icon"
            className="h-12 w-12 rounded-full shadow-lg border-destructive/40 hover:bg-destructive hover:text-destructive-foreground"
            onClick={onStop}
            aria-label="Sair do modo live"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  )
}
