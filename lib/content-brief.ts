export type ContentIntent =
  | "image"
  | "marketing"
  | "slide"
  | "ebook"
  | "website"

export interface ProjectBrief {
  projectName?: string
  brandName?: string
  audience?: string
  objective?: string
  tone?: string
  language?: string
  primaryColor?: string
  secondaryColor?: string
  visualStyle?: string
  keywords?: string[]
  cta?: string
  productOrService?: string
  notes?: string
}

export interface ImagePromptOptions {
  prompt: string
  style?: string
  quality?: string
  width?: number
  height?: number
  intent?: ContentIntent
  brief?: ProjectBrief
}

const INTENT_RULES: Record<ContentIntent, string> = {
  image:
    "The requested subject must be immediately recognizable and be the visual priority. Preserve realistic shape, anatomy, proportions and semantic accuracy unless the user explicitly asks for abstraction.",
  marketing:
    "Create a conversion-oriented commercial visual with clear hierarchy, deliberate negative space for copy, one obvious focal point and composition adapted to the target platform.",
  slide:
    "Create a presentation-supporting visual that explains the slide idea at a glance. Avoid decorative imagery that is unrelated to the subject.",
  ebook:
    "Create an editorial illustration that supports the chapter topic and remains coherent with the book theme and audience.",
  website:
    "Create a polished web-ready visual with strong composition, clean subject separation and enough negative space for interface content.",
}

const STYLE_RULES: Record<string, string> = {
  fotorealista: "photorealistic, natural materials, realistic lighting, accurate anatomy, true-to-life proportions",
  realistic: "photorealistic, natural materials, realistic lighting, accurate anatomy, true-to-life proportions",
  anime: "high quality anime illustration, coherent anatomy, expressive but accurate subject",
  "digital art": "polished digital art, coherent forms, deliberate composition, refined details",
  illustration: "professional editorial illustration, clean shapes, coherent subject, purposeful composition",
  "arte digital": "polished digital art, coherent forms, deliberate composition, refined details",
  "arte 3d": "high quality 3D render, physically plausible materials, coherent geometry, studio lighting",
  "3d": "high quality 3D render, physically plausible materials, coherent geometry, studio lighting",
  minimal: "minimal composition, clean background, strong subject separation, no unnecessary objects",
  minimalista: "minimal composition, clean background, strong subject separation, no unnecessary objects",
  corporate: "professional corporate visual language, credible, clean, premium and restrained",
  corporativo: "professional corporate visual language, credible, clean, premium and restrained",
}

function clean(value?: string) {
  return typeof value === "string" ? value.trim() : ""
}

function briefContext(brief?: ProjectBrief) {
  if (!brief) return ""

  const parts = [
    clean(brief.brandName) && `Brand: ${clean(brief.brandName)}`,
    clean(brief.productOrService) && `Product/service: ${clean(brief.productOrService)}`,
    clean(brief.audience) && `Audience: ${clean(brief.audience)}`,
    clean(brief.objective) && `Objective: ${clean(brief.objective)}`,
    clean(brief.tone) && `Tone: ${clean(brief.tone)}`,
    clean(brief.visualStyle) && `Visual identity: ${clean(brief.visualStyle)}`,
    clean(brief.primaryColor) && `Primary brand color: ${clean(brief.primaryColor)}`,
    clean(brief.secondaryColor) && `Secondary brand color: ${clean(brief.secondaryColor)}`,
    clean(brief.cta) && `CTA context: ${clean(brief.cta)}`,
    Array.isArray(brief.keywords) && brief.keywords.length
      ? `Relevant concepts: ${brief.keywords.slice(0, 8).join(", ")}`
      : "",
    clean(brief.notes) && `Additional context: ${clean(brief.notes)}`,
  ].filter(Boolean)

  return parts.length ? parts.join(". ") + "." : ""
}

export const DEFAULT_NEGATIVE_PROMPT = [
  "unrelated subject",
  "wrong object",
  "abstract blob unless explicitly requested",
  "distorted anatomy",
  "extra limbs",
  "missing limbs",
  "deformed face",
  "cropped main subject",
  "out of frame",
  "blurry",
  "low detail",
  "low contrast focal point",
  "random text",
  "gibberish typography",
  "watermark",
  "logo unless requested",
  "duplicate subject",
  "visual artifacts",
].join(", ")

export function buildIntelligentImagePrompt(options: ImagePromptOptions) {
  const rawPrompt = clean(options.prompt)
  const intent = options.intent || "image"
  const styleKey = clean(options.style).toLowerCase()
  const styleRule = STYLE_RULES[styleKey] || (styleKey ? `Requested visual style: ${styleKey}.` : "")
  const context = briefContext(options.brief)

  const isLandscape = Number(options.width) > Number(options.height)
  const isPortrait = Number(options.height) > Number(options.width)
  const composition = isLandscape
    ? "landscape composition, use the horizontal frame intentionally"
    : isPortrait
      ? "portrait composition, use the vertical frame intentionally"
      : "balanced square composition"

  const qualityRule = options.quality === "fast"
    ? "clear subject, coherent composition"
    : "high fidelity, sharp focus, professional lighting, coherent details, polished finish"

  return [
    `USER REQUEST — preserve its meaning exactly: ${rawPrompt}.`,
    INTENT_RULES[intent],
    styleRule,
    context,
    `${composition}. ${qualityRule}.`,
    "Do not replace the requested subject with a symbolic, abstract or visually similar object. If a concrete object/person/animal/place is requested, depict that concrete subject clearly.",
    `Avoid: ${DEFAULT_NEGATIVE_PROMPT}.`,
  ]
    .filter(Boolean)
    .join(" ")
}

export function buildContentContext(brief?: ProjectBrief) {
  return briefContext(brief)
}
