export type ImageIntent =
  | "realistic_photo"
  | "illustration"
  | "marketing"
  | "thumbnail"
  | "flyer"
  | "logo"
  | "cover"
  | "product"
  | "portrait"
  | "concept"
  | "generic"

const RULES: Array<{ intent: ImageIntent; terms: string[] }> = [
  { intent: "logo", terms: ["logo", "logotipo", "marca gráfica", "brand mark"] },
  { intent: "thumbnail", terms: ["thumbnail", "miniatura youtube", "capa youtube"] },
  { intent: "flyer", terms: ["flyer", "folheto", "panfleto", "cartaz"] },
  { intent: "cover", terms: ["capa", "book cover", "ebook cover", "album cover"] },
  { intent: "product", terms: ["produto", "product shot", "packshot", "e-commerce", "ecommerce"] },
  { intent: "portrait", terms: ["retrato", "portrait", "headshot", "rosto", "face portrait"] },
  { intent: "marketing", terms: ["anúncio", "anuncio", "ad creative", "marketing", "instagram post", "facebook post", "story", "banner", "campanha"] },
  { intent: "illustration", terms: ["ilustração", "ilustracao", "illustration", "anime", "cartoon", "desenho", "digital art"] },
  { intent: "realistic_photo", terms: ["foto", "fotografia", "photoreal", "realista", "realistic", "camera", "dslr"] },
  { intent: "concept", terms: ["conceito", "concept art", "surreal", "abstrato", "abstract"] },
]

export function detectImageIntent(prompt: string, explicit?: string): ImageIntent {
  const normalizedExplicit = (explicit || "").toLowerCase().trim()
  if (normalizedExplicit && normalizedExplicit !== "image") {
    if (["marketing", "slide", "ebook", "website"].includes(normalizedExplicit)) {
      return normalizedExplicit === "marketing" ? "marketing" : "concept"
    }
    if (RULES.some((r) => r.intent === normalizedExplicit)) return normalizedExplicit as ImageIntent
  }

  const text = prompt.toLowerCase()
  for (const rule of RULES) {
    if (rule.terms.some((term) => text.includes(term))) return rule.intent
  }

  return "generic"
}

export const INTENT_PROMPT_RULES: Record<ImageIntent, string> = {
  realistic_photo: "Photorealistic result. Accurate real-world materials, anatomy, perspective and lighting. The image must look like a credible photograph, not CGI or abstract art.",
  illustration: "Create a polished coherent illustration with intentional shapes, clean silhouette, expressive composition and no accidental photorealistic artifacts.",
  marketing: "Commercial conversion-oriented creative. One obvious focal point, clean copy-safe negative space, deliberate hierarchy and composition suitable for advertising.",
  thumbnail: "High-impact thumbnail composition. Large readable focal subject, strong contrast, simple visual story, no tiny details that disappear at small size.",
  flyer: "Professional flyer/poster composition with clear zones for headline, supporting copy and CTA. Avoid clutter and illegible text.",
  logo: "Simple memorable logo mark. Vector-like geometry, clean silhouette, minimal elements, flat presentation, no photographic mockup unless requested.",
  cover: "Premium editorial cover composition with a strong central idea, title-safe negative space and visual hierarchy that reads instantly.",
  product: "Hero product photography. Product fully visible, accurate geometry, clean separation from background, premium controlled lighting and e-commerce clarity.",
  portrait: "Professional portrait. Natural facial anatomy, realistic eyes, skin and hair, clean hands if visible, flattering light and coherent background.",
  concept: "Conceptual visual with one clear idea. Even when imaginative, preserve semantic accuracy of requested subjects and avoid unrelated decorative elements.",
  generic: "Make the requested subject immediately recognizable. Preserve semantic accuracy, coherent geometry and a deliberate composition.",
}
