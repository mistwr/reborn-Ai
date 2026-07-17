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
