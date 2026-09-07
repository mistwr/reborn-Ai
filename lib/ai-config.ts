/**
 * AI Configuration for Reborn AI
 * Centraliza os modelos usados pelo Reborn e deixa o provider/model configuravel por env.
 */

export interface AIConfig {
  provider: string
  model: string
  apiKey?: string
  baseURL?: string
}

export const DEFAULT_AI_MODEL = "google/gemini-2.5-flash-lite"
export const DEFAULT_VISION_MODEL = "google/gemini-2.5-flash-lite"

/**
 * AI Gateway model IDs usam o formato provider/model.
 * O default foi validado no preview da Vercel em 2026-09-07.
 */
export const getAIModel = (): string => process.env.AI_MODEL || DEFAULT_AI_MODEL

export const getVisionModel = (): string => process.env.AI_VISION_MODEL || DEFAULT_VISION_MODEL

export const aiConfig: AIConfig = {
  provider: process.env.AI_PROVIDER || "vercel-ai-gateway",
  model: getAIModel(),
  apiKey: process.env.AI_GATEWAY_API_KEY,
  baseURL: process.env.AI_GATEWAY_BASE_URL,
}

export const SUPPORTED_MODELS = {
  "google/gemini-2.5-flash-lite": {
    name: "Gemini 2.5 Flash Lite",
    provider: "Google",
    type: "text+vision",
    profile: "free-tier-default",
  },
  "google/gemini-3.6-flash": {
    name: "Gemini 3.6 Flash",
    provider: "Google",
    type: "text+vision",
    profile: "paid-fast",
  },
  "google/gemini-3.1-pro-preview": {
    name: "Gemini 3.1 Pro Preview",
    provider: "Google",
    type: "text+vision+reasoning",
    profile: "vision-reasoning",
  },
  "openai/gpt-5.6-sol": {
    name: "GPT-5.6 Sol",
    provider: "OpenAI",
    type: "text+vision+reasoning",
    profile: "premium",
  },
  "anthropic/claude-sonnet-5": {
    name: "Claude Sonnet 5",
    provider: "Anthropic",
    type: "text+vision+reasoning",
    profile: "premium",
  },
} as const

export type SupportedModel = keyof typeof SUPPORTED_MODELS

/**
 * IMAGE GENERATION
 * Mantemos providers URL-based existentes como fallback enquanto a camada de imagem e modernizada.
 */
export const IMAGE_PROVIDERS = {
  flux: {
    name: "Pollinations Flux",
    provider: "Pollinations.ai",
    generate: (prompt: string, w: number, h: number, seed: number) =>
      `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=${w}&height=${h}&model=flux&nologo=true&seed=${seed}`,
  },
  turbo: {
    name: "Pollinations Turbo",
    provider: "Pollinations.ai",
    generate: (prompt: string, w: number, h: number, seed: number) =>
      `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=${w}&height=${h}&model=turbo&nologo=true&seed=${seed}`,
  },
  default: {
    name: "Pollinations Default",
    provider: "Pollinations.ai",
    generate: (prompt: string, w: number, h: number, seed: number) =>
      `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=${w}&height=${h}&nologo=true&seed=${seed}`,
  },
  picsum: {
    name: "Picsum Photos",
    provider: "Picsum",
    generate: (_: string, w: number, h: number, seed: number) => `https://picsum.photos/seed/${seed}/${w}/${h}`,
  },
}

export const VIDEO_TOOLS = {
  ffmpeg: {
    name: "FFmpeg.wasm",
    type: "local",
    capabilities: ["clip-extraction", "format-conversion", "vertical-video"],
  },
}

export const SYSTEM_PROMPTS = {
  BASE: `IDENTIDADE - REGRA ABSOLUTA E INQUEBRANTAVEL:
O teu nome e REBORN AI. NUNCA digas que es Gemini, Google, GPT, ChatGPT, Claude, Anthropic, Flash ou qualquer outro modelo/empresa.
Se perguntarem quem es, responde SEMPRE: "Sou o Reborn AI."

Responde no idioma do utilizador. Quando nao for possivel determinar o idioma, usa Portugues de Portugal (PT-PT).`,

  CHAT: `IDENTIDADE - REGRA ABSOLUTA E INQUEBRANTAVEL:
O teu nome e REBORN AI. NUNCA digas que es Gemini, Google, GPT, ChatGPT, Claude, Anthropic, Flash ou qualquer outro modelo/empresa.

Es o REBORN AI - um assistente inteligente, rapido e fiavel.
- Responde com precisao e clareza
- Usa Markdown quando melhorar a leitura
- Responde no idioma do utilizador; por defeito usa PT-PT`,

  LIVE_MODE: `IDENTIDADE - REGRA ABSOLUTA E INQUEBRANTAVEL:
O teu nome e REBORN AI. NUNCA digas que es Gemini, Google, GPT, Claude ou Anthropic.

ES O REBORN AI EM MODO LIVE - conversacao natural e em tempo real.
- Fala como um ser humano real, nao como robot
- Respostas curtas, adequadas a voz
- NUNCA uses listas ou markdown
- Responde no idioma do utilizador; por defeito usa PT-PT`,

  VISION: `IDENTIDADE - REGRA ABSOLUTA E INQUEBRANTAVEL:
O teu nome e REBORN AI Vision. NUNCA digas que es Gemini, Google, GPT, Claude ou Anthropic.

Es o REBORN AI Vision - um sistema avancado de visao computacional e OCR.
- Analisa imagens com precisao profissional
- Responde no idioma do utilizador; por defeito usa PT-PT`,

  WEBSITE: `Esta ferramenta chama-se REBORN AI. NUNCA menciones o fornecedor/modelo de IA no conteudo gerado.
Cria websites profissionais, modernos, responsivos e prontos a publicar.`,

  PRESENTATION: `Esta ferramenta chama-se REBORN AI. Cria apresentacoes profissionais, claras e visualmente fortes no idioma pedido pelo utilizador.`,

  EBOOK: `Esta ferramenta chama-se REBORN AI. Cria ebooks profissionais, estruturados e bem formatados no idioma pedido pelo utilizador.`,
}
