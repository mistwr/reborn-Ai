"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Slider } from "@/components/ui/slider"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import {
  Mic,
  MicOff,
  Camera,
  CameraOff,
  X,
  Send,
  Loader2,
  Sparkles,
  Globe,
  ImagePlus,
  Presentation,
  BookOpen,
  MessageSquare,
  Zap,
  Video,
  Eye,
  Settings2,
  Volume2,
  VolumeX,
  User,
  Bot,
} from "lucide-react"

// ── Slides ─────────────────────────────────────────────────────────────────────
const SLIDES = [
  {
    tag: "Chat com IA",
    title: "Reborn AI",
    subtitle: "Conversa inteligente com respostas instantaneas e contexto total.",
    icon: MessageSquare,
    h1: 220,
    h2: 250,
  },
  {
    tag: "Geracao de Imagens",
    title: "Cria sem limites",
    subtitle: "Transforma qualquer ideia em imagens unicas com inteligencia artificial.",
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
    tag: "Apresentacoes",
    title: "Slides profissionais",
    subtitle: "Apresentacoes de impacto criadas em segundos, prontas a usar.",
    icon: Presentation,
    h1: 150,
    h2: 170,
  },
  {
    tag: "Ebooks & Conteudo",
    title: "Publica o teu livro",
    subtitle: "Livros digitais completos e artigos profissionais escritos por IA.",
    icon: BookOpen,
    h1: 50,
    h2: 30,
  },
  {
    tag: "Visao AI",
    title: "Ve e entende tudo",
    subtitle: "OCR, analise de imagens, PDFs e documentos em segundos.",
    icon: Eye,
    h1: 130,
    h2: 160,
  },
  {
    tag: "Modo Live",
    title: "Ao vivo contigo",
    subtitle: "Camara, voz e inteligencia artificial em conversa real e continua.",
    icon: Video,
    h1: 10,
    h2: 340,
  },
  {
    tag: "Inteligencia Total",
    title: "O futuro e agora",
    subtitle: "Uma plataforma completa. Infinitas possibilidades. Zero limites.",
    icon: Zap,
    h1: 240,
    h2: 280,
  },
]

// Voice options for TTS
const VOICE_PERSONALITIES = [
  { id: "neutral", name: "Neutro", pitch: 1, rate: 1 },
  { id: "friendly", name: "Amigavel", pitch: 1.1, rate: 1.05 },
  { id: "professional", name: "Profissional", pitch: 0.95, rate: 0.95 },
  { id: "energetic", name: "Energetico", pitch: 1.15, rate: 1.1 },
  { id: "calm", name: "Calmo", pitch: 0.9, rate: 0.85 },
]

type ChatMessage = {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: Date
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
  // ── UI State ──
  const [slideIndex, setSlideIndex] = useState(0)
  const [slideVisible, setSlideVisible] = useState(true)
  const [textInput, setTextInput] = useState("")
  const [showSettings, setShowSettings] = useState(false)
  
  // ── Chat State ──
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamingText, setStreamingText] = useState("")
  
  // ── Voice State ──
  const [transcript, setTranscript] = useState("")
  const [isListening, setIsListening] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [voiceEnabled, setVoiceEnabled] = useState(true)
  
  // ── Personalization State ──
  const [voicePersonality, setVoicePersonality] = useState("friendly")
  const [voiceSpeed, setVoiceSpeed] = useState(1)
  const [voicePitch, setVoicePitch] = useState(1)
  const [autoListen, setAutoListen] = useState(true)
  const [userName, setUserName] = useState("")

  // ── Refs ──
  const videoRef = useRef<HTMLVideoElement>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const recognitionRef = useRef<any>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)
  const speakingRef = useRef(false)
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null)
  const lastTranscriptRef = useRef("")

  const hasMessages = messages.length > 0 || !!streamingText
  const slide = SLIDES[slideIndex]
  const SlideIcon = slide.icon

  // ── Slideshow ────────────────────────────────────────────────────────────
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
  }, [isCameraOn, isActive, onToggleCamera])

  // ── Cleanup on unmount ────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      mediaStreamRef.current?.getTracks().forEach((t) => t.stop())
      mediaStreamRef.current = null
      window.speechSynthesis?.cancel()
      stopVoice()
      abortRef.current?.abort()
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current)
    }
  }, [])

  // ── Scroll ────────────────────────────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, streamingText])

  // ── Get voice personality settings ────────────────────────────────────────
  const getVoiceSettings = useCallback(() => {
    const personality = VOICE_PERSONALITIES.find(v => v.id === voicePersonality) || VOICE_PERSONALITIES[1]
    return {
      pitch: voicePitch * personality.pitch,
      rate: voiceSpeed * personality.rate,
    }
  }, [voicePersonality, voicePitch, voiceSpeed])

  // ── TTS with echo prevention ──────────────────────────────────────────────
  const speak = useCallback((text: string) => {
    if (!text || !window.speechSynthesis || !voiceEnabled) return
    
    // Stop listening while speaking to prevent echo
    stopVoice()
    speakingRef.current = true
    setIsSpeaking(true)
    
    window.speechSynthesis.cancel()
    
    // Clean text for speech
    const cleanText = text
      .replace(/```[\s\S]*?```/g, " codigo ") // Replace code blocks
      .replace(/[*_#`]/g, "") // Remove markdown
      .replace(/https?:\/\/\S+/g, " link ") // Replace URLs
      .slice(0, 800) // Limit length
    
    const utterance = new SpeechSynthesisUtterance(cleanText)
    utterance.lang = "pt-PT"
    
    const settings = getVoiceSettings()
    utterance.rate = settings.rate
    utterance.pitch = settings.pitch
    
    // Select Portuguese voice if available
    const voices = window.speechSynthesis.getVoices()
    const ptVoice = voices.find(v => v.lang.startsWith("pt")) || voices[0]
    if (ptVoice) utterance.voice = ptVoice
    
    utterance.onend = () => {
      speakingRef.current = false
      setIsSpeaking(false)
      // Resume listening after speech ends (with delay to prevent echo)
      if (autoListen && isMicOn && isActive) {
        setTimeout(() => {
          if (!speakingRef.current) {
            startVoice()
          }
        }, 500)
      }
    }
    
    utterance.onerror = () => {
      speakingRef.current = false
      setIsSpeaking(false)
    }
    
    window.speechSynthesis.speak(utterance)
  }, [voiceEnabled, getVoiceSettings, autoListen, isMicOn, isActive])

  // ── Stop Voice Recognition ────────────────────────────────────────────────
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
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current)
      silenceTimerRef.current = null
    }
  }, [])

  // ── Send to AI ────────────────────────────────────────────────────────────
  const sendToAI = useCallback(
    async (userText: string) => {
      if (!userText.trim() || isStreaming) return
      
      // Stop listening while processing
      stopVoice()
      
      const msg: ChatMessage = { 
        id: Date.now().toString(), 
        role: "user", 
        content: userText.trim(),
        timestamp: new Date()
      }
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
            conversationHistory: history.slice(-10), // Limit history
            mode: isCameraOn ? "both" : "voice",
            userName: userName || undefined,
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
        
        const assistantMsg: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: full,
          timestamp: new Date()
        }
        setMessages((prev) => [...prev, assistantMsg])
        setStreamingText("")
        
        // Speak response
        speak(full)
        
      } catch (e: any) {
        if (e?.name !== "AbortError") {
          setMessages((prev) => [
            ...prev,
            {
              id: (Date.now() + 1).toString(),
              role: "assistant",
              content: "Desculpa, ocorreu um erro. Tenta novamente.",
              timestamp: new Date()
            },
          ])
          setStreamingText("")
        }
      } finally {
        setIsStreaming(false)
        abortRef.current = null
      }
    },
    [isStreaming, messages, isCameraOn, speak, stopVoice, userName],
  )

  // ── Start Voice Recognition with silence detection ────────────────────────
  const startVoice = useCallback(() => {
    // Don't start if AI is speaking (prevents echo)
    if (speakingRef.current || isSpeaking) return
    if (!("webkitSpeechRecognition" in window) && !("SpeechRecognition" in window)) return
    if (recognitionRef.current) return
    
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    const r = new SR()
    r.continuous = false // Changed to false to prevent continuous listening
    r.interimResults = true
    r.lang = "pt-PT"
    
    let finalTranscript = ""
    
    r.onresult = (e: any) => {
      let interim = ""
      finalTranscript = ""
      
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const result = e.results[i]
        if (result.isFinal) {
          finalTranscript += result[0].transcript
        } else {
          interim += result[0].transcript
        }
      }
      
      setTranscript(interim || finalTranscript)
      
      // Reset silence timer on new speech
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current)
      }
      
      // If we have final transcript, send it
      if (finalTranscript.trim()) {
        // Prevent duplicate sends
        if (finalTranscript.trim() !== lastTranscriptRef.current) {
          lastTranscriptRef.current = finalTranscript.trim()
          setTranscript("")
          sendToAI(finalTranscript)
        }
      }
    }
    
    r.onerror = (e: any) => {
      if (e.error !== "no-speech" && e.error !== "aborted") {
        console.error("[v0] Speech error:", e.error)
      }
      setIsListening(false)
      recognitionRef.current = null
    }
    
    r.onend = () => {
      recognitionRef.current = null
      setIsListening(false)
      
      // Auto-restart if conditions are met
      if (autoListen && isMicOn && isActive && !speakingRef.current && !isStreaming) {
        setTimeout(() => {
          if (!speakingRef.current && !isStreaming) {
            startVoice()
          }
        }, 300)
      }
    }
    
    try {
      r.start()
      recognitionRef.current = r
      setIsListening(true)
      lastTranscriptRef.current = ""
    } catch (err) {
      console.error("[v0] Failed to start recognition:", err)
    }
  }, [isSpeaking, autoListen, isMicOn, isActive, isStreaming, sendToAI])

  // ── Toggle Voice ──────────────────────────────────────────────────────────
  const toggleVoice = useCallback(() => {
    if (isListening) {
      stopVoice()
    } else {
      startVoice()
    }
  }, [isListening, stopVoice, startVoice])

  // ── Auto-start voice when mic is enabled ──────────────────────────────────
  useEffect(() => {
    if (isActive && isMicOn && autoListen && !isListening && !speakingRef.current && !isStreaming) {
      const timer = setTimeout(() => {
        if (!speakingRef.current && !isStreaming) {
          startVoice()
        }
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [isActive, isMicOn, autoListen, isListening, isStreaming, startVoice])

  // ── Handle text submit ────────────────────────────────────────────────────
  const handleTextSubmit = (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!textInput.trim() || isStreaming) return
    sendToAI(textInput.trim())
    setTextInput("")
  }

  // ── Format time ───────────────────────────────────────────────────────────
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" })
  }

  return (
    <div className="relative w-full h-full flex flex-col overflow-hidden bg-gradient-to-br from-zinc-950 via-zinc-900 to-black">
      {/* ── Animated Background ── */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute w-[500px] h-[500px] rounded-full blur-[120px] opacity-20 transition-all duration-[2000ms]"
          style={{
            background: `linear-gradient(135deg, hsl(${slide.h1}, 80%, 50%), hsl(${slide.h2}, 70%, 40%))`,
            top: "10%",
            left: "60%",
            transform: "translate(-50%, -50%)",
          }}
        />
        <div
          className="absolute w-[400px] h-[400px] rounded-full blur-[100px] opacity-15 transition-all duration-[2500ms]"
          style={{
            background: `linear-gradient(225deg, hsl(${slide.h2}, 70%, 45%), hsl(${slide.h1}, 60%, 35%))`,
            bottom: "20%",
            right: "10%",
          }}
        />
      </div>

      {/* ── Top Bar ── */}
      <div className="relative z-10 flex items-center justify-between px-4 py-3 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-violet-600 flex items-center justify-center shadow-lg shadow-primary/30">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-white font-bold text-lg leading-none">Modo Live</h1>
            <p className="text-zinc-500 text-xs mt-0.5">
              {isActive ? (isSpeaking ? "A falar..." : isListening ? "A ouvir..." : "Ativo") : "Inativo"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowSettings(!showSettings)}
            className="h-9 w-9 text-zinc-400 hover:text-white hover:bg-white/10"
          >
            <Settings2 className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onStop}
            className="h-9 w-9 text-zinc-400 hover:text-red-400 hover:bg-red-500/10"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* ── Settings Panel ── */}
      {showSettings && (
        <div className="relative z-20 bg-zinc-900/95 backdrop-blur-xl border-b border-white/5 p-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Voice Personality */}
            <div className="space-y-2">
              <Label className="text-xs text-zinc-400">Personalidade da Voz</Label>
              <Select value={voicePersonality} onValueChange={setVoicePersonality}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {VOICE_PERSONALITIES.map(v => (
                    <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* Voice Speed */}
            <div className="space-y-2">
              <Label className="text-xs text-zinc-400">Velocidade: {voiceSpeed.toFixed(1)}x</Label>
              <Slider
                value={[voiceSpeed]}
                onValueChange={([v]) => setVoiceSpeed(v)}
                min={0.5}
                max={1.5}
                step={0.1}
                className="py-2"
              />
            </div>
            
            {/* Voice Pitch */}
            <div className="space-y-2">
              <Label className="text-xs text-zinc-400">Tom: {voicePitch.toFixed(1)}</Label>
              <Slider
                value={[voicePitch]}
                onValueChange={([v]) => setVoicePitch(v)}
                min={0.5}
                max={1.5}
                step={0.1}
                className="py-2"
              />
            </div>
            
            {/* User Name */}
            <div className="space-y-2">
              <Label className="text-xs text-zinc-400">O teu nome (opcional)</Label>
              <Input
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="Como queres ser chamado?"
                className="bg-white/5 border-white/10 text-white placeholder:text-zinc-600"
              />
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-6 pt-2 border-t border-white/5">
            <div className="flex items-center gap-2">
              <Switch checked={voiceEnabled} onCheckedChange={setVoiceEnabled} />
              <Label className="text-xs text-zinc-400">Voz ativa</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={autoListen} onCheckedChange={setAutoListen} />
              <Label className="text-xs text-zinc-400">Ouvir automaticamente</Label>
            </div>
          </div>
        </div>
      )}

      {/* ── Main Content ── */}
      <div className="flex-1 min-h-0 flex flex-col lg:flex-row">
        {/* ── Left: Video/Slideshow ── */}
        <div className="lg:w-1/2 h-48 sm:h-64 lg:h-full relative flex items-center justify-center bg-black/20">
          {isActive && isCameraOn ? (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="absolute inset-0 w-full h-full object-cover"
            />
          ) : (
            <div
              className={`flex flex-col items-center justify-center text-center px-6 transition-all duration-500 ${
                slideVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
              }`}
            >
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-violet-600/20 flex items-center justify-center mb-4 border border-white/10">
                <SlideIcon className="h-8 w-8 text-primary" />
              </div>
              <span className="text-xs font-medium text-primary/80 uppercase tracking-wider mb-2">
                {slide.tag}
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">{slide.title}</h2>
              <p className="text-zinc-400 text-sm max-w-md">{slide.subtitle}</p>
            </div>
          )}
          
          {/* Speaking/Listening indicator */}
          {isActive && (
            <div className="absolute bottom-4 left-4 right-4 flex justify-center">
              <div className={`flex items-center gap-2 px-4 py-2 rounded-full backdrop-blur-md transition-all ${
                isSpeaking 
                  ? "bg-violet-500/20 border border-violet-500/30" 
                  : isListening 
                    ? "bg-emerald-500/20 border border-emerald-500/30"
                    : "bg-white/5 border border-white/10"
              }`}>
                {isSpeaking ? (
                  <>
                    <Volume2 className="h-4 w-4 text-violet-400 animate-pulse" />
                    <span className="text-xs text-violet-300">Reborn AI a falar...</span>
                  </>
                ) : isListening ? (
                  <>
                    <Mic className="h-4 w-4 text-emerald-400 animate-pulse" />
                    <span className="text-xs text-emerald-300">
                      {transcript || "A ouvir..."}
                    </span>
                  </>
                ) : (
                  <>
                    <MicOff className="h-4 w-4 text-zinc-500" />
                    <span className="text-xs text-zinc-500">Microfone pausado</span>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── Right: Chat ── */}
        <div className="flex-1 lg:w-1/2 flex flex-col min-h-0 border-l border-white/5">
          {/* Messages */}
          <ScrollArea className="flex-1 min-h-0">
            <div className="p-4 space-y-4">
              {!hasMessages ? (
                <div className="flex flex-col items-center justify-center h-full min-h-[200px] text-center px-4">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/10 to-violet-600/10 flex items-center justify-center mb-4 border border-white/5">
                    <MessageSquare className="h-7 w-7 text-primary/60" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-1">
                    {userName ? `Ola, ${userName}!` : "Ola!"}
                  </h3>
                  <p className="text-zinc-500 text-sm max-w-sm">
                    {isActive 
                      ? "Estou a ouvir. Fala comigo ou escreve uma mensagem."
                      : "Ativa o modo live para comecarmos a conversar."}
                  </p>
                </div>
              ) : (
                <>
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
                    >
                      <div className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${
                        msg.role === "user" 
                          ? "bg-primary/20" 
                          : "bg-gradient-to-br from-violet-500/20 to-primary/20"
                      }`}>
                        {msg.role === "user" ? (
                          <User className="h-4 w-4 text-primary" />
                        ) : (
                          <Bot className="h-4 w-4 text-violet-400" />
                        )}
                      </div>
                      <div className={`flex-1 max-w-[80%] ${msg.role === "user" ? "text-right" : ""}`}>
                        <div className={`inline-block px-4 py-2.5 rounded-2xl ${
                          msg.role === "user"
                            ? "bg-primary text-primary-foreground rounded-tr-sm"
                            : "bg-white/5 text-white rounded-tl-sm"
                        }`}>
                          <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                        </div>
                        <p className="text-[10px] text-zinc-600 mt-1 px-1">
                          {formatTime(msg.timestamp)}
                        </p>
                      </div>
                    </div>
                  ))}
                  
                  {/* Streaming message */}
                  {streamingText && (
                    <div className="flex gap-3">
                      <div className="shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500/20 to-primary/20 flex items-center justify-center">
                        <Bot className="h-4 w-4 text-violet-400" />
                      </div>
                      <div className="flex-1 max-w-[80%]">
                        <div className="inline-block px-4 py-2.5 rounded-2xl rounded-tl-sm bg-white/5 text-white">
                          <p className="text-sm whitespace-pre-wrap">{streamingText}</p>
                          <span className="inline-block w-2 h-4 bg-primary/60 animate-pulse ml-0.5" />
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {/* Input area */}
          <div className="p-4 border-t border-white/5 bg-zinc-900/50">
            <form onSubmit={handleTextSubmit} className="flex gap-2">
              <div className="flex-1 relative">
                <Input
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  placeholder={isActive ? "Escreve ou fala..." : "Ativa o modo live para comecar"}
                  disabled={!isActive || isStreaming}
                  className="bg-white/5 border-white/10 text-white placeholder:text-zinc-600 pr-20"
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setVoiceEnabled(!voiceEnabled)}
                    disabled={!isActive}
                    className="h-7 w-7 text-zinc-500 hover:text-white"
                  >
                    {voiceEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={toggleVoice}
                    disabled={!isActive || !isMicOn || isSpeaking}
                    className={`h-7 w-7 ${isListening ? "text-emerald-400" : "text-zinc-500 hover:text-white"}`}
                  >
                    {isListening ? <Mic className="h-4 w-4 animate-pulse" /> : <MicOff className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              <Button
                type="submit"
                disabled={!isActive || isStreaming || !textInput.trim()}
                className="bg-primary hover:bg-primary/90"
              >
                {isStreaming ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </form>
          </div>
        </div>
      </div>

      {/* ── Bottom Controls ── */}
      <div className="relative z-10 flex items-center justify-center gap-3 px-4 py-4 border-t border-white/5 bg-zinc-950/80 backdrop-blur-xl">
        <Button
          variant="outline"
          size="icon"
          onClick={onToggleMic}
          disabled={!isActive}
          className={`h-12 w-12 rounded-full border-2 transition-all ${
            isMicOn && isActive
              ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/30"
              : "bg-white/5 border-white/10 text-zinc-500 hover:text-white"
          }`}
        >
          {isMicOn ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
        </Button>
        
        <Button
          onClick={isActive ? onStop : onStart}
          className={`h-14 px-8 rounded-full font-semibold text-base transition-all ${
            isActive
              ? "bg-red-500 hover:bg-red-600 text-white"
              : "bg-gradient-to-r from-primary to-violet-600 hover:opacity-90 text-white shadow-lg shadow-primary/30"
          }`}
        >
          {isActive ? "Terminar" : "Iniciar Live"}
        </Button>
        
        <Button
          variant="outline"
          size="icon"
          onClick={onToggleCamera}
          disabled={!isActive}
          className={`h-12 w-12 rounded-full border-2 transition-all ${
            isCameraOn && isActive
              ? "bg-blue-500/20 border-blue-500/50 text-blue-400 hover:bg-blue-500/30"
              : "bg-white/5 border-white/10 text-zinc-500 hover:text-white"
          }`}
        >
          {isCameraOn ? <Camera className="h-5 w-5" /> : <CameraOff className="h-5 w-5" />}
        </Button>
      </div>
    </div>
  )
}
