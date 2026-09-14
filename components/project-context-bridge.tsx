"use client"

import { useEffect, useState } from "react"
import type { ProjectBrief } from "@/lib/content-brief"

const STORAGE_KEY = "reborn-project-brief-v1"
const CONTEXT_ENDPOINTS = [
  "/api/generate-image",
  "/api/generate-presentation",
  "/api/generate-ebook",
  "/api/generate-website",
]

const ENDPOINT_OVERRIDES: Record<string, string> = {
  "/api/generate-presentation": "/api/generate-presentation-v2",
  "/api/generate-ebook": "/api/generate-ebook-v2",
}

type AgentHudState = {
  visible: boolean
  busy: boolean
  label: string
  detail: string
  approval: boolean
  sessionId?: string
  executed: boolean
  web: boolean
  sandbox: boolean
  browser: boolean
}

const IDLE_HUD: AgentHudState = {
  visible: false,
  busy: false,
  label: "Lumin Agent",
  detail: "",
  approval: false,
  executed: false,
  web: false,
  sandbox: false,
  browser: false,
}

function readStoredBrief(): ProjectBrief | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === "object" ? parsed : null
  } catch {
    return null
  }
}

function compactBrief(input: unknown): ProjectBrief | null {
  if (!input || typeof input !== "object") return null
  const source = input as Record<string, unknown>
  const out: ProjectBrief = {}
  const keys: Array<keyof ProjectBrief> = [
    "projectName",
    "brandName",
    "audience",
    "objective",
    "tone",
    "language",
    "primaryColor",
    "secondaryColor",
    "visualStyle",
    "cta",
    "productOrService",
    "notes",
  ]

  for (const key of keys) {
    const value = source[key]
    if (typeof value === "string" && value.trim()) {
      ;(out as Record<string, unknown>)[key] = value.trim().slice(0, 500)
    }
  }

  if (Array.isArray(source.keywords)) {
    out.keywords = source.keywords
      .filter((v): v is string => typeof v === "string" && Boolean(v.trim()))
      .slice(0, 12)
      .map((v) => v.trim().slice(0, 80))
  }

  return Object.keys(out).length ? out : null
}

function mergeBrief(base: ProjectBrief | null, next: ProjectBrief | null): ProjectBrief | null {
  if (!base && !next) return null
  return {
    ...(base || {}),
    ...(next || {}),
    keywords: next?.keywords?.length ? next.keywords : base?.keywords,
  }
}

function saveBrief(brief: ProjectBrief | null) {
  if (!brief) return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(brief))
    window.dispatchEvent(new CustomEvent("reborn:project-brief", { detail: brief }))
  } catch {
    // Context is an enhancement; never block generation if storage is unavailable.
  }
}

function endpointPath(input: RequestInfo | URL) {
  try {
    if (typeof input === "string") return new URL(input, window.location.origin).pathname
    if (input instanceof URL) return input.pathname
    return new URL(input.url, window.location.origin).pathname
  } catch {
    return ""
  }
}

function rerouteInput(input: RequestInfo | URL, path: string): RequestInfo | URL {
  const override = ENDPOINT_OVERRIDES[path]
  if (!override) return input

  try {
    if (typeof input === "string") {
      const url = new URL(input, window.location.origin)
      url.pathname = override
      return input.startsWith("http") ? url.toString() : `${url.pathname}${url.search}${url.hash}`
    }

    if (input instanceof URL) {
      const url = new URL(input.toString())
      url.pathname = override
      return url
    }

    const url = new URL(input.url, window.location.origin)
    url.pathname = override
    return new Request(url.toString(), input)
  } catch {
    return input
  }
}

function guessActivity(body: any) {
  const message = String(body?.message || "").toLowerCase()
  if (/\b(aprova|aprovo|confirmo|rejeita|cancela)\b/.test(message)) return "A executar decisão aprovada"
  if (/\b(abre|navega|site|website|página|pagina|clica|preenche|formulário|formulario|browser)\b/.test(message)) return "A navegar no browser"
  if (/\b(calcula|cálculo|python|javascript|csv|excel|dados|simula|estatística)\b/.test(message)) return "A executar na sandbox"
  if (/\b(hoje|agora|atual|últim|recent|notícia|preço|mercado|pesquisa|procura|internet)\b/.test(message)) return "A pesquisar e cruzar fontes"
  return "A pensar"
}

function localResilienceReply(message: string, offline: boolean) {
  const value = String(message || "").trim()
  const lower = value.toLowerCase()
  const currentInfo = /\b(hoje|agora|atual|not[ií]cia|pre[çc]o|mercado|cotação|tempo|meteorologia|resultado|ranking|stock|horário|lei|governo|latest|current|today)\b/i.test(value)
  const approval = /^\s*(aprovo|aprova|confirmo|executa|faz isso|rejeita|cancela)\b/i.test(value)

  if (/^(ol[aá]|hello|hi|boas|bom dia|boa tarde|boa noite|tas ai|tás aí|estás aí|responde)[!?., ]*$/i.test(value)) {
    return offline
      ? "Estou aqui. Estou em **Modo Offline**: consigo manter a conversa e ajudar com conteúdo que não dependa da internet. Pesquisa web, Browser Agent e dados atuais voltam assim que houver ligação."
      : "Estou aqui. Entrei em **Modo Resiliência** porque os modelos externos estão temporariamente indisponíveis. A conversa continua ativa e volto automaticamente ao modo completo assim que um provider responder."
  }

  if (approval) {
    return "Recebi a tua decisão. Neste momento o motor de linguagem está em **Modo Resiliência**, por isso não vou assumir nem repetir uma ação externa sem confirmação real do servidor. Assim que o serviço normalizar, podes enviar a decisão novamente e o Browser Agent continua da sessão guardada."
  }

  if (offline && currentInfo) {
    return `Estou em **Modo Offline**. Recebi o teu pedido — “${value.slice(0, 180)}” — mas esta resposta depende de informação atual e não seria correto inventar dados sem ligação. Assim que a internet voltar, o Lumin pesquisa e valida as fontes automaticamente.`
  }

  if (offline) {
    return `Estou em **Modo Offline** e continuo disponível. Recebi: “${value.slice(0, 220)}”. Posso ajudar com escrita, estrutura, ideias, revisão e trabalho que não dependa de informação online. Para pesquisa web, Browser Agent ou IA remota, retomo automaticamente quando a ligação regressar.`
  }

  return `Estou em **Modo Resiliência**. Recebi o teu pedido — “${value.slice(0, 220)}” — mas os modelos externos não responderam mesmo após novas tentativas. Não perdi a conversa nem vou inventar uma resposta. Podes continuar a escrever; o Lumin volta automaticamente ao modo completo quando um provider ficar disponível.`
}

function resilienceResponse(text: string, mode: "offline" | "provider") {
  return new Response(text, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Lumin-Resilience": mode,
    },
  })
}

export function ProjectContextBridge() {
  const [hud, setHud] = useState<AgentHudState>(IDLE_HUD)

  useEffect(() => {
    const originalFetch = window.fetch.bind(window)

    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const path = endpointPath(input)
      const shouldEnhance = CONTEXT_ENDPOINTS.includes(path)
      const targetInput = rerouteInput(input, path)

      if (path === "/api/chat") {
        let parsedBody: any = null
        try {
          if (typeof init?.body === "string") parsedBody = JSON.parse(init.body)
        } catch {}

        const userMessage = String(parsedBody?.message || "")
        if (typeof navigator !== "undefined" && navigator.onLine === false) {
          setHud({
            ...IDLE_HUD,
            visible: true,
            label: "Modo Offline",
            detail: "Sem ligação. O Lumin mantém o chat vivo e evita inventar informação atual.",
          })
          return resilienceResponse(localResilienceReply(userMessage, true), "offline")
        }

        setHud((prev) => ({
          ...prev,
          visible: true,
          busy: true,
          label: guessActivity(parsedBody),
          detail: "Lumin Agent está a trabalhar no pedido…",
          approval: false,
          executed: false,
        }))

        try {
          const response = await originalFetch(targetInput, init)

          if (!response.ok && response.status >= 500) {
            setHud({
              ...IDLE_HUD,
              visible: true,
              label: "Modo Resiliência",
              detail: "Os providers não responderam. O chat continua ativo sem mostrar erro técnico.",
            })
            return resilienceResponse(localResilienceReply(userMessage, false), "provider")
          }

          const web = response.headers.get("X-Lumin-Web-Search") === "1"
          const sandbox = response.headers.get("X-Lumin-Sandbox") === "1"
          const browser = response.headers.get("X-Lumin-Browser") === "1"
          const approval = response.headers.get("X-Lumin-Browser-Approval") === "1"
          const executed = response.headers.get("X-Lumin-Browser-Executed") === "1"
          const sessionId = response.headers.get("X-Lumin-Browser-Session") || undefined
          const opened = response.headers.get("X-Lumin-Web-Opened") || "0"
          const resilience = response.headers.get("X-Lumin-Resilience")

          let label = "Concluído"
          let detail = "Resposta pronta"
          if (resilience) {
            label = resilience === "offline" ? "Modo Offline" : "Modo Resiliência"
            detail = resilience === "offline" ? "Resposta local sem ligação." : "Resposta local de segurança."
          } else if (approval) {
            label = "Aprovação necessária"
            detail = "O Lumin preparou uma ação no browser e está à espera da tua decisão."
          } else if (executed) {
            label = "Ação executada"
            detail = "A ação aprovada foi executada e o estado da página foi atualizado."
          } else if (browser) {
            label = "Browser Agent concluído"
            detail = "O Lumin navegou e analisou a página."
          } else if (sandbox) {
            label = "Sandbox concluída"
            detail = "O Lumin executou o cálculo/código numa sandbox isolada."
          } else if (web) {
            label = "Pesquisa concluída"
            detail = `${opened} página(s) aberta(s) e analisada(s).`
          }

          setHud({
            visible: Boolean(resilience) || web || sandbox || browser || approval || executed,
            busy: false,
            label,
            detail,
            approval,
            sessionId,
            executed,
            web,
            sandbox,
            browser,
          })
          return response
        } catch {
          setHud({
            ...IDLE_HUD,
            visible: true,
            label: "Modo Resiliência",
            detail: "Falha de rede/provider. O chat continua com resposta local segura.",
          })
          return resilienceResponse(localResilienceReply(userMessage, typeof navigator !== "undefined" && navigator.onLine === false), "provider")
        }
      }

      if (!shouldEnhance || !init?.body || typeof init.body !== "string") {
        return originalFetch(targetInput, init)
      }

      try {
        const body = JSON.parse(init.body)
        if (!body || typeof body !== "object") return originalFetch(targetInput, init)

        const stored = readStoredBrief()
        const incoming = compactBrief(body.brief)
        const merged = mergeBrief(stored, incoming)

        if (incoming) saveBrief(merged)

        if (merged) {
          body.brief = merged

          const contextParts = [
            merged.brandName && `Marca: ${merged.brandName}`,
            merged.productOrService && `Produto/serviço: ${merged.productOrService}`,
            merged.audience && `Público: ${merged.audience}`,
            merged.objective && `Objetivo: ${merged.objective}`,
            merged.tone && `Tom: ${merged.tone}`,
            merged.visualStyle && `Estilo visual: ${merged.visualStyle}`,
            merged.primaryColor && `Cor principal: ${merged.primaryColor}`,
            merged.cta && `CTA: ${merged.cta}`,
          ].filter(Boolean)

          if (contextParts.length && path !== "/api/generate-image") {
            const context = contextParts.join(". ")
            if (typeof body.prompt === "string" && !body.prompt.includes("[Contexto Lumin]")) {
              body.prompt = `${body.prompt}\n\n[Contexto Lumin] ${context}`
            }
          }
        }

        return originalFetch(targetInput, { ...init, body: JSON.stringify(body) })
      } catch {
        return originalFetch(targetInput, init)
      }
    }

    return () => {
      window.fetch = originalFetch
    }
  }, [])

  const decide = async (decision: "Aprovo" | "Rejeita") => {
    setHud((prev) => ({ ...prev, busy: true, label: decision === "Aprovo" ? "A executar ação" : "A rejeitar ação", detail: "A atualizar a sessão do Browser Agent…" }))
    try {
      const response = await window.fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: decision, history: [], enableSearch: false }),
      })
      if (!response.ok) throw new Error("decision_failed")
      const text = await response.text()
      const resilience = response.headers.get("X-Lumin-Resilience")
      setHud((prev) => ({
        ...prev,
        visible: true,
        busy: false,
        approval: resilience ? prev.approval : false,
        label: resilience ? "Modo Resiliência" : decision === "Aprovo" ? "Ação concluída" : "Ação rejeitada",
        detail: text.trim().slice(0, 260) || (decision === "Aprovo" ? "A ação foi processada." : "A ação não foi executada."),
      }))
    } catch {
      setHud((prev) => ({ ...prev, busy: false, label: "Não foi possível concluir", detail: "Tenta novamente pelo chat." }))
    }
  }

  if (!hud.visible) return null

  return (
    <div className="fixed bottom-24 left-1/2 z-[90] w-[calc(100%-24px)] max-w-md -translate-x-1/2 rounded-2xl border border-amber-400/20 bg-black/90 p-3 text-white shadow-2xl backdrop-blur-xl sm:bottom-6 sm:left-auto sm:right-6 sm:translate-x-0">
      <div className="flex items-start gap-3">
        <div className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${hud.busy ? "animate-pulse bg-amber-400" : hud.approval ? "bg-orange-400" : "bg-emerald-400"}`} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-amber-100">{hud.label}</p>
            {!hud.busy && !hud.approval && (
              <button onClick={() => setHud(IDLE_HUD)} className="text-xs text-white/50 hover:text-white" aria-label="Fechar estado do agente">Fechar</button>
            )}
          </div>
          <p className="mt-1 text-xs leading-relaxed text-white/65">{hud.detail}</p>
          <div className="mt-2 flex flex-wrap gap-1.5 text-[10px] uppercase tracking-wide text-white/45">
            {hud.web && <span className="rounded-full border border-white/10 px-2 py-1">Web</span>}
            {hud.browser && <span className="rounded-full border border-white/10 px-2 py-1">Browser</span>}
            {hud.sandbox && <span className="rounded-full border border-white/10 px-2 py-1">Sandbox</span>}
            {hud.sessionId && <span className="rounded-full border border-white/10 px-2 py-1">Sessão ativa</span>}
          </div>
          {hud.approval && !hud.busy && (
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button onClick={() => decide("Rejeita")} className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm font-medium text-white/80 hover:bg-white/10">Rejeitar</button>
              <button onClick={() => decide("Aprovo")} className="rounded-xl bg-amber-400 px-3 py-2 text-sm font-semibold text-black hover:bg-amber-300">Aprovar</button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export function getStoredProjectBrief(): ProjectBrief | null {
  if (typeof window === "undefined") return null
  return readStoredBrief()
}
