import { generateText } from "ai"
import { getAIModel } from "@/lib/ai-config"

type Orientation = "landscape" | "portrait" | "square"

export type VisualSlot = {
  id: string
  section: string
  purpose: string
  query: string
  subject: string
  orientation: Orientation
}

export type VisualPlan = {
  businessType: string
  location: string
  audience: string
  style: string
  mood: string
  avoid: string[]
  slots: VisualSlot[]
}

export type VisualContextImage = {
  url: string
  thumbnail?: string
  title?: string
  creator?: string
  source: "unsplash" | "openverse"
  license?: string
  licenseUrl?: string
  query: string
  section: string
  purpose: string
  subject: string
  orientation: Orientation
  width?: number
  height?: number
  score: number
}

export type VisualContext = {
  brief: string
  plan: VisualPlan
  images: VisualContextImage[]
}

const MAX_SLOTS = 6
const SEARCH_RESULTS_PER_SLOT = 10

function stripJsonFence(value: string) {
  return value
    .replace(/^\s*\`\`\`(?:json)?/i, "")
    .replace(/\`\`\`\s*$/i, "")
    .trim()
}

function compactWords(value: string) {
  return value
    .toLocaleLowerCase("en")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 2)
}

function normalizeOrientation(value: unknown): Orientation {
  if (value === "portrait" || value === "square") return value
  return "landscape"
}

function fallbackPlan(prompt: string, businessName?: string): VisualPlan {
  const words = compactWords(`${businessName || ""} ${prompt}`)
    .filter((word) => !["site", "website", "page", "create", "cria", "fazer", "empresa", "business"].includes(word))
    .slice(0, 6)
  const base = words.length ? words.join(" ") : "professional business"

  return {
    businessType: businessName || "business",
    location: "",
    audience: "prospective customers",
    style: "premium editorial photography",
    mood: "credible, modern, natural",
    avoid: ["generic corporate stock", "irrelevant people", "text inside images", "watermarks"],
    slots: [
      {
        id: "hero",
        section: "Hero",
        purpose: "Immediate visual proof of the core offer with copy-safe space",
        query: `${base} premium editorial`,
        subject: base,
        orientation: "landscape",
      },
      {
        id: "offer",
        section: "Services",
        purpose: "Show the main service or product in a credible real-world context",
        query: `${base} service detail`,
        subject: base,
        orientation: "landscape",
      },
      {
        id: "trust",
        section: "About / Trust",
        purpose: "Build trust with an authentic environment connected to the business",
        query: `${base} authentic workplace`,
        subject: base,
        orientation: "landscape",
      },
    ],
  }
}

function sanitizePlan(raw: any, prompt: string, businessName?: string): VisualPlan {
  const fallback = fallbackPlan(prompt, businessName)
  if (!raw || typeof raw !== "object") return fallback

  const slots = Array.isArray(raw.slots)
    ? raw.slots
        .map((slot: any, index: number): VisualSlot | null => {
          const query = typeof slot?.query === "string" ? slot.query.trim() : ""
          const section = typeof slot?.section === "string" ? slot.section.trim() : ""
          if (!query || !section) return null
          return {
            id: typeof slot?.id === "string" && slot.id.trim() ? slot.id.trim().slice(0, 40) : `slot-${index + 1}`,
            section: section.slice(0, 80),
            purpose: typeof slot?.purpose === "string" ? slot.purpose.trim().slice(0, 180) : "Support this section",
            query: query
              .replace(/[^\p{L}\p{N}\s-]/gu, " ")
              .replace(/\s+/g, " ")
              .trim()
              .split(" ")
              .slice(0, 8)
              .join(" "),
            subject: typeof slot?.subject === "string" && slot.subject.trim() ? slot.subject.trim().slice(0, 120) : query.slice(0, 120),
            orientation: normalizeOrientation(slot?.orientation),
          }
        })
        .filter((slot: VisualSlot | null): slot is VisualSlot => Boolean(slot))
        .slice(0, MAX_SLOTS)
    : []

  return {
    businessType:
      typeof raw.businessType === "string" && raw.businessType.trim()
        ? raw.businessType.trim().slice(0, 120)
        : fallback.businessType,
    location: typeof raw.location === "string" ? raw.location.trim().slice(0, 120) : "",
    audience:
      typeof raw.audience === "string" && raw.audience.trim()
        ? raw.audience.trim().slice(0, 160)
        : fallback.audience,
    style:
      typeof raw.style === "string" && raw.style.trim()
        ? raw.style.trim().slice(0, 180)
        : fallback.style,
    mood:
      typeof raw.mood === "string" && raw.mood.trim()
        ? raw.mood.trim().slice(0, 180)
        : fallback.mood,
    avoid: Array.isArray(raw.avoid)
      ? raw.avoid.map((item: unknown) => String(item).trim()).filter(Boolean).slice(0, 8)
      : fallback.avoid,
    slots: slots.length ? slots : fallback.slots,
  }
}

async function createVisualPlan(prompt: string, businessName?: string, language?: string) {
  try {
    const result = await generateText({
      model: getAIModel(),
      system: `You are LUMIN Visual Director for premium web design.
Return ONLY valid compact JSON, no markdown.
Your job is to understand the business and design a coherent photographic direction before any images are searched.
Create 4 to 6 visual slots only where images materially improve the page.
Every stock-search query MUST be in English, concrete, photographic and 3 to 8 words.
Never use abstract marketing words alone. Prefer visible nouns, place/context and action.
Do not request logos, text in images, screenshots, celebrity likenesses or specific real people.
For a hero, favour landscape composition with copy-safe negative space.
Keep the whole site visually consistent.`,
      prompt: `Website request: ${prompt}
Business/project name: ${businessName || "not supplied"}
Visible language: ${language || "pt-PT"}

Return this JSON shape:
{
  "businessType": "...",
  "location": "...",
  "audience": "...",
  "style": "...",
  "mood": "...",
  "avoid": ["..."],
  "slots": [
    {
      "id": "hero",
      "section": "Hero",
      "purpose": "...",
      "query": "english stock search query",
      "subject": "what must visibly appear",
      "orientation": "landscape"
    }
  ]
}

Infer location only when supported by the request. Keep queries specific to the actual content, not generic corporate stock.`,
    })

    const parsed = JSON.parse(stripJsonFence(result.text))
    return sanitizePlan(parsed, prompt, businessName)
  } catch {
    return fallbackPlan(prompt, businessName)
  }
}

function orientationScore(width = 0, height = 0, expected: Orientation) {
  if (!width || !height) return 0
  const ratio = width / height
  if (expected === "landscape") return ratio >= 1.35 ? 20 : ratio >= 1.05 ? 10 : -12
  if (expected === "portrait") return ratio <= 0.8 ? 20 : ratio <= 1 ? 8 : -10
  return ratio >= 0.85 && ratio <= 1.2 ? 20 : 3
}

function resolutionScore(width = 0, height = 0) {
  if (!width || !height) return 0
  const longest = Math.max(width, height)
  const shortest = Math.min(width, height)
  if (longest >= 2400 && shortest >= 1200) return 20
  if (longest >= 1600 && shortest >= 900) return 16
  if (longest >= 1200 && shortest >= 700) return 10
  if (longest < 900 || shortest < 500) return -25
  return 3
}

function semanticScore(query: string, metadata: string) {
  const queryWords = Array.from(new Set(compactWords(query)))
  if (!queryWords.length) return 0
  const haystack = new Set(compactWords(metadata))
  const matches = queryWords.filter((word) => haystack.has(word)).length
  return Math.round((matches / queryWords.length) * 34)
}

function buildUnsplashUrl(raw: string, orientation: Orientation) {
  try {
    const url = new URL(raw)
    url.searchParams.set("auto", "format")
    url.searchParams.set("fit", "crop")
    url.searchParams.set("q", "88")
    if (orientation === "portrait") {
      url.searchParams.set("w", "1200")
      url.searchParams.set("h", "1600")
    } else if (orientation === "square") {
      url.searchParams.set("w", "1400")
      url.searchParams.set("h", "1400")
    } else {
      url.searchParams.set("w", "1800")
      url.searchParams.set("h", "1100")
    }
    return url.toString()
  } catch {
    return raw
  }
}

async function searchUnsplash(slot: VisualSlot): Promise<VisualContextImage[]> {
  const accessKey = process.env.UNSPLASH_ACCESS_KEY?.trim()
  if (!accessKey) return []

  try {
    const url = new URL("https://api.unsplash.com/search/photos")
    url.searchParams.set("query", slot.query)
    url.searchParams.set("per_page", String(SEARCH_RESULTS_PER_SLOT))
    url.searchParams.set("content_filter", "high")
    url.searchParams.set("orientation", slot.orientation)

    const response = await fetch(url, {
      headers: {
        Authorization: `Client-ID ${accessKey}`,
        "Accept-Version": "v1",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(6500),
    })
    if (!response.ok) return []

    const data = await response.json().catch(() => null)
    const results = Array.isArray(data?.results) ? data.results : []

    return results
      .map((item: any): VisualContextImage | null => {
        const raw = typeof item?.urls?.raw === "string" ? item.urls.raw : ""
        if (!raw) return null

        const width = Number(item?.width || 0)
        const height = Number(item?.height || 0)
        const metadata = [
          item?.description,
          item?.alt_description,
          ...(Array.isArray(item?.tags) ? item.tags.map((tag: any) => tag?.title || tag?.name || "") : []),
        ]
          .filter(Boolean)
          .join(" ")

        const score =
          38 +
          orientationScore(width, height, slot.orientation) +
          resolutionScore(width, height) +
          semanticScore(slot.query, metadata)

        return {
          url: buildUnsplashUrl(raw, slot.orientation),
          thumbnail: typeof item?.urls?.small === "string" ? item.urls.small : undefined,
          title: typeof item?.alt_description === "string" ? item.alt_description : undefined,
          creator: typeof item?.user?.name === "string" ? item.user.name : undefined,
          source: "unsplash",
          license: "Unsplash License",
          licenseUrl: "https://unsplash.com/license",
          query: slot.query,
          section: slot.section,
          purpose: slot.purpose,
          subject: slot.subject,
          orientation: slot.orientation,
          width,
          height,
          score,
        }
      })
      .filter((item: VisualContextImage | null): item is VisualContextImage => Boolean(item))
      .sort((a: VisualContextImage, b: VisualContextImage) => b.score - a.score)
  } catch {
    return []
  }
}

async function searchOpenverse(slot: VisualSlot): Promise<VisualContextImage[]> {
  try {
    const url = new URL("https://api.openverse.org/v1/images/")
    url.searchParams.set("q", slot.query)
    url.searchParams.set("page_size", String(SEARCH_RESULTS_PER_SLOT))
    url.searchParams.set("mature", "false")

    const response = await fetch(url, {
      headers: { "User-Agent": "Lumin-AI-Studio/2.0" },
      cache: "no-store",
      signal: AbortSignal.timeout(6500),
    })
    if (!response.ok) return []

    const data = await response.json().catch(() => null)
    const results = Array.isArray(data?.results) ? data.results : []

    return results
      .map((item: any): VisualContextImage | null => {
        const original = typeof item?.url === "string" && /^https?:\/\//i.test(item.url) ? item.url : ""
        const thumbnail =
          typeof item?.thumbnail === "string" && /^https?:\/\//i.test(item.thumbnail) ? item.thumbnail : ""
        const usableUrl = original || thumbnail
        if (!usableUrl) return null

        const width = Number(item?.width || 0)
        const height = Number(item?.height || 0)
        const tagText = Array.isArray(item?.tags)
          ? item.tags.map((tag: any) => (typeof tag === "string" ? tag : tag?.name || "")).join(" ")
          : ""
        const metadata = [item?.title, tagText].filter(Boolean).join(" ")

        let score =
          orientationScore(width, height, slot.orientation) +
          resolutionScore(width, height) +
          semanticScore(slot.query, metadata)

        if (original) score += 18
        if (thumbnail && !original) score -= 18
        if (item?.source === "wikimedia" || item?.provider === "wikimedia") score += 4

        return {
          url: usableUrl,
          thumbnail: thumbnail || undefined,
          title: typeof item?.title === "string" ? item.title : undefined,
          creator: typeof item?.creator === "string" ? item.creator : undefined,
          source: "openverse",
          license: typeof item?.license === "string" ? item.license : undefined,
          licenseUrl: typeof item?.license_url === "string" ? item.license_url : undefined,
          query: slot.query,
          section: slot.section,
          purpose: slot.purpose,
          subject: slot.subject,
          orientation: slot.orientation,
          width,
          height,
          score,
        }
      })
      .filter((item: VisualContextImage | null): item is VisualContextImage => Boolean(item))
      .filter((item: VisualContextImage) => {
        if (!item.width || !item.height) return true
        if (slot.orientation === "landscape" && item.width <= item.height) return false
        if (slot.orientation === "portrait" && item.height <= item.width) return false
        return Math.max(item.width, item.height) >= 1000
      })
      .sort((a: VisualContextImage, b: VisualContextImage) => b.score - a.score)
  } catch {
    return []
  }
}

function imageIdentity(image: VisualContextImage) {
  try {
    const url = new URL(image.url)
    return `${url.hostname}${url.pathname}`
  } catch {
    return image.url
  }
}

async function chooseImageForSlot(slot: VisualSlot, used: Set<string>) {
  const [unsplash, openverse] = await Promise.all([searchUnsplash(slot), searchOpenverse(slot)])
  const candidates = [...unsplash, ...openverse].sort((a, b) => b.score - a.score)

  for (const candidate of candidates) {
    const identity = imageIdentity(candidate)
    if (used.has(identity)) continue
    used.add(identity)
    return candidate
  }
  return null
}

export async function resolveVisualContext(input: {
  prompt: string
  businessName?: string
  language?: string
}): Promise<VisualContext> {
  const plan = await createVisualPlan(input.prompt, input.businessName, input.language)
  const used = new Set<string>()

  const selected = await Promise.all(
    plan.slots.map(async (slot) => ({ slot, image: await chooseImageForSlot(slot, used) })),
  )

  const images = selected
    .map((entry) => entry.image)
    .filter((image: VisualContextImage | null): image is VisualContextImage => Boolean(image))

  const brief = [
    `Business: ${plan.businessType}`,
    plan.location ? `Location: ${plan.location}` : "",
    `Audience: ${plan.audience}`,
    `Visual style: ${plan.style}`,
    `Mood: ${plan.mood}`,
    plan.avoid.length ? `Avoid: ${plan.avoid.join(", ")}` : "",
  ]
    .filter(Boolean)
    .join(" | ")

  return { brief, plan, images }
}

export function buildVisualContextBlock(context: VisualContext) {
  const { images, plan, brief } = context

  const planLines = plan.slots
    .map(
      (slot, index) =>
        `${index + 1}. ${slot.section}: show "${slot.subject}". Purpose: ${slot.purpose}. Preferred orientation: ${slot.orientation}.`,
    )
    .join("\n")

  if (!images.length) {
    return `
LUMIN VISUAL DIRECTOR:
${brief}
SECTION IMAGE PLAN:
${planLines}

No sufficiently strong stock image was resolved. Keep this visual direction. Use a precise thematic fallback only where an image materially helps, and never insert unrelated generic stock.`
  }

  const imageLines = images
    .map((image, index) => {
      const dimensions = image.width && image.height ? `${image.width}x${image.height}` : "unknown dimensions"
      const attribution = [image.creator, image.license].filter(Boolean).join(" · ")
      return `${index + 1}. SECTION: ${image.section}
   PURPOSE: ${image.purpose}
   MUST SHOW: ${image.subject}
   SEARCH INTENT: ${image.query}
   IMAGE URL: ${image.url}
   SOURCE: ${image.source} · ${dimensions} · relevance score ${image.score}${image.title ? `
   DESCRIPTION: ${image.title}` : ""}${attribution ? `
   CREDIT/LICENSE: ${attribution}` : ""}${image.licenseUrl ? `
   LICENSE URL: ${image.licenseUrl}` : ""}`
    })
    .join("\n\n")

  return `
LUMIN VISUAL DIRECTOR — FOLLOW THIS PLAN:
${brief}

SECTION IMAGE PLAN:
${planLines}

CURATED HIGH-RELEVANCE IMAGES:
${imageLines}

Rules:
- Match each curated image to the named section and purpose; do not place it in an unrelated block.
- Do not repeat the same image in multiple sections.
- Keep the full page visually coherent with the Visual Director style and mood.
- Prefer the exact high-resolution IMAGE URL, never the thumbnail.
- For the hero, preserve copy-safe space and use a subtle overlay only when needed for text contrast.
- Use object-fit: cover with intentional object-position; do not stretch or distort photography.
- If a curated image is clearly unsuitable for the generated copy, omit it rather than forcing it.
- Preserve required attribution discreetly when a source/license calls for it.
- Do not add random stock merely to fill space.`
}
