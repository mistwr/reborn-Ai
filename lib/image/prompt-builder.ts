import { buildIntelligentImagePrompt, type ProjectBrief } from "@/lib/content-brief"
import { detectImageIntent, INTENT_PROMPT_RULES, type ImageIntent } from "@/lib/image/intents"
import { getNegativePrompt } from "@/lib/image/negative-prompts"

export interface AdvancedImagePromptInput {
  prompt: string
  style?: string
  quality?: string
  width?: number
  height?: number
  intent?: string
  brief?: ProjectBrief
}

export function buildAdvancedImagePrompt(input: AdvancedImagePromptInput) {
  const detectedIntent = detectImageIntent(input.prompt, input.intent)
  const base = buildIntelligentImagePrompt({
    prompt: input.prompt,
    style: input.style,
    quality: input.quality,
    width: input.width,
    height: input.height,
    intent:
      detectedIntent === "marketing"
        ? "marketing"
        : input.intent === "slide"
          ? "slide"
          : input.intent === "ebook"
            ? "ebook"
            : input.intent === "website"
              ? "website"
              : "image",
    brief: input.brief,
  })

  const negative = getNegativePrompt(detectedIntent)
  const enhanced = [
    base,
    `INTENT: ${detectedIntent}.`,
    INTENT_PROMPT_RULES[detectedIntent],
    `NEGATIVE CONSTRAINTS: ${negative}.`,
    "Prioritize semantic fidelity over decoration. The requested subject, action, environment and visual purpose must remain obvious at first glance.",
  ].join(" ")

  return {
    prompt: enhanced,
    intent: detectedIntent as ImageIntent,
    negativePrompt: negative,
  }
}
