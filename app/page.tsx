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
} from "lucide-react"
import ReactMarkdown from "react-markdown"
import * as XLSX from "xlsx"
import { LiveChat } from "@/components/live-chat"
import { VisionTab } from "@/components/vision-tab"
import { ChatWelcome } from "@/components/chat-welcome"
import { ImageGenerator } from "@/components/image-generator"
import { MarketingStudio } from "@/components/marketing-studio"
import { PresentationStudio } from "@/components/presentation-studio"
import { MessagingHub } from "@/components/messaging-hub"
import { EbookStudio } from "@/components/ebook-studio"

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

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { data: session } = useSession()
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [showProModal, setShowProModal] = useState(false)
  const [isPro, setIsPro] = useState(false) // Assume not Pro initially, you'd likely fetch this from user data

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
    <div className="flex bg-background" style={{ height: "100dvh" }}>
      {/* Sidebar overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

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
              <Button
                variant={activeTab === "vision" ? "secondary" : "ghost"}
                className="w-full justify-start"
                onClick={() => setActiveTab("vision")}
              >
                <Eye className="h-4 w-4 mr-2" />
                Visao AI
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
        <header className="border-b border-border bg-card/60 backdrop-blur-md px-3 sm:px-4 lg:px-6 py-3 flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2 sm:gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden h-9 w-9 shrink-0"
              aria-label="Abrir menu"
            >
              <Menu className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shrink-0 shadow-lg shadow-primary/20">
                <Sparkles className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="font-bold text-base sm:text-lg gradient-text">Reborn AI</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {enableSearch && (
              <Badge variant="outline" className="gap-1 hidden sm:flex bg-primary/10 border-primary/30 text-primary">
                <Search className="h-3 w-3" />
                Web Ativo
              </Badge>
            )}
            <Badge variant="outline" className="gap-1 bg-green-500/10 border-green-500/30 text-green-400 text-xs">
              <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
              <span className="hidden sm:inline">Online</span>
            </Badge>
          </div>
        </header>

        {/* Main content area — live/vision tabs fill height, others scroll */}
        <main className="flex-1 min-h-0 flex flex-col overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 min-h-0 flex flex-col">
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
                  <TabsTrigger value="vision" className="px-3 rounded-lg">
                    <Eye className="h-4 w-4 mr-2" />
                    Visao AI
                  </TabsTrigger>
                </TabsList>
              </ScrollArea>
            </div>

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
            <TabsContent value="webcraft" className="flex-1 flex flex-col min-h-0 m-0 overflow-y-auto">
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
            <TabsContent value="clipper" className="flex-1 flex flex-col min-h-0 m-0 overflow-y-auto">
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
            <TabsContent value="marketing" className="flex-1 flex flex-col min-h-0 m-0 overflow-hidden">
              <MarketingStudio />
            </TabsContent>

            {/* Vision AI Tab */}
            <TabsContent value="vision" className="flex-1 min-h-0 mt-0 data-[state=active]:flex data-[state=active]:flex-col overflow-hidden">
              <VisionTab />
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



      {/* Overlay when sidebar is open on mobile */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 bg-black/50 z-40" onClick={() => setSidebarOpen(false)} />
      )}
    </div>
  )
}
