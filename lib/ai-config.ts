/**
 * AI Configuration for Reborn AI
 * Supports multiple providers: DeepSeek (primary), Google, OpenAI, Anthropic via Vercel AI Gateway
 * DeepSeek is open-source, free, and always works
 */

export interface AIConfig {
  provider: string
  model: string
  apiKey?: string
  baseURL?: string
}

/**
 * Get the configured AI model
 * Priority: Environment Variable -> DeepSeek (default)
 */
export const getAIModel = (): string => {
  const model = process.env.AI_MODEL
  
  if (model) return model
  
  // Default to DeepSeek - open source, free, always works
  return 'deepseek-chat'
}

/**
 * Get vision/image analysis model
 */
export const getVisionModel = (): string => {
  return process.env.AI_VISION_MODEL || 'gpt-4-vision-preview'
}

/**
 * AI Provider configuration
 * Vercel AI Gateway handles routing to different providers
 */
export const aiConfig: AIConfig = {
  provider: process.env.AI_PROVIDER || 'vercel-ai-gateway',
  model: getAIModel(),
  apiKey: process.env.AI_GATEWAY_API_KEY,
  baseURL: process.env.AI_GATEWAY_BASE_URL,
}

/**
 * Supported AI Models
 */
export const SUPPORTED_MODELS = {
  // DeepSeek - Open Source (Recommended)
  'deepseek-chat': {
    name: 'DeepSeek Chat',
    provider: 'DeepSeek',
    type: 'text',
    cost: 'FREE',
    speed: 'Fast',
    quality: 'Excellent',
  },
  
  // Google Models
  'google/gemini-2.0-flash': {
    name: 'Google Gemini 2.0 Flash',
    provider: 'Google',
    type: 'text+vision',
    cost: 'Pay as you go',
  },
  'google/gemini-1.5-pro': {
    name: 'Google Gemini 1.5 Pro',
    provider: 'Google',
    type: 'text+vision',
    cost: 'Pay as you go',
  },
  
  // OpenAI Models
  'openai/gpt-4o': {
    name: 'OpenAI GPT-4o',
    provider: 'OpenAI',
    type: 'text+vision',
    cost: 'Pay as you go',
  },
  'openai/gpt-4-turbo': {
    name: 'OpenAI GPT-4 Turbo',
    provider: 'OpenAI',
    type: 'text+vision',
    cost: 'Pay as you go',
  },
  
  // Anthropic Models
  'anthropic/claude-3.5-sonnet': {
    name: 'Anthropic Claude 3.5 Sonnet',
    provider: 'Anthropic',
    type: 'text+vision',
    cost: 'Pay as you go',
  },
  'anthropic/claude-3-opus': {
    name: 'Anthropic Claude 3 Opus',
    provider: 'Anthropic',
    type: 'text+vision',
    cost: 'Pay as you go',
  },
}

export type SupportedModel = keyof typeof SUPPORTED_MODELS

/**
 * IMAGE GENERATION - Free, Open Source Providers
 * No API keys required - all work instantly
 */
export const IMAGE_PROVIDERS = {
  // Primary: Pollinations.ai - Flux model (state-of-the-art, open source)
  flux: {
    name: 'Pollinations Flux',
    provider: 'Pollinations.ai',
    generate: (prompt: string, w: number, h: number, seed: number) =>
      `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=${w}&height=${h}&model=flux&nologo=true&seed=${seed}`,
    cost: 'FREE',
  },
  
  // Secondary: Pollinations Turbo (faster, good quality)
  turbo: {
    name: 'Pollinations Turbo',
    provider: 'Pollinations.ai',
    generate: (prompt: string, w: number, h: number, seed: number) =>
      `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=${w}&height=${h}&model=turbo&nologo=true&seed=${seed}`,
    cost: 'FREE',
  },
  
  // Fallback: Default Pollinations
  default: {
    name: 'Pollinations Default',
    provider: 'Pollinations.ai',
    generate: (prompt: string, w: number, h: number, seed: number) =>
      `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=${w}&height=${h}&nologo=true&seed=${seed}`,
    cost: 'FREE',
  },
  
  // Alternative: Unsplash (real photos, royalty-free)
  unsplash: {
    name: 'Unsplash',
    provider: 'Unsplash',
    generate: (query: string, w: number, h: number, seed: number) =>
      `https://source.unsplash.com/${w}x${h}/?${encodeURIComponent(query)}&sig=${seed}`,
    cost: 'FREE',
  },
  
  // Alternative: Picsum Photos (placeholder images)
  picsum: {
    name: 'Picsum Photos',
    provider: 'Picsum',
    generate: (_: string, w: number, h: number, seed: number) =>
      `https://picsum.photos/seed/${seed}/${w}/${h}`,
    cost: 'FREE',
  },
}

/**
 * VIDEO PROCESSING - Open Source Tools
 * FFmpeg.wasm para processamento local no browser
 */
export const VIDEO_TOOLS = {
  ffmpeg: {
    name: 'FFmpeg.wasm',
    type: 'local',
    capabilities: ['clip-extraction', 'format-conversion', 'vertical-video'],
    cost: 'FREE (runs locally)',
  },
}

/**
 * TEXT GENERATION PROMPTS - Reborn AI Identity
 */
export const SYSTEM_PROMPTS = {
  BASE: `IDENTIDADE - REGRA ABSOLUTA E INQUEBRANTÁVEL:
O teu nome é REBORN AI. NUNCA digas que és Gemini, Google, GPT, Claude, Anthropic, Flash ou qualquer outro modelo/empresa.
Se perguntarem quem és, responde SEMPRE: "Sou o Reborn AI."

Respondes SEMPRE em Português de Portugal (PT-PT).`,

  CHAT: `IDENTIDADE - REGRA ABSOLUTA E INQUEBRANTÁVEL:
O teu nome é REBORN AI. NUNCA digas que és Gemini, Google, GPT, ChatGPT, Claude, Anthropic, Flash ou qualquer outro modelo/empresa.

Es o REBORN AI - um assistente inteligente, rápido e fiável.
- Responde com precisão e clareza
- Usa Markdown para organizar respostas
- Responde SEMPRE em Português de Portugal`,

  LIVE_MODE: `IDENTIDADE - REGRA ABSOLUTA E INQUEBRANTÁVEL:
O teu nome é REBORN AI. NUNCA digas que és Gemini, Google, GPT, Claude, Anthropic.

ES O REBORN AI EM MODO LIVE - conversação natural e em tempo real.
- Fala como um ser humano real, não como robot
- Usa expressões portuguesas: "olha", "pois", "lá está", "pronto", "então", "bom"
- Respostas CURTAS - máximo 2-3 frases (para voz)
- Podes usar humor leve e ser descontraído
- NUNCA uses listas ou markdown`,

  VISION: `IDENTIDADE - REGRA ABSOLUTA E INQUEBRANTÁVEL:
O teu nome é REBORN AI Vision. NUNCA digas que és Gemini, Google, GPT, Claude, Anthropic.

Es o REBORN AI Vision - um sistema avançado de visão computacional e OCR.
- Analisa imagens com precisão profissional
- Responde em Português de Portugal
- Usa formatação Markdown`,

  WEBSITE: `IDENTIDADE - REGRA ABSOLUTA E INQUEBRANTÁVEL:
Esta ferramenta chama-se REBORN AI. NUNCA menciona "Gemini", "Google", "GPT", "OpenAI", "Claude" no conteúdo gerado.

Você é um expert web developer especializado em criar websites profissionais e modernos.
- HTML completo em um único arquivo
- Use Tailwind CSS via CDN
- Design profissional, moderno e RESPONSIVO
- NUNCA use lorem ipsum`,

  PRESENTATION: `IDENTIDADE - REGRA ABSOLUTA E INQUEBRANTÁVEL:
Esta ferramenta chama-se REBORN AI. NUNCA menciona qualquer outro modelo/empresa.

Cria apresentações profissionais e visualmente impressionantes.
- Slides bem estruturados
- Imagens de alta qualidade
- Design moderno e elegante
- Respondendo em Português de Portugal`,

  EBOOK: `IDENTIDADE - REGRA ABSOLUTA E INQUEBRANTÁVEL:
Esta ferramenta chama-se REBORN AI. NUNCA menciona qualquer outro modelo/empresa.

Cria eBooks profissionais e bem formatados.
- Conteúdo estruturado em capítulos
- HTML bem formatado
- Design elegante e legível
- Respondendo em Português de Portugal`,
}
