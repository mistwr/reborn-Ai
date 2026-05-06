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
  Pause,
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
  Music,
  Music2,
} from "lucide-react"
import ReactMarkdown from "react-markdown"
import * as XLSX from "xlsx"
import { LiveChat } from "@/components/live-chat"
import { VisionTab } from "@/components/vision-tab"
import { FacebookAutoPost } from "@/components/facebook-auto-post"
import { ChatWelcome } from "@/components/chat-welcome"
import { ImageGenerator } from "@/components/image-generator"
import { MarketingStudio } from "@/components/marketing-studio"
import { PresentationStudio } from "@/components/presentation-studio"
import { MessagingHub } from "@/components/messaging-hub"
import { EbookStudio } from "@/components/ebook-studio"
import { WebCraftStudio } from "@/components/webcraft-studio"
import { ClipperStudio } from "@/components/clipper-studio"

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



  // Presentation state


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

  // Background Music state
  const [isMusicPlaying, setIsMusicPlaying] = useState(false)
  const [showMusicPlayer, setShowMusicPlayer] = useState(false)
  const [showMiniPlayer, setShowMiniPlayer] = useState(false)
  const [currentVideoId, setCurrentVideoId] = useState("rUlFW5gRiFE")
  const [currentVideoTitle, setCurrentVideoTitle] = useState("Lo-Fi Hip Hop Radio")
  const [youtubeSearchQuery, setYoutubeSearchQuery] = useState("")
  const youtubePlayerRef = useRef<HTMLIFrameElement>(null)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { data: session } = useSession()
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [showProModal, setShowProModal] = useState(false)
  const [isPro, setIsPro] = useState(false) // Assume not Pro initially, you'd likely fetch this from user data
  const [tokenCount, setTokenCount] = useState(0) // Track token usage
  const [showTokenLimitMessage, setShowTokenLimitMessage] = useState(false)
  const FREE_TOKEN_LIMIT = 100

  const startLiveMode = () => {
    setLiveMode({
      isActive: true,
      isMicOn: true,
      isCameraOn: true,
      isProcessing: false,
      transcript: "",
      response: "",
    })
  }

  const stopLiveMode = () => {
    setLiveMode(null)
  }

  const toggleLiveMic = () => {
    if (!liveMode) return
    setLiveMode((prev) => (prev ? { ...prev, isMicOn: !prev.isMicOn } : null))
  }

  const toggleLiveCamera = () => {
    if (!liveMode) return
    setLiveMode((prev) => (prev ? { ...prev, isCameraOn: !prev.isCameraOn } : null))
  }

  // Load data from localStorage
  useEffect(() => {
    loadChatHistories()
    createNewChat() // Initialize with a new chat
    
    // Load token count from localStorage
    const savedTokens = localStorage.getItem("rebornai-tokens")
    if (savedTokens) {
      setTokenCount(parseInt(savedTokens, 10))
    }
  }, [])

  // Give bonus tokens when user logs in
  useEffect(() => {
    if (session?.user) {
      const bonusKey = `rebornai-bonus-${session.user.email}`
      const hasReceivedBonus = localStorage.getItem(bonusKey)
      if (!hasReceivedBonus) {
        // Give 50 bonus tokens for creating account
        setTokenCount(prev => {
          const newCount = Math.max(0, prev - 50) // Subtract 50 (giving back tokens)
          localStorage.setItem("rebornai-tokens", newCount.toString())
          return newCount
        })
        localStorage.setItem(bonusKey, "true")
      }
    }
  }, [session])

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

  // Compress image before uploading to stay under API payload limits
  const compressImageForChat = (file: File, maxDimension: number = 1280, quality: number = 0.7): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => {
        let { width, height } = img
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width)
            width = maxDimension
          } else {
            width = Math.round((width * maxDimension) / height)
            height = maxDimension
          }
        }
        const canvas = document.createElement("canvas")
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext("2d")
        if (!ctx) {
          reject(new Error("Canvas context not available"))
          return
        }
        ctx.drawImage(img, 0, 0, width, height)
        const dataUrl = canvas.toDataURL("image/jpeg", quality)
        resolve(dataUrl)
      }
      img.onerror = () => reject(new Error("Failed to load image"))
      const reader = new FileReader()
      reader.onload = () => { img.src = reader.result as string }
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      try {
        // Compress images larger than 500KB
        if (file.size > 500 * 1024 && file.type.startsWith("image/")) {
          const compressed = await compressImageForChat(file, 1280, 0.7)
          setSelectedImage(compressed)
        } else {
          const reader = new FileReader()
          reader.onload = (event) => {
            setSelectedImage(event.target?.result as string)
          }
          reader.readAsDataURL(file)
        }
      } catch (err) {
        console.error("Error compressing image:", err)
        // Fallback to original
        const reader = new FileReader()
        reader.onload = (event) => {
          setSelectedImage(event.target?.result as string)
        }
        reader.readAsDataURL(file)
      }
    }
  }

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if ((!input.trim() && !selectedImage) || isLoading) return

    // Check token limit for free users
    if (!isPro && tokenCount >= FREE_TOKEN_LIMIT) {
      setShowTokenLimitMessage(true)
      return
    }

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
        
        // Handle payload too large error
        if (response.status === 413 || errorText.includes("TOO_LARGE") || errorText.includes("Entity Too Large")) {
          errorMessage = "A imagem e muito grande. Por favor usa uma imagem menor (max 2MB)."
        } else {
          try {
            const errorJson = JSON.parse(errorText)
            errorMessage = errorJson.error || errorMessage
          } catch {
            errorMessage = errorText || errorMessage
          }
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
        
        // Increment token count (rough estimate: 1 token per 4 characters)
        const estimatedTokens = Math.ceil((input.length + fullContent.length) / 4)
        const newTokenCount = tokenCount + estimatedTokens
        setTokenCount(newTokenCount)
        localStorage.setItem("rebornai-tokens", newTokenCount.toString())
        
        // Show upgrade message when approaching or exceeding limit
        if (!isPro && newTokenCount >= FREE_TOKEN_LIMIT) {
          setShowTokenLimitMessage(true)
        }
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

  const startListening = () => {
    if (!("webkitSpeechRecognition" in window) && !("SpeechRecognition" in window)) {
      alert("O seu navegador nao suporta reconhecimento de voz.")
      return
    }
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    const recognition = new SpeechRecognition()
    recognition.lang = "pt-PT"
    recognition.interimResults = false
    recognition.maxAlternatives = 1

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
    <div className="flex bg-background" style={{ height: "100dvh" }}>
      {/* Sidebar overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar — Premium dark design */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-zinc-950 border-r border-white/5 transform transition-transform duration-300 ease-in-out flex flex-col ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Sidebar Header */}
        <div className="p-4 border-b border-white/5 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary via-primary to-violet-600 flex items-center justify-center shadow-lg shadow-primary/30">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-white text-lg leading-none">Reborn AI</span>
                <span className="text-[11px] text-zinc-500 leading-none mt-1">Plataforma Inteligente</span>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(false)} className="text-zinc-400 hover:text-white hover:bg-white/5">
              <X className="h-5 w-5" />
            </Button>
          </div>

          {session?.user ? (
            <div className="mt-4 space-y-2">
              <div className="flex items-center gap-3 p-2.5 rounded-xl bg-white/5">
                <Avatar className="h-9 w-9">
                  <div className="w-full h-full rounded-full bg-gradient-to-br from-primary to-violet-600 flex items-center justify-center">
                    <User className="h-4 w-4 text-white" />
                  </div>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{session.user.name || session.user.email}</p>
                  {isPro ? (
                    <Badge className="text-[10px] bg-gradient-to-r from-amber-500 to-orange-500 border-0 text-white">
                      PRO
                    </Badge>
                  ) : (
                    <Button
                      variant="link"
                      size="sm"
                      className="h-auto p-0 text-xs text-primary"
                      onClick={() => setShowProModal(true)}
                    >
                      Upgrade Pro
                    </Button>
                  )}
                </div>
              </div>
              <Button variant="ghost" size="sm" className="w-full text-xs text-zinc-500 hover:text-white hover:bg-white/5" onClick={() => signOut()}>
                Terminar Sessao
              </Button>
            </div>
          ) : (
            <Button className="w-full mt-4 bg-white text-black hover:bg-zinc-200" onClick={() => setShowAuthModal(true)}>
              <User className="h-4 w-4 mr-2" />
              Entrar
            </Button>
          )}
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-4">
          <div className="mb-3">
            <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider px-3 mb-2">Ferramentas</p>
          </div>
          <nav className="space-y-0.5">
            <div className="flex flex-col gap-0.5">
              <button
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  activeTab === "chat" 
                    ? "bg-white/10 text-white" 
                    : "text-zinc-400 hover:text-white hover:bg-white/5"
                }`}
                onClick={() => { setActiveTab("chat"); setSidebarOpen(false); }}
              >
                <MessageSquare className="h-4 w-4" />
                Chat IA
              </button>
              <button
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  activeTab === "live" 
                    ? "bg-white/10 text-white" 
                    : "text-zinc-400 hover:text-white hover:bg-white/5"
                }`}
                onClick={() => { setActiveTab("live"); setSidebarOpen(false); }}
              >
                <Video className="h-4 w-4" />
                Modo Live
              </button>
              <button
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  activeTab === "images" 
                    ? "bg-white/10 text-white" 
                    : "text-zinc-400 hover:text-white hover:bg-white/5"
                }`}
                onClick={() => { setActiveTab("images"); setSidebarOpen(false); }}
              >
                <ImagePlus className="h-4 w-4" />
                Gerar Imagens
              </button>
              <button
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  activeTab === "vision" 
                    ? "bg-white/10 text-white" 
                    : "text-zinc-400 hover:text-white hover:bg-white/5"
                }`}
                onClick={() => { setActiveTab("vision"); setSidebarOpen(false); }}
              >
                <Eye className="h-4 w-4" />
                Visao OCR
              </button>
            </div>
            
            <div className="my-3 border-t border-white/5" />
            <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider px-3 mb-2">Criacao</p>
            
            <div className="flex flex-col gap-0.5">
              <button
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  activeTab === "webcraft" 
                    ? "bg-white/10 text-white" 
                    : "text-zinc-400 hover:text-white hover:bg-white/5"
                }`}
                onClick={() => { setActiveTab("webcraft"); setSidebarOpen(false); }}
              >
                <Globe className="h-4 w-4" />
                WebCraft
              </button>
              <button
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  activeTab === "presentations" 
                    ? "bg-white/10 text-white" 
                    : "text-zinc-400 hover:text-white hover:bg-white/5"
                }`}
                onClick={() => { setActiveTab("presentations"); setSidebarOpen(false); }}
              >
                <Presentation className="h-4 w-4" />
                Slides
              </button>
              <button
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  activeTab === "ebooks" 
                    ? "bg-white/10 text-white" 
                    : "text-zinc-400 hover:text-white hover:bg-white/5"
                }`}
                onClick={() => { setActiveTab("ebooks"); setSidebarOpen(false); }}
              >
                <BookOpen className="h-4 w-4" />
                Ebooks
              </button>
              <button
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  activeTab === "clipper" 
                    ? "bg-white/10 text-white" 
                    : "text-zinc-400 hover:text-white hover:bg-white/5"
                }`}
                onClick={() => { setActiveTab("clipper"); setSidebarOpen(false); }}
              >
                <Scissors className="h-4 w-4" />
                Video Clipper
              </button>
            </div>

            <div className="my-3 border-t border-white/5" />
            <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider px-3 mb-2">Marketing</p>
            
            <div className="flex flex-col gap-0.5">
              <button
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  activeTab === "marketing" 
                    ? "bg-white/10 text-white" 
                    : "text-zinc-400 hover:text-white hover:bg-white/5"
                }`}
                onClick={() => { setActiveTab("marketing"); setSidebarOpen(false); }}
              >
                <Megaphone className="h-4 w-4" />
                Redes Sociais
              </button>
              <button
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  activeTab === "sms" 
                    ? "bg-white/10 text-white" 
                    : "text-zinc-400 hover:text-white hover:bg-white/5"
                }`}
                onClick={() => { setActiveTab("sms"); setSidebarOpen(false); }}
              >
                <MessageCircleIcon className="h-4 w-4" />
                Mensagens
              </button>
            </div>

            <div className="my-3 border-t border-white/5" />
            <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider px-3 mb-2">Apps Integradas</p>
            
            <div className="flex flex-col gap-0.5">
              <button
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  activeTab === "whatsapp-web" 
                    ? "bg-white/10 text-white" 
                    : "text-zinc-400 hover:text-white hover:bg-white/5"
                }`}
                onClick={() => { setActiveTab("whatsapp-web"); setSidebarOpen(false); }}
              >
                <MessageCircle className="h-4 w-4 text-green-500" />
                WhatsApp Web
              </button>
              <button
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  activeTab === "facebook-app" 
                    ? "bg-white/10 text-white" 
                    : "text-zinc-400 hover:text-white hover:bg-white/5"
                }`}
                onClick={() => { setActiveTab("facebook-app"); setSidebarOpen(false); }}
              >
                <Facebook className="h-4 w-4 text-blue-500" />
                Facebook
              </button>
              <button
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  activeTab === "facebook-autopost" 
                    ? "bg-white/10 text-white" 
                    : "text-zinc-400 hover:text-white hover:bg-white/5"
                }`}
                onClick={() => { setActiveTab("facebook-autopost"); setSidebarOpen(false); }}
              >
                <Zap className="h-4 w-4 text-orange-500" />
                Auto-Post FB
              </button>
              <button
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  activeTab === "instagram-app" 
                    ? "bg-white/10 text-white" 
                    : "text-zinc-400 hover:text-white hover:bg-white/5"
                }`}
                onClick={() => { setActiveTab("instagram-app"); setSidebarOpen(false); }}
              >
                <Instagram className="h-4 w-4 text-pink-500" />
                Instagram
              </button>
              <button
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  activeTab === "youtube-app" 
                    ? "bg-white/10 text-white" 
                    : "text-zinc-400 hover:text-white hover:bg-white/5"
                }`}
                onClick={() => { setActiveTab("youtube-app"); setSidebarOpen(false); }}
              >
                <Youtube className="h-4 w-4 text-red-500" />
                YouTube
              </button>
            </div>
          </nav>

          {/* Chat History */}
          <div className="mt-6 pt-4 border-t border-white/5">
            <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider px-3 mb-2">Historico</p>
            <div className="space-y-0.5 max-h-48 overflow-y-auto">
              {chatHistories.slice(0, 5).map((chat) => (
                <div
                  key={chat.id}
                  className={`group flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-all ${
                    currentChatId === chat.id ? "bg-white/10 text-white" : "text-zinc-500 hover:text-white hover:bg-white/5"
                  }`}
                  onClick={() => { loadChat(chat); setSidebarOpen(false); }}
                >
                  <MessageSquare className="h-3.5 w-3.5 shrink-0" />
                  <span className="flex-1 text-xs truncate">{chat.title}</span>
                  <button
                    className="h-5 w-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-zinc-500 hover:text-red-400"
                    onClick={(e) => {
                      e.stopPropagation()
                      deleteChat(chat.id)
                    }}
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Music Player Toggle */}
        <div className="px-3 py-2 border-t border-white/5">
          <button
            onClick={() => setShowMusicPlayer(!showMusicPlayer)}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-zinc-400 hover:text-white hover:bg-white/5 transition-all"
          >
            <Music2 className="h-4 w-4" />
            <span className="flex-1 text-left">Musica Ambiente</span>
            {isMusicPlaying && (
              <span className="flex gap-0.5">
                <span className="w-0.5 h-3 bg-primary rounded-full animate-pulse" />
                <span className="w-0.5 h-4 bg-primary rounded-full animate-pulse delay-75" />
                <span className="w-0.5 h-2 bg-primary rounded-full animate-pulse delay-150" />
              </span>
            )}
          </button>
        </div>

        {/* New Chat Button */}
        <div className="p-3 border-t border-white/5 shrink-0">
          <button 
            onClick={() => { createNewChat(); setSidebarOpen(false); }} 
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-white text-black font-medium text-sm hover:bg-zinc-200 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Nova Conversa
          </button>
        </div>
      </div>

      {/* Music Player Modal */}
      {showMusicPlayer && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-2xl bg-zinc-900 rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Music2 className="h-5 w-5 text-primary" />
                <span className="font-semibold text-white">Musica Ambiente</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { setShowMusicPlayer(false); setShowMiniPlayer(true); }}
                  className="h-8 px-3 rounded-full flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <Monitor className="h-3.5 w-3.5" />
                  Mini Player
                </button>
                <button
                  onClick={() => setShowMusicPlayer(false)}
                  className="h-8 w-8 rounded-full flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
            
            {/* YouTube Player */}
            <div className="aspect-video w-full bg-black">
              <iframe
                ref={youtubePlayerRef}
                width="100%"
                height="100%"
                src={`https://www.youtube.com/embed/${currentVideoId}?autoplay=1&loop=1&playlist=${currentVideoId}&rel=0&enablejsapi=1`}
                title="Background Music"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="w-full h-full"
              />
            </div>
            
            {/* Controls & Search */}
            <div className="p-4 space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <p className="text-sm font-medium text-white">{currentVideoTitle}</p>
                  <p className="text-xs text-zinc-500">A tocar agora</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setIsMusicPlaying(!isMusicPlaying)}
                    className={`h-10 w-10 rounded-full flex items-center justify-center transition-all ${
                      isMusicPlaying 
                        ? "bg-primary text-white shadow-lg shadow-primary/30" 
                        : "bg-white/10 text-zinc-400 hover:text-white"
                    }`}
                  >
                    {isMusicPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 ml-0.5" />}
                  </button>
                </div>
              </div>
              
              {/* YouTube Search - Integrated */}
              <div className="space-y-3">
                <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Pesquisar Musica no YouTube</p>
                <div className="flex gap-2">
                  <Input
                    value={youtubeSearchQuery}
                    onChange={(e) => setYoutubeSearchQuery(e.target.value)}
                    placeholder="Pesquisar musica, artista, playlist..."
                    className="flex-1 bg-white/5 border-white/10 text-white placeholder:text-zinc-500"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && youtubeSearchQuery) {
                        // Search and show results in embedded player
                        const searchUrl = `https://www.youtube.com/embed?listType=search&list=${encodeURIComponent(youtubeSearchQuery)}&autoplay=1`
                        if (youtubePlayerRef.current) {
                          youtubePlayerRef.current.src = searchUrl
                        }
                        setCurrentVideoTitle(`Resultados: ${youtubeSearchQuery}`)
                        setIsMusicPlaying(true)
                      }
                    }}
                  />
                  <Button
                    onClick={() => {
                      if (youtubeSearchQuery) {
                        const searchUrl = `https://www.youtube.com/embed?listType=search&list=${encodeURIComponent(youtubeSearchQuery)}&autoplay=1`
                        if (youtubePlayerRef.current) {
                          youtubePlayerRef.current.src = searchUrl
                        }
                        setCurrentVideoTitle(`Resultados: ${youtubeSearchQuery}`)
                        setIsMusicPlaying(true)
                      }
                    }}
                    className="bg-red-600 hover:bg-red-700 text-white"
                  >
                    <Search className="h-4 w-4 mr-2" />
                    Pesquisar
                  </Button>
                </div>
              </div>
              
              {/* Quick Playlists */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Playlists Rapidas</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { name: "Lo-Fi Beats", id: "rUlFW5gRiFE" },
                    { name: "Jazz Relaxante", id: "Dx5qFachd3A" },
                    { name: "Piano Ambiente", id: "HSOtku1j600" },
                    { name: "Sons Natureza", id: "eKFTSSKCzWA" },
                    { name: "Estudo Focus", id: "5qap5aO4i9A" },
                    { name: "Chill Vibes", id: "5yx6BWlEVcY" },
                    { name: "Cafe Music", id: "fEvM-OUbaKs" },
                    { name: "Rain Sounds", id: "mPZkdNFkNps" },
                  ].map((playlist) => (
                    <button
                      key={playlist.id}
                      onClick={() => {
                        setCurrentVideoId(playlist.id)
                        setCurrentVideoTitle(playlist.name)
                        if (youtubePlayerRef.current) {
                          youtubePlayerRef.current.src = `https://www.youtube.com/embed/${playlist.id}?autoplay=1&loop=1&playlist=${playlist.id}&rel=0`
                        }
                        setIsMusicPlaying(true)
                      }}
                      className={`flex items-center justify-center px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                        currentVideoId === playlist.id
                          ? "bg-primary text-white"
                          : "bg-white/5 text-zinc-300 hover:bg-white/10"
                      }`}
                    >
                      {playlist.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mini Player - Floating at bottom */}
      {showMiniPlayer && isMusicPlaying && !showMusicPlayer && (
        <div className="fixed bottom-4 right-4 z-50 flex items-center gap-3 p-2 pl-3 bg-zinc-900/95 backdrop-blur-xl border border-white/10 rounded-full shadow-2xl animate-in slide-in-from-bottom-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
              <Music2 className="h-4 w-4 text-primary animate-pulse" />
            </div>
            <div className="hidden sm:block max-w-32">
              <p className="text-xs font-medium text-white truncate">{currentVideoTitle}</p>
              <p className="text-[10px] text-zinc-500">A tocar</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsMusicPlaying(false)}
              className="h-8 w-8 rounded-full flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <Pause className="h-4 w-4" />
            </button>
            <button
              onClick={() => setShowMusicPlayer(true)}
              className="h-8 w-8 rounded-full flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <Maximize2 className="h-4 w-4" />
            </button>
            <button
              onClick={() => { setShowMiniPlayer(false); setIsMusicPlaying(false); }}
              className="h-8 w-8 rounded-full flex items-center justify-center text-zinc-400 hover:text-red-400 hover:bg-white/10 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          {/* Hidden iframe to keep music playing */}
          <iframe
            src={`https://www.youtube.com/embed/${currentVideoId}?autoplay=1&loop=1&playlist=${currentVideoId}&rel=0`}
            className="absolute -top-[9999px] w-0 h-0"
            title="Background Music"
            allow="autoplay"
          />
        </div>
      )}

      {/* Main Content */}
      {/* Added proper overflow handling for main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header — Clean minimal design */}
        <header className="h-14 border-b border-border/50 bg-background/80 backdrop-blur-xl px-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="h-9 w-9 shrink-0 hover:bg-muted"
              aria-label="Menu"
            >
              <Menu className="h-5 w-5" />
            </Button>
            <div className="hidden sm:flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary via-primary to-primary/80 flex items-center justify-center shadow-lg shadow-primary/25">
                <Sparkles className="h-4 w-4 text-primary-foreground" />
              </div>
              <div className="flex flex-col">
                <span className="font-semibold text-sm leading-none">Reborn AI</span>
                <span className="text-[10px] text-muted-foreground leading-none mt-0.5">Assistente Inteligente</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Token Counter - Only show for free users */}
            {!isPro && (
              <button
                onClick={() => tokenCount >= FREE_TOKEN_LIMIT ? setShowTokenLimitMessage(true) : setShowProModal(true)}
                className={`hidden sm:flex items-center gap-1.5 h-7 px-2.5 rounded-full text-xs font-medium transition-all ${
                  tokenCount >= FREE_TOKEN_LIMIT * 0.8
                    ? "bg-orange-500/10 border border-orange-500/20 text-orange-500"
                    : "bg-muted/50 text-muted-foreground hover:bg-muted"
                }`}
              >
                <Zap className="h-3 w-3" />
                {tokenCount}/{FREE_TOKEN_LIMIT}
              </button>
            )}
            {/* Music Player Button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowMusicPlayer(true)}
              className={`h-9 w-9 relative ${isMusicPlaying ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}
              aria-label="Musica"
            >
              <Music2 className="h-5 w-5" />
              {isMusicPlaying && (
                <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary" />
                </span>
              )}
            </Button>
            <Badge variant="outline" className="gap-1.5 h-7 bg-emerald-500/10 border-emerald-500/20 text-emerald-500 text-xs font-medium">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Online
            </Badge>
          </div>
        </header>

        {/* Main content area — clean, no visible tabs */}
        <main className="flex-1 min-h-0 flex flex-col overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 min-h-0 flex flex-col">
            {/* Chat Tab */}
            <TabsContent value="chat" className="flex-1 min-h-0 mt-0 data-[state=active]:flex data-[state=active]:flex-col overflow-hidden">
              <ScrollArea className="flex-1">
                <div className="max-w-3xl mx-auto py-4 space-y-4">
                  {messages.length === 0 && (
                    <ChatWelcome onTabChange={setActiveTab} />
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
            <TabsContent value="live" className="flex-1 min-h-0 mt-0 data-[state=active]:flex data-[state=active]:flex-col overflow-hidden">
              <LiveChat
                onStop={stopLiveMode}
                onStart={startLiveMode}
                isActive={!!liveMode}
                isCameraOn={liveMode?.isCameraOn ?? true}
                isMicOn={liveMode?.isMicOn ?? true}
                onToggleCamera={toggleLiveCamera}
                onToggleMic={toggleLiveMic}
              />
            </TabsContent>

            {/* Images Tab */}
            <TabsContent value="images" className="flex-1 flex flex-col min-h-0 m-0 overflow-hidden">
              <ImageGenerator />
            </TabsContent>

            {/* WebCraft Tab */}
            <TabsContent value="webcraft" className="flex-1 flex flex-col min-h-0 m-0 overflow-hidden">
              <WebCraftStudio />
            </TabsContent>


            {/* Presentations Tab */}
            <TabsContent value="presentations" className="flex-1 flex flex-col min-h-0 m-0 overflow-hidden">
              <PresentationStudio />
            </TabsContent>

            {/* Ebooks Tab */}
            <TabsContent value="ebooks" className="flex-1 flex flex-col min-h-0 m-0 overflow-hidden">
              <EbookStudio />
            </TabsContent>



            {/* Messaging Hub — SMS / Email / WhatsApp */}
            <TabsContent value="sms" className="flex-1 flex flex-col min-h-0 m-0 overflow-hidden">
              <MessagingHub />
            </TabsContent>


            {/* Clipper Tab - Adding clipper functionality */}
            <TabsContent value="clipper" className="flex-1 flex flex-col min-h-0 m-0 overflow-hidden">
              <ClipperStudio />
            </TabsContent>

            {/* Marketing Tab */}
            <TabsContent value="marketing" className="flex-1 flex flex-col min-h-0 m-0 overflow-hidden">
              <MarketingStudio />
            </TabsContent>

            {/* Vision AI Tab */}
            <TabsContent value="vision" className="flex-1 min-h-0 mt-0 data-[state=active]:flex data-[state=active]:flex-col overflow-hidden">
              <VisionTab />
            </TabsContent>

            {/* Facebook Auto-Post Tab */}
            <TabsContent value="facebook-autopost" className="flex-1 min-h-0 mt-0 data-[state=active]:flex data-[state=active]:flex-col overflow-hidden">
              <FacebookAutoPost />
            </TabsContent>

            {/* WhatsApp Web Embedded */}
            <TabsContent value="whatsapp-web" className="flex-1 min-h-0 mt-0 data-[state=active]:flex data-[state=active]:flex-col overflow-hidden">
              <div className="flex-1 flex flex-col h-full">
                <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card/50">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
                      <MessageCircle className="h-5 w-5 text-green-500" />
                    </div>
                    <div>
                      <h2 className="font-semibold">WhatsApp Web</h2>
                      <p className="text-xs text-muted-foreground">Acede ao teu WhatsApp integrado</p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open("https://web.whatsapp.com", "_blank")}
                    className="gap-2"
                  >
                    <Maximize2 className="h-4 w-4" />
                    Abrir em Nova Aba
                  </Button>
                </div>
                <div className="flex-1 relative bg-[#111b21]">
                  <iframe
                    src="https://web.whatsapp.com"
                    className="w-full h-full border-0"
                    title="WhatsApp Web"
                    allow="camera; microphone; clipboard-write; encrypted-media"
                    sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-modals"
                  />
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#111b21] text-white p-8 text-center pointer-events-none opacity-0 hover:opacity-100 transition-opacity">
                    <MessageCircle className="h-16 w-16 text-green-500 mb-4" />
                    <h3 className="text-xl font-bold mb-2">WhatsApp Web</h3>
                    <p className="text-zinc-400 text-sm max-w-md mb-4">
                      Por questoes de seguranca, o WhatsApp Web pode nao carregar em iframes.
                      Clica no botao abaixo para abrir numa nova aba.
                    </p>
                    <Button
                      onClick={() => window.open("https://web.whatsapp.com", "_blank")}
                      className="bg-green-500 hover:bg-green-600 text-white pointer-events-auto"
                    >
                      <MessageCircle className="h-4 w-4 mr-2" />
                      Abrir WhatsApp Web
                    </Button>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Facebook Embedded */}
            <TabsContent value="facebook-app" className="flex-1 min-h-0 mt-0 data-[state=active]:flex data-[state=active]:flex-col overflow-hidden">
              <div className="flex-1 flex flex-col h-full">
                <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card/50">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                      <Facebook className="h-5 w-5 text-blue-500" />
                    </div>
                    <div>
                      <h2 className="font-semibold">Facebook</h2>
                      <p className="text-xs text-muted-foreground">Acede ao Facebook integrado</p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open("https://www.facebook.com", "_blank")}
                    className="gap-2"
                  >
                    <Maximize2 className="h-4 w-4" />
                    Abrir em Nova Aba
                  </Button>
                </div>
                <div className="flex-1 relative bg-[#18191a]">
                  <iframe
                    src="https://www.facebook.com"
                    className="w-full h-full border-0"
                    title="Facebook"
                    allow="camera; microphone; clipboard-write; encrypted-media"
                    sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-modals"
                  />
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#18191a] text-white p-8 text-center">
                    <Facebook className="h-16 w-16 text-blue-500 mb-4" />
                    <h3 className="text-xl font-bold mb-2">Facebook</h3>
                    <p className="text-zinc-400 text-sm max-w-md mb-4">
                      Por questoes de seguranca, o Facebook nao permite incorporacao em iframes.
                      Clica no botao abaixo para abrir numa nova aba.
                    </p>
                    <Button
                      onClick={() => window.open("https://www.facebook.com", "_blank")}
                      className="bg-blue-500 hover:bg-blue-600 text-white"
                    >
                      <Facebook className="h-4 w-4 mr-2" />
                      Abrir Facebook
                    </Button>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Instagram Embedded */}
            <TabsContent value="instagram-app" className="flex-1 min-h-0 mt-0 data-[state=active]:flex data-[state=active]:flex-col overflow-hidden">
              <div className="flex-1 flex flex-col h-full">
                <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card/50">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500/10 via-pink-500/10 to-orange-500/10 flex items-center justify-center">
                      <Instagram className="h-5 w-5 text-pink-500" />
                    </div>
                    <div>
                      <h2 className="font-semibold">Instagram</h2>
                      <p className="text-xs text-muted-foreground">Acede ao Instagram integrado</p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open("https://www.instagram.com", "_blank")}
                    className="gap-2"
                  >
                    <Maximize2 className="h-4 w-4" />
                    Abrir em Nova Aba
                  </Button>
                </div>
                <div className="flex-1 relative bg-black">
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black text-white p-8 text-center">
                    <Instagram className="h-16 w-16 text-pink-500 mb-4" />
                    <h3 className="text-xl font-bold mb-2">Instagram</h3>
                    <p className="text-zinc-400 text-sm max-w-md mb-4">
                      Por questoes de seguranca, o Instagram nao permite incorporacao em iframes.
                      Clica no botao abaixo para abrir numa nova aba.
                    </p>
                    <Button
                      onClick={() => window.open("https://www.instagram.com", "_blank")}
                      className="bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 hover:opacity-90 text-white"
                    >
                      <Instagram className="h-4 w-4 mr-2" />
                      Abrir Instagram
                    </Button>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* YouTube Embedded */}
            <TabsContent value="youtube-app" className="flex-1 min-h-0 mt-0 data-[state=active]:flex data-[state=active]:flex-col overflow-hidden">
              <div className="flex-1 flex flex-col h-full">
                <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card/50">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
                      <Youtube className="h-5 w-5 text-red-500" />
                    </div>
                    <div>
                      <h2 className="font-semibold">YouTube</h2>
                      <p className="text-xs text-muted-foreground">Assiste videos do YouTube integrado</p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open("https://www.youtube.com", "_blank")}
                    className="gap-2"
                  >
                    <Maximize2 className="h-4 w-4" />
                    Abrir em Nova Aba
                  </Button>
                </div>
                <div className="flex-1 relative bg-[#0f0f0f]">
                  <iframe
                    src="https://www.youtube.com/embed/rUlFW5gRiFE?autoplay=0"
                    className="w-full h-full border-0"
                    title="YouTube"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                  />
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </main>
      </div>

      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />

      {/* Token Limit Reached Modal */}
      {showTokenLimitMessage && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-zinc-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center">
                <Zap className="h-8 w-8 text-white" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">Limite de Tokens Atingido</h2>
              <p className="text-zinc-400 text-sm mb-6">
                {!session 
                  ? "Usaste os teus tokens gratuitos. Cria uma conta ou faz login para continuar a usar o Reborn AI."
                  : "Usaste os teus tokens gratuitos. Faz upgrade para o plano Basic para continuar a usar o Reborn AI sem limites."
                }
              </p>
              
              <div className="bg-white/5 rounded-xl p-4 mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-zinc-400">Tokens usados</span>
                  <span className="text-sm font-bold text-white">{tokenCount} / {FREE_TOKEN_LIMIT}</span>
                </div>
                <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-orange-500 to-red-500 rounded-full transition-all"
                    style={{ width: `${Math.min((tokenCount / FREE_TOKEN_LIMIT) * 100, 100)}%` }}
                  />
                </div>
              </div>
              
              <div className="space-y-3">
                {!session ? (
                  <>
                    <button
                      onClick={() => { setShowTokenLimitMessage(false); setShowAuthModal(true); }}
                      className="flex items-center justify-center gap-2 w-full py-3 px-4 bg-gradient-to-r from-primary to-violet-600 hover:opacity-90 text-white font-semibold rounded-xl transition-all shadow-lg shadow-primary/30"
                    >
                      <User className="h-5 w-5" />
                      Criar Conta / Entrar
                    </button>
                    <p className="text-xs text-zinc-500">Ao criar conta, recebes +50 tokens gratis</p>
                  </>
                ) : (
                  <a
                    href="https://buy.stripe.com/eVqdR93RbaHQ4ecbk95Rm00"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full py-3 px-4 bg-gradient-to-r from-primary to-violet-600 hover:opacity-90 text-white font-semibold rounded-xl transition-all shadow-lg shadow-primary/30"
                  >
                    <Sparkles className="h-5 w-5" />
                    Upgrade para Basic - 9.99 EUR/mes
                  </a>
                )}
                <button
                  onClick={() => setShowTokenLimitMessage(false)}
                  className="w-full py-2.5 px-4 text-zinc-400 hover:text-white text-sm font-medium transition-colors"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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



      {/* Overlay when sidebar is open on mobile */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 bg-black/50 z-40" onClick={() => setSidebarOpen(false)} />
      )}
    </div>
  )
}
