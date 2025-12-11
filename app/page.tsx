"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { useSession, signIn, signOut } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Progress } from "@/components/ui/progress"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import {
  MessageSquare,
  Send,
  Users,
  CheckCircle,
  Loader2,
  Sparkles,
  CreditCard,
  Phone,
  Globe,
  Coins,
  ImageIcon,
  Presentation,
  Bot,
  Scissors,
  Download,
  Rocket,
  Menu,
  X,
  Crown,
  Wand2,
  BookOpen,
  User,
  LogOut,
  Home,
} from "lucide-react"
import * as XLSX from "xlsx"

interface SmsContact {
  name: string
  number: string
  personalizedMessage: string
  status: "pending" | "sent" | "error"
}

interface Message {
  role: "user" | "assistant"
  content: string
}

export default function RebornAI() {
  const { data: session } = useSession()

  // UI State
  const [activeTab, setActiveTab] = useState("home")
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [showProModal, setShowProModal] = useState(false)

  // Credits system
  const [credits, setCredits] = useState(10)
  const [secretCode, setSecretCode] = useState("")

  // SMS system
  const [smsMessage, setSmsMessage] = useState("")
  const [smsCountryCode, setSmsCountryCode] = useState("+244")
  const [smsContacts, setSmsContacts] = useState<SmsContact[]>([])
  const [isSendingBulk, setIsSendingBulk] = useState(false)
  const [bulkProgress, setBulkProgress] = useState(0)

  // Chat system
  const [chatMessages, setChatMessages] = useState<Message[]>([])
  const [chatInput, setChatInput] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)

  // Website Generator
  const [websitePrompt, setWebsitePrompt] = useState("")
  const [websiteStyle, setWebsiteStyle] = useState("modern")
  const [generatedHtml, setGeneratedHtml] = useState("")
  const [isGeneratingWebsite, setIsGeneratingWebsite] = useState(false)
  const [deployedUrl, setDeployedUrl] = useState("")
  const [isDeploying, setIsDeploying] = useState(false)

  // Ebook Generator
  const [ebookTopic, setEbookTopic] = useState("")
  const [ebookChapters, setEbookChapters] = useState(5)
  const [ebookStyle, setEbookStyle] = useState("informative")
  const [generatedEbook, setGeneratedEbook] = useState("")
  const [isGeneratingEbook, setIsGeneratingEbook] = useState(false)

  // Presentation Generator
  const [presentationTopic, setPresentationTopic] = useState("")
  const [presentationSlides, setPresentationSlides] = useState(10)
  const [generatedPresentation, setGeneratedPresentation] = useState("")
  const [isGeneratingPresentation, setIsGeneratingPresentation] = useState(false)

  // Image Generator
  const [imagePrompt, setImagePrompt] = useState("")
  const [generatedImage, setGeneratedImage] = useState("")
  const [isGeneratingImage, setIsGeneratingImage] = useState(false)

  const stripeUrl =
    "https://buy.stripe.com/c/pay/cs_live_b1qybgGpnnZ288il3laKXmenbaWfKt40BHqSilF5wu5kqVSEVrM282A5TJ#fidpamZkaWAnPydkcHFqJyknZHVsTmB8Jz8ndW5aaWxzYFowNFZfPEpqQndmTTVBN2JXfHdnV2dBSWk2bnV0bHFDbUxnbVRzQVJ8NzVUdmRndkl2M250VkRCcnNDUVZHYXIzRlFTMFF8dEhtV31oaXJ3ZEhxSj1hS25BQzU1cVZwYGBzR2EnKSdjd2poVmB3c2B3Jz9xd3BgKSdpZHxqcHFRfHVgJz8naHBpcWxabHFgaCcpJ2BrZGdpYFVpZGZgbWppYWB3dic%2FcXdwYHgl"

  // Load from localStorage
  useEffect(() => {
    const savedCredits = localStorage.getItem("reborn_credits")
    const savedMessage = localStorage.getItem("reborn_sms_message")
    const savedCountryCode = localStorage.getItem("reborn_country_code")
    const savedContacts = localStorage.getItem("reborn_contacts")
    const savedChat = localStorage.getItem("reborn_chat")

    if (savedCredits) setCredits(Number.parseInt(savedCredits))
    if (savedMessage) setSmsMessage(savedMessage)
    if (savedCountryCode) setSmsCountryCode(savedCountryCode)
    if (savedContacts) setSmsContacts(JSON.parse(savedContacts))
    if (savedChat) setChatMessages(JSON.parse(savedChat))
  }, [])

  // Save to localStorage
  useEffect(() => {
    localStorage.setItem("reborn_credits", credits.toString())
  }, [credits])

  useEffect(() => {
    localStorage.setItem("reborn_sms_message", smsMessage)
  }, [smsMessage])

  useEffect(() => {
    localStorage.setItem("reborn_country_code", smsCountryCode)
  }, [smsCountryCode])

  useEffect(() => {
    localStorage.setItem("reborn_contacts", JSON.stringify(smsContacts))
  }, [smsContacts])

  useEffect(() => {
    localStorage.setItem("reborn_chat", JSON.stringify(chatMessages))
  }, [chatMessages])

  // Secret code handler
  useEffect(() => {
    if (secretCode === "3011") {
      setCredits(999999)
      localStorage.setItem("reborn_credits", "999999")
      setSecretCode("")
    }
  }, [secretCode])

  // Scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [chatMessages])

  const consumeCredit = () => {
    if (credits > 0) {
      setCredits((prev) => prev - 1)
      return true
    }
    return false
  }

  // Parse Excel file
  const handleExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const data = event.target?.result
      const workbook = XLSX.read(data, { type: "binary" })
      const sheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[sheetName]
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as string[][]

      if (jsonData.length < 2) return

      const headers = jsonData[0].map((h: string) => h?.toString().toLowerCase().trim())
      const nameIndex = headers.findIndex(
        (h: string) => h?.includes("nome") || h?.includes("name") || h?.includes("cliente"),
      )
      const numberIndex = headers.findIndex(
        (h: string) =>
          h?.includes("numero") ||
          h?.includes("número") ||
          h?.includes("number") ||
          h?.includes("telefone") ||
          h?.includes("phone") ||
          h?.includes("telemovel") ||
          h?.includes("contacto") ||
          h?.includes("contact"),
      )

      const contacts: SmsContact[] = []
      for (let i = 1; i < jsonData.length; i++) {
        const row = jsonData[i]
        const name = nameIndex >= 0 ? row[nameIndex]?.toString().trim() : ""
        const number = numberIndex >= 0 ? row[numberIndex]?.toString().trim() : row[0]?.toString().trim()

        if (number) {
          const personalizedMsg = name ? `${name}, ${smsMessage}` : smsMessage

          contacts.push({
            name: name || "Sem nome",
            number: number.replace(/\D/g, ""),
            personalizedMessage: personalizedMsg,
            status: "pending",
          })
        }
      }

      setSmsContacts(contacts)
    }
    reader.readAsBinaryString(file)
  }

  // Update personalized messages when smsMessage changes
  useEffect(() => {
    if (smsContacts.length > 0) {
      setSmsContacts((prev) =>
        prev.map((contact) => ({
          ...contact,
          personalizedMessage:
            contact.name && contact.name !== "Sem nome" ? `${contact.name}, ${smsMessage}` : smsMessage,
        })),
      )
    }
  }, [smsMessage])

  // Send all SMS automatically
  const sendAllSmsAutomatically = async () => {
    if (smsContacts.length === 0) return

    const pendingContacts = smsContacts.filter((c) => c.status === "pending")

    if (credits < pendingContacts.length) {
      alert(`Créditos insuficientes. Precisa de ${pendingContacts.length} créditos.`)
      return
    }

    setIsSendingBulk(true)
    setBulkProgress(0)

    for (let i = 0; i < pendingContacts.length; i++) {
      const contact = pendingContacts[i]
      const fullNumber = `${smsCountryCode}${contact.number}`.replace(/[^0-9+]/g, "")
      const smsUrl = `sms:${fullNumber}?body=${encodeURIComponent(contact.personalizedMessage)}`

      // Open SMS app
      window.open(smsUrl, "_blank")

      // Update contact status
      setSmsContacts((prev) => prev.map((c) => (c.number === contact.number ? { ...c, status: "sent" } : c)))

      // Consume credit
      consumeCredit()

      // Update progress
      setBulkProgress(Math.round(((i + 1) / pendingContacts.length) * 100))

      // Wait before next SMS
      if (i < pendingContacts.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 800))
      }
    }

    setIsSendingBulk(false)
  }

  // Chat with AI
  const handleSendMessage = async () => {
    if (!chatInput.trim() || isGenerating) return
    if (!consumeCredit()) {
      setShowProModal(true)
      return
    }

    const userMessage: Message = { role: "user", content: chatInput }
    setChatMessages((prev) => [...prev, userMessage])
    setChatInput("")
    setIsGenerating(true)

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [...chatMessages, userMessage] }),
      })

      const data = await response.json()
      const assistantMessage: Message = { role: "assistant", content: data.message }
      setChatMessages((prev) => [...prev, assistantMessage])
    } catch (error) {
      console.error("Chat error:", error)
    }

    setIsGenerating(false)
  }

  // Generate Website
  const handleGenerateWebsite = async () => {
    if (!websitePrompt.trim() || isGeneratingWebsite) return
    if (!consumeCredit()) {
      setShowProModal(true)
      return
    }

    setIsGeneratingWebsite(true)
    setGeneratedHtml("")

    try {
      const response = await fetch("/api/generate-website", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: websitePrompt, style: websiteStyle }),
      })

      const data = await response.json()
      setGeneratedHtml(data.html)
    } catch (error) {
      console.error("Website generation error:", error)
    }

    setIsGeneratingWebsite(false)
  }

  // Deploy to Vercel
  const handleDeploy = async () => {
    if (!generatedHtml || isDeploying) return
    if (!consumeCredit()) {
      setShowProModal(true)
      return
    }

    setIsDeploying(true)

    try {
      const response = await fetch("/api/deploy-vercel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          html: generatedHtml,
          projectName: `site-${Date.now()}`,
        }),
      })

      const data = await response.json()
      setDeployedUrl(data.url)
    } catch (error) {
      console.error("Deploy error:", error)
    }

    setIsDeploying(false)
  }

  // Generate Ebook
  const handleGenerateEbook = async () => {
    if (!ebookTopic.trim() || isGeneratingEbook) return
    if (!consumeCredit()) {
      setShowProModal(true)
      return
    }

    setIsGeneratingEbook(true)

    try {
      const response = await fetch("/api/generate-ebook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: ebookTopic, chapters: ebookChapters, style: ebookStyle }),
      })

      const data = await response.json()
      setGeneratedEbook(data.html)
    } catch (error) {
      console.error("Ebook generation error:", error)
    }

    setIsGeneratingEbook(false)
  }

  // Generate Presentation
  const handleGeneratePresentation = async () => {
    if (!presentationTopic.trim() || isGeneratingPresentation) return
    if (!consumeCredit()) {
      setShowProModal(true)
      return
    }

    setIsGeneratingPresentation(true)

    try {
      const response = await fetch("/api/generate-presentation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: presentationTopic, slides: presentationSlides }),
      })

      const data = await response.json()
      setGeneratedPresentation(data.html)
    } catch (error) {
      console.error("Presentation generation error:", error)
    }

    setIsGeneratingPresentation(false)
  }

  // Generate Image
  const handleGenerateImage = async () => {
    if (!imagePrompt.trim() || isGeneratingImage) return
    if (!consumeCredit()) {
      setShowProModal(true)
      return
    }

    setIsGeneratingImage(true)

    try {
      const response = await fetch("/api/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: imagePrompt }),
      })

      const data = await response.json()
      setGeneratedImage(data.imageUrl)
    } catch (error) {
      console.error("Image generation error:", error)
    }

    setIsGeneratingImage(false)
  }

  const menuItems = [
    { id: "home", label: "Início", icon: Home },
    { id: "chat", label: "Chat AI", icon: Bot },
    { id: "sms", label: "SMS em Massa", icon: MessageSquare },
    { id: "website", label: "Criar Website", icon: Globe },
    { id: "ebook", label: "Criar Ebook", icon: BookOpen },
    { id: "presentation", label: "Apresentações", icon: Presentation },
    { id: "image", label: "Gerar Imagens", icon: ImageIcon },
    { id: "clipper", label: "Video Clipper", icon: Scissors },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Sidebar - Mobile */}
      <div
        className={`fixed inset-0 z-50 lg:hidden ${sidebarOpen ? "block" : "hidden"}`}
        onClick={() => setSidebarOpen(false)}
      >
        <div className="absolute inset-0 bg-black/50" />
        <div className="absolute left-0 top-0 h-full w-64 bg-slate-900 border-r border-slate-800 p-4">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-cyan-400" />
              <span className="text-lg font-bold text-white">Reborn AI</span>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setSidebarOpen(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <nav className="space-y-1">
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  if (item.id === "clipper") {
                    window.location.href = "/clipper"
                  } else {
                    setActiveTab(item.id)
                  }
                  setSidebarOpen(false)
                }}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                  activeTab === item.id
                    ? "bg-cyan-600/20 text-cyan-400"
                    : "text-slate-400 hover:text-white hover:bg-slate-800"
                }`}
              >
                <item.icon className="h-4 w-4" />
                <span className="text-sm">{item.label}</span>
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Sidebar - Desktop */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:flex lg:w-64 lg:flex-col">
        <div className="flex flex-col flex-grow bg-slate-900/50 border-r border-slate-800 pt-5 pb-4 overflow-y-auto">
          <div className="flex items-center gap-2 px-4 mb-6">
            <Sparkles className="h-6 w-6 text-cyan-400" />
            <span className="text-lg font-bold text-white">Reborn AI</span>
          </div>
          <nav className="flex-1 px-2 space-y-1">
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  if (item.id === "clipper") {
                    window.location.href = "/clipper"
                  } else {
                    setActiveTab(item.id)
                  }
                }}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                  activeTab === item.id
                    ? "bg-cyan-600/20 text-cyan-400"
                    : "text-slate-400 hover:text-white hover:bg-slate-800"
                }`}
              >
                <item.icon className="h-4 w-4" />
                <span className="text-sm">{item.label}</span>
              </button>
            ))}
          </nav>
          <div className="px-4 mt-auto">
            <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-700">
              <div className="flex items-center gap-2 mb-2">
                <Coins className="h-4 w-4 text-yellow-400" />
                <span className="text-sm text-white font-medium">{credits.toLocaleString()} créditos</span>
              </div>
              <Button
                size="sm"
                className="w-full bg-gradient-to-r from-cyan-500 to-blue-500"
                onClick={() => window.open(stripeUrl, "_blank")}
              >
                <CreditCard className="h-3 w-3 mr-2" />
                Comprar Mais
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="lg:pl-64">
        {/* Header */}
        <header className="sticky top-0 z-40 bg-slate-950/80 backdrop-blur-sm border-b border-slate-800">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" className="lg:hidden" onClick={() => setSidebarOpen(true)}>
                <Menu className="h-5 w-5" />
              </Button>
              <h1 className="text-lg font-semibold text-white capitalize">
                {menuItems.find((i) => i.id === activeTab)?.label || "Início"}
              </h1>
            </div>
            <div className="flex items-center gap-3">
              <Input
                type="text"
                value={secretCode}
                onChange={(e) => setSecretCode(e.target.value)}
                className="w-12 h-7 text-xs bg-transparent border-transparent focus:border-slate-700 text-slate-600 placeholder:text-transparent"
                placeholder=""
              />
              <div className="flex items-center gap-2 bg-slate-800/50 px-3 py-1.5 rounded-full">
                <Coins className="h-4 w-4 text-yellow-400" />
                <span className="text-sm text-white">{credits.toLocaleString()}</span>
              </div>
              {session ? (
                <Button variant="ghost" size="sm" onClick={() => signOut()}>
                  <LogOut className="h-4 w-4" />
                </Button>
              ) : (
                <Button variant="ghost" size="sm" onClick={() => signIn("google")}>
                  <User className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-4 md:p-6 lg:p-8">
          {/* Home Tab */}
          {activeTab === "home" && (
            <div className="space-y-8">
              <div className="text-center space-y-4 py-8">
                <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white">
                  Bem-vindo ao <span className="text-cyan-400">Reborn AI</span>
                </h1>
                <p className="text-lg text-slate-400 max-w-2xl mx-auto">
                  A plataforma completa de IA para criar conteúdo, websites, ebooks, apresentações e muito mais.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {menuItems.slice(1).map((item) => (
                  <Card
                    key={item.id}
                    className="bg-slate-900/50 border-slate-800 hover:border-cyan-800 transition-all cursor-pointer group"
                    onClick={() => {
                      if (item.id === "clipper") {
                        window.location.href = "/clipper"
                      } else {
                        setActiveTab(item.id)
                      }
                    }}
                  >
                    <CardHeader>
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-cyan-600/20 group-hover:bg-cyan-600/30 transition-colors">
                          <item.icon className="h-5 w-5 text-cyan-400" />
                        </div>
                        <CardTitle className="text-white text-lg">{item.label}</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-slate-400">
                        {item.id === "chat" && "Converse com IA avançada para obter respostas e ideias."}
                        {item.id === "sms" && "Envie mensagens personalizadas em massa automaticamente."}
                        {item.id === "website" && "Gere websites completos e faça deploy com um clique."}
                        {item.id === "ebook" && "Crie ebooks profissionais sobre qualquer tema."}
                        {item.id === "presentation" && "Gere apresentações impressionantes em segundos."}
                        {item.id === "image" && "Crie imagens únicas com inteligência artificial."}
                        {item.id === "clipper" && "Extraia os melhores clips de vídeos longos."}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Chat Tab */}
          {activeTab === "chat" && (
            <div className="max-w-3xl mx-auto">
              <Card className="bg-slate-900/50 border-slate-800 h-[70vh] flex flex-col">
                <CardHeader className="border-b border-slate-800">
                  <CardTitle className="flex items-center gap-2 text-white">
                    <Bot className="h-5 w-5 text-cyan-400" />
                    Chat com IA
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex-1 overflow-hidden p-0">
                  <ScrollArea className="h-full p-4">
                    <div className="space-y-4">
                      {chatMessages.map((msg, index) => (
                        <div key={index} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                          <div
                            className={`max-w-[80%] p-3 rounded-lg ${
                              msg.role === "user" ? "bg-cyan-600 text-white" : "bg-slate-800 text-slate-200"
                            }`}
                          >
                            {msg.content}
                          </div>
                        </div>
                      ))}
                      {isGenerating && (
                        <div className="flex justify-start">
                          <div className="bg-slate-800 p-3 rounded-lg">
                            <Loader2 className="h-4 w-4 animate-spin text-cyan-400" />
                          </div>
                        </div>
                      )}
                      <div ref={chatEndRef} />
                    </div>
                  </ScrollArea>
                </CardContent>
                <CardFooter className="border-t border-slate-800 p-4">
                  <div className="flex gap-2 w-full">
                    <Input
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                      placeholder="Escreva a sua mensagem..."
                      className="bg-slate-800/50 border-slate-700 text-white"
                    />
                    <Button onClick={handleSendMessage} disabled={isGenerating}>
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </CardFooter>
              </Card>
            </div>
          )}

          {/* SMS Tab */}
          {activeTab === "sms" && (
            <div className="max-w-4xl mx-auto space-y-6">
              <Card className="bg-slate-900/50 border-slate-800">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-white">
                    <MessageSquare className="h-5 w-5 text-cyan-400" />
                    Envio de SMS em Massa
                  </CardTitle>
                  <CardDescription>
                    O nome do contacto será adicionado automaticamente no início da mensagem.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label className="text-slate-400">Mensagem Base</Label>
                    <Textarea
                      value={smsMessage}
                      onChange={(e) => setSmsMessage(e.target.value)}
                      placeholder="Escreva a sua mensagem aqui..."
                      className="min-h-[120px] bg-slate-800/50 border-slate-700 text-white"
                    />
                    <p className="text-xs text-slate-500">Formato final: [Nome do Excel], [Sua mensagem]</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-slate-400">Código do País</Label>
                      <Input
                        value={smsCountryCode}
                        onChange={(e) => setSmsCountryCode(e.target.value)}
                        placeholder="+244"
                        className="bg-slate-800/50 border-slate-700 text-white"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-slate-400">Ficheiro Excel</Label>
                      <Input
                        type="file"
                        accept=".xlsx,.xls,.csv"
                        onChange={handleExcelUpload}
                        className="bg-slate-800/50 border-slate-700 text-white file:bg-slate-700 file:text-white file:border-0"
                      />
                    </div>
                  </div>

                  {smsContacts.length > 0 && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-cyan-400" />
                          <span className="text-sm text-white">{smsContacts.length} contactos</span>
                        </div>
                        <Badge variant="outline" className="border-slate-700">
                          {smsContacts.filter((c) => c.status === "sent").length} enviados
                        </Badge>
                      </div>

                      <ScrollArea className="h-[250px] rounded-md border border-slate-800 p-4">
                        <div className="space-y-2">
                          {smsContacts.map((contact, index) => (
                            <div
                              key={index}
                              className="flex items-start gap-3 p-3 rounded-lg bg-slate-800/30 border border-slate-700/50"
                            >
                              <div className="mt-1">
                                {contact.status === "sent" ? (
                                  <CheckCircle className="h-4 w-4 text-green-400" />
                                ) : (
                                  <Phone className="h-4 w-4 text-slate-500" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-sm font-medium text-white">{contact.name}</span>
                                  <span className="text-xs text-slate-500">
                                    {smsCountryCode}
                                    {contact.number}
                                  </span>
                                </div>
                                <p className="text-xs text-slate-400 break-words">{contact.personalizedMessage}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>

                      <Button
                        onClick={sendAllSmsAutomatically}
                        disabled={isSendingBulk || smsContacts.filter((c) => c.status === "pending").length === 0}
                        className="w-full h-12 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-semibold"
                      >
                        {isSendingBulk ? (
                          <>
                            <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                            Enviando automaticamente... {bulkProgress}%
                          </>
                        ) : (
                          <>
                            <Send className="h-5 w-5 mr-2" />
                            Enviar Todas as SMS Automaticamente (
                            {smsContacts.filter((c) => c.status === "pending").length})
                          </>
                        )}
                      </Button>

                      {isSendingBulk && <Progress value={bulkProgress} className="h-2" />}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Website Tab */}
          {activeTab === "website" && (
            <div className="max-w-4xl mx-auto space-y-6">
              <Card className="bg-slate-900/50 border-slate-800">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-white">
                    <Globe className="h-5 w-5 text-cyan-400" />
                    Gerador de Websites
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-slate-400">Descreva o website que deseja</Label>
                    <Textarea
                      value={websitePrompt}
                      onChange={(e) => setWebsitePrompt(e.target.value)}
                      placeholder="Ex: Um website para uma loja de roupas com página inicial, sobre nós e contactos..."
                      className="min-h-[100px] bg-slate-800/50 border-slate-700 text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-400">Estilo</Label>
                    <Select value={websiteStyle} onValueChange={setWebsiteStyle}>
                      <SelectTrigger className="bg-slate-800/50 border-slate-700 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="modern">Moderno</SelectItem>
                        <SelectItem value="minimal">Minimalista</SelectItem>
                        <SelectItem value="corporate">Corporativo</SelectItem>
                        <SelectItem value="creative">Criativo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    onClick={handleGenerateWebsite}
                    disabled={isGeneratingWebsite || !websitePrompt}
                    className="w-full bg-cyan-600 hover:bg-cyan-700"
                  >
                    {isGeneratingWebsite ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Gerando...
                      </>
                    ) : (
                      <>
                        <Wand2 className="h-4 w-4 mr-2" />
                        Gerar Website
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>

              {generatedHtml && (
                <Card className="bg-slate-900/50 border-slate-800">
                  <CardHeader>
                    <CardTitle className="text-white">Preview</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="aspect-video rounded-lg overflow-hidden border border-slate-700">
                      <iframe srcDoc={generatedHtml} className="w-full h-full" title="Website Preview" />
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={handleDeploy} disabled={isDeploying} className="flex-1">
                        {isDeploying ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Publicando...
                          </>
                        ) : (
                          <>
                            <Rocket className="h-4 w-4 mr-2" />
                            Publicar na Vercel
                          </>
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          const blob = new Blob([generatedHtml], { type: "text/html" })
                          const url = URL.createObjectURL(blob)
                          const a = document.createElement("a")
                          a.href = url
                          a.download = "website.html"
                          a.click()
                        }}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                    {deployedUrl && (
                      <div className="p-3 rounded-lg bg-green-900/30 border border-green-700">
                        <p className="text-sm text-green-400">
                          Website publicado:{" "}
                          <a href={deployedUrl} target="_blank" rel="noopener noreferrer" className="underline">
                            {deployedUrl}
                          </a>
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Ebook Tab */}
          {activeTab === "ebook" && (
            <div className="max-w-4xl mx-auto space-y-6">
              <Card className="bg-slate-900/50 border-slate-800">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-white">
                    <BookOpen className="h-5 w-5 text-cyan-400" />
                    Gerador de Ebooks
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-slate-400">Tema do Ebook</Label>
                    <Input
                      value={ebookTopic}
                      onChange={(e) => setEbookTopic(e.target.value)}
                      placeholder="Ex: Marketing Digital para Iniciantes"
                      className="bg-slate-800/50 border-slate-700 text-white"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-slate-400">Capítulos: {ebookChapters}</Label>
                      <Slider
                        value={[ebookChapters]}
                        onValueChange={(v) => setEbookChapters(v[0])}
                        min={3}
                        max={15}
                        step={1}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-slate-400">Estilo</Label>
                      <Select value={ebookStyle} onValueChange={setEbookStyle}>
                        <SelectTrigger className="bg-slate-800/50 border-slate-700 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="informative">Informativo</SelectItem>
                          <SelectItem value="practical">Prático</SelectItem>
                          <SelectItem value="storytelling">Narrativo</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <Button
                    onClick={handleGenerateEbook}
                    disabled={isGeneratingEbook || !ebookTopic}
                    className="w-full bg-cyan-600 hover:bg-cyan-700"
                  >
                    {isGeneratingEbook ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Gerando Ebook...
                      </>
                    ) : (
                      <>
                        <Wand2 className="h-4 w-4 mr-2" />
                        Gerar Ebook
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>

              {generatedEbook && (
                <Card className="bg-slate-900/50 border-slate-800">
                  <CardHeader>
                    <CardTitle className="text-white">Ebook Gerado</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="aspect-[3/4] max-h-[500px] rounded-lg overflow-hidden border border-slate-700 mb-4">
                      <iframe srcDoc={generatedEbook} className="w-full h-full" title="Ebook Preview" />
                    </div>
                    <Button
                      onClick={() => {
                        const blob = new Blob([generatedEbook], { type: "text/html" })
                        const url = URL.createObjectURL(blob)
                        const a = document.createElement("a")
                        a.href = url
                        a.download = "ebook.html"
                        a.click()
                      }}
                      className="w-full"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download Ebook
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Presentation Tab */}
          {activeTab === "presentation" && (
            <div className="max-w-4xl mx-auto space-y-6">
              <Card className="bg-slate-900/50 border-slate-800">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-white">
                    <Presentation className="h-5 w-5 text-cyan-400" />
                    Gerador de Apresentações
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-slate-400">Tema da Apresentação</Label>
                    <Input
                      value={presentationTopic}
                      onChange={(e) => setPresentationTopic(e.target.value)}
                      placeholder="Ex: Introdução à Inteligência Artificial"
                      className="bg-slate-800/50 border-slate-700 text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-400">Número de Slides: {presentationSlides}</Label>
                    <Slider
                      value={[presentationSlides]}
                      onValueChange={(v) => setPresentationSlides(v[0])}
                      min={5}
                      max={25}
                      step={1}
                    />
                  </div>
                  <Button
                    onClick={handleGeneratePresentation}
                    disabled={isGeneratingPresentation || !presentationTopic}
                    className="w-full bg-cyan-600 hover:bg-cyan-700"
                  >
                    {isGeneratingPresentation ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Gerando...
                      </>
                    ) : (
                      <>
                        <Wand2 className="h-4 w-4 mr-2" />
                        Gerar Apresentação
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>

              {generatedPresentation && (
                <Card className="bg-slate-900/50 border-slate-800">
                  <CardHeader>
                    <CardTitle className="text-white">Apresentação Gerada</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="aspect-video rounded-lg overflow-hidden border border-slate-700 mb-4">
                      <iframe srcDoc={generatedPresentation} className="w-full h-full" title="Presentation Preview" />
                    </div>
                    <Button
                      onClick={() => {
                        const blob = new Blob([generatedPresentation], { type: "text/html" })
                        const url = URL.createObjectURL(blob)
                        const a = document.createElement("a")
                        a.href = url
                        a.download = "presentation.html"
                        a.click()
                      }}
                      className="w-full"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download Apresentação
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Image Tab */}
          {activeTab === "image" && (
            <div className="max-w-4xl mx-auto space-y-6">
              <Card className="bg-slate-900/50 border-slate-800">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-white">
                    <ImageIcon className="h-5 w-5 text-cyan-400" />
                    Gerador de Imagens
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-slate-400">Descreva a imagem que deseja</Label>
                    <Textarea
                      value={imagePrompt}
                      onChange={(e) => setImagePrompt(e.target.value)}
                      placeholder="Ex: Um pôr do sol sobre o oceano com cores vibrantes..."
                      className="min-h-[100px] bg-slate-800/50 border-slate-700 text-white"
                    />
                  </div>
                  <Button
                    onClick={handleGenerateImage}
                    disabled={isGeneratingImage || !imagePrompt}
                    className="w-full bg-cyan-600 hover:bg-cyan-700"
                  >
                    {isGeneratingImage ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Gerando Imagem...
                      </>
                    ) : (
                      <>
                        <Wand2 className="h-4 w-4 mr-2" />
                        Gerar Imagem
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>

              {generatedImage && (
                <Card className="bg-slate-900/50 border-slate-800">
                  <CardHeader>
                    <CardTitle className="text-white">Imagem Gerada</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <img
                      src={generatedImage || "/placeholder.svg"}
                      alt="Generated"
                      className="w-full rounded-lg border border-slate-700 mb-4"
                    />
                    <Button
                      onClick={() => {
                        const a = document.createElement("a")
                        a.href = generatedImage
                        a.download = "image.png"
                        a.click()
                      }}
                      className="w-full"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download Imagem
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </main>
      </div>

      {/* Pro Modal */}
      <Dialog open={showProModal} onOpenChange={setShowProModal}>
        <DialogContent className="bg-slate-900 border-slate-800">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Crown className="h-5 w-5 text-yellow-400" />
              Créditos Esgotados
            </DialogTitle>
            <DialogDescription>Compre mais créditos para continuar a usar todas as funcionalidades.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Button
              className="w-full bg-gradient-to-r from-yellow-500 to-orange-500"
              onClick={() => window.open(stripeUrl, "_blank")}
            >
              <CreditCard className="h-4 w-4 mr-2" />
              Comprar Créditos
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
