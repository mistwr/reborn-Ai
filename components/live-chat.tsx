"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport } from "ai"
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
} from "lucide-react"

// Slideshow slides showcasing Reborn AI features
const SLIDES = [
  {
    title: "Chat Inteligente",
    subtitle: "Conversa natural com IA avançada",
    icon: MessageSquare,
    gradient: "from-blue-900/80 via-blue-800/60 to-transparent",
    accent: "bg-blue-500",
  },
  {
    title: "Geração de Imagens",
    subtitle: "Cria imagens únicas com IA",
    icon: ImagePlus,
    gradient: "from-violet-900/80 via-violet-800/60 to-transparent",
    accent: "bg-violet-500",
  },
  {
    title: "WebCraft",
    subtitle: "Websites completos em segundos",
    icon: Globe,
    gradient: "from-cyan-900/80 via-cyan-800/60 to-transparent",
    accent: "bg-cyan-500",
  },
  {
    title: "Apresentações",
    subtitle: "Slides profissionais com IA",
    icon: Presentation,
    gradient: "from-emerald-900/80 via-emerald-800/60 to-transparent",
    accent: "bg-emerald-500",
  },
  {
    title: "Ebooks",
    subtitle: "Livros digitais gerados por IA",
    icon: BookOpen,
    gradient: "from-amber-900/80 via-amber-800/60 to-transparent",
    accent: "bg-amber-500",
  },
  {
    title: "Modo Live",
    subtitle: "Conversa em tempo real com câmara e voz",
    icon: Video,
    gradient: "from-rose-900/80 via-rose-800/60 to-transparent",
    accent: "bg-rose-500",
  },
  {
    title: "Reborn AI",
    subtitle: "O futuro da inteligência artificial",
    icon: Zap,
    gradient: "from-indigo-900/80 via-indigo-800/60 to-transparent",
    accent: "bg-indigo-500",
  },
]

interface LiveChatProps {
  onStop: () => void
  isCameraOn: boolean
  isMicOn: boolean
  onToggleCamera: () => void
  onToggleMic: () => void
  videoRef: React.RefObject<HTMLVideoElement>
  canvasRef: React.RefObject<HTMLCanvasElement>
}

function getMessageText(message: any): string {
  if (!message.parts || !Array.isArray(message.parts)) {
    return message.content || ""
  }
  return message.parts
    .filter((p: any): p is { type: "text"; text: string } => p.type === "text")
    .map((p: any) => p.text)
    .join("")
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
  const recognitionRef = useRef<any>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const synthRef = useRef<SpeechSynthesisUtterance | null>(null)

  const { messages, status, sendMessage } = useChat({
    transport: new DefaultChatTransport({ api: "/api/live" }),
  })

  const isStreaming = status === "streaming" || status === "submitted"

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
  }, [messages])

  // Speak AI response via TTS
  const speakResponse = useCallback((text: string) => {
    if (!text || typeof window === "undefined" || !window.speechSynthesis) return
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = "pt-PT"
    utterance.rate = 1.05
    utterance.pitch = 1
    synthRef.current = utterance
    window.speechSynthesis.speak(utterance)
  }, [])

  // Speak last AI message when it arrives
  useEffect(() => {
    const lastMsg = messages[messages.length - 1]
    if (lastMsg && lastMsg.role === "assistant" && status === "ready") {
      const text = getMessageText(lastMsg)
      if (text) speakResponse(text)
    }
  }, [messages, status, speakResponse])

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
        sendMessage({ text: transcript }, { body: { mode: "voice" } })
      }
    }

    recognition.onerror = () => {
      setIsListeningVoice(false)
      recognitionRef.current = null
    }

    recognition.onend = () => {
      if (isMicOn) {
        try { recognition.start() } catch {}
      } else {
        setIsListeningVoice(false)
        recognitionRef.current = null
      }
    }

    recognition.start()
    recognitionRef.current = recognition
    setIsListeningVoice(true)
  }, [isMicOn, sendMessage])

  const stopVoiceRecognition = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
      recognitionRef.current = null
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
    return () => {
      if (!isMicOn) stopVoiceRecognition()
    }
  }, [isMicOn, startVoiceRecognition, stopVoiceRecognition])

  // Stop TTS when component unmounts
  useEffect(() => {
    return () => {
      window.speechSynthesis?.cancel()
      stopVoiceRecognition()
    }
  }, [stopVoiceRecognition])

  const handleTextSend = (e: React.FormEvent) => {
    e.preventDefault()
    if (!textInput.trim() || isStreaming) return
    sendMessage({ text: textInput }, { body: { mode: "voice" } })
    setTextInput("")
  }

  const currentSlide = SLIDES[slideIndex]
  const SlideIcon = currentSlide.icon

  return (
    <div className="relative w-full h-full flex flex-col overflow-hidden bg-background rounded-lg">
      {/* Background Slideshow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none select-none">
        {/* Animated gradient background */}
        <div
          className={`absolute inset-0 transition-all duration-1000 ${
            slideVisible ? "opacity-100" : "opacity-0"
          }`}
          style={{
            background: `radial-gradient(ellipse at 30% 50%, oklch(0.25 0.15 ${
              [220, 270, 190, 150, 60, 10, 240][slideIndex]
            } / 0.35) 0%, transparent 60%), radial-gradient(ellipse at 70% 80%, oklch(0.15 0.1 ${
              [240, 290, 200, 160, 70, 20, 250][slideIndex]
            } / 0.2) 0%, transparent 50%)`,
          }}
        />

        {/* Subtle grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(oklch(0.65 0.22 220) 1px, transparent 1px), linear-gradient(90deg, oklch(0.65 0.22 220) 1px, transparent 1px)`,
            backgroundSize: "40px 40px",
          }}
        />

        {/* Floating orbs */}
        <div
          className={`absolute top-1/4 left-1/4 w-48 sm:w-72 h-48 sm:h-72 rounded-full blur-3xl transition-all duration-1000 ${
            slideVisible ? "opacity-20" : "opacity-0"
          }`}
          style={{
            background: `oklch(0.65 0.22 ${[220, 270, 190, 150, 60, 10, 240][slideIndex]})`,
            transform: `translate(-50%, -50%) scale(${isStreaming ? 1.2 : 1})`,
            transition: "transform 0.5s ease, opacity 1s ease",
          }}
        />
        <div
          className={`absolute bottom-1/4 right-1/4 w-32 sm:w-48 h-32 sm:h-48 rounded-full blur-3xl transition-all duration-1000 ${
            slideVisible ? "opacity-15" : "opacity-0"
          }`}
          style={{
            background: `oklch(0.6 0.18 ${[240, 290, 200, 160, 70, 20, 250][slideIndex]})`,
          }}
        />

        {/* Slide feature card - visible only when no messages */}
        {messages.length === 0 && (
          <div
            className={`absolute inset-0 flex flex-col items-center justify-center gap-4 sm:gap-6 transition-all duration-600 ${
              slideVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            }`}
          >
            {/* Icon */}
            <div
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center"
              style={{
                background: `oklch(0.65 0.22 ${[220, 270, 190, 150, 60, 10, 240][slideIndex]} / 0.2)`,
                border: `1px solid oklch(0.65 0.22 ${[220, 270, 190, 150, 60, 10, 240][slideIndex]} / 0.3)`,
              }}
            >
              <SlideIcon
                className="w-8 h-8 sm:w-10 sm:h-10"
                style={{
                  color: `oklch(0.7 0.22 ${[220, 270, 190, 150, 60, 10, 240][slideIndex]})`,
                }}
              />
            </div>

            <div className="text-center px-4">
              <h2 className="text-2xl sm:text-4xl font-bold text-foreground text-balance">
                {currentSlide.title}
              </h2>
              <p className="mt-2 text-sm sm:text-base text-muted-foreground">
                {currentSlide.subtitle}
              </p>
            </div>

            {/* Slide indicators */}
            <div className="flex gap-1.5">
              {SLIDES.map((_, i) => (
                <button
                  key={i}
                  className={`h-1 rounded-full transition-all duration-300 pointer-events-auto ${
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

            {/* CTA hint */}
            <div className="flex items-center gap-2 text-xs text-muted-foreground/60">
              <Mic className="w-3 h-3" />
              <span>Fala ou escreve para começar</span>
            </div>
          </div>
        )}
      </div>

      {/* Video feed (when camera is on) */}
      {isCameraOn && (
        <div className="absolute top-3 right-3 w-24 h-18 sm:w-36 sm:h-28 rounded-xl overflow-hidden border border-border/50 z-20 shadow-xl">
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className="w-full h-full object-cover"
          />
        </div>
      )}
      <canvas ref={canvasRef} className="hidden" />

      {/* Processing indicator */}
      {isStreaming && (
        <div className="absolute top-3 left-3 z-20 flex items-center gap-2 bg-card/80 backdrop-blur-sm rounded-full px-3 py-1.5 border border-border/50">
          <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          <span className="text-xs text-muted-foreground">A processar...</span>
        </div>
      )}

      {/* Live indicator */}
      {isMicOn && isListeningVoice && !isStreaming && (
        <div className="absolute top-3 left-3 z-20 flex items-center gap-2 bg-card/80 backdrop-blur-sm rounded-full px-3 py-1.5 border border-red-500/30">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          <span className="text-xs text-muted-foreground">Ao vivo</span>
        </div>
      )}

      {/* Messages area */}
      {messages.length > 0 && (
        <div className="relative z-10 flex-1 overflow-hidden px-3 sm:px-4 pt-12 pb-2">
          <ScrollArea className="h-full">
            <div className="space-y-3 py-2">
              {messages.map((message) => {
                const text = getMessageText(message)
                if (!text) return null
                return (
                  <div
                    key={message.id}
                    className={`flex gap-2 items-start animate-fade-in ${
                      message.role === "user" ? "flex-row-reverse" : "flex-row"
                    }`}
                  >
                    {message.role === "assistant" && (
                      <div className="w-7 h-7 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Brain className="w-3.5 h-3.5 text-primary" />
                      </div>
                    )}
                    <div
                      className={`max-w-[80%] sm:max-w-[70%] px-3 py-2 rounded-2xl text-sm leading-relaxed ${
                        message.role === "user"
                          ? "bg-primary text-primary-foreground rounded-tr-sm"
                          : "bg-card/80 backdrop-blur-sm text-foreground rounded-tl-sm border border-border/40"
                      }`}
                    >
                      {text}
                    </div>
                  </div>
                )
              })}

              {isStreaming && messages[messages.length - 1]?.role === "user" && (
                <div className="flex gap-2 items-start animate-fade-in">
                  <div className="w-7 h-7 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center flex-shrink-0">
                    <Loader2 className="w-3.5 h-3.5 text-primary animate-spin" />
                  </div>
                  <div className="bg-card/80 backdrop-blur-sm rounded-2xl rounded-tl-sm border border-border/40 px-3 py-2">
                    <div className="flex gap-1">
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

      {/* Voice transcript overlay */}
      {liveModeTranscript && (
        <div className="absolute bottom-20 sm:bottom-24 left-3 right-3 z-20">
          <div className="bg-card/90 backdrop-blur-sm rounded-xl px-3 py-2 border border-border/40 text-sm text-muted-foreground italic">
            &ldquo;{liveModeTranscript}&rdquo;
          </div>
        </div>
      )}

      {/* Bottom controls */}
      <div className="relative z-20 mt-auto p-3 sm:p-4">
        {/* Text input */}
        <form onSubmit={handleTextSend} className="flex gap-2 mb-3">
          <Input
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            placeholder="Escreve uma mensagem..."
            className="flex-1 bg-card/80 backdrop-blur-sm border-border/50 text-sm h-10"
            disabled={isStreaming}
          />
          <Button
            type="submit"
            size="icon"
            className="h-10 w-10 flex-shrink-0"
            disabled={isStreaming || !textInput.trim()}
          >
            {isStreaming ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </form>

        {/* Media controls */}
        <div className="flex items-center justify-center gap-3">
          {/* Mic toggle */}
          <Button
            variant={isMicOn ? "default" : "destructive"}
            size="icon"
            className="h-12 w-12 rounded-full shadow-lg"
            onClick={onToggleMic}
            aria-label={isMicOn ? "Desligar microfone" : "Ligar microfone"}
          >
            {isMicOn ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
          </Button>

          {/* Mic pulse animation when active */}
          {isMicOn && isListeningVoice && (
            <div className="absolute pointer-events-none">
              <div className="w-12 h-12 rounded-full border-2 border-primary/40 animate-ping" />
            </div>
          )}

          {/* Camera toggle */}
          <Button
            variant={isCameraOn ? "default" : "outline"}
            size="icon"
            className="h-12 w-12 rounded-full shadow-lg"
            onClick={onToggleCamera}
            aria-label={isCameraOn ? "Desligar câmara" : "Ligar câmara"}
          >
            {isCameraOn ? <Camera className="h-5 w-5" /> : <CameraOff className="h-5 w-5" />}
          </Button>

          {/* Sparkles indicator */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs text-primary font-medium">Reborn AI</span>
          </div>

          {/* Stop button */}
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
