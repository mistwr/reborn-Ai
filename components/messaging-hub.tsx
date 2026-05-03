"use client"

import { useState, useRef } from "react"
import * as XLSX from "xlsx"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  MessageCircle,
  Mail,
  Send,
  Upload,
  CheckCircle,
  XCircle,
  Copy,
  ExternalLink,
  Loader2,
  Users,
  AlertCircle,
  Layers,
  Phone,
} from "lucide-react"

// ── Types ─────────────────────────────────────────────────────────────────────
interface Contact {
  name: string
  phone: string
  message?: string
}

interface Stats {
  valid: number
  invalid: number
  duplicates: number
  batches: number
}

// ── Country list ──────────────────────────────────────────────────────────────
const COUNTRIES = [
  { code: "+351", label: "Portugal (+351)" },
  { code: "+55", label: "Brasil (+55)" },
  { code: "+34", label: "Espanha (+34)" },
  { code: "+33", label: "Franca (+33)" },
  { code: "+44", label: "Reino Unido (+44)" },
  { code: "+1", label: "EUA/Canada (+1)" },
  { code: "+49", label: "Alemanha (+49)" },
  { code: "+39", label: "Italia (+39)" },
  { code: "+31", label: "Holanda (+31)" },
  { code: "+32", label: "Belgica (+32)" },
  { code: "+41", label: "Suica (+41)" },
  { code: "+244", label: "Angola (+244)" },
  { code: "+258", label: "Mocambique (+258)" },
  { code: "+238", label: "Cabo Verde (+238)" },
  { code: "", label: "Nenhum (ja formatados)" },
]

// ── Helpers ───────────────────────────────────────────────────────────────────
function parseContactsFromText(text: string): Contact[] {
  const contacts: Contact[] = []
  for (const line of text.split(/\r?\n/)) {
    const cells = line.split(/[,;\t]/)
    if (cells.length >= 2) {
      const a = cells[0].trim().replace(/"/g, "")
      const b = cells[1].trim().replace(/"/g, "")
      if (/^\+?[\d\s\-(). ]{8,}$/.test(a)) contacts.push({ name: b, phone: a })
      else if (/^\+?[\d\s\-(). ]{8,}$/.test(b)) contacts.push({ name: a, phone: b })
    } else if (cells.length === 1) {
      const t = cells[0].trim().replace(/"/g, "")
      if (/^\+?[\d\s\-(). ]{8,}$/.test(t)) contacts.push({ name: "", phone: t })
    }
  }
  return contacts
}

function parseContactsFromExcel(buffer: ArrayBuffer): Contact[] {
  const contacts: Contact[] = []
  try {
    const wb = XLSX.read(buffer, { type: "array" })
    for (const sheetName of wb.SheetNames) {
      const sheet = wb.Sheets[sheetName]
      const data = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][]
      for (const row of data) {
        if (!row?.length) continue
        let name = "", phone = ""
        for (const cell of row) {
          if (cell == null) continue
          const val = String(cell).trim()
          if (/^\+?[\d\s\-(). ]{8,}$/.test(val) && !phone) phone = val
          else if (/[a-zA-Z]/.test(val) && !name) name = val
        }
        if (phone) contacts.push({ name, phone })
      }
    }
  } catch { /* ignore */ }
  return contacts
}

function parseEmailsFromText(text: string): string[] {
  const emails: string[] = []
  for (const line of text.split(/\r?\n/)) {
    for (const cell of line.split(/[,;\t]/)) {
      const t = cell.trim().replace(/"/g, "")
      if (t.includes("@")) emails.push(t)
    }
  }
  return emails
}

function parseEmailsFromExcel(buffer: ArrayBuffer): string[] {
  const emails: string[] = []
  try {
    const wb = XLSX.read(buffer, { type: "array" })
    for (const sheetName of wb.SheetNames) {
      const data = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { header: 1 }) as any[][]
      for (const row of data) {
        for (const cell of row ?? []) {
          const val = String(cell ?? "").trim()
          if (val.includes("@")) emails.push(val)
        }
      }
    }
  } catch { /* ignore */ }
  return emails
}

// ── StatsBar ──────────────────────────────────────────────────────────────────
function StatsBar({ stats }: { stats: Stats | null }) {
  if (!stats) return (
    <p className="text-sm text-muted-foreground">As estatisticas aparecerao aqui apos processar.</p>
  )
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {[
        { label: "Validos", value: stats.valid, color: "text-green-400 bg-green-500/10 border-green-500/20" },
        { label: "Invalidos", value: stats.invalid, color: "text-red-400 bg-red-500/10 border-red-500/20" },
        { label: "Duplicados", value: stats.duplicates, color: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20" },
        { label: "Lotes", value: stats.batches, color: "text-primary bg-primary/10 border-primary/20" },
      ].map(({ label, value, color }) => (
        <div key={label} className={`rounded-lg border p-3 ${color}`}>
          <div className="text-2xl font-bold">{value}</div>
          <div className="text-xs opacity-80">{label}</div>
        </div>
      ))}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// SMS TAB
// ─────────────────────────────────────────────────────────────────────────────
function SmsTab() {
  const [message, setMessage] = useState("")
  const [numbersText, setNumbersText] = useState("")
  const [countryCode, setCountryCode] = useState("+351")
  const [batchSize, setBatchSize] = useState("20")
  const [stats, setStats] = useState<Stats | null>(null)
  const [batches, setBatches] = useState<{ contacts: Contact[]; index: number }[]>([])
  const [invalid, setInvalid] = useState<string[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [copied, setCopied] = useState<number | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const validatePhone = (raw: string): { valid: boolean; formatted: string } => {
    let cleaned = raw.replace(/[\s\-(). +]/g, "").trim()
    if (!cleaned) return { valid: false, formatted: "" }
    if (countryCode && cleaned.startsWith("0")) cleaned = cleaned.slice(1)
    if (!/^\d+$/.test(cleaned) || cleaned.length < 7 || cleaned.length > 15) return { valid: false, formatted: "" }
    return { valid: true, formatted: countryCode + cleaned }
  }

  const process = (contacts: Contact[]) => {
    const bs = parseInt(batchSize)
    const valid: Contact[] = []
    const inv: string[] = []
    const seen = new Set<string>()

    for (const c of contacts) {
      const { valid: ok, formatted } = validatePhone(c.phone)
      if (ok && !seen.has(formatted)) {
        seen.add(formatted)
        valid.push({
          ...c,
          phone: formatted,
          message: message.replace(/\{nome\}/gi, c.name || "Cliente"),
        })
      } else if (!ok && c.phone.trim()) {
        inv.push(c.phone)
      }
    }

    const batchArr = []
    for (let i = 0; i < valid.length; i += bs) {
      batchArr.push({ contacts: valid.slice(i, i + bs), index: i / bs })
    }

    setStats({ valid: valid.length, invalid: inv.length, duplicates: contacts.length - valid.length - inv.length, batches: batchArr.length })
    setBatches(batchArr)
    setInvalid(inv)
    setIsProcessing(false)
  }

  const handleGenerate = () => {
    setIsProcessing(true)
    const file = fileRef.current?.files?.[0]
    if (file) {
      const isXlsx = file.name.endsWith(".xlsx") || file.name.endsWith(".xls")
      if (isXlsx) {
        file.arrayBuffer().then(buf => process([...parseContactsFromText(numbersText), ...parseContactsFromExcel(buf)]))
      } else {
        file.text().then(txt => process([...parseContactsFromText(numbersText), ...parseContactsFromText(txt)]))
      }
    } else {
      process(parseContactsFromText(numbersText))
    }
  }

  const copyBatch = (idx: number, phones: string[]) => {
    navigator.clipboard.writeText(phones.join("\n"))
    setCopied(idx)
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-4">
      <Card className="p-5 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <MessageCircle className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-lg">SMS em Massa com Personalizacao</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          Use <code className="bg-muted px-1 rounded text-xs">{"{nome}"}</code> para personalizar automaticamente com o nome de cada contacto.
        </p>

        <div className="space-y-1">
          <Label>Mensagem</Label>
          <Textarea
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder={`Ola {nome}, temos uma oferta especial para ti!`}
            className="min-h-[90px]"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label>Prefixo do Pais</Label>
            <select
              value={countryCode}
              onChange={e => setCountryCode(e.target.value)}
              className="w-full p-2 rounded-md border bg-background text-sm"
            >
              {COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <Label>Tamanho do Lote</Label>
            <select
              value={batchSize}
              onChange={e => setBatchSize(e.target.value)}
              className="w-full p-2 rounded-md border bg-background text-sm"
            >
              <option value="1">1 (max personalizacao)</option>
              <option value="5">5 por lote</option>
              <option value="10">10 por lote</option>
              <option value="20">20 por lote (recomendado)</option>
              <option value="50">50 por lote</option>
            </select>
          </div>
        </div>

        <div className="space-y-1">
          <Label>Contactos (Nome, Numero — um por linha)</Label>
          <Textarea
            value={numbersText}
            onChange={e => setNumbersText(e.target.value)}
            placeholder={"Joao Silva, 912345678\nMaria Santos, 923456789\n934567890"}
            className="min-h-[100px] font-mono text-sm"
          />
        </div>

        <div className="space-y-1">
          <Label>Ou importa Excel / CSV</Label>
          <div className="flex items-center gap-2">
            <Input ref={fileRef} type="file" accept=".csv,.txt,.xlsx,.xls" className="text-sm" />
            <Upload className="h-4 w-4 text-muted-foreground shrink-0" />
          </div>
        </div>

        <Button onClick={handleGenerate} disabled={isProcessing || (!message.trim() && !numbersText.trim())} className="w-full">
          {isProcessing ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />A processar...</> : <><Send className="h-4 w-4 mr-2" />Gerar SMS Personalizados</>}
        </Button>
      </Card>

      {(stats || batches.length > 0) && (
        <Card className="p-5 space-y-4">
          <h4 className="font-medium flex items-center gap-2"><Users className="h-4 w-4" />Estatisticas</h4>
          <StatsBar stats={stats} />
          {invalid.length > 0 && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
              <p className="text-sm font-medium text-red-400 mb-1 flex items-center gap-1"><XCircle className="h-3 w-3" />Numeros invalidos ({invalid.length})</p>
              <p className="text-xs text-muted-foreground font-mono">{invalid.slice(0, 8).join(", ")}{invalid.length > 8 ? ` ...+${invalid.length - 8}` : ""}</p>
            </div>
          )}
        </Card>
      )}

      {batches.length > 0 && (
        <Card className="p-5 space-y-3">
          <h4 className="font-medium flex items-center gap-2"><Layers className="h-4 w-4" />Lotes para Envio</h4>
          {batches.map((batch) => {
            const phones = batch.contacts.map(c => c.phone)
            const smsUrl = `sms:${phones[0]}?body=${encodeURIComponent(batch.contacts[0]?.message || message)}`
            return (
              <div key={batch.index} className="p-3 rounded-lg border bg-card space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">Lote {batch.index + 1}</span>
                  <Badge variant="outline" className="text-xs">{batch.contacts.length} contactos</Badge>
                </div>
                <div className="text-xs text-muted-foreground font-mono bg-muted/50 rounded p-2 max-h-16 overflow-y-auto">
                  {batch.contacts.slice(0, 4).map(c => <div key={c.phone}>{c.phone}{c.name ? ` — ${c.name}` : ""}</div>)}
                  {batch.contacts.length > 4 && <div>...+{batch.contacts.length - 4} mais</div>}
                </div>
                <div className="flex gap-2">
                  <Button size="sm" className="flex-1" asChild>
                    <a href={smsUrl}><MessageCircle className="h-3 w-3 mr-1" />Abrir SMS</a>
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => copyBatch(batch.index, phones)}>
                    {copied === batch.index ? <CheckCircle className="h-3 w-3 text-green-400" /> : <Copy className="h-3 w-3" />}
                  </Button>
                </div>
              </div>
            )
          })}
        </Card>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// EMAIL TAB
// ─────────────────────────────────────────────────────────────────────────────
function EmailTab() {
  const [subject, setSubject] = useState("")
  const [body, setBody] = useState("")
  const [emailsText, setEmailsText] = useState("")
  const [batchSize, setBatchSize] = useState("50")
  const [stats, setStats] = useState<Stats | null>(null)
  const [batches, setBatches] = useState<string[][]>([])
  const [invalid, setInvalid] = useState<string[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [copied, setCopied] = useState<number | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const process = (emails: string[]) => {
    const bs = parseInt(batchSize)
    const valid: string[] = []
    const inv: string[] = []
    const seen = new Set<string>()

    for (const e of emails) {
      const cleaned = e.trim().toLowerCase()
      if (!cleaned) continue
      if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleaned)) {
        if (!seen.has(cleaned)) { seen.add(cleaned); valid.push(cleaned) }
      } else if (cleaned) {
        inv.push(e)
      }
    }

    const batchArr: string[][] = []
    for (let i = 0; i < valid.length; i += bs) batchArr.push(valid.slice(i, i + bs))

    setStats({ valid: valid.length, invalid: inv.length, duplicates: emails.length - valid.length - inv.length, batches: batchArr.length })
    setBatches(batchArr)
    setInvalid(inv)
    setIsProcessing(false)
  }

  const handleGenerate = () => {
    setIsProcessing(true)
    const file = fileRef.current?.files?.[0]
    const manual = emailsText.split("\n").map(e => e.trim()).filter(Boolean)
    if (file) {
      const isXlsx = file.name.endsWith(".xlsx") || file.name.endsWith(".xls")
      if (isXlsx) {
        file.arrayBuffer().then(buf => process([...manual, ...parseEmailsFromExcel(buf)]))
      } else {
        file.text().then(txt => process([...manual, ...parseEmailsFromText(txt)]))
      }
    } else {
      process(manual)
    }
  }

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-4">
      <Card className="p-5 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <Mail className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-lg">Email em Massa</h3>
        </div>
        <p className="text-sm text-muted-foreground">Gera links mailto em BCC para enviar com o teu cliente de email. Funciona 100% offline, sem APIs.</p>

        <div className="space-y-1">
          <Label>Assunto</Label>
          <Input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Assunto do email..." />
        </div>

        <div className="space-y-1">
          <Label>Corpo do Email</Label>
          <Textarea value={body} onChange={e => setBody(e.target.value)} placeholder="Conteudo do email..." className="min-h-[120px]" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label>Emails (um por linha)</Label>
            <Textarea value={emailsText} onChange={e => setEmailsText(e.target.value)} placeholder={"email1@ex.com\nemail2@ex.com"} className="min-h-[100px] font-mono text-sm" />
          </div>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Importar CSV / Excel</Label>
              <Input ref={fileRef} type="file" accept=".csv,.txt,.xlsx,.xls" className="text-sm" />
            </div>
            <div className="space-y-1">
              <Label>Tamanho do Lote (BCC)</Label>
              <select value={batchSize} onChange={e => setBatchSize(e.target.value)} className="w-full p-2 rounded-md border bg-background text-sm">
                <option value="20">20 por lote</option>
                <option value="50">50 por lote (recomendado)</option>
                <option value="100">100 por lote</option>
              </select>
            </div>
          </div>
        </div>

        <Button onClick={handleGenerate} disabled={isProcessing || !emailsText.trim()} className="w-full">
          {isProcessing ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />A processar...</> : <><Mail className="h-4 w-4 mr-2" />Gerar Links Email</>}
        </Button>
      </Card>

      {stats && (
        <Card className="p-5 space-y-4">
          <h4 className="font-medium flex items-center gap-2"><Users className="h-4 w-4" />Estatisticas</h4>
          <StatsBar stats={stats} />
          {invalid.length > 0 && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
              <p className="text-sm font-medium text-red-400 mb-1 flex items-center gap-1"><XCircle className="h-3 w-3" />Emails invalidos ({invalid.length})</p>
              <p className="text-xs font-mono text-muted-foreground">{invalid.slice(0, 6).join(", ")}{invalid.length > 6 ? ` ...+${invalid.length - 6}` : ""}</p>
            </div>
          )}
        </Card>
      )}

      {batches.length > 0 && (
        <Card className="p-5 space-y-3">
          <h4 className="font-medium flex items-center gap-2"><Layers className="h-4 w-4" />Lotes para Envio</h4>
          {batches.map((batch, i) => {
            const mailtoUrl = `mailto:?bcc=${encodeURIComponent(batch.join(","))}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
            return (
              <div key={i} className="p-3 rounded-lg border bg-card space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">Lote {i + 1}</span>
                  <Badge variant="outline" className="text-xs">{batch.length} emails</Badge>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" className="flex-1" asChild>
                    <a href={mailtoUrl}><ExternalLink className="h-3 w-3 mr-1" />Abrir Email</a>
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(batch.join("; ")); setCopied(i); setTimeout(() => setCopied(null), 2000) }}>
                    {copied === i ? <CheckCircle className="h-3 w-3 text-green-400" /> : <Copy className="h-3 w-3" />}
                  </Button>
                </div>
              </div>
            )
          })}
        </Card>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// WHATSAPP TAB
// ─────────────────────────────────────────────────────────────────────────────
function WhatsAppTab() {
  const [message, setMessage] = useState("")
  const [numbersText, setNumbersText] = useState("")
  const [countryCode, setCountryCode] = useState("351")
  const [stats, setStats] = useState<{ valid: number; invalid: number; duplicates: number } | null>(null)
  const [links, setLinks] = useState<{ num: string; url: string }[]>([])
  const [invalid, setInvalid] = useState<string[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const validateNum = (raw: string): { valid: boolean; formatted: string } => {
    let cleaned = raw.replace(/[\s\-(). +]/g, "").trim()
    if (!cleaned) return { valid: false, formatted: "" }
    if (countryCode && cleaned.startsWith("0")) cleaned = cleaned.slice(1)
    if (!/^\d+$/.test(cleaned) || cleaned.length < 7 || cleaned.length > 15) return { valid: false, formatted: "" }
    return { valid: true, formatted: countryCode + cleaned }
  }

  const process = (numbers: string[]) => {
    const valid: string[] = []
    const inv: string[] = []
    const seen = new Set<string>()
    for (const n of numbers) {
      const { valid: ok, formatted } = validateNum(n)
      if (ok && !seen.has(formatted)) { seen.add(formatted); valid.push(formatted) }
      else if (!ok && n.trim()) inv.push(n)
    }
    const enc = encodeURIComponent(message)
    setLinks(valid.map(num => ({ num, url: `https://wa.me/${num}?text=${enc}` })))
    setStats({ valid: valid.length, invalid: inv.length, duplicates: numbers.length - valid.length - inv.length })
    setInvalid(inv)
    setIsProcessing(false)
  }

  const handleGenerate = () => {
    setIsProcessing(true)
    const file = fileRef.current?.files?.[0]
    const manual = numbersText.split("\n").map(n => n.trim()).filter(Boolean)
    if (file) {
      const isXlsx = file.name.endsWith(".xlsx") || file.name.endsWith(".xls")
      if (isXlsx) {
        file.arrayBuffer().then(buf => {
          const nums: string[] = []
          try {
            const wb = XLSX.read(buf, { type: "array" })
            for (const s of wb.SheetNames) {
              const data = XLSX.utils.sheet_to_json(wb.Sheets[s], { header: 1 }) as any[][]
              for (const row of data) for (const cell of row ?? []) { const v = String(cell ?? "").trim(); if (/^[\d\s\-(). +]{8,}$/.test(v)) nums.push(v) }
            }
          } catch { /* ignore */ }
          process([...manual, ...nums])
        })
      } else {
        file.text().then(txt => {
          const nums = txt.split(/\r?\n/).flatMap(l => l.split(/[,;\t]/)).map(c => c.trim()).filter(c => /^[\d\s\-(). +]{8,}$/.test(c))
          process([...manual, ...nums])
        })
      }
    } else {
      process(manual)
    }
  }

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-4">
      <Card className="p-5 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <Phone className="h-5 w-5 text-green-500" />
          <h3 className="font-semibold text-lg">WhatsApp em Massa</h3>
        </div>
        <p className="text-sm text-muted-foreground">Gera links individuais que abrem o WhatsApp com a mensagem ja preenchida. Suporta formatacao: <code className="bg-muted px-1 rounded text-xs">*negrito*</code>, <code className="bg-muted px-1 rounded text-xs">_italico_</code>.</p>

        <div className="space-y-1">
          <Label>Mensagem</Label>
          <Textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="Ola! Temos uma oferta especial para ti. *Aproveita ja!*" className="min-h-[100px]" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label>Prefixo do Pais</Label>
            <select value={countryCode} onChange={e => setCountryCode(e.target.value)} className="w-full p-2 rounded-md border bg-background text-sm">
              {[["351","Portugal"],["55","Brasil"],["34","Espanha"],["33","Franca"],["44","RU"],["1","EUA/CA"],["49","Alemanha"],["39","Italia"],["244","Angola"],["258","Mocambique"],["238","Cabo Verde"],["","Nenhum"]].map(([v, l]) => (
                <option key={v} value={v}>{l}{v ? ` (+${v})` : ""}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label>Numeros (um por linha)</Label>
            <Textarea value={numbersText} onChange={e => setNumbersText(e.target.value)} placeholder={"912345678\n923456789"} className="min-h-[80px] font-mono text-sm" />
          </div>
        </div>

        <div className="space-y-1">
          <Label>Ou importa Excel / CSV</Label>
          <Input ref={fileRef} type="file" accept=".csv,.txt,.xlsx,.xls" className="text-sm" />
        </div>

        <Button onClick={handleGenerate} disabled={isProcessing || (!message.trim() && !numbersText.trim())} className="w-full bg-green-600 hover:bg-green-700 text-white">
          {isProcessing ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />A processar...</> : <><Phone className="h-4 w-4 mr-2" />Gerar Links WhatsApp</>}
        </Button>
      </Card>

      {stats && (
        <Card className="p-5 space-y-4">
          <h4 className="font-medium flex items-center gap-2"><Users className="h-4 w-4" />Estatisticas</h4>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Validos", value: stats.valid, color: "text-green-400 bg-green-500/10 border-green-500/20" },
              { label: "Invalidos", value: stats.invalid, color: "text-red-400 bg-red-500/10 border-red-500/20" },
              { label: "Duplicados", value: stats.duplicates, color: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20" },
            ].map(({ label, value, color }) => (
              <div key={label} className={`rounded-lg border p-3 ${color}`}>
                <div className="text-2xl font-bold">{value}</div>
                <div className="text-xs opacity-80">{label}</div>
              </div>
            ))}
          </div>
          {invalid.length > 0 && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
              <p className="text-sm font-medium text-red-400 mb-1 flex items-center gap-1"><XCircle className="h-3 w-3" />Invalidos ({invalid.length})</p>
              <p className="text-xs font-mono text-muted-foreground">{invalid.slice(0, 6).join(", ")}</p>
            </div>
          )}
        </Card>
      )}

      {links.length > 0 && (
        <Card className="p-5 space-y-3">
          <h4 className="font-medium flex items-center gap-2"><Phone className="h-4 w-4 text-green-500" />Links WhatsApp ({links.length})</h4>
          <p className="text-xs text-muted-foreground flex items-center gap-1"><AlertCircle className="h-3 w-3" />Cada link abre uma conversa individual com a mensagem pre-preenchida.</p>
          <div className="max-h-80 overflow-y-auto space-y-2 pr-1">
            {links.map(({ num, url }, i) => (
              <a key={num} href={url} target="_blank" rel="noopener noreferrer"
                className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted transition-colors group">
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground w-6">{i + 1}.</span>
                  <span className="font-mono text-sm">+{num}</span>
                </div>
                <ExternalLink className="h-4 w-4 text-green-500 opacity-60 group-hover:opacity-100" />
              </a>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN EXPORT
// ─────────────────────────────────────────────────────────────────────────────
export function MessagingHub() {
  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      <Tabs defaultValue="sms" className="flex-1 flex flex-col min-h-0">
        <div className="border-b border-border px-4 pt-4 shrink-0">
          <TabsList className="w-full max-w-sm grid grid-cols-3">
            <TabsTrigger value="sms" className="gap-1.5 text-xs sm:text-sm">
              <MessageCircle className="h-3.5 w-3.5" />SMS
            </TabsTrigger>
            <TabsTrigger value="email" className="gap-1.5 text-xs sm:text-sm">
              <Mail className="h-3.5 w-3.5" />Email
            </TabsTrigger>
            <TabsTrigger value="whatsapp" className="gap-1.5 text-xs sm:text-sm">
              <Phone className="h-3.5 w-3.5" />WhatsApp
            </TabsTrigger>
          </TabsList>
        </div>
        <ScrollArea className="flex-1">
          <TabsContent value="sms" className="m-0"><SmsTab /></TabsContent>
          <TabsContent value="email" className="m-0"><EmailTab /></TabsContent>
          <TabsContent value="whatsapp" className="m-0"><WhatsAppTab /></TabsContent>
        </ScrollArea>
      </Tabs>
    </div>
  )
}
