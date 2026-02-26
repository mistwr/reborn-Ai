"use client"

import { Calendar } from "@/components/ui/calendar"
import { AuthModal } from "@/components/auth-modal"
import { GDPRBanner } from "@/components/gdpr-banner"
import { useSession, signOut } from "next-auth/react"

import type React from "react"

import { useState, useRef, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { WebCraftProTab } from "@/components/pro/webcraft-pro-tab"
import { ImageGeneratorProTab } from "@/components/pro/image-generator-pro-tab"
import { CliperAITab } from "@/components/pro/clipper-ai-tab"
import { GlobalExportTab } from "@/components/pro/global-export-tab"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Label } from "@/components/ui/label"
import {
  MessageSquare,
  ImagePlus,
  Globe,
  Presentation,
  BookOpen,
  Plus,
  Send,
  X,
  Mic,
  MicOff,
  Volume2,
  Download,
  Play,
  Maximize2,
  Layout,
  Smartphone,
  Monitor,
  Eye,
  Loader2,
  Sparkles,
  Trash2,
  Video,
  Camera,
  CameraOff,
  Settings,
  Zap,
  Search,
  MessageCircleIcon,
  Scissors,
  Megaphone,
  Crown,
  Instagram,
  Twitter,
  Facebook,
  Linkedin,
  Youtube,
  ImageIcon,
  Square,
  Star,
  Heart,
  Hexagon,
  Bot,
  User,
  Rocket,
  Store,
  Utensils,
  Briefcase,
  GraduationCap,
  Building,
  FileText,
  Users,
  Mail,
  Menu,
  Brain,
  VolumeX,
  Share2,
  MessageCircle,
  Check,
  Edit3,
} from "lucide-react"
import ReactMarkdown from "react-markdown"
import * as XLSX from "xlsx"

// Business categories for WebCraft
const BUSINESS_CATEGORIES = [
  { id: "startup", name: "Startup / SaaS", icon: Rocket, description: "Landing pages modernas para startups" },
  { id: "ecommerce", name: "E-Commerce", icon: Store, description: "Lojas online completas" },
  { id: "restaurant", name: "Restaurante", icon: Utensils, description: "Menus e reservas online" },
  { id: "portfolio", name: "Portfolio", icon: Briefcase, description: "Mostre o seu trabalho" },
  { id: "services", name: "Serviços", icon: Settings, description: "Empresas de serviços" },
  { id: "health", name: "Saúde", icon: Heart, description: "Clínicas e profissionais" },
  { id: "education", name: "Educação", icon: GraduationCap, description: "Cursos e escolas" },
  { id: "realestate", name: "Imobiliária", icon: Building, description: "Imóveis e agências" },
  { id: "events", name: "Eventos", icon: Calendar, description: "Casamentos e festas" },
  { id: "blog", name: "Blog", icon: FileText, description: "Blogs e revistas" },
  { id: "agency", name: "Agência", icon: Users, description: "Agências criativas" },
  { id: "fitness", name: "Fitness", icon: Zap, description: "Ginásios e personal trainers" },
]

// Templates for each category
const TEMPLATES_BY_CATEGORY: Record<string, { id: string; name: string; preview: string }[]> = {
  startup: [
    { id: "startup-modern", name: "Modern SaaS", preview: "Minimalista com gradientes" },
    { id: "startup-bold", name: "Bold Launch", preview: "Cores vibrantes e CTAs fortes" },
    { id: "startup-clean", name: "Clean Tech", preview: "Layout limpo e profissional" },
    { id: "startup-dark", name: "Dark Mode", preview: "Tema escuro elegante" },
  ],
  ecommerce: [
    { id: "ecom-fashion", name: "Fashion Store", preview: "Para moda e acessórios" },
    { id: "ecom-tech", name: "Tech Shop", preview: "Produtos tecnológicos" },
    { id: "ecom-minimal", name: "Minimal Shop", preview: "Design minimalista" },
    { id: "ecom-luxury", name: "Luxury Brand", preview: "Marcas premium" },
  ],
  restaurant: [
    { id: "resto-elegant", name: "Fine Dining", preview: "Restaurantes elegantes" },
    { id: "resto-casual", name: "Casual Eats", preview: "Restaurantes casuais" },
    { id: "resto-cafe", name: "Coffee Shop", preview: "Cafés e padarias" },
    { id: "resto-fastfood", name: "Fast Food", preview: "Comida rápida" },
  ],
  portfolio: [
    { id: "folio-creative", name: "Creative", preview: "Para criativos e designers" },
    { id: "folio-developer", name: "Developer", preview: "Para programadores" },
    { id: "folio-photo", name: "Photography", preview: "Para fotógrafos" },
    { id: "folio-minimal", name: "Minimal", preview: "Ultra minimalista" },
  ],
  services: [
    { id: "serv-consulting", name: "Consulting", preview: "Consultoria empresarial" },
    { id: "serv-legal", name: "Legal", preview: "Advogados e escritórios" },
    { id: "serv-finance", name: "Finance", preview: "Serviços financeiros" },
    { id: "serv-marketing", name: "Marketing", preview: "Agências de marketing" },
  ],
  health: [
    { id: "health-clinic", name: "Medical Clinic", preview: "Clínicas médicas" },
    { id: "health-dental", name: "Dental", preview: "Dentistas" },
    { id: "health-wellness", name: "Wellness", preview: "Bem-estar e spa" },
    { id: "health-therapy", name: "Therapy", preview: "Terapeutas e psicólogos" },
  ],
  education: [
    { id: "edu-school", name: "School", preview: "Escolas e colégios" },
    { id: "edu-course", name: "Online Course", preview: "Cursos online" },
    { id: "edu-tutor", name: "Tutoring", preview: "Explicações" },
    { id: "edu-university", name: "University", preview: "Universidades" },
  ],
  realestate: [
    { id: "real-agency", name: "Agency", preview: "Imobiliárias" },
    { id: "real-luxury", name: "Luxury Homes", preview: "Imóveis de luxo" },
    { id: "real-rental", name: "Rentals", preview: "Arrendamentos" },
    { id: "real-commercial", name: "Commercial", preview: "Imóveis comerciais" },
  ],
  events: [
    { id: "event-wedding", name: "Wedding", preview: "Casamentos" },
    { id: "event-corporate", name: "Corporate", preview: "Eventos corporativos" },
    { id: "event-party", name: "Party", preview: "Festas e celebrações" },
    { id: "event-conference", name: "Conference", preview: "Conferências" },
  ],
  blog: [
    { id: "blog-personal", name: "Personal", preview: "Blog pessoal" },
    { id: "blog-magazine", name: "Magazine", preview: "Revista online" },
    { id: "blog-tech", name: "Tech Blog", preview: "Blog de tecnologia" },
    { id: "blog-lifestyle", name: "Lifestyle", preview: "Estilo de vida" },
  ],
  agency: [
    { id: "agency-creative", name: "Creative Agency", preview: "Agências criativas" },
    { id: "agency-digital", name: "Digital Agency", preview: "Marketing digital" },
    { id: "agency-design", name: "Design Studio", preview: "Estúdios de design" },
    { id: "agency-branding", name: "Branding", preview: "Agências de branding" },
  ],
  fitness: [
    { id: "fit-gym", name: "Gym", preview: "Ginásios" },
    { id: "fit-personal", name: "Personal Trainer", preview: "Personal trainers" },
    { id: "fit-yoga", name: "Yoga Studio", preview: "Estúdios de yoga" },
    { id: "fit-sports", name: "Sports Club", preview: "Clubes desportivos" },
  ],
}

// Color palettes
const COLOR_PALETTES = [
  { id: "blue", name: "Azul Profissional", primary: "#2563eb", secondary: "#1e40af", accent: "#60a5fa", bg: "#f8fafc" },
  { id: "green", name: "Verde Natural", primary: "#059669", secondary: "#047857", accent: "#34d399", bg: "#f0fdf4" },
  { id: "purple", name: "Roxo Criativo", primary: "#7c3aed", secondary: "#6d28d9", accent: "#a78bfa", bg: "#faf5ff" },
  {
    id: "orange",
    name: "Laranja Energético",
    primary: "#ea580c",
    secondary: "#c2410c",
    accent: "#fb923c",
    bg: "#fff7ed",
  },
  { id: "red", name: "Vermelho Bold", primary: "#dc2626", secondary: "#b91c1c", accent: "#f87171", bg: "#fef2f2" },
  { id: "teal", name: "Teal Moderno", primary: "#0d9488", secondary: "#0f766e", accent: "#2dd4bf", bg: "#f0fdfa" },
  { id: "pink", name: "Rosa Elegante", primary: "#db2777", secondary: "#be185d", accent: "#f472b6", bg: "#fdf2f8" },
  { id: "dark", name: "Dark Mode", primary: "#e2e8f0", secondary: "#cbd5e1", accent: "#818cf8", bg: "#0f172a" },
  { id: "minimal", name: "Minimalista", primary: "#171717", secondary: "#404040", accent: "#737373", bg: "#ffffff" },
  { id: "gold", name: "Dourado Premium", primary: "#b45309", secondary: "#92400e", accent: "#fbbf24", bg: "#fffbeb" },
]

// Website features/sections
const WEBSITE_FEATURES = [
  { id: "hero", name: "Hero Section", icon: Layout },
  { id: "about", name: "Sobre Nós", icon: Users },
  { id: "services", name: "Serviços", icon: Settings },
  { id: "portfolio", name: "Portfolio", icon: Briefcase },
  { id: "testimonials", name: "Testemunhos", icon: Star },
  { id: "pricing", name: "Preços", icon: Zap },
  { id: "team", name: "Equipa", icon: Users },
  { id: "blog", name: "Blog", icon: FileText },
  { id: "gallery", name: "Galeria", icon: ImagePlus },
  { id: "contact", name: "Contacto", icon: Mail },
  { id: "faq", name: "FAQ", icon: MessageSquare },
  { id: "chatbot", name: "Chatbot", icon: Bot },
  { id: "newsletter", name: "Newsletter", icon: Send },
  { id: "map", name: "Mapa", icon: Globe },
]

// Presentation templates
const PRESENTATION_TEMPLATES = [
  { id: "modern", name: "Moderno", description: "Design limpo e atual" },
  { id: "corporate", name: "Corporativo", description: "Profissional e formal" },
  { id: "creative", name: "Criativo", description: "Colorido e dinâmico" },
  { id: "minimal", name: "Minimalista", description: "Simples e elegante" },
  { id: "dark", name: "Escuro", description: "Tema dark sofisticado" },
  { id: "gradient", name: "Gradiente", description: "Cores em gradiente" },
  { id: "ocean", name: "Oceano", description: "Tons azuis relaxantes" },
  { id: "sunset", name: "Pôr do Sol", description: "Tons quentes vibrantes" },
  { id: "nature", name: "Natureza", description: "Verde e orgânico" },
  { id: "tech", name: "Tecnologia", description: "Futurista e moderno" },
  { id: "elegant", name: "Elegante", description: "Luxo e sofisticação" },
  { id: "playful", name: "Divertido", description: "Alegre e colorido" },
]

// Ebook styles
const EBOOK_STYLES = [
  { id: "modern", name: "Moderno", description: "Tipografia contemporânea" },
  { id: "classic", name: "Clássico", description: "Estilo livro tradicional" },
  { id: "minimal", name: "Minimalista", description: "Foco no conteúdo" },
  { id: "dark", name: "Dark Mode", description: "Leitura noturna" },
  { id: "nature", name: "Natureza", description: "Verde e orgânico" },
  { id: "ocean", name: "Oceano", description: "Azul e refrescante" },
  { id: "sunset", name: "Pôr do Sol", description: "Tons quentes" },
  { id: "royal", name: "Real", description: "Roxo elegante" },
  { id: "tech", name: "Tech", description: "Estilo programador" },
  { id: "vintage", name: "Vintage", description: "Retro e nostálgico" },
  { id: "neon", name: "Neon", description: "Vibrante e moderno" },
  { id: "magazine", name: "Revista", description: "Editorial profissional" },
]

type Message = {
  id?: string
  role: "user" | "assistant"
  content: string
  image?: string
}

type ChatHistory = {
  id: string
  title: string
  messages: Message[]
  timestamp: number
}

interface Contact {
  name: string
  phone: string
}

interface UserPreferences {
  style?: string
  language?: string
  expertise?: string
  enableSearch?: boolean
}

interface LiveModeState {
  isActive: boolean
  isMicOn: boolean
  isCameraOn: boolean
  isProcessing: boolean
  transcript: string
  response: string
}

export default function RebornAI() {
  // Chat state
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [selectedImage, setSelectedImage] = useState<string | null>(null) // Renamed from attachedImage

  // Voice state
  const [isListening, setIsListening] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)

  // UI state
  const [sidebarOpen, setSidebarOpen] = useState(false) // Update sidebar to start closed on mobile
  const [activeTab, setActiveTab] = useState("chat") // Changed from activeMode to activeTab for clarity

  // Chat history
  const [chatHistories, setChatHistories] = useState<ChatHistory[]>([])
  const [currentChatId, setCurrentChatId] = useState<string>("") // Changed from null to string for consistency

  // Image generation state
  const [imagePrompt, setImagePrompt] = useState("")
  const [generatedImage, setGeneratedImage] = useState<string | null>(null)
  const [isGeneratingImage, setIsGeneratingImage] = useState(false)

  // WebCraft state
  const [showWebCraft, setShowWebCraft] = useState(false)
  const [websitePrompt, setWebsitePrompt] = useState("")
  const [generatedWebsite, setGeneratedWebsite] = useState<string | null>(null)
  const [editMode, setEditMode] = useState(false)
  const [editableHtml, setEditableHtml] = useState("")
  const [uploadedImages, setUploadedImages] = useState<{ id: string; dataUrl: string; name: string }[]>([])
  // </CHANGE>
  const [isGeneratingWebsite, setIsGeneratingWebsite] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState("startup")
  const [selectedTemplate, setSelectedTemplate] = useState("modern")
  const [selectedColorScheme, setSelectedColorScheme] = useState("blue")
  const [businessName, setBusinessName] = useState("")
  const [businessContact, setBusinessContact] = useState("")
  const [selectedSections, setSelectedSections] = useState<string[]>(["hero", "features", "cta"])

  // Presentation state
  const [presentationPrompt, setPresentationPrompt] = useState("")
  const [generatedPresentation, setGeneratedPresentation] = useState<string | null>(null)
  const [isGeneratingPresentation, setIsGeneratingPresentation] = useState(false)
  const [presentationTemplate, setPresentationTemplate] = useState("modern")
  const [slideCount, setSlideCount] = useState(5)

  // Ebook state
  const [ebookPrompt, setEbookPrompt] = useState("")
  const [generatedEbook, setGeneratedEbook] = useState<string | null>(null)
  const [isGeneratingEbook, setIsGeneratingEbook] = useState(false)
  const [ebookStyle, setEbookStyle] = useState("modern")
  const [chapterCount, setChapterCount] = useState(5)

  // Marketing state
  const [marketingType, setMarketingType] = useState<"post" | "banner" | "story" | "thumbnail" | "logo">("post")
  const [marketingPlatform, setMarketingPlatform] = useState<
    "instagram" | "facebook" | "twitter" | "linkedin" | "youtube" | "tiktok"
  >("instagram")
  const [marketingText, setMarketingText] = useState("")
  const [marketingStyle, setMarketingStyle] = useState<
    "minimal" | "bold" | "elegant" | "playful" | "corporate" | "neon"
  >("minimal")
  const [marketingColor, setMarketingColor] = useState("#6366f1")
  const [generatedMarketing, setGeneratedMarketing] = useState<string | null>(null)
  const [isGeneratingMarketing, setIsGeneratingMarketing] = useState(false)

  const [enableSearch, setEnableSearch] = useState(true)
  const [userPreferences, setUserPreferences] = useState<UserPreferences>({
    style: "detailed",
    language: "pt",
    expertise: "intermediate",
    enableSearch: true,
  })
  const [showSettings, setShowSettings] = useState(false)

  // Live Mode state
  const [liveMode, setLiveMode] = useState<LiveModeState | null>(null) // Initialize as null
  const [liveHistory, setLiveHistory] = useState<Array<{ role: string; content: string }>>([])
  const [liveModeTranscript, setLiveModeTranscript] = useState("") // Add state for live mode transcript

  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const recognitionRef = useRef<any>(null)
  const liveIntervalRef = useRef<NodeJS.Timeout | null>(null)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { data: session } = useSession()
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [showProModal, setShowProModal] = useState(false)
  const [isPro, setIsPro] = useState(false) // Assume not Pro initially, you'd likely fetch this from user data

  const startLiveMode = async () => {
    try {
      // Request camera and microphone
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      })

      mediaStreamRef.current = stream

      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }

      setLiveMode({
        isActive: true,
        isMicOn: true,
        isCameraOn: true,
        isProcessing: false,
        transcript: "",
        response: "",
      })

      // Start speech recognition
      startLiveRecognition()

      // Start periodic frame analysis
      startFrameAnalysis()
    } catch (error) {
      console.error("Error starting live mode:", error)
      alert("Erro ao aceder à câmara/microfone. Verifique as permissões.")
    }
  }

  const stopLiveMode = () => {
    // Stop media stream
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop())
      mediaStreamRef.current = null
    }

    // Stop recognition
    if (recognitionRef.current) {
      recognitionRef.current.stop()
      recognitionRef.current = null // Clear ref
    }

    // Stop frame analysis
    if (liveIntervalRef.current) {
      clearInterval(liveIntervalRef.current)
      liveIntervalRef.current = null
    }

    setLiveMode(null) // Set to null to indicate mode is off
    setLiveHistory([])
    setLiveModeTranscript("") // Clear transcript
  }

  const startLiveRecognition = () => {
    if (!("webkitSpeechRecognition" in window) && !("SpeechRecognition" in window)) {
      alert("O seu navegador não suporta reconhecimento de voz.")
      return
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    const recognition = new SpeechRecognition()

    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = "pt-PT"

    recognition.onresult = async (event: any) => {
      const lastResult = event.results[event.results.length - 1]
      const transcript = lastResult[0].transcript

      setLiveModeTranscript(transcript) // Update transcript state

      // If final result, send to AI
      if (lastResult.isFinal && transcript.trim()) {
        await processLiveInput(transcript)
      }
    }

    recognition.onerror = (event: any) => {
      console.error("Recognition error:", event.error)
      setLiveMode((prev) => (prev ? { ...prev, transcript: "" } : null)) // Clear transcript on error
      if (event.error === "no-speech") {
        alert("Nenhuma fala detetada. Tente novamente.")
      } else if (event.error === "audio-capture") {
        alert("Erro na captura de áudio. Verifique o microfone.")
      }
    }

    recognition.onend = () => {
      // Restart if still in live mode and mic is on
      if (liveMode?.isActive && liveMode.isMicOn) {
        recognition.start()
      }
    }

    recognition.start()
    recognitionRef.current = recognition
  }

  const startFrameAnalysis = () => {
    // Analyze frame every 5 seconds
    liveIntervalRef.current = setInterval(async () => {
      if (!liveMode?.isCameraOn || !videoRef.current || !canvasRef.current) return

      const canvas = canvasRef.current
      const video = videoRef.current
      const ctx = canvas.getContext("2d")

      if (!ctx) return

      canvas.width = 320
      canvas.height = 240
      ctx.drawImage(video, 0, 0, 320, 240)

      // Get frame as base64 (low quality for speed)
      const frameData = canvas.toDataURL("image/jpeg", 0.3)

      // Only analyze if not currently processing
      if (!liveMode.isProcessing) {
        // Store frame for context but don't send automatically
        // Frame will be included when user speaks
      }
    }, 5000)
  }

  const processLiveInput = async (transcript: string) => {
    if (!transcript.trim() || liveMode?.isProcessing) return

    setLiveMode((prev) => (prev ? { ...prev, isProcessing: true, transcript: "" } : null)) // Clear transcript during processing

    try {
      // Get current frame if camera is on
      const frameDescription = ""
      if (liveMode?.isCameraOn && videoRef.current && canvasRef.current) {
        const canvas = canvasRef.current
        const video = videoRef.current
        const ctx = canvas.getContext("2d")

        if (ctx) {
          canvas.width = 320
          canvas.height = 240
          ctx.drawImage(video, 0, 0, 320, 240)
        }
      }

      const response = await fetch("/api/live", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          audioTranscript: transcript,
          frameDescription,
          conversationHistory: liveHistory,
          mode: liveMode?.isCameraOn ? "both" : "voice",
        }),
      })

      if (!response.ok) throw new Error("Erro na resposta")

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      let fullResponse = ""

      if (reader) {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          fullResponse += decoder.decode(value)
          setLiveMode((prev) => (prev ? { ...prev, response: fullResponse } : null))
        }
      }

      // Update history
      setLiveHistory((prev) => [
        ...prev,
        { role: "user", content: transcript },
        { role: "assistant", content: fullResponse },
      ])

      // Speak response
      speakText(fullResponse)
    } catch (error) {
      console.error("Live processing error:", error)
      setLiveMode((prev) => (prev ? { ...prev, response: "Desculpa, ocorreu um erro no processamento." } : null))
    } finally {
      setLiveMode((prev) => (prev ? { ...prev, isProcessing: false } : null))
    }
  }

  const toggleLiveMic = () => {
    if (!liveMode) return

    if (liveMode.isMicOn) {
      if (recognitionRef.current) {
        recognitionRef.current.stop()
      }
    } else {
      startLiveRecognition()
    }
    setLiveMode((prev) => (prev ? { ...prev, isMicOn: !prev.isMicOn } : null))
  }

  const toggleLiveCamera = () => {
    if (!liveMode || !mediaStreamRef.current) return

    const videoTrack = mediaStreamRef.current.getVideoTracks()[0]
    if (videoTrack) {
      videoTrack.enabled = !liveMode.isCameraOn
      setLiveMode((prev) => (prev ? { ...prev, isCameraOn: !prev.isCameraOn } : null))
    }
  }

  // Load data from localStorage
  useEffect(() => {
    loadChatHistories()
    createNewChat() // Initialize with a new chat
  }, [])

  // Scroll to bottom
  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  const loadChatHistories = () => {
    const saved = localStorage.getItem("rebornai-chats")
    if (saved) {
      setChatHistories(JSON.parse(saved))
    }
  }

  const saveChatHistories = (histories: ChatHistory[]) => {
    localStorage.setItem("rebornai-chats", JSON.stringify(histories))
    setChatHistories(histories)
  }

  const createNewChat = () => {
    const newId = Date.now().toString()
    setCurrentChatId(newId)
    setMessages([])
    if (window.innerWidth < 768) setSidebarOpen(false)
  }

  const saveCurrentChat = (msgs: Message[]) => {
    if (msgs.length === 0) return

    // Try to get a meaningful title from the first user message or default
    const title =
      msgs.find((m) => m.role === "user")?.content?.slice(0, 30) +
        ((msgs.find((m) => m.role === "user")?.content?.length ?? 0 > 30) ? "..." : "") || "Nova conversa"
    const existingIndex = chatHistories.findIndex((c) => c.id === currentChatId)

    let updated: ChatHistory[]
    if (existingIndex >= 0) {
      // Update existing chat
      updated = [...chatHistories]
      updated[existingIndex] = { id: currentChatId, title, messages: msgs, timestamp: Date.now() }
    } else {
      // Add new chat
      updated = [{ id: currentChatId, title, messages: msgs, timestamp: Date.now() }, ...chatHistories]
    }

    saveChatHistories(updated.slice(0, 50)) // Limit to 50 chats
  }

  const loadChat = (chat: ChatHistory) => {
    setCurrentChatId(chat.id)
    setMessages(chat.messages)
    if (window.innerWidth < 768) setSidebarOpen(false)
  }

  const deleteChat = (id: string) => {
    const updated = chatHistories.filter((c) => c.id !== id)
    saveChatHistories(updated)
    if (currentChatId === id) createNewChat()
  }

  // Initialize speech recognition (moved from useEffect for clarity)
  const initializeRecognition = useCallback(() => {
    if (!("webkitSpeechRecognition" in window) && !("SpeechRecognition" in window)) {
      alert("O seu navegador não suporta reconhecimento de voz. Tente um navegador moderno.")
      return null
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    const recognition = new SpeechRecognition()
    recognition.continuous = false
    recognition.interimResults = false
    recognition.lang = "pt-PT"

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript
      setInput((prev) => prev + " " + transcript)
      setIsListening(false)
    }

    recognition.onerror = () => {
      setIsListening(false)
      console.error("Speech recognition error")
    }
    recognition.onend = () => {
      setIsListening(false)
    }
    return recognition
  }, [])

  // Initialize recognition instance
  useEffect(() => {
    // recognitionRef.current = initializeRecognition() // Keeping this commented as it's not used in the main chat input
  }, [initializeRecognition])

  const toggleListening = () => {
    // This is for the main chat input, not live mode
    if (!("webkitSpeechRecognition" in window) && !("SpeechRecognition" in window)) {
      alert("O seu navegador não suporta reconhecimento de voz.")
      return
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    const recognition = new SpeechRecognition()
    recognition.continuous = false
    recognition.interimResults = false
    recognition.lang = "pt-PT"

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript
      setInput((prev) => prev + " " + transcript)
      setIsListening(false)
    }

    recognition.onerror = () => {
      setIsListening(false)
      console.error("Speech recognition error")
    }
    recognition.onend = () => {
      setIsListening(false)
    }

    if (isListening) {
      recognition.stop()
      setIsListening(false)
    } else {
      recognition.start()
      setIsListening(true)
    }
  }

  const speakText = (text: string) => {
    if (!("speechSynthesis" in window)) {
      alert("O seu navegador não suporta síntese de voz.")
      return
    }

    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text.replace(/[#*`]/g, "")) // Remove markdown formatting
    utterance.lang = "pt-PT"
    utterance.rate = 1.0
    utterance.onstart = () => setIsSpeaking(true)
    utterance.onend = () => setIsSpeaking(false)
    utterance.onerror = () => setIsSpeaking(false)
    window.speechSynthesis.speak(utterance)
  }

  const stopSpeaking = () => {
    window.speechSynthesis.cancel()
    setIsSpeaking(false)
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (event) => {
        setSelectedImage(event.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const generateImage = async () => {
    if (!imagePrompt.trim()) return
    setIsGeneratingImage(true)
    try {
      const response = await fetch("/api/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: imagePrompt }),
      })
      const data = await response.json()
      if (data.url) {
        setGeneratedImage(data.url)
        setImagePrompt("") // Clear prompt after generation
      } else {
        throw new Error(data.error || "Erro desconhecido ao gerar imagem")
      }
    } catch (error: any) {
      console.error("Error generating image:", error)
      alert(`Falha ao gerar imagem: ${error.message}`)
    } finally {
      setIsGeneratingImage(false)
    }
  }

  const generateMarketing = async () => {
    if (!marketingText.trim()) return
    setIsGeneratingMarketing(true)

    const sizes: Record<string, { w: number; h: number }> = {
      post: { w: 1080, h: 1080 },
      banner: { w: 1920, h: 1080 },
      story: { w: 1080, h: 1920 },
      thumbnail: { w: 1280, h: 720 },
      logo: { w: 500, h: 500 },
    }

    const stylePrompts: Record<string, string> = {
      minimal: "clean minimalist design, white space, simple typography",
      bold: "bold colors, strong typography, high contrast, dynamic",
      elegant: "luxury elegant design, gold accents, serif typography",
      playful: "colorful fun playful design, rounded shapes, friendly",
      corporate: "professional corporate design, business, trust",
      neon: "neon glow effects, cyberpunk, dark background, vibrant colors",
    }

    const size = sizes[marketingType]
    const stylePrompt = stylePrompts[marketingStyle]

    const prompt = `${marketingType} design for ${marketingPlatform}, ${stylePrompt}, text says "${marketingText}", professional marketing material, high quality, ${marketingColor} color theme`

    try {
      const seed = Math.floor(Math.random() * 1000000)
      const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=${size.w}&height=${size.h}&nologo=true&seed=${seed}`
      setGeneratedMarketing(url)
    } catch (error) {
      alert("Erro ao gerar design")
    } finally {
      setIsGeneratingMarketing(false)
    }
  }

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if ((!input.trim() && !selectedImage) || isLoading) return

    const userMessage: Message = {
      role: "user",
      content: input,
      image: selectedImage || undefined,
    }

    const newMessages = [...messages, userMessage]
    setMessages(newMessages)
    setInput("")
    setSelectedImage(null)
    setIsLoading(true)

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: input,
          image: selectedImage,
          history: messages.slice(-10), // Pass last 10 messages for context
          enableSearch, // Pass search flag
          userPreferences, // Pass user preferences
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        let errorMessage = "Erro ao processar"
        try {
          const errorJson = JSON.parse(errorText)
          errorMessage = errorJson.error || errorMessage
        } catch {
          errorMessage = errorText || errorMessage
        }
        throw new Error(errorMessage)
      }

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      const assistantMessage: Message = { role: "assistant", content: "" }
      const updatedMessages = [...newMessages, assistantMessage]
      setMessages(updatedMessages)

      if (reader) {
        let fullContent = ""
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          const chunk = decoder.decode(value)
          fullContent += chunk
          // Update the last message (assistant's response) in real-time
          setMessages((prev) => {
            const updated = [...prev]
            updated[updated.length - 1] = { ...updated[updated.length - 1], content: fullContent }
            return updated
          })
        }

        const finalMessages = [...newMessages, { role: "assistant" as const, content: fullContent }]
        saveCurrentChat(finalMessages)
      }
    } catch (error: any) {
      console.error("Chat error:", error)
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `Desculpa, ocorreu um erro: ${error.message || "Erro desconhecido"}` },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  const handleWebCraftImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return

    Array.from(files).forEach((file) => {
      const reader = new FileReader()
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string
        const newImage = {
          id: `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          dataUrl,
          name: file.name,
        }
        setUploadedImages((prev) => [...prev, newImage])
      }
      reader.readAsDataURL(file)
    })

    // Reset input
    e.target.value = ""
  }
  // </CHANGE>

  const insertImageIntoHtml = (imageDataUrl: string) => {
    if (!editMode || !editableHtml) return

    // Find first img tag with placeholder src and replace it
    const imgRegex = /(src=["'])(https:\/\/picsum\.photos\/[^"']+|https:\/\/placehold\.co\/[^"']+)(["'])/
    if (imgRegex.test(editableHtml)) {
      const newHtml = editableHtml.replace(imgRegex, `$1${imageDataUrl}$3`)
      setEditableHtml(newHtml)
      setGeneratedWebsite(newHtml)
    } else {
      alert("Nenhuma imagem placeholder encontrada no HTML. Adicione manualmente no editor.")
    }
  }
  // </CHANGE>

  const generateWebsite = async () => {
    if (!websitePrompt.trim() && !businessName.trim()) return // Basic validation
    setIsGeneratingWebsite(true)
    setGeneratedWebsite("") // Clear previous content
    setEditMode(false) // Reset edit mode
    setUploadedImages([]) // Clear uploaded images

    try {
      const response = await fetch("/api/generate-website", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: websitePrompt,
          category: selectedCategory,
          template: selectedTemplate,
          colorScheme: selectedColorScheme,
          businessName,
          contact: businessContact,
          sections: selectedSections,
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(errorText || "Erro ao gerar website")
      }

      // Process text stream
      const reader = response.body?.getReader()
      if (!reader) throw new Error("Stream não disponível")

      const decoder = new TextDecoder()
      let html = ""

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        html += chunk
        // Clean any markdown code blocks that AI might add
        const cleanHtml = html.replace(/^```html?\n?/i, "").replace(/\n?```$/i, "")
        setGeneratedWebsite(cleanHtml)
      }

      // Final cleanup
      const finalHtml = html.replace(/^```html?\n?/i, "").replace(/\n?```$/i, "")
      setGeneratedWebsite(finalHtml)
      setEditableHtml(finalHtml) // Initialize editable HTML
    } catch (error: any) {
      console.error("Error generating website:", error)
      alert(`Falha ao gerar website: ${error.message}`)
    } finally {
      setIsGeneratingWebsite(false)
    }
  }
  // </CHANGE>

  const generatePresentation = async () => {
    if (!presentationPrompt.trim()) return // Basic validation
    setIsGeneratingPresentation(true)
    try {
      const response = await fetch("/api/generate-presentation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: presentationPrompt,
          template: presentationTemplate,
          slideCount,
        }),
      })
      const data = await response.json()
      if (data.html) {
        setGeneratedPresentation(data.html)
      } else {
        throw new Error(data.error || "Erro desconhecido ao gerar apresentação")
      }
    } catch (error: any) {
      console.error("Error generating presentation:", error)
      alert(`Falha ao gerar apresentação: ${error.message}`)
    } finally {
      setIsGeneratingPresentation(false)
    }
  }

  const generateEbook = async () => {
    if (!ebookPrompt.trim()) return // Basic validation
    setIsGeneratingEbook(true)
    try {
      const response = await fetch("/api/generate-ebook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: ebookPrompt,
          title: businessName, // Using business name as ebook title placeholder
          author: businessContact, // Using business contact as ebook author placeholder
          style: ebookStyle,
          chapters: chapterCount,
        }),
      })
      const data = await response.json()
      if (data.html) {
        setGeneratedEbook(data.html)
      } else {
        throw new Error(data.error || "Erro desconhecido ao gerar ebook")
      }
    } catch (error: any) {
      console.error("Error generating ebook:", error)
      alert(`Falha ao gerar ebook: ${error.message}`)
    } finally {
      setIsGeneratingEbook(false)
    }
  }

  const downloadContent = (content: string, filename: string) => {
    const blob = new Blob([content], { type: "text/html" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  // Template options
  const categories = [
    { id: "startup", name: "Startup/Tech" },
    { id: "ecommerce", name: "E-commerce" },
    { id: "restaurant", name: "Restaurante" },
    { id: "portfolio", name: "Portfolio" },
    { id: "services", name: "Serviços" },
    { id: "health", name: "Saúde" },
    { id: "education", name: "Educação" },
    { id: "realestate", name: "Imobiliária" },
    { id: "events", name: "Eventos" },
    { id: "blog", name: "Blog" },
    { id: "agency", name: "Agência" },
    { id: "fitness", name: "Fitness" },
  ]

  const templates = [
    { id: "modern", name: "Moderno" },
    { id: "minimal", name: "Minimalista" },
    { id: "bold", name: "Bold" },
    { id: "elegant", name: "Elegante" },
  ]

  const colorSchemes = [
    { id: "blue", name: "Azul", color: "#3B82F6" },
    { id: "green", name: "Verde", color: "#10B981" },
    { id: "purple", name: "Roxo", color: "#8B5CF6" },
    { id: "red", name: "Vermelho", color: "#EF4444" },
    { id: "orange", name: "Laranja", color: "#F97316" },
    { id: "pink", name: "Rosa", color: "#EC4899" },
    { id: "teal", name: "Teal", color: "#14B8A6" },
    { id: "indigo", name: "Indigo", color: "#6366F1" },
    { id: "amber", name: "Amber", color: "#F59E0B" },
    { id: "cyan", name: "Cyan", color: "#06B6D4" },
  ]

  const sections = [
    { id: "hero", name: "Hero" },
    { id: "features", name: "Funcionalidades" },
    { id: "about", name: "Sobre" },
    { id: "services", name: "Serviços" },
    { id: "pricing", name: "Preços" },
    { id: "testimonials", name: "Testemunhos" },
    { id: "team", name: "Equipa" },
    { id: "faq", name: "FAQ" },
    { id: "contact", name: "Contacto" },
    { id: "cta", name: "Call to Action" },
    { id: "chatbot", name: "Chatbot" },
    { id: "newsletter", name: "Newsletter" },
  ]

  const presentationTemplates = [
    { id: "modern", name: "Moderno" },
    { id: "corporate", name: "Corporativo" },
    { id: "creative", name: "Criativo" },
    { id: "minimal", name: "Minimalista" },
    { id: "dark", name: "Escuro" },
    { id: "gradient", name: "Gradiente" },
    { id: "nature", name: "Natureza" },
    { id: "tech", name: "Tecnologia" },
    { id: "elegant", name: "Elegante" },
    { id: "bold", name: "Bold" },
    { id: "pastel", name: "Pastel" },
    { id: "neon", name: "Neon" },
  ]

  const ebookStyles = [
    { id: "modern", name: "Moderno" },
    { id: "classic", name: "Clássico" },
    { id: "minimal", name: "Minimalista" },
    { id: "magazine", name: "Magazine" },
    { id: "academic", name: "Académico" },
    { id: "creative", name: "Criativo" },
    { id: "dark", name: "Escuro" },
    { id: "elegant", name: "Elegante" },
    { id: "tech", name: "Tecnologia" },
    { id: "nature", name: "Natureza" },
    { id: "vintage", name: "Vintage" },
    { id: "bold", name: "Bold" },
  ]

  // SMS Functionality
  const generateSmsLinks = (
    contacts: Contact[],
    messageTemplate: string,
    linksContainer: HTMLElement,
    statsContainer: HTMLElement,
    invalidContainer: HTMLElement,
    countryCode: string,
    batchSize: number,
  ) => {
    linksContainer.innerHTML = ""
    statsContainer.innerHTML = '<p class="text-sm text-muted-foreground">A processar...</p>'
    invalidContainer.innerHTML = ""

    const validateAndFormatNumber = (num: string) => {
      if (!num || num.trim().length === 0) {
        return { valid: false, formatted: "", original: num }
      }

      const cleaned = num.trim().replace(/[\s\-().]/g, "")

      if (cleaned.startsWith("+")) {
        const digits = cleaned.slice(1).replace(/\D/g, "")
        if (digits.length >= 8 && digits.length <= 15) {
          return { valid: true, formatted: "+" + digits, original: num }
        }
        return { valid: false, formatted: "", original: num }
      }

      const digits = cleaned.replace(/\D/g, "")

      if (digits.length < 8 || digits.length > 15) {
        return { valid: false, formatted: "", original: num }
      }

      if (countryCode && digits.length === 9 && digits.startsWith("9")) {
        return { valid: true, formatted: countryCode + digits, original: num }
      }

      if (countryCode) {
        return { valid: true, formatted: countryCode + digits, original: num }
      }

      return { valid: true, formatted: "+" + digits, original: num }
    }

    const validContacts: { name: string; phone: string; message: string }[] = []
    const invalidContacts: { name: string; phone: string }[] = []
    const seenPhones = new Set<string>()

    for (const contact of contacts) {
      const result = validateAndFormatNumber(contact.phone)

      if (result.valid && !seenPhones.has(result.formatted)) {
        seenPhones.add(result.formatted)

        // Se houver {nome} no template, substitui. Senão, adiciona nome no início
        let personalizedMessage = messageTemplate

        if (contact.name && contact.name.trim() !== "") {
          if (messageTemplate.includes("{nome}") || messageTemplate.includes("{NOME}")) {
            // Substituir {nome} pelo nome do contacto
            personalizedMessage = messageTemplate.replace(/{nome}/gi, contact.name.trim())
          } else {
            // Adicionar nome automaticamente no início: "Nome, mensagem"
            personalizedMessage = `${contact.name.trim()}, ${messageTemplate}`
          }
        }

        validContacts.push({
          name: contact.name,
          phone: result.formatted,
          message: personalizedMessage,
        })
      } else {
        invalidContacts.push(contact)
      }
    }

    const duplicates = contacts.length - validContacts.length - invalidContacts.length
    statsContainer.innerHTML = `
      <div class="grid grid-cols-2 gap-2">
        <p class="text-sm text-muted-foreground">Total: ${contacts.length}</p>
        <p class="text-sm text-green-500">Válidos: ${validContacts.length}</p>
        <p class="text-sm text-red-500">Inválidos: ${invalidContacts.length}</p>
        <p class="text-sm text-yellow-500">Duplicados: ${duplicates}</p>
      </div>
    `

    if (invalidContacts.length > 0) {
      const invalidList = invalidContacts.map((c) => `${c.name || "Sem nome"}: ${c.phone}`).join("<br>")
      invalidContainer.innerHTML = `
        <h4 class="font-medium mb-2 text-red-500">Contactos Inválidos (${invalidContacts.length})</h4>
        <div class="text-xs text-red-400 bg-red-900/30 p-2 rounded-md overflow-auto max-h-32">
          ${invalidList}
        </div>
      `
    }

    const contactListDiv = document.createElement("div")
    contactListDiv.className = "space-y-2 mb-4 max-h-64 overflow-y-auto"

    const smsQueue: { phone: string; message: string; name: string; sent: boolean; element: HTMLElement }[] = []

    validContacts.forEach((contact, index) => {
      const contactCard = document.createElement("div")
      contactCard.className = "flex items-center justify-between p-3 bg-card/50 rounded-lg border border-border/50"
      contactCard.id = `sms-contact-${index}`

      const encodedMessage = encodeURIComponent(contact.message)
      const smsLink = `sms:${contact.phone}?body=${encodedMessage}`

      contactCard.innerHTML = `
        <div class="flex-1 min-w-0">
          <p class="font-medium text-sm truncate">${contact.name || "Sem nome"}</p>
          <p class="text-xs text-muted-foreground">${contact.phone}</p>
          <p class="text-xs text-blue-400 truncate mt-1">${contact.message.substring(0, 50)}...</p>
        </div>
        <div class="flex items-center gap-2 ml-2">
          <span class="status-badge text-xs px-2 py-1 rounded bg-yellow-500/20 text-yellow-500">Pendente</span>
          <a href="${smsLink}" target="_blank" class="p-2 bg-green-600 hover:bg-green-700 rounded-lg text-white text-xs">
            Enviar
          </a>
        </div>
      `

      smsQueue.push({
        phone: contact.phone,
        message: contact.message,
        name: contact.name,
        sent: false,
        element: contactCard,
      })

      contactListDiv.appendChild(contactCard)
    })

    linksContainer.appendChild(contactListDiv)

    const controlsDiv = document.createElement("div")
    controlsDiv.className = "space-y-3"

    // Progress bar
    const progressDiv = document.createElement("div")
    progressDiv.className = "hidden"
    progressDiv.innerHTML = `
      <div class="flex items-center justify-between mb-2">
        <span class="text-sm font-medium">Progresso de Envio</span>
        <span class="progress-text text-sm text-muted-foreground">0/${validContacts.length}</span>
      </div>
      <div class="w-full h-3 bg-muted rounded-full overflow-hidden">
        <div class="progress-bar h-full bg-gradient-to-r from-green-500 to-emerald-500 transition-all duration-300" style="width: 0%"></div>
      </div>
      <p class="current-contact text-xs text-muted-foreground mt-2">Preparando...</p>
    `
    controlsDiv.appendChild(progressDiv)

    const sendAllAtOnceButton = document.createElement("button")
    sendAllAtOnceButton.className =
      "w-full p-4 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all mb-3"

    sendAllAtOnceButton.innerHTML = `
      <div class="flex items-center justify-center gap-2">
        <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
        <span>ENVIAR TODAS DE UMA VEZ (${validContacts.length} SMS)</span>
      </div>
    `

    sendAllAtOnceButton.onclick = () => {
      const confirmed = confirm(
        `Abrir ${validContacts.length} SMS de uma só vez?\n\n` +
          `Todas as mensagens serão abertas no seu app de SMS com o nome da pessoa no início.\n\n` +
          `NOTA: O seu navegador pode bloquear popups. Se isso acontecer, permita popups para este site.`,
      )

      if (!confirmed) return

      // Marcar todos como enviados e abrir todos os links
      let openedCount = 0

      smsQueue.forEach((item, index) => {
        // Criar link e clicar
        const link = document.createElement("a")
        link.href = `sms:${item.phone}?body=${encodeURIComponent(item.message)}`
        link.target = "_blank"
        link.style.display = "none"
        document.body.appendChild(link)

        // Usar setTimeout para evitar bloqueio de popups
        setTimeout(() => {
          link.click()
          document.body.removeChild(link)
          openedCount++

          // Atualizar badge do contacto
          const badge = item.element.querySelector(".status-badge") as HTMLElement
          if (badge) {
            badge.className = "status-badge text-xs px-2 py-1 rounded bg-green-500/20 text-green-500"
            badge.textContent = "Aberto"
          }

          // Quando todos forem abertos
          if (openedCount === smsQueue.length) {
            sendAllAtOnceButton.innerHTML = `
              <div class="flex items-center justify-center gap-2">
                <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
                <span>TODAS ABERTAS! (${validContacts.length} SMS)</span>
              </div>
            `
          }
        }, index * 100) // 100ms entre cada abertura para evitar bloqueio
      })
    }

    controlsDiv.appendChild(sendAllAtOnceButton)

    const sendAllButton = document.createElement("button")
    sendAllButton.className =
      "w-full p-4 rounded-lg bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all"

    sendAllButton.innerHTML = `
      <div class="flex items-center justify-center gap-2">
        <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
        </svg>
        <span>Iniciar Envio Automático (${validContacts.length} SMS)</span>
      </div>
    `

    let isRunning = false
    let currentIndex = 0

    const startAutoSend = async () => {
      if (isRunning) return

      const confirmed = confirm(
        `Iniciar envio automático de ${validContacts.length} SMS?\n\n` +
          `Cada SMS será aberto automaticamente com o nome do contacto no início da mensagem.\n\n` +
          `IMPORTANTE: Precisará confirmar o envio de cada SMS no seu telemóvel.`,
      )

      if (!confirmed) return

      isRunning = true
      progressDiv.classList.remove("hidden")
      sendAllButton.disabled = true

      const progressBar = progressDiv.querySelector(".progress-bar") as HTMLElement
      const progressText = progressDiv.querySelector(".progress-text") as HTMLElement
      const currentContactText = progressDiv.querySelector(".current-contact") as HTMLElement

      sendAllButton.innerHTML = `
        <div class="flex items-center justify-center gap-2">
          <svg class="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span>Enviando...</span>
        </div>
      `

      for (let i = currentIndex; i < smsQueue.length; i++) {
        const item = smsQueue[i]

        // Atualizar UI
        const progress = ((i + 1) / smsQueue.length) * 100
        progressBar.style.width = `${progress}%`
        progressText.textContent = `${i + 1}/${smsQueue.length}`
        currentContactText.textContent = `Enviando para: ${item.name || item.phone}`

        // Marcar como enviando
        const badge = item.element.querySelector(".status-badge") as HTMLElement
        if (badge) {
          badge.className = "status-badge text-xs px-2 py-1 rounded bg-blue-500/20 text-blue-500"
          badge.textContent = "Enviando..."
        }

        // Scroll para o contacto atual
        item.element.scrollIntoView({ behavior: "smooth", block: "center" })

        // Abrir link SMS
        const encodedMessage = encodeURIComponent(item.message)
        const smsUrl = `sms:${item.phone}?body=${encodedMessage}`

        // Usar window.open para abrir o SMS
        window.open(smsUrl, "_blank")

        // Marcar como enviado (aberto)
        if (badge) {
          badge.className = "status-badge text-xs px-2 py-1 rounded bg-green-500/20 text-green-500"
          badge.textContent = "Aberto"
        }
        item.sent = true
        currentIndex = i + 1

        // Aguardar 2 segundos entre cada SMS para dar tempo de processar
        if (i < smsQueue.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 2000))
        }
      }

      isRunning = false
      currentContactText.textContent = "Envio concluído!"

      sendAllButton.disabled = false
      sendAllButton.innerHTML = `
        <div class="flex items-center justify-center gap-2">
          <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
          </svg>
          <span>Concluído! (${validContacts.length} SMS abertos)</span>
        </div>
      `
    }

    sendAllButton.onclick = startAutoSend
    controlsDiv.appendChild(sendAllButton)

    const stopButton = document.createElement("button")
    stopButton.className = "w-full p-3 rounded-lg bg-red-600 hover:bg-red-700 text-white font-medium hidden"
    stopButton.textContent = "Parar Envio"
    stopButton.onclick = () => {
      isRunning = false
      stopButton.classList.add("hidden")
    }
    controlsDiv.appendChild(stopButton)

    const infoDiv = document.createElement("div")
    infoDiv.className = "mt-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg"
    infoDiv.innerHTML = `
      <h4 class="font-medium text-blue-400 mb-2">Como funciona o envio automático:</h4>
      <ol class="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
        <li>Clique em "Iniciar Envio Automático"</li>
        <li>Cada SMS será aberto automaticamente com a mensagem personalizada</li>
        <li>A mensagem já inclui o nome do contacto no início</li>
        <li>No seu telemóvel, só precisa confirmar o envio de cada SMS</li>
        <li>O sistema aguarda 2 segundos entre cada SMS para dar tempo de processar</li>
      </ol>
    `
    controlsDiv.appendChild(infoDiv)

    linksContainer.appendChild(controlsDiv)

    // Preview das mensagens (mantendo o preview original)
    const previewDiv = document.createElement("div")
    previewDiv.className = "mt-4 p-3 bg-muted/30 rounded-lg border"
    previewDiv.innerHTML = `
      <h4 class="font-medium mb-2 text-sm">Preview das Mensagens (primeiros 5):</h4>
      <div class="space-y-1 text-xs text-muted-foreground">
        ${validContacts
          .slice(0, 5)
          .map(
            (c) => `
          <div class="p-2 bg-background rounded border-l-2 border-primary">
            <strong>${c.phone}</strong>: "${c.message.slice(0, 60)}${c.message.length > 60 ? "..." : ""}"
          </div>
        `,
          )
          .join("")}
        ${validContacts.length > 5 ? `<div class="text-center">... e mais ${validContacts.length - 5} contactos</div>` : ""}
      </div>
    `
    linksContainer.appendChild(previewDiv)
  }

  const parseTextFile = (text: string): Contact[] => {
    const lines = text.split(/\r?\n/)
    const contacts: Contact[] = []

    for (const line of lines) {
      const cells = line.split(/[,;\t]/)

      if (cells.length >= 2) {
        // Formato: Nome, Numero ou Numero, Nome
        const cell1 = cells[0].trim().replace(/"/g, "")
        const cell2 = cells[1].trim().replace(/"/g, "")

        // Verificar qual celula e o numero
        if (/^\+?[\d\s\-().]{8,}$/.test(cell1)) {
          contacts.push({ name: cell2, phone: cell1 })
        } else if (/^\+?[\d\s\-().]{8,}$/.test(cell2)) {
          contacts.push({ name: cell1, phone: cell2 })
        }
      } else if (cells.length === 1) {
        // So numero
        const trimmed = cells[0].trim().replace(/"/g, "")
        if (/^\+?[\d\s\-().]{8,}$/.test(trimmed)) {
          contacts.push({ name: "", phone: trimmed })
        }
      }
    }

    return contacts
  }

  const parseExcelFile = (buffer: ArrayBuffer): Contact[] => {
    const contacts: Contact[] = []
    try {
      const workbook = XLSX.read(buffer, { type: "array" })

      for (const sheetName of workbook.SheetNames) {
        const sheet = workbook.Sheets[sheetName]
        const data = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][]

        // Percorrer todas as linhas
        for (let i = 0; i < data.length; i++) {
          const row = data[i]
          if (!row || row.length === 0) continue

          let name = ""
          let phone = ""

          // Procurar primeira coluna com nome e coluna com numero
          for (let j = 0; j < row.length; j++) {
            const cell = row[j]
            if (cell === null || cell === undefined) continue
            const value = String(cell).trim()

            // Se parece numero de telefone
            if (/^\+?[\d\s\-().]{8,}$/.test(value) && !phone) {
              phone = value
            }
            // Se parece nome (tem letras, nao e so numeros)
            else if (/[a-zA-Z]/.test(value) && !name) {
              name = value
            }
          }

          if (phone) {
            contacts.push({ name, phone })
          }
        }
      }
    } catch (error) {
      console.error("Erro ao processar Excel:", error)
    }
    return contacts
  }

  // Handler for toggling listening for the main chat input
  const startListening = () => {
    if (!("webkitSpeechRecognition" in window) && !("SpeechRecognition" in window)) {
      alert("O seu navegador não suporta reconhecimento de voz.")
      return
    }
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    const recognition = new SpeechRecognition()
    recognition.continuous = false
    recognition.interimResults = false
    recognition.lang = "pt-PT"

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript
      setInput((prev) => prev + " " + transcript)
      setIsListening(false)
    }
    recognition.onerror = () => {
      setIsListening(false)
      console.error("Speech recognition error")
    }
    recognition.onend = () => {
      setIsListening(false)
    }

    recognition.start()
    setIsListening(true)
  }

  const stopListening = () => {
    // This logic needs to be attached to the recognition instance created in startListening
    // For now, just setting the state. A more robust implementation would store the recognition instance.
    setIsListening(false)
  }

  // Handle Pro upgrade logic
  const handleUpgradePro = async () => {
    try {
      const response = await fetch("/api/stripe/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          priceId: "price_xxx", // Replace with your actual Stripe Price ID
          userId: session?.user?.id,
        }),
      })

      const { url } = await response.json()
      if (url) {
        window.open(url, "_blank")
      } else {
        alert("Não foi possível iniciar o processo de upgrade. Tente novamente mais tarde.")
      }
    } catch (error) {
      console.error("Upgrade Pro error:", error)
      alert("Ocorreu um erro ao tentar fazer o upgrade. Verifique a consola.")
    }
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <div
        className={`fixed lg:static inset-y-0 left-0 z-50 w-72 bg-sidebar border-r border-sidebar-border transform transition-transform duration-300 ease-in-out flex flex-col ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        {/* Sidebar Header */}
        <div className="p-4 border-b border-sidebar-border shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
                <Sparkles className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="font-semibold text-lg">Reborn AI</span>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(false)} className="lg:hidden">
              <X className="h-5 w-5" />
            </Button>
          </div>

          {session?.user ? (
            <div className="mt-3 space-y-2">
              <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
                <Avatar className="h-8 w-8">
                  <div className="w-full h-full rounded-full bg-primary/20 flex items-center justify-center">
                    <User className="h-4 w-4 text-primary" />
                  </div>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{session.user.name || session.user.email}</p>
                  {isPro ? (
                    <Badge variant="secondary" className="text-xs">
                      Pro
                    </Badge>
                  ) : (
                    <Button
                      variant="link"
                      size="sm"
                      className="h-auto p-0 text-xs text-primary"
                      onClick={() => setShowProModal(true)}
                    >
                      Upgrade para Pro
                    </Button>
                  )}
                </div>
              </div>
              <Button variant="ghost" size="sm" className="w-full text-xs" onClick={() => signOut()}>
                Sair
              </Button>
            </div>
          ) : (
            <Button className="w-full mt-3" onClick={() => setShowAuthModal(true)}>
              <User className="h-4 w-4 mr-2" />
              Entrar / Registar
            </Button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-4">
          <nav className="space-y-1">
            {/* CHANGED: Removed TabsList from sidebar as it was outside Tabs component */}
            <div className="flex flex-col items-start gap-1">
              <Button
                variant={activeTab === "chat" ? "secondary" : "ghost"}
                className="w-full justify-start"
                onClick={() => setActiveTab("chat")}
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                Chat
              </Button>
              <Button
                variant={activeTab === "live" ? "secondary" : "ghost"}
                className="w-full justify-start"
                onClick={() => setActiveTab("live")}
              >
                <Video className="h-4 w-4 mr-2" />
                Modo Live
              </Button>
              <Button
                variant={activeTab === "images" ? "secondary" : "ghost"}
                className="w-full justify-start"
                onClick={() => setActiveTab("images")}
              >
                <ImagePlus className="h-4 w-4 mr-2" />
                Imagens
              </Button>
              <Button
                variant={activeTab === "webcraft" ? "secondary" : "ghost"}
                className="w-full justify-start"
                onClick={() => setActiveTab("webcraft")}
              >
                <Globe className="h-4 w-4 mr-2" />
                WebCraft
              </Button>
              <Button
                variant={activeTab === "presentations" ? "secondary" : "ghost"}
                className="w-full justify-start"
                onClick={() => setActiveTab("presentations")}
              >
                <Presentation className="h-4 w-4 mr-2" />
                Slides
              </Button>
              <Button
                variant={activeTab === "ebooks" ? "secondary" : "ghost"}
                className="w-full justify-start"
                onClick={() => setActiveTab("ebooks")}
              >
                <BookOpen className="h-4 w-4 mr-2" />
                Ebooks
              </Button>
              <Button
                variant={activeTab === "sms" ? "secondary" : "ghost"}
                className="w-full justify-start"
                onClick={() => setActiveTab("sms")}
              >
                <MessageCircleIcon className="h-4 w-4 mr-2" />
                SMS
              </Button>
              <Button
                variant={activeTab === "email" ? "secondary" : "ghost"}
                className="w-full justify-start"
                onClick={() => setActiveTab("email")}
              >
                <Mail className="h-4 w-4 mr-2" />
                Email
              </Button>
              <Button
                variant={activeTab === "whatsapp" ? "secondary" : "ghost"}
                className="w-full justify-start"
                onClick={() => setActiveTab("whatsapp")}
              >
                <Share2 className="h-4 w-4 mr-2" />
                WhatsApp
              </Button>
              <Button
                variant={activeTab === "clipper" ? "secondary" : "ghost"}
                className="w-full justify-start"
                onClick={() => setActiveTab("clipper")}
              >
                <Scissors className="h-4 w-4 mr-2" />
                Clipper
              </Button>
              <Button
                variant={activeTab === "marketing" ? "secondary" : "ghost"}
                className="w-full justify-start"
                onClick={() => setActiveTab("marketing")}
              >
                <Megaphone className="h-4 w-4 mr-2" />
                Marketing
              </Button>
            </div>
          </nav>

          {/* Chat History */}
          <div className="mt-8 pt-4 border-t border-sidebar-border">
            <h4 className="px-3 text-sm font-semibold text-muted-foreground mb-2">Histórico</h4>
            <nav className="space-y-1">
              {chatHistories.map((chat) => (
                <div
                  key={chat.id}
                  className={`group flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors ${
                    currentChatId === chat.id ? "bg-muted" : "hover:bg-muted/50"
                  }`}
                  onClick={() => loadChat(chat)}
                >
                  <MessageSquare className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="flex-1 text-sm truncate">{chat.title}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation()
                      deleteChat(chat.id)
                    }}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </nav>
          </div>
        </div>

        {/* New Chat Button */}
        <div className="p-3 border-t border-sidebar-border shrink-0">
          <Button onClick={createNewChat} className="w-full gap-2 bg-transparent" variant="outline">
            <Plus className="h-4 w-4" />
            Nova Conversa
          </Button>
        </div>
      </div>

      {/* Main Content */}
      {/* Added proper overflow handling for main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="border-b border-border bg-card/50 backdrop-blur-sm px-3 sm:px-4 lg:px-6 py-3 sm:py-4 flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(!sidebarOpen)} className="lg:hidden">
              <Menu className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <Sparkles className="h-4 w-4 text-primary-foreground" />
              </div>
              <h1 className="font-bold text-lg gradient-text hidden sm:block">Reborn AI</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {enableSearch && (
              <Badge variant="outline" className="gap-1 hidden sm:flex bg-primary/10 border-primary/30">
                <Search className="h-3 w-3" />
                Web Ativo
              </Badge>
            )}
            <Badge variant="outline" className="gap-1 bg-green-500/10 border-green-500/30 text-green-400">
              <Zap className="h-3 w-3" />
              <span className="hidden sm:inline">Online</span>
            </Badge>
          </div>
        </header>

        {/* Main content area with proper scroll */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
            {/* Tabs List */}
            <div className="border-b border-border mb-4 pb-2">
              <ScrollArea orientation="horizontal" className="w-full whitespace-nowrap">
                <TabsList className="inline-flex gap-1 h-12">
                  <TabsTrigger value="chat" className="px-3 rounded-lg">
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Chat
                  </TabsTrigger>
                  <TabsTrigger value="live" className="px-3 rounded-lg">
                    <Video className="h-4 w-4 mr-2" />
                    Modo Live
                  </TabsTrigger>
                  <TabsTrigger value="images" className="px-3 rounded-lg">
                    <ImagePlus className="h-4 w-4 mr-2" />
                    Imagens
                  </TabsTrigger>
                  <TabsTrigger value="webcraft" className="px-3 rounded-lg">
                    <Globe className="h-4 w-4 mr-2" />
                    WebCraft
                  </TabsTrigger>
                  <TabsTrigger value="presentations" className="px-3 rounded-lg">
                    <Presentation className="h-4 w-4 mr-2" />
                    Slides
                  </TabsTrigger>
                  <TabsTrigger value="ebooks" className="px-3 rounded-lg">
                    <BookOpen className="h-4 w-4 mr-2" />
                    Ebooks
                  </TabsTrigger>
                  <TabsTrigger value="sms" className="px-3 rounded-lg">
                    <MessageCircleIcon className="h-4 w-4 mr-2" />
                    SMS
                  </TabsTrigger>
                  <TabsTrigger value="email" className="px-3 rounded-lg">
                    <Mail className="h-4 w-4 mr-2" />
                    Email
                  </TabsTrigger>
                  <TabsTrigger value="whatsapp" className="px-3 rounded-lg">
                    <Share2 className="h-4 w-4 mr-2" />
                    WhatsApp
                  </TabsTrigger>
                  <TabsTrigger value="clipper" className="px-3 rounded-lg">
                    <Scissors className="h-4 w-4 mr-2" />
                    Clipper
                  </TabsTrigger>
                  <TabsTrigger value="marketing" className="px-3 rounded-lg">
                    <Megaphone className="h-4 w-4 mr-2" />
                    Marketing
                  </TabsTrigger>
                  <TabsTrigger value="pro" className="px-3 rounded-lg">
                    <Crown className="h-4 w-4 mr-2" />
                    Pro
                  </TabsTrigger>
                </TabsList>
              </ScrollArea>
            </div>

            {/* Chat Tab */}
            <TabsContent value="chat" className="h-full mt-0 data-[state=active]:flex data-[state=active]:flex-col">
              <ScrollArea className="flex-1">
                <div className="max-w-3xl mx-auto py-4 space-y-4">
                  {messages.length === 0 && (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center mx-auto mb-4">
                        <Sparkles className="h-8 w-8 text-primary-foreground" />
                      </div>
                      <h2 className="text-xl font-semibold mb-2">Olá! Sou o Reborn AI</h2>
                      <p className="text-muted-foreground text-sm max-w-md mx-auto">
                        Posso ajudar com conversas, análise de imagens, pesquisa web, criar websites, apresentações e
                        ebooks.
                        {enableSearch && " Pesquisa web ativada para informações atualizadas."}
                      </p>
                    </div>
                  )}

                  {messages.map((message, index) => (
                    <div
                      key={index}
                      className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"} animate-in fade-in slide-in-from-bottom-2 duration-300`}
                    >
                      {message.role === "assistant" && (
                        <Avatar className="h-8 w-8 shrink-0 bg-primary/10">
                          <Bot className="h-5 w-5 text-primary m-auto" />
                        </Avatar>
                      )}
                      <div
                        className={`chat-message max-w-[85%] sm:max-w-[75%] rounded-2xl p-3 sm:p-4 ${
                          message.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"
                        }`}
                      >
                        {message.image && (
                          <img
                            src={message.image || "/placeholder.svg"}
                            alt="Uploaded"
                            className="max-w-full h-auto rounded-lg mb-2 max-h-48 object-cover"
                          />
                        )}
                        {message.role === "assistant" ? (
                          <div className="prose prose-sm dark:prose-invert max-w-none text-sm sm:text-base">
                            <ReactMarkdown>{message.content}</ReactMarkdown>
                          </div>
                        ) : (
                          <p className="text-sm sm:text-base whitespace-pre-wrap break-words">{message.content}</p>
                        )}
                        {message.role === "assistant" && message.content && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="mt-2 h-7 text-xs"
                            onClick={() => (isSpeaking ? stopSpeaking() : speakText(message.content))}
                          >
                            {isSpeaking ? <VolumeX className="h-3 w-3 mr-1" /> : <Volume2 className="h-3 w-3 mr-1" />}
                            {isSpeaking ? "Parar" : "Ouvir"}
                          </Button>
                        )}
                      </div>
                      {message.role === "user" && (
                        <Avatar className="h-8 w-8 shrink-0 bg-primary">
                          <User className="h-5 w-5 text-primary-foreground m-auto" />
                        </Avatar>
                      )}
                    </div>
                  ))}

                  {isLoading && (
                    <div className="flex gap-3 justify-start">
                      <Avatar className="h-8 w-8 shrink-0 bg-primary/10">
                        <Bot className="h-5 w-5 text-primary m-auto" />
                      </Avatar>
                      <div className="bg-muted rounded-2xl p-4">
                        <Loader2 className="h-5 w-5 animate-spin" />
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

              {/* Input Area */}
              <div className="p-3 sm:p-4 border-t border-border bg-card/50">
                <div className="max-w-3xl mx-auto">
                  {selectedImage && (
                    <div className="mb-3 relative inline-block">
                      <img src={selectedImage || "/placeholder.svg"} alt="Selected" className="h-20 rounded-lg" />
                      <Button
                        variant="destructive"
                        size="icon"
                        className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                        onClick={() => setSelectedImage(null)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                  <form onSubmit={handleSubmit} className="flex gap-2">
                    <input
                      type="file"
                      ref={fileInputRef}
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                    <Button type="button" variant="outline" size="icon" onClick={() => fileInputRef.current?.click()}>
                      <ImageIcon className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={toggleListening}
                      className={isListening ? "bg-red-500 text-white hover:bg-red-600" : ""}
                    >
                      {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                    </Button>
                    <Input
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder="Escreve uma mensagem..."
                      className="flex-1"
                      disabled={isLoading}
                    />
                    <Button type="submit" disabled={isLoading || (!input.trim() && !selectedImage)}>
                      {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    </Button>
                  </form>
                </div>
              </div>
            </TabsContent>

            {/* Live Mode Tab */}
            <TabsContent value="live" className="h-full mt-0 data-[state=active]:flex data-[state=active]:flex-col">
              <div className="flex-1 flex flex-col items-center justify-center gap-6 p-4">
                {!liveMode ? (
                  <div className="text-center space-y-4">
                    <Video className="h-16 w-16 mx-auto text-primary" />
                    <h2 className="text-2xl font-bold">Modo Live</h2>
                    <p className="text-muted-foreground max-w-md">
                      Converse com o Reborn AI em tempo real usando câmara e microfone
                    </p>
                    <Button onClick={startLiveMode} size="lg" className="gap-2">
                      <Video className="h-5 w-5" />
                      Iniciar Modo Live
                    </Button>
                  </div>
                ) : (
                  <div className="w-full max-w-4xl space-y-4">
                    {/* Video Feed */}
                    <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
                      <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
                      <canvas ref={canvasRef} className="hidden" /> {/* Hidden canvas for frame capture */}
                      {/* Live Controls */}
                      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
                        <Button
                          variant={liveMode.isMicOn ? "default" : "destructive"}
                          size="icon"
                          className="rounded-full h-12 w-12 shadow-lg"
                          onClick={toggleLiveMic}
                        >
                          {liveMode.isMicOn ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
                        </Button>
                        <Button
                          variant={liveMode.isCameraOn ? "default" : "destructive"}
                          size="icon"
                          className="rounded-full h-12 w-12 shadow-lg"
                          onClick={toggleLiveCamera}
                        >
                          {liveMode.isCameraOn ? <Camera className="h-5 w-5" /> : <CameraOff className="h-5 w-5" />}
                        </Button>
                      </div>
                      {/* Animated Orb when speaking */}
                      {liveMode.isProcessing && ( // Changed from isListening to isProcessing for better visual cue
                        <div className="absolute inset-0 flex items-center justify-center z-0">
                          <div className="w-32 h-32 rounded-full bg-primary/30 backdrop-blur-sm animate-ping"></div>
                          <div
                            className={`w-32 h-32 rounded-full bg-primary/30 backdrop-blur-sm flex items-center justify-center`}
                          >
                            <Mic className="h-16 w-16 text-primary" />
                          </div>
                        </div>
                      )}
                      {/* Transcript Overlay */}
                      {liveModeTranscript && (
                        <div className="absolute top-4 left-4 right-4 bg-black/70 rounded-lg p-3 z-10">
                          <p className="text-white text-sm">{liveModeTranscript}</p>
                        </div>
                      )}
                    </div>

                    <div className="flex justify-center gap-4">
                      <Button onClick={stopLiveMode} size="lg" variant="outline" className="gap-2 bg-transparent">
                        <X className="h-5 w-5" />
                        Sair do Modo Live
                      </Button>
                    </div>

                    {/* Live AI Response */}
                    {liveMode.response && (
                      <Card className="p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <Brain className="h-5 w-5 text-primary" />
                          <span className="font-medium">Resposta AI</span>
                          {liveMode.isProcessing && <Loader2 className="h-4 w-4 animate-spin ml-auto" />}
                        </div>
                        <p className="text-sm text-muted-foreground">{liveMode.response}</p>
                      </Card>
                    )}
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Images Tab */}
            <TabsContent value="images" className="flex-1 flex flex-col min-h-0 m-0">
              <div className="max-w-2xl mx-auto w-full space-y-4 p-4">
                <Card className="p-4 sm:p-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <ImagePlus className="h-5 w-5" />
                    Gerar Imagem com IA
                  </h3>
                  <div className="space-y-4">
                    <Textarea
                      value={imagePrompt}
                      onChange={(e) => setImagePrompt(e.target.value)}
                      placeholder="Descreve a imagem que queres criar..."
                      className="min-h-[100px]"
                    />
                    <Button
                      onClick={generateImage}
                      disabled={isGeneratingImage || !imagePrompt.trim()}
                      className="w-full"
                    >
                      {isGeneratingImage ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />A gerar...
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4 mr-2" />
                          Gerar Imagem
                        </>
                      )}
                    </Button>
                  </div>
                </Card>

                {generatedImage && (
                  <Card className="p-4 sm:p-6">
                    <img
                      src={generatedImage || "/placeholder.svg"}
                      alt="Generated"
                      className="w-full rounded-lg mb-4"
                    />
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        className="flex-1 bg-transparent"
                        onClick={() => window.open(generatedImage, "_blank")}
                      >
                        <Maximize2 className="h-4 w-4 mr-2" />
                        Ver Original
                      </Button>
                      <Button variant="outline" className="flex-1 bg-transparent" asChild>
                        <a href={generatedImage} download="reborn-ai-image.png">
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </a>
                      </Button>
                    </div>
                  </Card>
                )}
              </div>
            </TabsContent>

            {/* WebCraft Tab */}
            <TabsContent value="webcraft" className="flex-1 flex flex-col min-h-0 m-0">
              <div className="flex-1 flex flex-col lg:flex-row gap-4 p-4 overflow-hidden">
                {/* Config Panel */}
                <Card className="lg:w-96 shrink-0 p-4 overflow-auto">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Globe className="h-5 w-5" />
                    WebCraft
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <Label>Categoria</Label>
                      <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>Template</Label>
                      <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {templates.map((t) => (
                            <SelectItem key={t.id} value={t.id}>
                              {t.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>Cores</Label>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {colorSchemes.map((c) => (
                          <button
                            key={c.id}
                            className={`w-8 h-8 rounded-full border-2 transition-all ${
                              selectedColorScheme === c.id ? "border-foreground scale-110" : "border-transparent"
                            }`}
                            style={{ backgroundColor: c.color }}
                            onClick={() => setSelectedColorScheme(c.id)}
                            title={c.name}
                          />
                        ))}
                      </div>
                    </div>

                    <div>
                      <Label>Nome do Negócio</Label>
                      <Input
                        value={businessName}
                        onChange={(e) => setBusinessName(e.target.value)}
                        placeholder="Ex: Minha Empresa"
                      />
                    </div>

                    <div>
                      <Label>Contacto/Email</Label>
                      <Input
                        value={businessContact}
                        onChange={(e) => setBusinessContact(e.target.value)}
                        placeholder="Ex: email@empresa.com"
                      />
                    </div>

                    <div>
                      <Label>Secções</Label>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {sections.map((s) => (
                          <Badge
                            key={s.id}
                            variant={selectedSections.includes(s.id) ? "default" : "outline"}
                            className="cursor-pointer"
                            onClick={() => {
                              setSelectedSections((prev) =>
                                prev.includes(s.id) ? prev.filter((x) => x !== s.id) : [...prev, s.id],
                              )
                            }}
                          >
                            {s.name}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div>
                      <Label>Descrição do Site</Label>
                      <Textarea
                        value={websitePrompt}
                        onChange={(e) => setWebsitePrompt(e.target.value)}
                        placeholder="Descreve o que queres no site..."
                        className="min-h-[80px]"
                      />
                    </div>

                    <Button onClick={generateWebsite} disabled={isGeneratingWebsite} className="w-full">
                      {isGeneratingWebsite ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />A gerar...
                        </>
                      ) : (
                        <>
                          <Rocket className="h-4 w-4 mr-2" />
                          Gerar Website
                        </>
                      )}
                    </Button>

                    {generatedWebsite && (
                      <>
                        <div className="pt-4 border-t border-border">
                          <Label className="mb-2 block">Upload de Imagens</Label>
                          <Input
                            type="file"
                            accept="image/*"
                            multiple
                            onChange={handleWebCraftImageUpload}
                            className="mb-2"
                          />
                          {uploadedImages.length > 0 && (
                            <div className="space-y-2 max-h-32 overflow-y-auto">
                              {uploadedImages.map((img) => (
                                <div
                                  key={img.id}
                                  className="flex items-center gap-2 p-2 bg-muted rounded-md cursor-pointer hover:bg-muted/80"
                                  onClick={() => insertImageIntoHtml(img.dataUrl)}
                                >
                                  <img
                                    src={img.dataUrl || "/placeholder.svg"}
                                    alt={img.name}
                                    className="w-10 h-10 object-cover rounded"
                                  />
                                  <span className="text-xs flex-1 truncate">{img.name}</span>
                                  <Badge variant="outline" className="text-xs">
                                    Inserir
                                  </Badge>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        <Button
                          variant={editMode ? "default" : "outline"}
                          onClick={() => {
                            if (editMode) {
                              // Save changes
                              setGeneratedWebsite(editableHtml)
                            } else {
                              // Enter edit mode
                              setEditableHtml(generatedWebsite)
                            }
                            setEditMode(!editMode)
                          }}
                          className="w-full"
                        >
                          {editMode ? (
                            <>
                              <Check className="h-4 w-4 mr-2" />
                              Guardar Alterações
                            </>
                          ) : (
                            <>
                              <Edit3 className="h-4 w-4 mr-2" />
                              Editar HTML
                            </>
                          )}
                        </Button>
                      </>
                    )}
                    {/* </CHANGE> */}
                  </div>
                </Card>

                {/* Preview Panel */}
                <Card className="flex-1 min-h-0 flex flex-col overflow-hidden">
                  <div className="p-3 border-b border-border flex items-center justify-between">
                    <span className="font-medium text-sm">
                      {editMode ? "Editor HTML" : "Preview"}
                      {/* </CHANGE> */}
                    </span>
                    {generatedWebsite && (
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => downloadContent(generatedWebsite, "website.html")}
                        >
                          <Download className="h-3 w-3 mr-1" />
                          Download
                        </Button>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-h-0 bg-white">
                    {editMode && generatedWebsite ? (
                      <Textarea
                        value={editableHtml}
                        onChange={(e) => setEditableHtml(e.target.value)}
                        className="w-full h-full font-mono text-xs p-4 border-0 resize-none"
                        placeholder="Cole ou edite o código HTML aqui..."
                      />
                    ) : generatedWebsite ? (
                      <iframe srcDoc={generatedWebsite} className="w-full h-full border-0" title="Website Preview" />
                    ) : (
                      <div className="h-full flex items-center justify-center text-muted-foreground">
                        <p>O preview aparecerá aqui</p>
                      </div>
                    )}
                    {/* </CHANGE> */}
                  </div>
                </Card>
              </div>
            </TabsContent>

            {/* Presentations Tab */}
            <TabsContent value="presentations" className="flex-1 flex flex-col min-h-0 m-0">
              <div className="flex-1 flex flex-col lg:flex-row gap-4 p-4 overflow-hidden">
                <Card className="lg:w-80 shrink-0 p-4">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Presentation className="h-5 w-5" />
                    Criar Apresentação
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <Label>Tema</Label>
                      <Textarea
                        value={presentationPrompt}
                        onChange={(e) => setPresentationPrompt(e.target.value)}
                        placeholder="Ex: Introdução ao Marketing Digital"
                        className="min-h-[80px]"
                      />
                    </div>

                    <div>
                      <Label>Template</Label>
                      <Select value={presentationTemplate} onValueChange={setPresentationTemplate}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {presentationTemplates.map((t) => (
                            <SelectItem key={t.id} value={t.id}>
                              {t.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>Número de Slides: {slideCount}</Label>
                      <Slider
                        value={[slideCount]}
                        onValueChange={([v]) => setSlideCount(v)}
                        min={3}
                        max={15}
                        step={1}
                        className="mt-2"
                      />
                    </div>

                    <Button
                      onClick={generatePresentation}
                      disabled={isGeneratingPresentation || !presentationPrompt.trim()}
                      className="w-full"
                    >
                      {isGeneratingPresentation ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />A gerar...
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4 mr-2" />
                          Gerar Apresentação
                        </>
                      )}
                    </Button>
                  </div>
                </Card>

                <Card className="flex-1 min-h-0 flex flex-col overflow-hidden">
                  <div className="p-3 border-b border-border flex items-center justify-between">
                    <span className="font-medium text-sm">Preview</span>
                    {generatedPresentation && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => downloadContent(generatedPresentation, "presentation.html")}
                      >
                        <Download className="h-3 w-3 mr-1" />
                        Download
                      </Button>
                    )}
                  </div>
                  <div className="flex-1 min-h-0 bg-white">
                    {generatedPresentation ? (
                      <iframe
                        srcDoc={generatedPresentation}
                        className="w-full h-full border-0"
                        title="Presentation Preview"
                      />
                    ) : (
                      <div className="h-full flex items-center justify-center text-muted-foreground">
                        <p>A apresentação aparecerá aqui</p>
                      </div>
                    )}
                  </div>
                </Card>
              </div>
            </TabsContent>

            {/* Ebooks Tab */}
            <TabsContent value="ebooks" className="flex-1 flex flex-col min-h-0 m-0">
              <div className="flex-1 flex flex-col lg:flex-row gap-4 p-4 overflow-hidden">
                <Card className="lg:w-80 shrink-0 p-4">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <BookOpen className="h-5 w-5" />
                    Criar Ebook
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <Label>Título/Tema</Label>
                      <Textarea
                        value={ebookPrompt}
                        onChange={(e) => setEbookPrompt(e.target.value)}
                        placeholder="Ex: Guia Completo de Produtividade"
                        className="min-h-[80px]"
                      />
                    </div>

                    <div>
                      <Label>Estilo</Label>
                      <Select value={ebookStyle} onValueChange={setEbookStyle}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ebookStyles.map((s) => (
                            <SelectItem key={s.id} value={s.id}>
                              {s.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>Número de Capítulos: {chapterCount}</Label>
                      <Slider
                        value={[chapterCount]}
                        onValueChange={([v]) => setChapterCount(v)}
                        min={3}
                        max={15}
                        step={1}
                        className="mt-2"
                      />
                    </div>

                    <Button
                      onClick={generateEbook}
                      disabled={isGeneratingEbook || !ebookPrompt.trim()}
                      className="w-full"
                    >
                      {isGeneratingEbook ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />A gerar...
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4 mr-2" />
                          Gerar Ebook
                        </>
                      )}
                    </Button>
                  </div>
                </Card>

                <Card className="flex-1 min-h-0 flex flex-col overflow-hidden">
                  <div className="p-3 border-b border-border flex items-center justify-between">
                    <span className="font-medium text-sm">Preview</span>
                    {generatedEbook && (
                      <Button variant="outline" size="sm" onClick={() => downloadContent(generatedEbook, "ebook.html")}>
                        <Download className="h-3 w-3 mr-1" />
                        Download
                      </Button>
                    )}
                  </div>
                  <div className="flex-1 min-h-0 bg-white">
                    {generatedEbook ? (
                      <iframe srcDoc={generatedEbook} className="w-full h-full border-0" title="Ebook Preview" />
                    ) : (
                      <div className="h-full flex items-center justify-center text-muted-foreground">
                        <p>O ebook aparecerá aqui</p>
                      </div>
                    )}
                  </div>
                </Card>
              </div>
            </TabsContent>

            {/* SMS Tab - Updated with contact name parsing */}
            <TabsContent value="sms" className="flex-1 flex flex-col min-h-0 m-0">
              <ScrollArea className="flex-1">
                <div className="max-w-3xl mx-auto p-4 space-y-4">
                  <Card className="p-4 sm:p-6">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <MessageCircleIcon className="h-5 w-5" />
                      SMS em Massa com Personalizacao
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Envia SMS personalizados para multiplos contactos. Use {"{nome}"} na mensagem para personalizar
                      automaticamente.
                    </p>
                    <div className="space-y-4">
                      <div>
                        <Label>Mensagem (use {"{nome}"} para personalizar)</Label>
                        <Textarea
                          id="smsMessage"
                          placeholder="Ola {nome}, esta e uma mensagem personalizada para ti!"
                          className="min-h-[100px]"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Use {"{nome}"} que sera substituido automaticamente pelo nome de cada contacto
                        </p>
                      </div>

                      <div>
                        <Label>Prefixo do Pais (opcional)</Label>
                        <select
                          id="smsCountryCode"
                          className="w-full p-2 rounded-md border bg-background text-sm"
                          defaultValue="+351"
                        >
                          <option value="+351">Portugal (+351)</option>
                          <option value="+55">Brasil (+55)</option>
                          <option value="+34">Espanha (+34)</option>
                          <option value="+33">Franca (+33)</option>
                          <option value="+44">Reino Unido (+44)</option>
                          <option value="+1">EUA/Canada (+1)</option>
                          <option value="+49">Alemanha (+49)</option>
                          <option value="+39">Italia (+39)</option>
                          <option value="+31">Holanda (+31)</option>
                          <option value="+32">Belgica (+32)</option>
                          <option value="+41">Suica (+41)</option>
                          <option value="+244">Angola (+244)</option>
                          <option value="+258">Mocambique (+258)</option>
                          <option value="+238">Cabo Verde (+238)</option>
                          <option value="">Nenhum (numeros ja formatados)</option>
                        </select>
                      </div>

                      <div>
                        <Label>Numeros Manuais (um por linha ou Nome, Numero)</Label>
                        <Textarea
                          id="smsNumbers"
                          placeholder="Joao Silva, 912345678&#10;Maria Santos, 923456789&#10;&#10;Ou so numeros:&#10;934567890&#10;+351945678901"
                          className="min-h-[120px] font-mono text-sm"
                        />
                      </div>

                      <div>
                        <Label htmlFor="smsFile">Importar Excel com Nomes e Numeros</Label>
                        <Input type="file" id="smsFile" accept=".csv,.txt,.xlsx,.xls" className="mt-1" />
                        <p className="text-xs text-muted-foreground mt-1">
                          O Excel deve ter colunas para Nome e Numero. O sistema detecta automaticamente.
                        </p>
                      </div>

                      <div>
                        <Label>Tamanho do Lote</Label>
                        <select
                          id="smsBatchSize"
                          className="w-full p-2 rounded-md border bg-background text-sm"
                          defaultValue="20"
                        >
                          <option value="1">1 numero por lote (maximo personalizacao)</option>
                          <option value="5">5 numeros por lote</option>
                          <option value="10">10 numeros por lote</option>
                          <option value="20">20 numeros por lote (recomendado)</option>
                          <option value="30">30 numeros por lote</option>
                        </select>
                      </div>

                      <Button
                        className="w-full"
                        onClick={() => {
                          const numbersText =
                            (document.getElementById("smsNumbers") as HTMLTextAreaElement)?.value || ""
                          const fileInput = document.getElementById("smsFile") as HTMLInputElement
                          const messageElement = document.getElementById("smsMessage") as HTMLTextAreaElement
                          const countryCodeElement = document.getElementById("smsCountryCode") as HTMLSelectElement
                          const batchSizeElement = document.getElementById("smsBatchSize") as HTMLSelectElement
                          const linksContainer = document.getElementById("smsLinksContainer") as HTMLDivElement
                          const statsContainer = document.getElementById("smsStats") as HTMLDivElement
                          const invalidContainer = document.getElementById("smsInvalid") as HTMLDivElement

                          const messageTemplate = messageElement?.value || ""
                          const countryCode = countryCodeElement?.value || ""
                          const batchSize = Number.parseInt(batchSizeElement?.value || "20")

                          if (fileInput?.files?.[0]) {
                            const file = fileInput.files[0]
                            const isExcel = file.name.endsWith(".xlsx") || file.name.endsWith(".xls")

                            if (isExcel) {
                              file
                                .arrayBuffer()
                                .then((buffer) => {
                                  const fileContacts = parseExcelFile(buffer)
                                  const manualContacts = parseTextFile(numbersText)
                                  generateSmsLinks(
                                    [...manualContacts, ...fileContacts],
                                    messageTemplate,
                                    linksContainer,
                                    statsContainer,
                                    invalidContainer,
                                    countryCode,
                                    batchSize,
                                  )
                                })
                                .catch((err) => {
                                  alert("Erro ao ler ficheiro Excel: " + err.message)
                                })
                            } else {
                              file
                                .text()
                                .then((text) => {
                                  const fileContacts = parseTextFile(text)
                                  const manualContacts = parseTextFile(numbersText)
                                  generateSmsLinks(
                                    [...manualContacts, ...fileContacts],
                                    messageTemplate,
                                    linksContainer,
                                    statsContainer,
                                    invalidContainer,
                                    countryCode,
                                    batchSize,
                                  )
                                })
                                .catch((err) => {
                                  alert("Erro ao ler ficheiro de texto: " + err.message)
                                })
                            }
                          } else {
                            const manualContacts = parseTextFile(numbersText)
                            generateSmsLinks(
                              manualContacts,
                              messageTemplate,
                              linksContainer,
                              statsContainer,
                              invalidContainer,
                              countryCode,
                              batchSize,
                            )
                          }
                        }}
                      >
                        <Send className="h-4 w-4 mr-2" />
                        Validar e Gerar SMS Personalizados
                      </Button>
                    </div>
                  </Card>

                  <Card className="p-4 sm:p-6">
                    <h4 className="font-medium mb-3">Estatisticas</h4>
                    <div id="smsStats" className="mb-4">
                      <p className="text-sm text-muted-foreground">As estatisticas aparecerao aqui apos validar</p>
                    </div>
                    <div id="smsInvalid" className="mb-4"></div>
                  </Card>

                  <Card className="p-4 sm:p-6">
                    <h4 className="font-medium mb-3">Links para Envio</h4>
                    <div id="smsLinksContainer" className="space-y-3">
                      <p className="text-sm text-muted-foreground">Os links aparecerao aqui apos gerar</p>
                    </div>
                  </Card>

                  <Card className="p-4 sm:p-6 bg-muted/30">
                    <h4 className="font-medium mb-2">Como funciona</h4>
                    <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                      <li>Escreve a mensagem usando {"{nome}"} onde queres o nome do contacto</li>
                      <li>Carrega um Excel com colunas de Nome e Numero (detecta automaticamente)</li>
                      <li>Os contactos serao validados e as mensagens personalizadas</li>
                      <li>Clica no botao de cada lote para abrir SMS com mensagem personalizada</li>
                      <li>Cada contacto recebe sua mensagem com seu nome!</li>
                    </ol>
                    <div className="mt-3 p-2 bg-blue-500/10 rounded-md border border-blue-500/20">
                      <p className="text-xs text-blue-400">
                        <strong>Dica:</strong> No Excel, coloca Nome na coluna A e Numero na coluna B para melhor
                        resultado
                      </p>
                    </div>
                  </Card>
                </div>
              </ScrollArea>
            </TabsContent>

            {/* CHANGE: Add Email Mass Sending Tab after SMS Tab */}
            <TabsContent value="email" className="flex-1 flex flex-col min-h-0 m-0">
              <ScrollArea className="flex-1">
                <div className="max-w-3xl mx-auto p-4 space-y-4">
                  <Card className="p-4 sm:p-6">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <Mail className="h-5 w-5" />
                      Email em Massa
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Envia emails para multiplos contactos usando o teu cliente de email. Funciona 100% offline, sem
                      APIs externas.
                    </p>
                    <div className="space-y-4">
                      <div>
                        <Label>Assunto do Email</Label>
                        <Input id="emailSubject" placeholder="Assunto do email..." />
                      </div>

                      <div>
                        <Label>Corpo do Email</Label>
                        <Textarea
                          id="emailBody"
                          placeholder="Escreve o conteudo do email aqui..."
                          className="min-h-[150px]"
                        />
                      </div>

                      <div>
                        <Label>Emails (um por linha)</Label>
                        <Textarea
                          id="emailAddresses"
                          placeholder="email1@exemplo.com&#10;email2@exemplo.com&#10;email3@exemplo.com"
                          className="min-h-[120px] font-mono text-sm"
                        />
                      </div>

                      <div>
                        <Label htmlFor="emailFile">Importar Ficheiro (CSV, TXT, Excel)</Label>
                        <Input type="file" id="emailFile" accept=".csv,.txt,.xlsx,.xls" className="mt-1" />
                        <p className="text-xs text-muted-foreground mt-1">
                          Formatos aceites: CSV, TXT (um email por linha), ou Excel (.xlsx, .xls)
                        </p>
                      </div>

                      <div>
                        <Label>Tamanho do Lote (BCC)</Label>
                        <select
                          id="emailBatchSize"
                          className="w-full p-2 rounded-md border bg-background text-sm"
                          defaultValue="50"
                        >
                          <option value="20">20 emails por lote</option>
                          <option value="50">50 emails por lote (recomendado)</option>
                          <option value="100">100 emails por lote</option>
                        </select>
                      </div>

                      <Button
                        className="w-full"
                        onClick={() => {
                          const subject = (document.getElementById("emailSubject") as HTMLInputElement)?.value || ""
                          const body = (document.getElementById("emailBody") as HTMLTextAreaElement)?.value || ""
                          const emailsText =
                            (document.getElementById("emailAddresses") as HTMLTextAreaElement)?.value || ""
                          const batchSizeElement = document.getElementById("emailBatchSize") as HTMLSelectElement
                          const fileInput = document.getElementById("emailFile") as HTMLInputElement

                          const batchSize = Number.parseInt(batchSizeElement?.value || "50")

                          // Funcao para validar email
                          const validateEmail = (
                            email: string,
                          ): { valid: boolean; formatted: string; original: string } => {
                            const cleaned = email.trim().toLowerCase()
                            if (!cleaned) return { valid: false, formatted: "", original: email }

                            // Regex simples para validar email
                            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
                            if (emailRegex.test(cleaned)) {
                              return { valid: true, formatted: cleaned, original: email }
                            }
                            return { valid: false, formatted: "", original: email }
                          }

                          const parseTextFile = (text: string): string[] => {
                            const lines = text.split(/\r?\n/)
                            const emails: string[] = []

                            for (const line of lines) {
                              const cells = line.split(/[,;\t]/)
                              for (const cell of cells) {
                                const trimmed = cell.trim().replace(/"/g, "")
                                if (trimmed.includes("@")) {
                                  emails.push(trimmed)
                                }
                              }
                            }
                            return emails
                          }

                          const parseExcelFile = (buffer: ArrayBuffer): string[] => {
                            const emails: string[] = []
                            try {
                              const workbook = XLSX.read(buffer, { type: "array" })
                              for (const sheetName of workbook.SheetNames) {
                                const sheet = workbook.Sheets[sheetName]
                                const data = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][]
                                for (const row of data) {
                                  if (!row) continue
                                  for (const cell of row) {
                                    if (cell === null || cell === undefined) continue
                                    const value = String(cell).trim()
                                    if (value.includes("@")) {
                                      emails.push(value)
                                    }
                                  }
                                }
                              }
                            } catch (error) {
                              console.error("Erro ao processar Excel:", error)
                            }
                            return emails
                          }

                          const processEmails = (allEmails: string[]) => {
                            const validEmails: string[] = []
                            const invalidEmails: string[] = []
                            const seen = new Set<string>()

                            for (const email of allEmails) {
                              const result = validateEmail(email)
                              if (result.valid) {
                                if (!seen.has(result.formatted)) {
                                  seen.add(result.formatted)
                                  validEmails.push(result.formatted)
                                }
                              } else if (email.trim()) {
                                invalidEmails.push(email)
                              }
                            }

                            // Dividir em lotes
                            const batches: string[][] = []
                            for (let i = 0; i < validEmails.length; i += batchSize) {
                              batches.push(validEmails.slice(i, i + batchSize))
                            }

                            // Mostrar estatisticas
                            const statsContainer = document.getElementById("emailStats")
                            if (statsContainer) {
                              statsContainer.innerHTML = `
                                <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
                                  <div class="p-2 rounded bg-green-500/10 text-green-500">
                                    <div class="font-bold">${validEmails.length}</div>
                                    <div class="text-xs">Validos</div>
                                  </div>
                                  <div class="p-2 rounded bg-red-500/10 text-red-500">
                                    <div class="font-bold">${invalidEmails.length}</div>
                                    <div class="text-xs">Invalidos</div>
                                  </div>
                                  <div class="p-2 rounded bg-yellow-500/10 text-yellow-500">
                                    <div class="font-bold">${allEmails.length - validEmails.length - invalidEmails.length}</div>
                                    <div class="text-xs">Duplicados</div>
                                  </div>
                                  <div class="p-2 rounded bg-blue-500/10 text-blue-500">
                                    <div class="font-bold">${batches.length}</div>
                                    <div class="text-xs">Lotes</div>
                                  </div>
                                </div>
                              `
                            }

                            // Mostrar invalidos
                            const invalidContainer = document.getElementById("emailInvalid")
                            if (invalidContainer && invalidEmails.length > 0) {
                              invalidContainer.innerHTML = `
                                <div class="p-3 rounded bg-red-500/10 border border-red-500/20">
                                  <p class="text-sm font-medium text-red-500 mb-2">Emails invalidos (${invalidEmails.length}):</p>
                                  <p class="text-xs text-muted-foreground font-mono">${invalidEmails.slice(0, 10).join(", ")}${invalidEmails.length > 10 ? ` e mais ${invalidEmails.length - 10}...` : ""}</p>
                                </div>
                              `
                            } else if (invalidContainer) {
                              invalidContainer.innerHTML = ""
                            }

                            // Gerar links
                            const linksContainer = document.getElementById("emailLinksContainer")
                            if (linksContainer) {
                              if (batches.length === 0) {
                                linksContainer.innerHTML =
                                  '<p class="text-sm text-muted-foreground">Nenhum email valido encontrado</p>'
                                return
                              }

                              linksContainer.innerHTML = batches
                                .map((batch, index) => {
                                  const bccList = batch.join(",")
                                  const mailtoUrl = `mailto:?bcc=${encodeURIComponent(bccList)}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`

                                  return `
                                  <div class="p-3 rounded-lg border bg-card">
                                    <div class="flex items-center justify-between mb-2">
                                      <span class="font-medium">Lote ${index + 1}</span>
                                      <span class="text-xs text-muted-foreground">${batch.length} emails</span>
                                    </div>
                                    <div class="flex gap-2">
                                      <a href="${mailtoUrl}" class="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
                                        Abrir Email
                                      </a>
                                      <button onclick="navigator.clipboard.writeText('${batch.join("; ")}')"" class="px-3 py-2 rounded-md border hover:bg-muted text-sm">
                                        Copiar
                                      </button>
                                    </div>
                                  </div>
                                `
                                })
                                .join("")
                            }
                          }

                          if (fileInput?.files?.[0]) {
                            const file = fileInput.files[0]
                            const isExcel = file.name.endsWith(".xlsx") || file.name.endsWith(".xls")

                            if (isExcel) {
                              file
                                .arrayBuffer()
                                .then((buffer) => {
                                  const fileEmails = parseExcelFile(buffer)
                                  const manualEmails = emailsText
                                    .split("\n")
                                    .map((e) => e.trim())
                                    .filter((e) => e.length > 0)
                                  processEmails([...manualEmails, ...fileEmails])
                                })
                                .catch((err) => {
                                  alert("Erro ao ler ficheiro Excel: " + err.message)
                                })
                            } else {
                              file
                                .text()
                                .then((text) => {
                                  const fileEmails = parseTextFile(text)
                                  const manualEmails = emailsText
                                    .split("\n")
                                    .map((e) => e.trim())
                                    .filter((e) => e.length > 0)
                                  processEmails([...manualEmails, ...fileEmails])
                                })
                                .catch((err) => {
                                  alert("Erro ao ler ficheiro: " + err.message)
                                })
                            }
                          } else {
                            const manualEmails = emailsText
                              .split("\n")
                              .map((e) => e.trim())
                              .filter((e) => e.length > 0)
                            processEmails(manualEmails)
                          }
                        }}
                      >
                        <Mail className="h-4 w-4 mr-2" />
                        Validar e Gerar Links Email
                      </Button>
                    </div>
                  </Card>

                  <Card className="p-4 sm:p-6">
                    <h4 className="font-medium mb-3">Estatisticas</h4>
                    <div id="emailStats" className="mb-4">
                      <p className="text-sm text-muted-foreground">As estatisticas aparecerao aqui apos validar</p>
                    </div>
                    <div id="emailInvalid" className="mb-4"></div>
                  </Card>

                  <Card className="p-4 sm:p-6">
                    <h4 className="font-medium mb-3">Links para Envio</h4>
                    <div id="emailLinksContainer" className="space-y-3">
                      <p className="text-sm text-muted-foreground">Os links aparecerao aqui apos gerar</p>
                    </div>
                  </Card>

                  <Card className="p-4 sm:p-6 bg-muted/30">
                    <h4 className="font-medium mb-2">Como funciona</h4>
                    <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                      <li>Escreve o assunto e corpo do email</li>
                      <li>Insere os emails manualmente ou carrega um ficheiro CSV/TXT/Excel</li>
                      <li>Os emails serao validados e organizados em lotes BCC</li>
                      <li>Clica no botao de cada lote para abrir o teu cliente de email</li>
                      <li>Confirma e envia - os destinatarios nao veem os outros emails!</li>
                    </ol>
                  </Card>
                </div>
              </ScrollArea>
            </TabsContent>

            {/* CHANGE: Add WhatsApp Mass Sending Tab */}
            <TabsContent value="whatsapp" className="flex-1 flex flex-col min-h-0 m-0">
              <ScrollArea className="flex-1">
                <div className="max-w-3xl mx-auto p-4 space-y-4">
                  <Card className="p-4 sm:p-6">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <Share2 className="h-5 w-5 text-green-500" />
                      WhatsApp em Massa
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Envia mensagens WhatsApp para multiplos contactos. Gera links individuais que abrem o WhatsApp com
                      a mensagem pre-preenchida.
                    </p>
                    <div className="space-y-4">
                      <div>
                        <Label>Mensagem</Label>
                        <Textarea
                          id="waMessage"
                          placeholder="Escreve a tua mensagem aqui...&#10;&#10;Podes usar *negrito*, _italico_ e ~riscado~"
                          className="min-h-[120px]"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Suporta formatacao WhatsApp: *negrito*, _italico_, ~riscado~
                        </p>
                      </div>

                      <div>
                        <Label>Prefixo do Pais</Label>
                        <select
                          id="waCountryCode"
                          className="w-full p-2 rounded-md border bg-background text-sm"
                          defaultValue="351"
                        >
                          <option value="351">Portugal (351)</option>
                          <option value="55">Brasil (55)</option>
                          <option value="34">Espanha (34)</option>
                          <option value="33">Franca (33)</option>
                          <option value="44">Reino Unido (44)</option>
                          <option value="1">EUA/Canada (1)</option>
                          <option value="49">Alemanha (49)</option>
                          <option value="39">Italia (39)</option>
                          <option value="244">Angola (244)</option>
                          <option value="258">Mocambique (258)</option>
                          <option value="238">Cabo Verde (238)</option>
                          <option value="">Nenhum (numeros ja formatados)</option>
                        </select>
                      </div>

                      <div>
                        <Label>Numeros (um por linha)</Label>
                        <Textarea
                          id="waNumbers"
                          placeholder="912345678&#10;923456789&#10;934567890"
                          className="min-h-[120px] font-mono text-sm"
                        />
                      </div>

                      <div>
                        <Label htmlFor="waFile">Importar Ficheiro (CSV, TXT, Excel)</Label>
                        <Input type="file" id="waFile" accept=".csv,.txt,.xlsx,.xls" className="mt-1" />
                      </div>

                      <Button
                        className="w-full bg-green-600 hover:bg-green-700"
                        onClick={() => {
                          const message = (document.getElementById("waMessage") as HTMLTextAreaElement)?.value || ""
                          const numbersText = (document.getElementById("waNumbers") as HTMLTextAreaElement)?.value || ""
                          const countryCodeElement = document.getElementById("waCountryCode") as HTMLSelectElement
                          const fileInput = document.getElementById("waFile") as HTMLInputElement

                          const countryCode = countryCodeElement?.value || ""

                          // Funcao para validar e formatar numero para WhatsApp (so digitos)
                          const validateNumber = (
                            num: string,
                          ): { valid: boolean; formatted: string; original: string } => {
                            let cleaned = num.replace(/[\s\-().+]/g, "").trim()
                            if (!cleaned) return { valid: false, formatted: "", original: num }

                            // Remover zeros iniciais se houver prefixo de pais
                            if (countryCode && cleaned.startsWith("0")) {
                              cleaned = cleaned.slice(1)
                            }

                            // Verificar se tem apenas digitos
                            if (!/^\d+$/.test(cleaned)) {
                              return { valid: false, formatted: "", original: num }
                            }

                            // Verificar tamanho
                            if (cleaned.length < 8 || cleaned.length > 15) {
                              return { valid: false, formatted: "", original: num }
                            }

                            // Adicionar prefixo do pais
                            const formatted = countryCode ? countryCode + cleaned : cleaned
                            return { valid: true, formatted, original: num }
                          }

                          const parseTextFile = (text: string): string[] => {
                            const lines = text.split(/\r?\n/)
                            const numbers: string[] = []
                            for (const line of lines) {
                              const cells = line.split(/[,;\t]/)
                              for (const cell of cells) {
                                const trimmed = cell.trim().replace(/"/g, "")
                                if (/^[\d\s\-().+]{8,}$/.test(trimmed)) {
                                  numbers.push(trimmed)
                                }
                              }
                            }
                            return numbers
                          }

                          const parseExcelFile = (buffer: ArrayBuffer): string[] => {
                            const numbers: string[] = []
                            try {
                              const workbook = XLSX.read(buffer, { type: "array" })
                              for (const sheetName of workbook.SheetNames) {
                                const sheet = workbook.Sheets[sheetName]
                                const data = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][]
                                for (const row of data) {
                                  if (!row) continue
                                  for (const cell of row) {
                                    if (cell === null || cell === undefined) continue
                                    const value = String(cell).trim()
                                    if (/^[\d\s\-().+]{8,}$/.test(value)) {
                                      numbers.push(value)
                                    }
                                  }
                                }
                              }
                            } catch (error) {
                              console.error("Erro ao processar Excel:", error)
                            }
                            return numbers
                          }

                          const processNumbers = (allNumbers: string[]) => {
                            const validNumbers: string[] = []
                            const invalidNumbers: string[] = []
                            const seen = new Set<string>()

                            for (const num of allNumbers) {
                              const result = validateNumber(num)
                              if (result.valid) {
                                if (!seen.has(result.formatted)) {
                                  seen.add(result.formatted)
                                  validNumbers.push(result.formatted)
                                }
                              } else if (num.trim()) {
                                invalidNumbers.push(num)
                              }
                            }

                            // Mostrar estatisticas
                            const statsContainer = document.getElementById("waStats")
                            if (statsContainer) {
                              statsContainer.innerHTML = `
                                <div class="grid grid-cols-3 gap-2 text-sm">
                                  <div class="p-2 rounded bg-green-500/10 text-green-500">
                                    <div class="font-bold">${validNumbers.length}</div>
                                    <div class="text-xs">Validos</div>
                                  </div>
                                  <div class="p-2 rounded bg-red-500/10 text-red-500">
                                    <div class="font-bold">${invalidNumbers.length}</div>
                                    <div class="text-xs">Invalidos</div>
                                  </div>
                                  <div class="p-2 rounded bg-yellow-500/10 text-yellow-500">
                                    <div class="font-bold">${allNumbers.length - validNumbers.length - invalidNumbers.length}</div>
                                    <div class="text-xs">Duplicados</div>
                                  </div>
                                </div>
                              `
                            }

                            // Mostrar invalidos
                            const invalidContainer = document.getElementById("waInvalid")
                            if (invalidContainer && invalidNumbers.length > 0) {
                              invalidContainer.innerHTML = `
                                <div class="p-3 rounded bg-red-500/10 border border-red-500/20">
                                  <p class="text-sm font-medium text-red-500 mb-2">Numeros invalidos (${invalidNumbers.length}):</p>
                                  <p class="text-xs text-muted-foreground font-mono">${invalidNumbers.slice(0, 10).join(", ")}${invalidNumbers.length > 10 ? ` e mais ${invalidNumbers.length - 10}...` : ""}</p>
                                </div>
                              `
                            } else if (invalidContainer) {
                              invalidContainer.innerHTML = ""
                            }

                            // Gerar links WhatsApp
                            const linksContainer = document.getElementById("waLinksContainer")
                            if (linksContainer) {
                              if (validNumbers.length === 0) {
                                linksContainer.innerHTML =
                                  '<p class="text-sm text-muted-foreground">Nenhum numero valido encontrado</p>'
                                return
                              }

                              const encodedMessage = encodeURIComponent(message)

                              linksContainer.innerHTML = `
                                <p class="text-sm text-muted-foreground mb-3">Clica em cada numero para abrir o WhatsApp com a mensagem pre-preenchida:</p>
                                <div class="grid gap-2 max-h-[400px] overflow-y-auto">
                                  ${validNumbers
                                    .map((num, index) => {
                                      const waUrl = `https://wa.me/${num}?text=${encodedMessage}`
                                      return `
                                      <a href="${waUrl}" target="_blank" rel="noopener noreferrer" class="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted transition-colors">
                                        <div class="flex items-center gap-3">
                                          <span class="text-xs text-muted-foreground w-6">${index + 1}.</span>
                                          <span class="font-mono">+${num}</span>
                                        </div>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" class="text-green-500"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                                      </a>
                                    `
                                    })
                                    .join("")}
                                </div>
                                <div class="mt-4 p-3 rounded bg-muted/50">
                                  <p class="text-xs text-muted-foreground">
                                    <strong>Nota:</strong> O WhatsApp nao permite envio em massa automatico. Cada link abre uma conversa individual.
                                    Para envio rapido, abre cada link, envia, e volta aqui para o proximo.
                                  </p>
                                </div>
                              `
                            }
                          }

                          if (fileInput?.files?.[0]) {
                            const file = fileInput.files[0]
                            const isExcel = file.name.endsWith(".xlsx") || file.name.endsWith(".xls")

                            if (isExcel) {
                              file
                                .arrayBuffer()
                                .then((buffer) => {
                                  const fileNumbers = parseExcelFile(buffer)
                                  const manualNumbers = numbersText
                                    .split("\n")
                                    .map((n) => n.trim())
                                    .filter((n) => n.length > 0)
                                  processNumbers([...manualNumbers, ...fileNumbers])
                                })
                                .catch((err) => {
                                  alert("Erro ao ler ficheiro Excel: " + err.message)
                                })
                            } else {
                              file
                                .text()
                                .then((text) => {
                                  const fileNumbers = parseTextFile(text)
                                  const manualNumbers = numbersText
                                    .split("\n")
                                    .map((n) => n.trim())
                                    .filter((n) => n.length > 0)
                                  processNumbers([...manualNumbers, ...fileNumbers])
                                })
                                .catch((err) => {
                                  alert("Erro ao ler ficheiro: " + err.message)
                                })
                            }
                          } else {
                            const manualNumbers = numbersText
                              .split("\n")
                              .map((n) => n.trim())
                              .filter((n) => n.length > 0)
                            processNumbers(manualNumbers)
                          }
                        }}
                      >
                        <Share2 className="h-4 w-4 mr-2" />
                        Validar e Gerar Links WhatsApp
                      </Button>
                    </div>
                  </Card>

                  <Card className="p-4 sm:p-6">
                    <h4 className="font-medium mb-3">Estatisticas</h4>
                    <div id="waStats" className="mb-4">
                      <p className="text-sm text-muted-foreground">As estatisticas aparecerao aqui apos validar</p>
                    </div>
                    <div id="waInvalid" className="mb-4"></div>
                  </Card>

                  <Card className="p-4 sm:p-6">
                    <h4 className="font-medium mb-3">Links WhatsApp</h4>
                    <div id="waLinksContainer" className="space-y-3">
                      <p className="text-sm text-muted-foreground">Os links aparecerao aqui apos gerar</p>
                    </div>
                  </Card>

                  <Card className="p-4 sm:p-6 bg-muted/30">
                    <h4 className="font-medium mb-2">Como funciona</h4>
                    <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                      <li>Escreve a mensagem (suporta formatacao WhatsApp)</li>
                      <li>Insere os numeros manualmente ou carrega um ficheiro</li>
                      <li>Os numeros serao validados e formatados</li>
                      <li>Clica em cada numero para abrir o WhatsApp Web/App</li>
                      <li>A mensagem ja estara pre-preenchida, so precisas de enviar!</li>
                    </ol>
                  </Card>
                </div>
              </ScrollArea>
            </TabsContent>

            {/* Clipper Tab - Adding clipper functionality */}
            <TabsContent value="clipper" className="flex-1 flex flex-col min-h-0 m-0">
              <div className="max-w-4xl mx-auto w-full space-y-4 p-4">
                <Card className="p-4 sm:p-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Scissors className="h-5 w-5" />
                    Clipper AI
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Transforma vídeos longos em clips curtos otimizados para TikTok, Reels e Shorts.
                  </p>
                  <div className="grid gap-4">
                    <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
                      <Video className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground mb-4">Arrasta um vídeo ou clica para selecionar</p>
                      <Input type="file" accept="video/*" className="max-w-xs mx-auto" />
                    </div>
                    <div className="flex gap-2">
                      <Button className="flex-1" disabled>
                        <Sparkles className="h-4 w-4 mr-2" />
                        Gerar Clips (Em breve)
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground text-center">
                      Requer configuração do Cloudflare Worker. Consulta /clipper para a versão completa.
                    </p>
                  </div>
                </Card>
              </div>
            </TabsContent>

            {/* Marketing Tab */}
            <TabsContent value="marketing" className="flex-1 flex flex-col min-h-0 m-0">
              <ScrollArea className="flex-1">
                <div className="max-w-4xl mx-auto w-full space-y-6 p-4 pb-20">
                  <div className="text-center mb-6">
                    <h2 className="text-2xl font-bold mb-2">Marketing Studio</h2>
                    <p className="text-muted-foreground">Cria posts, banners, stories e thumbnails profissionais</p>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Settings Panel */}
                    <Card className="p-4 sm:p-6 space-y-4">
                      <h3 className="font-semibold flex items-center gap-2">
                        <Settings className="h-4 w-4" />
                        Configuracoes
                      </h3>

                      {/* Type Selection */}
                      <div className="space-y-2">
                        <Label>Tipo de Conteudo</Label>
                        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                          {[
                            { id: "post", label: "Post", icon: Square },
                            { id: "banner", label: "Banner", icon: Monitor },
                            { id: "story", label: "Story", icon: Smartphone },
                            { id: "thumbnail", label: "Thumbnail", icon: Play },
                            { id: "logo", label: "Logo", icon: Hexagon },
                          ].map(({ id, label, icon: Icon }) => (
                            <Button
                              key={id}
                              variant={marketingType === id ? "default" : "outline"}
                              size="sm"
                              onClick={() => setMarketingType(id as any)}
                              className="flex flex-col h-auto py-2"
                            >
                              <Icon className="h-4 w-4 mb-1" />
                              <span className="text-xs">{label}</span>
                            </Button>
                          ))}
                        </div>
                      </div>

                      {/* Platform Selection */}
                      <div className="space-y-2">
                        <Label>Plataforma</Label>
                        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                          {[
                            { id: "instagram", icon: Instagram, color: "#E4405F" },
                            { id: "facebook", icon: Facebook, color: "#1877F2" },
                            { id: "twitter", icon: Twitter, color: "#1DA1F2" },
                            { id: "linkedin", icon: Linkedin, color: "#0A66C2" },
                            { id: "youtube", icon: Youtube, color: "#FF0000" },
                            { id: "tiktok", icon: Video, color: "#000000" },
                          ].map(({ id, icon: Icon, color }) => (
                            <Button
                              key={id}
                              variant={marketingPlatform === id ? "default" : "outline"}
                              size="sm"
                              onClick={() => setMarketingPlatform(id as any)}
                              className="flex flex-col h-auto py-2"
                              style={marketingPlatform === id ? { backgroundColor: color } : {}}
                            >
                              <Icon className="h-4 w-4" />
                            </Button>
                          ))}
                        </div>
                      </div>

                      {/* Style Selection */}
                      <div className="space-y-2">
                        <Label>Estilo Visual</Label>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {[
                            { id: "minimal", label: "Minimalista", gradient: "from-gray-100 to-gray-200" },
                            { id: "bold", label: "Bold", gradient: "from-red-500 to-orange-500" },
                            { id: "elegant", label: "Elegante", gradient: "from-amber-200 to-yellow-500" },
                            { id: "playful", label: "Divertido", gradient: "from-pink-400 to-purple-500" },
                            { id: "corporate", label: "Corporativo", gradient: "from-blue-600 to-blue-800" },
                            { id: "neon", label: "Neon", gradient: "from-cyan-400 to-purple-600" },
                          ].map(({ id, label, gradient }) => (
                            <Button
                              key={id}
                              variant={marketingStyle === id ? "default" : "outline"}
                              size="sm"
                              onClick={() => setMarketingStyle(id as any)}
                              className={`bg-gradient-to-r ${gradient} ${marketingStyle === id ? "ring-2 ring-primary" : ""}`}
                            >
                              {label}
                            </Button>
                          ))}
                        </div>
                      </div>

                      {/* Color Picker */}
                      <div className="space-y-2">
                        <Label>Cor Principal</Label>
                        <div className="flex gap-2">
                          <input
                            type="color"
                            value={marketingColor}
                            onChange={(e) => setMarketingColor(e.target.value)}
                            className="w-12 h-10 rounded cursor-pointer"
                          />
                          <div className="flex gap-1 flex-wrap">
                            {[
                              "#6366f1",
                              "#ec4899",
                              "#10b981",
                              "#f59e0b",
                              "#ef4444",
                              "#3b82f6",
                              "#8b5cf6",
                              "#000000",
                            ].map((color) => (
                              <button
                                key={color}
                                onClick={() => setMarketingColor(color)}
                                className={`w-8 h-8 rounded-full border-2 ${marketingColor === color ? "border-white ring-2 ring-primary" : "border-transparent"}`}
                                style={{ backgroundColor: color }}
                              />
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Text Input */}
                      <div className="space-y-2">
                        <Label>Texto Principal</Label>
                        <Textarea
                          placeholder="Ex: Grande Promocao de Verao - Ate 50% OFF"
                          value={marketingText}
                          onChange={(e) => setMarketingText(e.target.value)}
                          className="min-h-[80px]"
                        />
                      </div>

                      <Button
                        className="w-full"
                        onClick={generateMarketing}
                        disabled={isGeneratingMarketing || !marketingText.trim()}
                      >
                        {isGeneratingMarketing ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />A gerar...
                          </>
                        ) : (
                          <>
                            <Sparkles className="h-4 w-4 mr-2" />
                            Gerar Design
                          </>
                        )}
                      </Button>
                    </Card>

                    {/* Preview Panel */}
                    <Card className="p-4 sm:p-6">
                      <h3 className="font-semibold mb-4 flex items-center gap-2">
                        <Eye className="h-4 w-4" />
                        Preview
                      </h3>

                      <div className="aspect-square bg-muted rounded-lg overflow-hidden flex items-center justify-center">
                        {generatedMarketing ? (
                          <img
                            src={generatedMarketing || "/placeholder.svg"}
                            alt="Generated marketing"
                            className="w-full h-full object-contain"
                          />
                        ) : (
                          <div className="text-center text-muted-foreground p-4">
                            <ImageIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
                            <p>O preview aparecera aqui</p>
                          </div>
                        )}
                      </div>

                      {generatedMarketing && (
                        <div className="flex gap-2 mt-4">
                          <Button asChild className="flex-1">
                            <a
                              href={generatedMarketing}
                              download="marketing-design.png"
                              target="_blank"
                              rel="noreferrer"
                            >
                              <Download className="h-4 w-4 mr-2" />
                              Download
                            </a>
                          </Button>
                          <Button variant="outline" onClick={() => setGeneratedMarketing(null)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </Card>
                  </div>

                  {/* Templates Gallery */}
                  <Card className="p-4 sm:p-6">
                    <h3 className="font-semibold mb-4">Templates Rapidos</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {[
                        { text: "Promocao Especial", style: "bold", type: "post" },
                        { text: "Novo Produto", style: "elegant", type: "post" },
                        { text: "Inscricoes Abertas", style: "corporate", type: "banner" },
                        { text: "Evento Online", style: "neon", type: "story" },
                        { text: "Tutorial Video", style: "playful", type: "thumbnail" },
                        { text: "Dica do Dia", style: "minimal", type: "post" },
                        { text: "Lancamento", style: "bold", type: "story" },
                        { text: "Desconto Flash", style: "neon", type: "post" },
                      ].map((template, i) => (
                        <Button
                          key={i}
                          variant="outline"
                          className="h-auto py-3 flex flex-col bg-transparent"
                          onClick={() => {
                            setMarketingText(template.text)
                            setMarketingStyle(template.style as any)
                            setMarketingType(template.type as any)
                          }}
                        >
                          <span className="text-sm font-medium">{template.text}</span>
                          <span className="text-xs text-muted-foreground capitalize">
                            {template.style} • {template.type}
                          </span>
                        </Button>
                      ))}
                    </div>
                  </Card>
                </div>
              </ScrollArea>
            </TabsContent>

            {/* Pro Tab - Integrates all Pro features */}
            <TabsContent value="pro" className="h-full mt-0 data-[state=active]:flex data-[state=active]:flex-col">
              <ScrollArea className="flex-1">
                <div className="max-w-6xl mx-auto py-4 px-4">
                  <Tabs defaultValue="webcraft" className="w-full">
                    <TabsList className="grid w-full grid-cols-4 mb-6">
                      <TabsTrigger value="webcraft">WebCraft</TabsTrigger>
                      <TabsTrigger value="images">Images</TabsTrigger>
                      <TabsTrigger value="clipper">Clipper</TabsTrigger>
                      <TabsTrigger value="export">Export</TabsTrigger>
                    </TabsList>

                    <TabsContent value="webcraft" className="space-y-4">
                      <WebCraftProTab />
                    </TabsContent>

                    <TabsContent value="images" className="space-y-4">
                      <ImageGeneratorProTab />
                    </TabsContent>

                    <TabsContent value="clipper" className="space-y-4">
                      <CliperAITab />
                    </TabsContent>

                    <TabsContent value="export" className="space-y-4">
                      <GlobalExportTab />
                    </TabsContent>
                  </Tabs>
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </main>
      </div>

      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />

      {showProModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <Card className="w-full max-w-lg bg-card border-border shadow-2xl">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold gradient-text">Reborn AI Pro</h2>
                <Button variant="ghost" size="icon" onClick={() => setShowProModal(false)}>
                  <X className="h-5 w-5" />
                </Button>
              </div>

              <div className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Zap className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold">Gerações Ilimitadas</p>
                      <p className="text-sm text-muted-foreground">Sem limites de uso</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Sparkles className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold">Prioridade no Processamento</p>
                      <p className="text-sm text-muted-foreground">Resposta mais rápida</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Rocket className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold">Funcionalidades Exclusivas</p>
                      <p className="text-sm text-muted-foreground">Acesso a novos recursos primeiro</p>
                    </div>
                  </div>
                </div>

                <div className="border-t border-border pt-6">
                  <div className="text-center mb-4">
                    <p className="text-3xl font-bold">
                      €9.99<span className="text-lg text-muted-foreground">/mês</span>
                    </p>
                  </div>
                  <Button className="w-full" size="lg" onClick={handleUpgradePro}>
                    Subscrever Agora
                  </Button>
                  <p className="text-xs text-center text-muted-foreground mt-3">
                    Cancele a qualquer momento. Renovação automática.
                  </p>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      <GDPRBanner />

      <a
        href="https://wa.me/968677320"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-16 right-3 sm:bottom-20 sm:right-4 z-50 bg-green-600 text-white p-2 sm:p-2.5 rounded-full shadow-lg hover:bg-green-700 transition-all hover:scale-110"
        aria-label="Contactar via WhatsApp"
      >
        <MessageCircle className="h-5 w-5 sm:h-6 sm:w-6" />
      </a>

      <div className="fixed bottom-3 left-3 z-50 bg-black/70 backdrop-blur-sm rounded-md p-1 shadow-md">
        <audio
          src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Em%20um%20mundo%20acelerado%2C%20onde%20tudo%20%C3%A9%20conex%20%281%29-grzbOEqHGivnGcHpOmGX2QXzwqJmGp.mp3"
          controls
          loop
          className="h-6 w-32 sm:h-7 sm:w-40"
          style={{
            filter: "invert(1) hue-rotate(180deg)",
          }}
        />
      </div>

      {/* Overlay when sidebar is open on mobile */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 bg-black/50 z-40" onClick={() => setSidebarOpen(false)} />
      )}
    </div>
  )
}
