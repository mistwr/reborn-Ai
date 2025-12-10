/**
 * REBORN AI CLIPPER - API de Análise de Momentos Virais
 *
 * Este endpoint analisa a transcrição e identifica os melhores
 * momentos para criar clipes curtos virais.
 *
 * ALGORITMO:
 * 1. Divide o texto em segmentos
 * 2. Analisa cada segmento para:
 *    - Energia emocional (exclamações, perguntas)
 *    - Palavras-chave de engagement
 *    - Densidade de informação
 *    - Potencial de hook (começo forte)
 * 3. Pontua cada segmento (0-100)
 * 4. Retorna os N melhores momentos
 */

import { type NextRequest, NextResponse } from "next/server"

// Palavras que indicam alto engagement
const HIGH_ENGAGEMENT_WORDS = [
  "incrível",
  "importante",
  "secreto",
  "erro",
  "nunca",
  "sempre",
  "melhor",
  "pior",
  "primeiro",
  "único",
  "grátis",
  "novo",
  "descobrir",
  "revelar",
  "verdade",
  "mentira",
  "chocante",
  "amazing",
  "important",
  "secret",
  "mistake",
  "never",
  "always",
  "best",
  "worst",
  "first",
  "only",
  "free",
  "new",
  "shocking",
  "dica",
  "truque",
  "hack",
  "estratégia",
  "método",
  "técnica",
]

// Palavras que indicam call-to-action
const CTA_WORDS = [
  "subscrever",
  "like",
  "partilhar",
  "comentar",
  "seguir",
  "subscribe",
  "share",
  "comment",
  "follow",
  "click",
]

// Frases de hook fortes
const HOOK_PATTERNS = [
  /^(olha|vê|repara|isto|aqui|hoje)/i,
  /^(did you know|have you ever|what if)/i,
  /^(a verdade|o segredo|ninguém te conta)/i,
  /\?$/, // Perguntas
]

interface TranscriptWord {
  text: string
  start: number
  end: number
  confidence: number
}

interface Moment {
  startTime: number
  endTime: number
  text: string
  score: number
  title: string
  hashtags: string[]
}

/**
 * POST /api/clipper/analyze
 *
 * Recebe a transcrição e retorna os melhores momentos para clipes
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { transcript, minDuration = 15, maxDuration = 45, numClips = 5 } = body

    if (!transcript?.words || transcript.words.length === 0) {
      return NextResponse.json({ error: "Transcrição inválida" }, { status: 400 })
    }

    const words: TranscriptWord[] = transcript.words
    const fullText = transcript.text || words.map((w: TranscriptWord) => w.text).join(" ")

    // Dividir em segmentos potenciais
    const segments = createSegments(words, minDuration, maxDuration)

    // Pontuar cada segmento
    const scoredSegments = segments.map((segment) => ({
      ...segment,
      score: calculateViralScore(segment.text),
      title: extractTitle(segment.text),
      hashtags: extractHashtags(segment.text),
    }))

    // Ordenar por pontuação e selecionar os melhores
    const bestMoments = scoredSegments
      .sort((a, b) => b.score - a.score)
      .slice(0, numClips)
      // Re-ordenar por tempo para evitar sobreposição
      .sort((a, b) => a.startTime - b.startTime)

    // Remover sobreposições
    const finalMoments = removeOverlaps(bestMoments)

    return NextResponse.json({
      moments: finalMoments,
      totalSegmentsAnalyzed: segments.length,
    })
  } catch (error) {
    console.error("Erro na análise:", error)
    return NextResponse.json({ error: error instanceof Error ? error.message : "Erro desconhecido" }, { status: 500 })
  }
}

/**
 * Cria segmentos potenciais a partir das palavras
 */
function createSegments(
  words: TranscriptWord[],
  minDuration: number,
  maxDuration: number,
): { startTime: number; endTime: number; text: string }[] {
  const segments: { startTime: number; endTime: number; text: string }[] = []
  const totalDuration = words[words.length - 1]?.end || 0

  // Criar segmentos com diferentes pontos de início
  for (let i = 0; i < words.length; i++) {
    const startTime = words[i].start

    // Tentar diferentes durações
    for (let duration = minDuration; duration <= maxDuration; duration += 5) {
      const endTime = startTime + duration

      if (endTime > totalDuration) break

      // Encontrar as palavras neste intervalo
      const segmentWords = words.filter((w) => w.start >= startTime && w.end <= endTime)

      if (segmentWords.length > 0) {
        segments.push({
          startTime,
          endTime,
          text: segmentWords.map((w) => w.text).join(" "),
        })
      }
    }

    // Saltar algumas palavras para não criar demasiados segmentos
    i += Math.floor(minDuration / 2)
  }

  return segments
}

/**
 * Calcula a pontuação viral de um segmento (0-100)
 */
function calculateViralScore(text: string): number {
  let score = 50 // Base

  const lowerText = text.toLowerCase()

  // Verificar palavras de alto engagement (+2 cada, máx +20)
  let engagementBonus = 0
  for (const word of HIGH_ENGAGEMENT_WORDS) {
    if (lowerText.includes(word)) {
      engagementBonus += 2
    }
  }
  score += Math.min(engagementBonus, 20)

  // Verificar hooks fortes (+10)
  for (const pattern of HOOK_PATTERNS) {
    if (pattern.test(text)) {
      score += 10
      break
    }
  }

  // Exclamações indicam energia (+1 cada, máx +10)
  const exclamations = (text.match(/!/g) || []).length
  score += Math.min(exclamations, 10)

  // Perguntas geram engagement (+5 cada, máx +15)
  const questions = (text.match(/\?/g) || []).length
  score += Math.min(questions * 5, 15)

  // Penalizar CTAs (provavelmente fim do vídeo) (-10)
  for (const word of CTA_WORDS) {
    if (lowerText.includes(word)) {
      score -= 10
      break
    }
  }

  // Penalizar textos muito curtos (-20 se < 50 chars)
  if (text.length < 50) {
    score -= 20
  }

  // Bonus para frases completas (termina com pontuação)
  if (/[.!?]$/.test(text.trim())) {
    score += 5
  }

  // Normalizar entre 0 e 100
  return Math.max(0, Math.min(100, score))
}

/**
 * Extrai um título curto do segmento
 */
function extractTitle(text: string): string {
  // Usar a primeira frase ou os primeiros 50 caracteres
  const firstSentence = text.split(/[.!?]/)[0]
  if (firstSentence.length <= 60) {
    return firstSentence.trim()
  }
  return firstSentence.substring(0, 57).trim() + "..."
}

/**
 * Extrai hashtags relevantes do texto
 */
function extractHashtags(text: string): string[] {
  const hashtags: string[] = []
  const lowerText = text.toLowerCase()

  // Categorias de conteúdo
  if (lowerText.includes("produtiv") || lowerText.includes("trabalh")) {
    hashtags.push("produtividade", "trabalho")
  }
  if (lowerText.includes("dinheiro") || lowerText.includes("invest") || lowerText.includes("financ")) {
    hashtags.push("financas", "dinheiro")
  }
  if (lowerText.includes("saúde") || lowerText.includes("fitness") || lowerText.includes("exerc")) {
    hashtags.push("saude", "fitness")
  }
  if (lowerText.includes("negócio") || lowerText.includes("empresa") || lowerText.includes("empreend")) {
    hashtags.push("negocios", "empreendedorismo")
  }

  // Adicionar hashtags genéricos se poucos
  if (hashtags.length < 3) {
    hashtags.push("viral", "fyp", "reels")
  }

  return hashtags.slice(0, 5)
}

/**
 * Remove segmentos que se sobrepõem
 */
function removeOverlaps(moments: Moment[]): Moment[] {
  const result: Moment[] = []

  for (const moment of moments) {
    const overlaps = result.some(
      (m) =>
        (moment.startTime >= m.startTime && moment.startTime < m.endTime) ||
        (moment.endTime > m.startTime && moment.endTime <= m.endTime),
    )

    if (!overlaps) {
      result.push(moment)
    }
  }

  return result
}
