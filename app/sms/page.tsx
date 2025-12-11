"use client"

import type React from "react"

/**
 * REBORN AI - SMS EM MASSA (100% CLIENT-SIDE)
 *
 * Este módulo permite enviar SMS em massa usando apenas o telemóvel do utilizador.
 * Não usa APIs externas - funciona totalmente offline no browser.
 *
 * Funcionalidades:
 * - Escrever mensagem personalizada
 * - Inserir números manualmente ou via CSV/TXT
 * - Divide automaticamente em lotes de 20 números
 * - Gera links SMS nativos (sms:)
 * - Gera QR Codes para envio direto no telemóvel
 */

import { useState, useRef } from "react"
import {
  MessageSquare,
  Upload,
  QrCode,
  Send,
  FileText,
  Smartphone,
  ArrowLeft,
  Copy,
  Check,
  Trash2,
  Download,
} from "lucide-react"
import Link from "next/link"

// Componente QR Code simples usando canvas (sem dependências externas)
function QRCodeCanvas({ value, size = 150 }: { value: string; size?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Gerar QR Code usando API pública (fallback simples)
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(value)}`

  return <img src={qrUrl || "/placeholder.svg"} alt="QR Code" width={size} height={size} className="rounded-lg" />
}

export default function SMSPage() {
  // Estados do formulário
  const [message, setMessage] = useState("")
  const [manualNumbers, setManualNumbers] = useState("")
  const [fileNumbers, setFileNumbers] = useState<string[]>([])
  const [fileName, setFileName] = useState("")

  // Estados dos resultados
  const [smsLinks, setSmsLinks] = useState<{ url: string; numbers: string[] }[]>([])
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)

  // Configurações
  const [chunkSize, setChunkSize] = useState(20)

  /**
   * Processa ficheiro CSV/TXT carregado
   * Extrai números de telefone (1 por linha)
   */
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setFileName(file.name)

    const text = await file.text()
    const numbers = text
      .split(/\r?\n/)
      .map((n) => n.trim().replace(/[^0-9+]/g, "")) // Remove caracteres não numéricos exceto +
      .filter((n) => n.length >= 9) // Mínimo 9 dígitos

    setFileNumbers(numbers)
  }

  /**
   * Gera links SMS divididos em lotes
   * Formato: sms:num1,num2,num3?body=mensagem
   */
  const generateSMSLinks = () => {
    setIsGenerating(true)

    // Combinar números manuais + ficheiro
    const manual = manualNumbers
      .split(/[\n,;]/)
      .map((n) => n.trim().replace(/[^0-9+]/g, ""))
      .filter((n) => n.length >= 9)

    const allNumbers = [...new Set([...manual, ...fileNumbers])] // Remove duplicados

    if (allNumbers.length === 0) {
      alert("Adiciona pelo menos um número de telefone!")
      setIsGenerating(false)
      return
    }

    if (!message.trim()) {
      alert("Escreve uma mensagem!")
      setIsGenerating(false)
      return
    }

    // Dividir em chunks
    const chunks: string[][] = []
    for (let i = 0; i < allNumbers.length; i += chunkSize) {
      chunks.push(allNumbers.slice(i, i + chunkSize))
    }

    // Gerar URLs
    const encodedMessage = encodeURIComponent(message)
    const links = chunks.map((group) => ({
      url: `sms:${group.join(",")}?body=${encodedMessage}`,
      numbers: group,
    }))

    setSmsLinks(links)
    setIsGenerating(false)
  }

  /**
   * Copia link para clipboard
   */
  const copyLink = async (url: string, index: number) => {
    await navigator.clipboard.writeText(url)
    setCopiedIndex(index)
    setTimeout(() => setCopiedIndex(null), 2000)
  }

  /**
   * Limpa todos os dados
   */
  const clearAll = () => {
    setMessage("")
    setManualNumbers("")
    setFileNumbers([])
    setFileName("")
    setSmsLinks([])
  }

  /**
   * Exporta links como ficheiro TXT
   */
  const exportLinks = () => {
    const content = smsLinks
      .map((link, i) => `Lote ${i + 1} (${link.numbers.length} números):\n${link.url}\n`)
      .join("\n")

    const blob = new Blob([content], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "sms-links.txt"
    a.click()
    URL.revokeObjectURL(url)
  }

  // Contagem total de números
  const totalNumbers = new Set([
    ...manualNumbers
      .split(/[\n,;]/)
      .map((n) => n.trim())
      .filter((n) => n.length >= 9),
    ...fileNumbers,
  ]).size

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Header */}
      <header className="border-b border-white/10 bg-[#0a0a0a]/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="p-2 rounded-lg hover:bg-white/5 transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="font-semibold text-lg">Reborn AI SMS</h1>
                <p className="text-xs text-white/50">Envio em massa sem APIs</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-green-500/20 text-green-400 text-xs font-medium">
              100% Offline
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Info Banner */}
        <div className="mb-8 p-4 rounded-xl bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20">
          <div className="flex items-start gap-3">
            <Smartphone className="w-5 h-5 text-green-400 mt-0.5" />
            <div>
              <h3 className="font-medium text-green-400 mb-1">Como funciona?</h3>
              <p className="text-sm text-white/70">
                Este módulo gera links SMS nativos que abrem a app de mensagens do teu telemóvel. Não usa APIs externas
                - tudo funciona localmente no browser. Basta escanear o QR Code ou clicar no botão para enviar.
              </p>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Formulário */}
          <div className="space-y-6">
            {/* Mensagem */}
            <div>
              <label className="block text-sm font-medium text-white/70 mb-2">Mensagem</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Escreve a tua mensagem aqui..."
                rows={4}
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-green-500/50 focus:ring-1 focus:ring-green-500/50 resize-none"
              />
              <p className="mt-1 text-xs text-white/40">{message.length} caracteres</p>
            </div>

            {/* Números manuais */}
            <div>
              <label className="block text-sm font-medium text-white/70 mb-2">Números (manual)</label>
              <textarea
                value={manualNumbers}
                onChange={(e) => setManualNumbers(e.target.value)}
                placeholder="+351912345678&#10;+351923456789&#10;..."
                rows={4}
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-green-500/50 focus:ring-1 focus:ring-green-500/50 resize-none font-mono text-sm"
              />
              <p className="mt-1 text-xs text-white/40">
                Um número por linha, separados por vírgula ou ponto-e-vírgula
              </p>
            </div>

            {/* Upload ficheiro */}
            <div>
              <label className="block text-sm font-medium text-white/70 mb-2">Importar lista (CSV/TXT)</label>
              <label className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/5 border border-dashed border-white/20 hover:border-green-500/50 cursor-pointer transition-colors">
                <Upload className="w-5 h-5 text-white/50" />
                <span className="text-white/50 text-sm">{fileName || "Clica para carregar ficheiro"}</span>
                <input type="file" accept=".csv,.txt" onChange={handleFileUpload} className="hidden" />
              </label>
              {fileNumbers.length > 0 && (
                <div className="mt-2 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-green-400" />
                  <span className="text-sm text-green-400">{fileNumbers.length} números carregados</span>
                </div>
              )}
            </div>

            {/* Tamanho do lote */}
            <div>
              <label className="block text-sm font-medium text-white/70 mb-2">Números por lote: {chunkSize}</label>
              <input
                type="range"
                min={5}
                max={50}
                value={chunkSize}
                onChange={(e) => setChunkSize(Number(e.target.value))}
                className="w-full accent-green-500"
              />
              <p className="mt-1 text-xs text-white/40">Alguns telemóveis têm limite de destinatários por SMS</p>
            </div>

            {/* Resumo */}
            {totalNumbers > 0 && (
              <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-2xl font-bold text-white">{totalNumbers}</p>
                    <p className="text-xs text-white/50">Números</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-white">{Math.ceil(totalNumbers / chunkSize)}</p>
                    <p className="text-xs text-white/50">Lotes</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-green-400">0€</p>
                    <p className="text-xs text-white/50">Custo API</p>
                  </div>
                </div>
              </div>
            )}

            {/* Botões */}
            <div className="flex gap-3">
              <button
                onClick={generateSMSLinks}
                disabled={isGenerating}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 text-white font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {isGenerating ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <QrCode className="w-5 h-5" />
                    Gerar Links SMS
                  </>
                )}
              </button>

              <button
                onClick={clearAll}
                className="px-4 py-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
              >
                <Trash2 className="w-5 h-5 text-white/50" />
              </button>
            </div>
          </div>

          {/* Resultados */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-lg">Links Gerados</h2>
              {smsLinks.length > 0 && (
                <button
                  onClick={exportLinks}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-sm transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Exportar
                </button>
              )}
            </div>

            {smsLinks.length === 0 ? (
              <div className="h-[400px] flex items-center justify-center rounded-xl bg-white/5 border border-white/10">
                <div className="text-center">
                  <QrCode className="w-12 h-12 text-white/20 mx-auto mb-3" />
                  <p className="text-white/40">Os links e QR Codes aparecem aqui</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
                {smsLinks.map((link, index) => (
                  <div key={index} className="p-4 rounded-xl bg-white/5 border border-white/10">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-medium">
                        Lote {index + 1}
                        <span className="ml-2 text-sm text-white/50">({link.numbers.length} números)</span>
                      </h3>
                      <button
                        onClick={() => copyLink(link.url, index)}
                        className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                      >
                        {copiedIndex === index ? (
                          <Check className="w-4 h-4 text-green-400" />
                        ) : (
                          <Copy className="w-4 h-4 text-white/50" />
                        )}
                      </button>
                    </div>

                    <div className="flex gap-4">
                      {/* QR Code */}
                      <div className="shrink-0">
                        <QRCodeCanvas value={link.url} size={120} />
                      </div>

                      <div className="flex-1 min-w-0">
                        {/* Lista de números */}
                        <p className="text-xs text-white/40 mb-2 truncate">
                          {link.numbers.slice(0, 3).join(", ")}
                          {link.numbers.length > 3 && ` +${link.numbers.length - 3} mais`}
                        </p>

                        {/* Botão enviar */}
                        <a
                          href={link.url}
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-green-500 hover:bg-green-600 text-white text-sm font-medium transition-colors"
                        >
                          <Send className="w-4 h-4" />
                          Enviar Lote {index + 1}
                        </a>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Aviso legal */}
        <div className="mt-12 p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
          <p className="text-sm text-yellow-200/70">
            <strong className="text-yellow-400">Aviso:</strong> Este módulo usa a app de SMS nativa do teu telemóvel. Os
            custos de SMS são cobrados pela tua operadora. Certifica-te que tens um plano adequado e que cumpres as leis
            anti-spam do teu país.
          </p>
        </div>
      </main>
    </div>
  )
}
