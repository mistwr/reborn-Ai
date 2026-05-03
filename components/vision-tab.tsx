"use client"

import type React from "react"
import { useState, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import {
  ScanText,
  ImageIcon,
  BarChart3,
  Search,
  Wand2,
  Upload,
  X,
  Loader2,
  Copy,
  Check,
  FileText,
  Eye,
  Trash2,
} from "lucide-react"
import ReactMarkdown from "react-markdown"

// ─── Types ────────────────────────────────────────────────────────────────────

interface UploadedFile {
  id: string
  name: string
  mimeType: string
  dataUrl: string
  size: number
  preview?: string // image preview URL
}

type AnalysisMode = "ocr" | "describe" | "data" | "identify" | "custom"

interface ModeOption {
  id: AnalysisMode
  label: string
  description: string
  icon: React.ElementType
}

// ─── Constants ────────────────────────────────────────────────────────────────

const MODES: ModeOption[] = [
  {
    id: "ocr",
    label: "Extrair Texto (OCR)",
    description: "Extrai todo o texto visível com precisão total",
    icon: ScanText,
  },
  {
    id: "describe",
    label: "Descrever",
    description: "Descrição visual detalhada do conteúdo",
    icon: Eye,
  },
  {
    id: "data",
    label: "Analisar Dados",
    description: "Tabelas, gráficos e informação estruturada",
    icon: BarChart3,
  },
  {
    id: "identify",
    label: "Identificar",
    description: "Objetos, logos, pessoas, marcas",
    icon: Search,
  },
  {
    id: "custom",
    label: "Personalizado",
    description: "Escreve a tua própria instrução",
    icon: Wand2,
  },
]

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/bmp", "application/pdf"]
const MAX_FILES = 5
const MAX_FILE_MB = 15

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

// ─── Component ────────────────────────────────────────────────────────────────

export function VisionTab() {
  const [files, setFiles] = useState<UploadedFile[]>([])
  const [mode, setMode] = useState<AnalysisMode>("describe")
  const [customPrompt, setCustomPrompt] = useState("")
  const [isAnalysing, setIsAnalysing] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [copied, setCopied] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)

  // ── File handling ────────────────────────────────────────────────────────

  const processFiles = useCallback(async (incoming: File[]) => {
    setError(null)
    const toAdd: UploadedFile[] = []

    for (const file of incoming) {
      if (!ACCEPTED_TYPES.includes(file.type)) {
        setError(`Tipo não suportado: ${file.name}. Usa imagens (JPG, PNG, WebP, GIF) ou PDFs.`)
        continue
      }
      if (file.size > MAX_FILE_MB * 1024 * 1024) {
        setError(`Ficheiro demasiado grande: ${file.name} (máx. ${MAX_FILE_MB}MB).`)
        continue
      }

      const dataUrl = await fileToDataUrl(file)
      toAdd.push({
        id: `${Date.now()}-${Math.random()}`,
        name: file.name,
        mimeType: file.type,
        dataUrl,
        size: file.size,
        preview: file.type.startsWith("image/") ? dataUrl : undefined,
      })
    }

    setFiles((prev) => {
      const combined = [...prev, ...toAdd]
      if (combined.length > MAX_FILES) {
        setError(`Máximo de ${MAX_FILES} ficheiros por análise.`)
        return combined.slice(0, MAX_FILES)
      }
      return combined
    })
  }, [])

  const handleFileInput = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const selected = Array.from(e.target.files || [])
      if (selected.length) await processFiles(selected)
      if (fileInputRef.current) fileInputRef.current.value = ""
    },
    [processFiles],
  )

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      const dropped = Array.from(e.dataTransfer.files)
      if (dropped.length) await processFiles(dropped)
    },
    [processFiles],
  )

  const removeFile = useCallback((id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id))
  }, [])

  // ── Analysis ─────────────────────────────────────────────────────────────

  const handleAnalyse = useCallback(async () => {
    if (files.length === 0) {
      setError("Adiciona pelo menos um ficheiro antes de analisar.")
      return
    }
    if (mode === "custom" && !customPrompt.trim()) {
      setError("Escreve uma instrução personalizada antes de analisar.")
      return
    }

    setIsAnalysing(true)
    setResult(null)
    setError(null)

    try {
      const response = await fetch("/api/vision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          files: files.map((f) => ({ dataUrl: f.dataUrl, mimeType: f.mimeType, name: f.name })),
          mode,
          customPrompt: mode === "custom" ? customPrompt.trim() : "",
        }),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error || `Erro ${response.status}`)
      }

      // Stream the text response
      const reader = response.body?.getReader()
      if (!reader) throw new Error("Sem stream de resposta")

      const decoder = new TextDecoder()
      let full = ""
      setResult("")

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        full += decoder.decode(value, { stream: true })
        setResult(full)
      }

      if (!full) setResult("Sem resultado. Tenta com um ficheiro diferente.")
    } catch (err: any) {
      setError(err.message || "Erro inesperado na análise.")
    } finally {
      setIsAnalysing(false)
    }
  }, [files, mode, customPrompt])

  const handleCopy = useCallback(() => {
    if (!result) return
    navigator.clipboard.writeText(result).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }, [result])

  const handleClear = useCallback(() => {
    setFiles([])
    setResult(null)
    setError(null)
    setCustomPrompt("")
    setMode("describe")
  }, [])

  // ── Render ───────────────────────────────────────────────────────────────

  const selectedMode = MODES.find((m) => m.id === mode)!

  return (
    <div className="flex flex-col lg:flex-row h-full gap-0 overflow-hidden">

      {/* ── Left Panel: Controls ── */}
      <div className="flex flex-col w-full lg:w-96 shrink-0 border-b lg:border-b-0 lg:border-r border-border bg-card overflow-y-auto">
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Eye className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h2 className="font-semibold text-sm text-balance">Visao AI</h2>
              <p className="text-xs text-muted-foreground">OCR e visao computacional</p>
            </div>
          </div>
        </div>

        <div className="flex-1 p-4 space-y-5">
          {/* Drop Zone */}
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 block">
              Ficheiros ({files.length}/{MAX_FILES})
            </label>
            <div
              className={`relative border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-colors ${
                isDragging
                  ? "border-primary bg-primary/5"
                  : files.length > 0
                    ? "border-border bg-muted/20"
                    : "border-border hover:border-primary/50 hover:bg-muted/20"
              }`}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept={ACCEPTED_TYPES.join(",")}
                multiple
                onChange={handleFileInput}
              />
              <Upload className="h-7 w-7 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm font-medium text-foreground">
                {isDragging ? "Solta aqui" : "Clica ou arrasta ficheiros"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                JPG, PNG, WebP, GIF, PDF — máx. {MAX_FILE_MB}MB cada
              </p>
            </div>
          </div>

          {/* File List */}
          {files.length > 0 && (
            <div className="space-y-2">
              {files.map((file) => (
                <div
                  key={file.id}
                  className="flex items-center gap-2 p-2 rounded-lg bg-muted/40 border border-border"
                >
                  {file.preview ? (
                    <img
                      src={file.preview}
                      alt={file.name}
                      className="h-10 w-10 rounded-md object-cover shrink-0"
                    />
                  ) : (
                    <div className="h-10 w-10 rounded-md bg-muted flex items-center justify-center shrink-0">
                      <FileText className="h-5 w-5 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate text-foreground">{file.name}</p>
                    <p className="text-xs text-muted-foreground">{formatBytes(file.size)}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                    onClick={() => removeFile(file.id)}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* Mode Selection */}
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 block">
              Modo de Analise
            </label>
            <div className="space-y-1.5">
              {MODES.map((m) => {
                const Icon = m.icon
                const active = mode === m.id
                return (
                  <button
                    key={m.id}
                    type="button"
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                      active
                        ? "bg-primary/10 border border-primary/30 text-foreground"
                        : "bg-muted/20 border border-transparent hover:bg-muted/40 text-muted-foreground hover:text-foreground"
                    }`}
                    onClick={() => setMode(m.id)}
                  >
                    <div className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 ${active ? "bg-primary/15" : "bg-muted"}`}>
                      <Icon className={`h-3.5 w-3.5 ${active ? "text-primary" : "text-muted-foreground"}`} />
                    </div>
                    <div className="min-w-0">
                      <p className={`text-xs font-medium ${active ? "text-foreground" : ""}`}>{m.label}</p>
                      <p className="text-xs text-muted-foreground truncate">{m.description}</p>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Custom Prompt */}
          {mode === "custom" && (
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 block">
                Instrucao Personalizada
              </label>
              <Textarea
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                placeholder="Ex: Descreve apenas o gráfico da página 2 e extrai os valores do eixo Y..."
                className="min-h-24 text-sm resize-none bg-input border-border"
              />
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="px-3 py-2 rounded-lg bg-destructive/10 border border-destructive/30">
              <p className="text-xs text-destructive">{error}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              className="flex-1 gap-2"
              onClick={handleAnalyse}
              disabled={isAnalysing || files.length === 0}
            >
              {isAnalysing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  A analisar...
                </>
              ) : (
                <>
                  <selectedMode.icon className="h-4 w-4" />
                  Analisar
                </>
              )}
            </Button>
            {(files.length > 0 || result) && (
              <Button variant="outline" size="icon" onClick={handleClear} title="Limpar tudo">
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* ── Right Panel: Result ── */}
      <div className="flex-1 flex flex-col min-h-0 bg-background">
        {/* Preview of uploaded files when no result yet */}
        {files.length > 0 && !result && !isAnalysing && (
          <div className="flex-1 flex flex-col min-h-0">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
              <div className="flex items-center gap-2">
                <ImageIcon className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">
                  Preview — {files.length} ficheiro{files.length > 1 ? "s" : ""}
                </span>
              </div>
            </div>
            <ScrollArea className="flex-1">
              <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                {files.map((file) => (
                  <div key={file.id} className="relative group rounded-xl overflow-hidden border border-border bg-muted/20">
                    {file.preview ? (
                      <img
                        src={file.preview}
                        alt={file.name}
                        className="w-full h-48 sm:h-64 object-contain bg-black/5"
                      />
                    ) : (
                      <div className="w-full h-48 sm:h-64 flex flex-col items-center justify-center bg-muted/30">
                        <FileText className="h-12 w-12 text-muted-foreground mb-2" />
                        <span className="text-sm text-muted-foreground">PDF</span>
                      </div>
                    )}
                    <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/60 to-transparent">
                      <p className="text-xs text-white truncate font-medium">{file.name}</p>
                      <p className="text-xs text-white/70">{formatBytes(file.size)}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute top-2 right-2 h-7 w-7 bg-black/40 hover:bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => removeFile(file.id)}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}
        
        {files.length === 0 && !result && !isAnalysing && (
          /* Empty state */
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
              <Eye className="h-8 w-8 text-primary" />
            </div>
            <h3 className="font-semibold text-lg mb-2 text-balance">Visao AI pronta</h3>
            <p className="text-muted-foreground text-sm max-w-xs text-pretty">
              Carrega imagens ou PDFs, escolhe o modo de analise e obtém resultados detalhados com IA.
            </p>
            <div className="mt-6 grid grid-cols-2 gap-2 text-xs text-muted-foreground max-w-sm w-full">
              {[
                { icon: ScanText, text: "OCR preciso" },
                { icon: Eye, text: "Descricao visual" },
                { icon: BarChart3, text: "Analise de dados" },
                { icon: ImageIcon, text: "Suporte a PDF" },
              ].map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/30 border border-border">
                  <Icon className="h-3.5 w-3.5 text-primary shrink-0" />
                  <span>{text}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {(result || isAnalysing) && (
          /* Result area */
          <div className="flex-1 flex flex-col min-h-0">
            {/* Result header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
              <div className="flex items-center gap-2">
                {isAnalysing ? (
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                ) : (
                  <selectedMode.icon className="h-4 w-4 text-primary" />
                )}
                <span className="text-sm font-medium">
                  {isAnalysing ? "A analisar..." : `Resultado — ${selectedMode.label}`}
                </span>
                {isAnalysing && (
                  <Badge variant="secondary" className="text-xs animate-pulse">
                    streaming
                  </Badge>
                )}
              </div>
              {result && !isAnalysing && (
                <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs" onClick={handleCopy}>
                  {copied ? (
                    <><Check className="h-3.5 w-3.5 text-green-500" /> Copiado</>
                  ) : (
                    <><Copy className="h-3.5 w-3.5" /> Copiar</>
                  )}
                </Button>
              )}
            </div>

            {/* Scrollable result */}
            <ScrollArea className="flex-1">
              <div className="p-4 sm:p-6 max-w-3xl mx-auto">
                {result ? (
                  <div className={`prose prose-sm dark:prose-invert max-w-none ${isAnalysing ? "typing-cursor" : ""}`}>
                    <ReactMarkdown>{result}</ReactMarkdown>
                  </div>
                ) : (
                  isAnalysing && (
                    <div className="flex items-center gap-3 text-muted-foreground text-sm">
                      <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                      <span>A processar ficheiro{files.length > 1 ? "s" : ""}...</span>
                    </div>
                  )
                )}
              </div>
            </ScrollArea>
          </div>
        )}
      </div>
    </div>
  )
}
