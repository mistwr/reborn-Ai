"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  MessageSquare,
  Send,
  Users,
  Zap,
  CheckCircle,
  XCircle,
  Loader2,
  Sparkles,
  CreditCard,
  FileSpreadsheet,
  Phone,
  Globe,
  Coins,
} from "lucide-react"
import * as XLSX from "xlsx"

interface SmsContact {
  name: string
  number: string
  personalizedMessage: string
  status: "pending" | "sent" | "error"
}

export default function RebornAI() {
  // Credits system
  const [credits, setCredits] = useState(10)
  const [secretCode, setSecretCode] = useState("")

  // SMS system
  const [smsMessage, setSmsMessage] = useState("")
  const [smsCountryCode, setSmsCountryCode] = useState("+244")
  const [smsContacts, setSmsContacts] = useState<SmsContact[]>([])
  const [isSendingBulk, setIsSendingBulk] = useState(false)
  const [bulkProgress, setBulkProgress] = useState(0)

  // Load from localStorage on mount
  useEffect(() => {
    const savedCredits = localStorage.getItem("reborn_credits")
    const savedMessage = localStorage.getItem("reborn_sms_message")
    const savedCountryCode = localStorage.getItem("reborn_country_code")
    const savedContacts = localStorage.getItem("reborn_contacts")

    if (savedCredits) setCredits(Number.parseInt(savedCredits))
    if (savedMessage) setSmsMessage(savedMessage)
    if (savedCountryCode) setSmsCountryCode(savedCountryCode)
    if (savedContacts) setSmsContacts(JSON.parse(savedContacts))
  }, [])

  // Save to localStorage on changes
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

  // Secret code handler - discrete hack mode
  useEffect(() => {
    if (secretCode === "3011") {
      setCredits(999999)
      localStorage.setItem("reborn_credits", "999999")
      setSecretCode("")
    }
  }, [secretCode])

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
          // Format message: Name first, then message
          const personalizedMsg = name ? `${name}, ${smsMessage.replace(/\{nome\}/gi, name)}` : smsMessage

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
            contact.name && contact.name !== "Sem nome"
              ? `${contact.name}, ${smsMessage.replace(/\{nome\}/gi, contact.name)}`
              : smsMessage,
        })),
      )
    }
  }, [smsMessage])

  // Send all SMS automatically
  const sendAllSmsAutomatically = async () => {
    if (smsContacts.length === 0) return
    if (credits < smsContacts.length) {
      alert(`Créditos insuficientes. Precisa de ${smsContacts.length} créditos.`)
      return
    }

    setIsSendingBulk(true)
    setBulkProgress(0)

    const pendingContacts = smsContacts.filter((c) => c.status === "pending")

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

      // Wait before next SMS (800ms)
      if (i < pendingContacts.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 800))
      }
    }

    setIsSendingBulk(false)
  }

  const stripeUrl =
    "https://buy.stripe.com/c/pay/cs_live_b1qybgGpnnZ288il3laKXmenbaWfKt40BHqSilF5wu5kqVSEVrM282A5TJ#fidpamZkaWAnPydkcHFqJyknZHVsTmB8Jz8ndW5aaWxzYFowNFZfPEpqQndmTTVBN2JXfHdnV2dBSWk2bnV0bHFDbUxnbVRzQVJ8NzVUdmRndkl2M250VkRCcnNDUVZHYXIzRlFTMFF8dEhtV31oaXJ3ZEhxSj1hS25BQzU1cVZwYGBzR2EnKSdjd2poVmB3c2B3Jz9xd3BgKSdpZHxqcHFRfHVgJz8naHBpcWxabHFgaCcpJ2BrZGdpYFVpZGZgbWppYWB3dic%2FcXdwYHgl"

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-cyan-400" />
            <span className="text-xl font-bold text-white">Reborn AI</span>
          </div>

          <div className="flex items-center gap-4">
            {/* Discrete secret code input */}
            <Input
              type="text"
              value={secretCode}
              onChange={(e) => setSecretCode(e.target.value)}
              className="w-16 h-8 text-xs bg-transparent border-transparent focus:border-slate-700 text-slate-600"
              placeholder=""
            />

            <div className="flex items-center gap-2 bg-slate-800/50 px-3 py-1.5 rounded-full">
              <Coins className="h-4 w-4 text-yellow-400" />
              <span className="text-sm font-medium text-white">{credits.toLocaleString()}</span>
            </div>

            <Button
              size="sm"
              className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600"
              onClick={() => window.open(stripeUrl, "_blank")}
            >
              <CreditCard className="h-4 w-4 mr-2" />
              Comprar Créditos
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-5xl mx-auto space-y-8">
          {/* Hero Section */}
          <div className="text-center space-y-4 py-8">
            <h1 className="text-4xl md:text-5xl font-bold text-white">Envio de SMS em Massa</h1>
            <p className="text-lg text-slate-400 max-w-2xl mx-auto">
              Envie mensagens personalizadas para todos os seus contactos automaticamente. Carregue um ficheiro Excel e
              deixe a IA formatar as mensagens.
            </p>
          </div>

          {/* Main Card */}
          <Card className="bg-slate-900/50 border-slate-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <MessageSquare className="h-5 w-5 text-cyan-400" />
                Configurar Mensagem
              </CardTitle>
              <CardDescription>
                Escreva a mensagem base. O nome do contacto será adicionado automaticamente no início.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Message Input */}
              <div className="space-y-2">
                <label className="text-sm text-slate-400">Mensagem Base</label>
                <Textarea
                  value={smsMessage}
                  onChange={(e) => setSmsMessage(e.target.value)}
                  placeholder="Escreva a sua mensagem aqui..."
                  className="min-h-[120px] bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500"
                />
                <p className="text-xs text-slate-500">A mensagem será formatada como: [Nome], [Sua mensagem]</p>
              </div>

              {/* Country Code & Excel Upload */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm text-slate-400">Código do País</label>
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-slate-500" />
                    <Input
                      value={smsCountryCode}
                      onChange={(e) => setSmsCountryCode(e.target.value)}
                      placeholder="+244"
                      className="bg-slate-800/50 border-slate-700 text-white"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm text-slate-400">Ficheiro Excel</label>
                  <div className="relative">
                    <Input
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      onChange={handleExcelUpload}
                      className="hidden"
                      id="excel-upload"
                    />
                    <label
                      htmlFor="excel-upload"
                      className="flex items-center gap-2 px-4 py-2 bg-slate-800/50 border border-slate-700 rounded-md cursor-pointer hover:bg-slate-700/50 transition-colors"
                    >
                      <FileSpreadsheet className="h-4 w-4 text-green-400" />
                      <span className="text-sm text-slate-300">Carregar Excel</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Contacts Preview */}
              {smsContacts.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-cyan-400" />
                      <span className="text-sm text-white font-medium">{smsContacts.length} contactos carregados</span>
                    </div>
                    <Badge variant="outline" className="border-slate-700 text-slate-400">
                      {smsContacts.filter((c) => c.status === "sent").length} enviados
                    </Badge>
                  </div>

                  <ScrollArea className="h-[300px] rounded-md border border-slate-800 p-4">
                    <div className="space-y-3">
                      {smsContacts.map((contact, index) => (
                        <div
                          key={index}
                          className="flex items-start gap-3 p-3 rounded-lg bg-slate-800/30 border border-slate-700/50"
                        >
                          <div className="flex-shrink-0 mt-1">
                            {contact.status === "sent" ? (
                              <CheckCircle className="h-4 w-4 text-green-400" />
                            ) : contact.status === "error" ? (
                              <XCircle className="h-4 w-4 text-red-400" />
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

                  {/* Send All Button */}
                  <Button
                    onClick={sendAllSmsAutomatically}
                    disabled={isSendingBulk || smsContacts.filter((c) => c.status === "pending").length === 0}
                    className="w-full h-12 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-semibold"
                  >
                    {isSendingBulk ? (
                      <>
                        <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                        Enviando... {bulkProgress}%
                      </>
                    ) : (
                      <>
                        <Send className="h-5 w-5 mr-2" />
                        Enviar Todas as SMS Automaticamente ({smsContacts.filter((c) => c.status === "pending").length})
                      </>
                    )}
                  </Button>

                  {isSendingBulk && (
                    <div className="w-full bg-slate-800 rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-green-500 to-emerald-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${bulkProgress}%` }}
                      />
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Credits Info */}
          <Card className="bg-slate-900/50 border-slate-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Coins className="h-5 w-5 text-yellow-400" />
                Sistema de Créditos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-lg bg-slate-800/30 border border-slate-700/50 text-center">
                  <p className="text-3xl font-bold text-white">{credits.toLocaleString()}</p>
                  <p className="text-sm text-slate-400">Créditos Disponíveis</p>
                </div>
                <div className="p-4 rounded-lg bg-slate-800/30 border border-slate-700/50 text-center">
                  <p className="text-3xl font-bold text-cyan-400">1</p>
                  <p className="text-sm text-slate-400">Crédito por SMS</p>
                </div>
                <div className="p-4 rounded-lg bg-slate-800/30 border border-slate-700/50 text-center">
                  <Button
                    className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600"
                    onClick={() => window.open(stripeUrl, "_blank")}
                  >
                    <Zap className="h-4 w-4 mr-2" />
                    Comprar Mais
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
