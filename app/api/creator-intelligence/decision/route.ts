import { getToken } from "next-auth/jwt"
import { NextResponse } from "next/server"
import { generateLuminText } from "@/lib/lumin-ai-runtime"

export const maxDuration = 120

type Question =
  | { type: "choice"; instructions?: unknown; criteria: Record<string, unknown> }
  | { type: "score"; instructions?: unknown; criteria: unknown[] }
  | { type: "noul"; instructions?: unknown; criteria?: Record<string, unknown> }

type DecisionRequest = {
  state: unknown
  model?: string
  questions: Record<string, Question>
}

function validateBody(body: unknown): DecisionRequest {
  if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error("Pedido inválido")

  const raw = body as Record<string, unknown>
  if (!raw.questions || typeof raw.questions !== "object" || Array.isArray(raw.questions)) {
    throw new Error("questions em falta")
  }

  const entries = Object.entries(raw.questions as Record<string, unknown>)
  if (entries.length < 1 || entries.length > 12) throw new Error("questions deve ter entre 1 e 12 entradas")

  const questions: Record<string, Question> = {}

  for (const [id, value] of entries) {
    if (!/^[a-zA-Z0-9_-]{1,64}$/.test(id)) throw new Error("question id inválido")
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`question ${id} inválida`)

    const question = value as Record<string, unknown>

    if (question.type === "choice") {
      if (!question.criteria || typeof question.criteria !== "object" || Array.isArray(question.criteria)) {
        throw new Error(`criteria inválido em ${id}`)
      }
      const criteria = question.criteria as Record<string, unknown>
      if (Object.keys(criteria).length < 2 || Object.keys(criteria).length > 40) {
        throw new Error(`choice ${id} deve ter 2-40 opções`)
      }
      questions[id] = { type: "choice", instructions: question.instructions, criteria }
      continue
    }

    if (question.type === "score") {
      if (!Array.isArray(question.criteria) || question.criteria.length < 2 || question.criteria.length > 10) {
        throw new Error(`score ${id} deve ter 2-10 níveis`)
      }
      questions[id] = { type: "score", instructions: question.instructions, criteria: question.criteria }
      continue
    }

    if (question.type === "noul") {
      questions[id] = {
        type: "noul",
        instructions: question.instructions,
        criteria: question.criteria && typeof question.criteria === "object" && !Array.isArray(question.criteria)
          ? question.criteria as Record<string, unknown>
          : undefined,
      }
      continue
    }

    throw new Error(`tipo desconhecido em ${id}`)
  }

  if (JSON.stringify(raw.state ?? "").length > 45000) throw new Error("state demasiado grande")

  return {
    state: raw.state ?? "",
    model: typeof raw.model === "string" ? raw.model.slice(0, 80) : undefined,
    questions,
  }
}

function normalizeKevUrl(raw: string) {
  const base = raw.replace(/\/$/, "")
  return base.endsWith("/v1/systemone") ? base : `${base}/v1/systemone`
}

function clamp01(value: unknown) {
  const number = Number(value)
  if (!Number.isFinite(number)) return 0
  return Math.max(0, Math.min(1, number))
}

function normalizeAnswers(payload: DecisionRequest, raw: any) {
  const source = raw?.answers && typeof raw.answers === "object" ? raw.answers : raw
  const answers: Record<string, unknown> = {}

  for (const [id, question] of Object.entries(payload.questions)) {
    const candidate = source?.[id] ?? {}

    if (question.type === "choice") {
      const keys = Object.keys(question.criteria)
      const proposed = String(candidate?.choice ?? candidate?.answer ?? "")
      const choice = keys.includes(proposed) ? proposed : keys[0]
      const incoming = candidate?.probabilities && typeof candidate.probabilities === "object"
        ? candidate.probabilities
        : {}

      const probabilities: Record<string, number> = {}
      let total = 0
      for (const key of keys) {
        const probability = clamp01(incoming[key])
        probabilities[key] = probability
        total += probability
      }

      if (total <= 0) {
        for (const key of keys) probabilities[key] = key === choice ? 1 : 0
      } else {
        for (const key of keys) probabilities[key] /= total
      }

      answers[id] = {
        type: "choice",
        choice,
        probabilities,
        confidence: clamp01(candidate?.confidence ?? Math.max(...Object.values(probabilities))),
      }
      continue
    }

    if (question.type === "score") {
      const max = question.criteria.length - 1
      const numeric = Number(candidate?.score ?? candidate?.answer ?? 0)
      const score = Math.max(0, Math.min(max, Number.isFinite(numeric) ? numeric : 0))
      answers[id] = {
        type: "score",
        score,
        legend: Object.fromEntries(question.criteria.map((value, index) => [String(index), String(value)])),
        confidence: clamp01(candidate?.confidence ?? 0.5),
      }
      continue
    }

    answers[id] = {
      type: "noul",
      noul: clamp01(candidate?.noul ?? candidate?.probability ?? candidate?.answer ?? 0.5),
    }
  }

  return answers
}

async function callKev(payload: DecisionRequest) {
  const rawUrl = process.env.KEV_SYSTEM_ONE_URL?.trim()
  if (!rawUrl) return null

  const headers: Record<string, string> = { "Content-Type": "application/json" }
  if (process.env.KEV_API_KEY?.trim()) headers.Authorization = `Bearer ${process.env.KEV_API_KEY.trim()}`

  const response = await fetch(normalizeKevUrl(rawUrl), {
    method: "POST",
    headers,
    body: JSON.stringify({
      ...payload,
      model: payload.model || process.env.KEV_MODEL || "kev-latest",
    }),
    signal: AbortSignal.timeout(110000),
  })

  const raw = await response.json().catch(async () => ({ error: (await response.text()).slice(0, 1200) }))
  if (!response.ok) throw new Error(`Kev respondeu ${response.status}: ${JSON.stringify(raw).slice(0, 1200)}`)

  return {
    provider: "kev",
    calibrated: true,
    model: payload.model || process.env.KEV_MODEL || "kev-latest",
    answers: normalizeAnswers(payload, raw),
  }
}

async function callJev(payload: DecisionRequest) {
  const apiKey = process.env.JEV_API_KEY?.trim()
  if (!apiKey) return null

  const endpoint = process.env.JEV_DECIDE_URL?.trim() || "https://jevtypesafeai.com/api/v1/decide"
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      ...payload,
      model: payload.model || process.env.JEV_MODEL || "jev-latest",
    }),
    signal: AbortSignal.timeout(30000),
  })

  const raw = await response.json().catch(async () => ({ error: (await response.text()).slice(0, 1200) }))
  if (!response.ok) throw new Error(`Jev respondeu ${response.status}: ${JSON.stringify(raw).slice(0, 1200)}`)

  return {
    provider: "jev",
    calibrated: true,
    model: payload.model || process.env.JEV_MODEL || "jev-latest",
    answers: normalizeAnswers(payload, raw),
  }
}

function extractJson(text: string) {
  const cleaned = text.replace(/^\s*```(?:json)?/i, "").replace(/```\s*$/, "").trim()
  try {
    return JSON.parse(cleaned)
  } catch {
    const start = cleaned.indexOf("{")
    const end = cleaned.lastIndexOf("}")
    if (start >= 0 && end > start) return JSON.parse(cleaned.slice(start, end + 1))
    throw new Error("A resposta do motor interno não contém JSON válido")
  }
}

function decisionPrompt(payload: DecisionRequest) {
  const contract = Object.fromEntries(
    Object.entries(payload.questions).map(([id, question]) => {
      if (question.type === "choice") {
        return [id, {
          type: "choice",
          allowed: Object.keys(question.criteria),
          return: { choice: "one allowed key", probabilities: "object keyed by allowed values", confidence: "0..1" },
        }]
      }

      if (question.type === "score") {
        return [id, {
          type: "score",
          levels: question.criteria,
          return: { score: `number 0..${question.criteria.length - 1}`, confidence: "0..1" },
        }]
      }

      return [id, { type: "noul", return: { noul: "probability 0..1" } }]
    }),
  )

  return [
    "Analisa os sinais de performance de conteúdo e toma decisões tipadas.",
    "Devolve APENAS JSON válido, sem markdown nem texto exterior.",
    "Não inventes métricas. Usa exclusivamente o state fornecido.",
    "Para choice, usa apenas uma das chaves permitidas.",
    "",
    "STATE:",
    JSON.stringify(payload.state),
    "",
    "QUESTIONS:",
    JSON.stringify(payload.questions),
    "",
    "OUTPUT CONTRACT:",
    JSON.stringify({ answers: contract }),
  ].join("\n")
}

async function callLumin(payload: DecisionRequest) {
  const result = await generateLuminText({
    system: "És o motor de decisão do Lumin Creator Intelligence. Compara sinais, evita certezas artificiais e devolve apenas JSON válido de acordo com o contrato.",
    prompt: decisionPrompt(payload),
    temperature: 0,
    maxOutputTokens: 1800,
  })

  const raw = extractJson(result.text)
  return {
    provider: "lumin",
    calibrated: false,
    model: result.model,
    answers: normalizeAnswers(payload, raw),
  }
}

export async function POST(req: Request) {
  try {
    const token = await getToken({ req: req as any, secret: process.env.NEXTAUTH_SECRET }).catch(() => null)
    if (!token) return NextResponse.json({ error: "Inicia sessão no Lumin para usar o Creator Intelligence." }, { status: 401 })

    const raw = await req.json()
    if (JSON.stringify(raw).length > 65000) {
      return NextResponse.json({ error: "Pedido demasiado grande" }, { status: 413 })
    }

    const payload = validateBody(raw)

    const kev = await callKev(payload)
    if (kev) return NextResponse.json(kev)

    const jev = await callJev(payload)
    if (jev) return NextResponse.json(jev)

    return NextResponse.json(await callLumin(payload))
  } catch (error: any) {
    console.error("[Lumin Creator Intelligence]", error)
    return NextResponse.json(
      { error: String(error?.message || "Erro no motor de decisão") },
      { status: 500 },
    )
  }
}
