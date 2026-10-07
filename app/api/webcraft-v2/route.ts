import { generateText } from "ai"
import { withModelFallback } from "@/lib/ai-fallback"
import { buildVisualContextBlock, resolveVisualContext } from "@/lib/webcraft-visual-director"

export const maxDuration = 120

type Mode = "website" | "app"

type WebCraftRequest = {
  prompt?: string
  mode?: Mode
  currentHtml?: string
  refinement?: string
  language?: string
  businessName?: string
  businessEmail?: string
  referenceImages?: string[]
  uploadedImages?: Array<{
    name?: string
    dataUrl?: string
  }>
}

type ContextImage = {
  url: string
  thumbnail?: string
  title?: string
  creator?: string
  source?: string
  license?: string
  licenseUrl?: string
  query: string
}

type EmbeddedContextAsset = {
  token: string
  dataUrl: string
  source?: string
}

const MAX_CONTEXT_IMAGE_BYTES = 1_800_000
const MAX_CONTEXT_TOTAL_BYTES = 5_400_000
const MAX_WEBCRAFT_RESPONSE_BYTES = 4_200_000

function imageMimeType(value: string | null, url: string) {
  const type = String(value || "").split(";")[0].trim().toLowerCase()
  if (type.startsWith("image/")) return type
  const clean = url.split("?")[0].toLowerCase()
  if (clean.endsWith(".png")) return "image/png"
  if (clean.endsWith(".webp")) return "image/webp"
  if (clean.endsWith(".jpg") || clean.endsWith(".jpeg")) return "image/jpeg"
  return ""
}

async function fetchContextImageDataUrl(url: string, thumbnail?: string) {
  if (/^data:image\/(?:png|jpe?g|webp);base64,/i.test(url)) {
    try {
      const base64 = url.slice(url.indexOf(",") + 1).replace(/\s+/g, "")
      const bytes = Buffer.byteLength(base64, "base64")
      if (!bytes || bytes > MAX_CONTEXT_IMAGE_BYTES) return null
      return { dataUrl: url, bytes }
    } catch {
      return null
    }
  }

  const candidates = [url, thumbnail].filter(
    (value, index, values): value is string =>
      typeof value === "string" &&
      /^https?:\/\//i.test(value) &&
      values.indexOf(value) === index,
  )

  for (const candidate of candidates) {
    try {
      const response = await fetch(candidate, {
        headers: {
          Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
          "User-Agent": "Lumin-AI-Studio/2.0",
        },
        cache: "no-store",
        redirect: "follow",
        signal: AbortSignal.timeout(7000),
      })
      if (!response.ok) continue

      const declaredLength = Number(response.headers.get("content-length") || 0)
      if (declaredLength && declaredLength > MAX_CONTEXT_IMAGE_BYTES) continue

      const mime = imageMimeType(response.headers.get("content-type"), candidate)
      if (!mime) continue

      const arrayBuffer = await response.arrayBuffer()
      if (!arrayBuffer.byteLength || arrayBuffer.byteLength > MAX_CONTEXT_IMAGE_BYTES) continue

      return {
        dataUrl: `data:${mime};base64,${Buffer.from(arrayBuffer).toString("base64")}`,
        bytes: arrayBuffer.byteLength,
      }
    } catch {
      // Try the thumbnail/next candidate.
    }
  }

  return null
}

async function materializeContextImages<T extends { images: any[] }>(context: T, maxImages: number) {
  const sourceImages = Array.isArray(context.images) ? context.images.slice(0, maxImages) : []
  if (!sourceImages.length) {
    return { context, assets: [] as EmbeddedContextAsset[] }
  }

  const downloaded = await Promise.all(
    sourceImages.map((image) => fetchContextImageDataUrl(image.url, image.thumbnail)),
  )

  let totalBytes = 0
  const assets: EmbeddedContextAsset[] = []
  const images: any[] = []

  sourceImages.forEach((image, index) => {
    const result = downloaded[index]
    if (!result) return
    if (totalBytes + result.bytes > MAX_CONTEXT_TOTAL_BYTES) return

    const token = `__LUMIN_CONTEXT_IMAGE_${assets.length + 1}__`
    totalBytes += result.bytes
    assets.push({ token, dataUrl: result.dataUrl, source: image.source })
    images.push({ ...image, url: token })
  })

  return {
    context: { ...context, images },
    assets,
  }
}

function restoreContextImagesInHtml(html: string, assets: EmbeddedContextAsset[]) {
  let output = html
  for (const asset of assets) {
    output = output.split(asset.token).join(asset.dataUrl)
  }
  return output
}

function removeContextImageTokenFromHtml(html: string, token: string) {
  let output = html
  const imageTags = Array.from(output.matchAll(/<img\b[^>]*>/gi)).map((match) => match[0])
  for (const tag of imageTags) {
    if (tag.includes(token)) output = output.replace(tag, "")
  }
  output = output
    .split(`url(${token})`).join("none")
    .split(`url("${token}")`).join("none")
    .split(`url('${token}')`).join("none")
  return output.split(token).join("")
}

function removeNonUserImageDataUntilWithinLimit(
  html: string,
  uploadedImages: UploadedReferenceImage[],
  maxBytes: number,
) {
  const userImageData = new Set(uploadedImages.map((image) => image.dataUrl))
  const candidates = Array.from(
    new Set(
      Array.from(html.matchAll(/data:image\/(?:png|jpe?g|webp);base64,[a-z0-9+/=]+/gi)).map((match) => match[0]),
    ),
  )
    .filter((dataUrl) => !userImageData.has(dataUrl))
    .sort((a, b) => b.length - a.length)

  let output = html
  let dropped = 0

  for (const dataUrl of candidates) {
    if (Buffer.byteLength(output, "utf8") <= maxBytes) break

    const imageTags = Array.from(output.matchAll(/<img\b[^>]*>/gi)).map((match) => match[0])
    for (const tag of imageTags) {
      if (tag.includes(dataUrl)) output = output.replace(tag, "")
    }

    output = output
      .split(`url(${dataUrl})`).join("none")
      .split(`url("${dataUrl}")`).join("none")
      .split(`url('${dataUrl}')`).join("none")
      .split(dataUrl).join("")
    dropped += 1
  }

  return { html: output, dropped }
}

function fallbackImageDataUrl(label = "LUMIN") {
  const safeLabel = label.replace(/[<>&"']/g, "").slice(0, 28) || "LUMIN"
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="760" viewBox="0 0 1200 760">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#0f172a"/>
      <stop offset="0.52" stop-color="#172554"/>
      <stop offset="1" stop-color="#312e81"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="760" rx="32" fill="url(#g)"/>
  <circle cx="600" cy="330" r="88" fill="none" stroke="#67e8f9" stroke-width="8" opacity=".85"/>
  <path d="M556 330h88M600 286v88" stroke="#c084fc" stroke-width="10" stroke-linecap="round"/>
  <text x="600" y="470" text-anchor="middle" fill="#e2e8f0" font-family="Arial,Helvetica,sans-serif" font-size="44" font-weight="700">${safeLabel}</text>
</svg>`
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`
}

function extractImageSrc(tag: string) {
  const match = tag.match(/\ssrc\s*=\s*(["'])(.*?)\1/i)
  return match?.[2]?.trim() || ""
}

function extractImageAlt(tag: string) {
  const match = tag.match(/\salt\s*=\s*(["'])(.*?)\1/i)
  return match?.[2]?.trim() || ""
}

function isStableImageSource(src: string) {
  return /^data:image\//i.test(src) || /^__LUMIN_(?:UPLOAD|CONTEXT)_IMAGE_\d+__$/.test(src)
}

async function stabilizeGeneratedImagesInHtml(html: string) {
  const imgTags = Array.from(html.matchAll(/<img\b[^>]*>/gi)).map((match) => match[0])
  const cssUrls = Array.from(html.matchAll(/url\(\s*(["']?)(https?:\/\/[^)"']+)\1\s*\)/gi)).map(
    (match) => match[2],
  )

  const remoteSources = Array.from(
    new Set([
      ...imgTags.map(extractImageSrc).filter((src) => /^https?:\/\//i.test(src)),
      ...cssUrls,
    ]),
  ).slice(0, 12)

  const resolved = new Map<string, string | null>()
  await Promise.all(
    remoteSources.map(async (src) => {
      const materialized = await fetchContextImageDataUrl(src)
      resolved.set(src, materialized?.dataUrl || null)
    }),
  )

  let repairs = 0
  let output = html.replace(/<img\b[^>]*>/gi, (tag) => {
    const src = extractImageSrc(tag)
    const alt = extractImageAlt(tag)
    let nextSrc = src

    if (!src || /^(?:null|undefined|none|nan|about:blank)$/i.test(src)) {
      nextSrc = fallbackImageDataUrl(alt || "LUMIN")
      repairs += 1
    } else if (/^https?:\/\//i.test(src)) {
      const embedded = resolved.get(src)
      if (embedded) {
        nextSrc = embedded
        repairs += 1
      } else {
        nextSrc = fallbackImageDataUrl(alt || "LUMIN")
        repairs += 1
      }
    } else if (!isStableImageSource(src) && !/^(?:#|mailto:|tel:)/i.test(src)) {
      // Relative/invented paths such as /images/hero.jpg do not exist in the
      // single-file Website preview or static deploy.
      nextSrc = fallbackImageDataUrl(alt || "LUMIN")
      repairs += 1
    }

    let nextTag = tag
      .replace(/\ssrcset\s*=\s*(["']).*?\1/gi, "")
      .replace(/\ssizes\s*=\s*(["']).*?\1/gi, "")

    if (/\ssrc\s*=\s*(["']).*?\1/i.test(nextTag)) {
      nextTag = nextTag.replace(/\ssrc\s*=\s*(["']).*?\1/i, ` src="${nextSrc}"`)
    } else {
      nextTag = nextTag.replace(/^<img/i, `<img src="${nextSrc}"`)
    }

    if (!/\sonerror\s*=/i.test(nextTag)) {
      const fallback = fallbackImageDataUrl(alt || "LUMIN")
      nextTag = nextTag.replace(
        /\s*\/?\s*>$/,
        ` onerror="this.onerror=null;this.removeAttribute('srcset');this.src='${fallback}';">`,
      )
    }

    return nextTag
  })

  output = output.replace(
    /url\(\s*(["']?)(https?:\/\/[^)"']+)\1\s*\)/gi,
    (_match, _quote, src: string) => {
      const embedded = resolved.get(src)
      if (embedded) {
        repairs += 1
        return `url("${embedded}")`
      }
      repairs += 1
      return "linear-gradient(135deg,#0f172a,#312e81)"
    },
  )

  // Do not allow model-invented image sources in picture/source elements to
  // override the repaired <img> fallback selected by the browser.
  output = output.replace(/<source\b[^>]*\btype\s*=\s*(["'])image\/[^"']+\1[^>]*>/gi, "")

  return { html: output, repairs }
}

const STOP_WORDS = new Set([
  "para", "com", "uma", "um", "uns", "umas", "de", "do", "da", "dos", "das", "e", "ou", "o", "a", "os", "as",
  "que", "cria", "criar", "faz", "fazer", "site", "website", "pagina", "landing", "page", "app", "aplicacao", "aplicação",
  "meu", "minha", "nosso", "nossa", "cliente", "negocio", "negócio", "empresa", "marca", "moderno", "moderna", "profissional",
  "completo", "completa", "responsive", "responsivo", "bonito", "bonita", "quero", "preciso", "tem", "ter", "sobre", "mais",
])

function stripCodeFence(value: string) {
  return value.replace(/^```html?\n?/i, "").replace(/\n?```$/i, "")
}

function sanitizeGeneratedTargets(value: string) {
  return value
    .replace(/\b(href|action)\s*=\s*(['"])(?:null|undefined|none|nan|about:blank|\s*)\2/gi, '$1="#"')
    .replace(/\b(href|action)\s*=\s*(?:null|undefined|none|nan)(?=\s|>)/gi, '$1="#"')
    .replace(/\bonclick\s*=\s*(['"])([^'"]*(?:location|window\.open)[^'"]*(?:null|undefined|none)[^'"]*)\1/gi, "")
}

function validateAndFixHtml(value: string) {
  const currentYear = new Date().getFullYear()
  let html = stripCodeFence(value.trim())

  if (!/^<!doctype html>/i.test(html)) html = `<!DOCTYPE html>\n${html}`

  if (/<head[\s>]/i.test(html) && !/name=["']viewport["']/i.test(html)) {
    html = html.replace(/<head(\s[^>]*)?>/i, (match) => `${match}\n<meta name="viewport" content="width=device-width, initial-scale=1" />`)
  }

  if (/<html[\s>]/i.test(html) && !/<html[^>]*\slang=/i.test(html)) {
    html = html.replace(/<html(\s[^>]*)?>/i, (_match, attrs = "") => `<html${attrs} lang="pt-PT">`)
  }

  html = sanitizeGeneratedTargets(html)
    .replace(/Powered by\s+Reborn AI/gi, "Powered by Lumin AI Studio")
    .replace(/Criado com\s+Reborn AI/gi, "Criado com Lumin AI Studio")
    .replace(/REBORN AI WebCraft/gi, "Lumin AI Studio")
    .replace(/(©|&copy;|copyright\s*)\s*(20(?:1\d|2[0-5]))/gi, (_m, prefix) => `${prefix} ${currentYear}`)

  return html
}

function cleanReferenceImages(input: unknown) {
  if (!Array.isArray(input)) return [] as string[]
  return input
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.trim())
    .filter((value) => /^https?:\/\//i.test(value))
    .slice(0, 12)
}

type UploadedReferenceImage = {
  name: string
  dataUrl: string
  placeholder: string
}

type UploadedVisualAssetAnalysis = {
  index: number
  summary: string
  kind: "logo" | "photo" | "poster" | "screenshot" | "illustration" | "other"
  bestUse: string
  preserveFullFrame: boolean
}

type UploadedVisualAnalysis = {
  summary: string
  needsSupportingStock: boolean
  assets: UploadedVisualAssetAnalysis[]
}

const MAX_UPLOADED_IMAGES = 5
const MAX_UPLOADED_DATA_URL_LENGTH = 700_000
const MAX_UPLOADED_TOTAL_LENGTH = 3_400_000

function cleanUploadedImages(input: unknown): UploadedReferenceImage[] {
  if (!Array.isArray(input)) return []

  const output: UploadedReferenceImage[] = []
  let totalLength = 0

  for (const value of input) {
    if (output.length >= MAX_UPLOADED_IMAGES) break
    if (!value || typeof value !== "object") continue

    const rawName = typeof (value as any).name === "string" ? (value as any).name.trim() : ""
    const dataUrl = typeof (value as any).dataUrl === "string" ? (value as any).dataUrl.trim() : ""

    if (!/^data:image\/(?:jpeg|jpg|png|webp);base64,[a-z0-9+/=\s]+$/i.test(dataUrl)) continue
    if (dataUrl.length > MAX_UPLOADED_DATA_URL_LENGTH) continue
    if (totalLength + dataUrl.length > MAX_UPLOADED_TOTAL_LENGTH) break

    const index = output.length + 1
    output.push({
      name: rawName.slice(0, 120) || `imagem-${index}`,
      dataUrl,
      placeholder: `__LUMIN_UPLOAD_IMAGE_${index}__`,
    })
    totalLength += dataUrl.length
  }

  return output
}

function maskUploadedImagesInHtml(html: string, uploadedImages: UploadedReferenceImage[]) {
  let masked = html
  for (const image of uploadedImages) {
    masked = masked.split(image.dataUrl).join(image.placeholder)
  }
  return masked
}

function restoreUploadedImagesInHtml(html: string, uploadedImages: UploadedReferenceImage[]) {
  let restored = html
  for (const image of uploadedImages) {
    restored = restored.split(image.placeholder).join(image.dataUrl)
  }
  return restored
}

function stripJsonFence(value: string) {
  return value
    .replace(/^\s*\`\`\`(?:json)?/i, "")
    .replace(/\`\`\`\s*$/i, "")
    .trim()
}

function fallbackUploadedVisualAnalysis(uploadedImages: UploadedReferenceImage[]): UploadedVisualAnalysis {
  return {
    summary: uploadedImages.length
      ? "User supplied visual assets. Treat them as primary brand/content imagery."
      : "",
    needsSupportingStock: uploadedImages.length < 2,
    assets: uploadedImages.map((image, index) => ({
      index: index + 1,
      summary: image.name,
      kind: "other" as const,
      bestUse: index === 0 ? "prominent hero or feature media" : "prominent feature/gallery media",
      preserveFullFrame: true,
    })),
  }
}

async function analyzeUploadedImages(
  uploadedImages: UploadedReferenceImage[],
  websiteRequest: string,
  economy = false,
): Promise<UploadedVisualAnalysis> {
  if (!uploadedImages.length) return fallbackUploadedVisualAnalysis(uploadedImages)

  try {
    const content: any[] = [
      {
        type: "text",
        text: `You are LUMIN Visual Director. Analyse these user-uploaded assets for a website requested as: "${websiteRequest}".
Return ONLY compact JSON:
{
  "summary": "one sentence describing the shared visual identity",
  "needsSupportingStock": false,
  "assets": [
    {
      "index": 1,
      "summary": "what is visibly in this asset and its purpose",
      "kind": "logo|photo|poster|screenshot|illustration|other",
      "bestUse": "specific website placement",
      "preserveFullFrame": true
    }
  ]
}
Use needsSupportingStock=true only when the uploads clearly cannot cover the site's visual needs (for example only a logo). If an asset is a designed poster, screenshot, dashboard or artwork containing important text/UI, preserveFullFrame must be true. Never identify real people.`,
      },
    ]

    uploadedImages.forEach((image, index) => {
      content.push({ type: "text", text: `Asset ${index + 1}: ${image.name}` })
      content.push({ type: "image", image: image.dataUrl })
    })

    const { value: result } = await withModelFallback(
      (model) =>
        generateText({
          model,
          messages: [{ role: "user", content }],
          maxTokens: 650,
        }),
      { kind: "vision", economy, label: "webcraft-upload-analysis" },
    )

    const parsed = JSON.parse(stripJsonFence(result.text))
    const rawAssets = Array.isArray(parsed?.assets) ? parsed.assets : []
    const assets = uploadedImages.map((image, index) => {
      const raw = rawAssets.find((asset: any) => Number(asset?.index) === index + 1) || rawAssets[index] || {}
      const allowedKinds = new Set(["logo", "photo", "poster", "screenshot", "illustration", "other"])
      const kind = allowedKinds.has(raw?.kind) ? raw.kind : "other"
      return {
        index: index + 1,
        summary:
          typeof raw?.summary === "string" && raw.summary.trim()
            ? raw.summary.trim().slice(0, 260)
            : image.name,
        kind,
        bestUse:
          typeof raw?.bestUse === "string" && raw.bestUse.trim()
            ? raw.bestUse.trim().slice(0, 180)
            : index === 0
              ? "prominent hero or feature media"
              : "prominent feature/gallery media",
        preserveFullFrame: raw?.preserveFullFrame !== false,
      } satisfies UploadedVisualAssetAnalysis
    })

    return {
      summary:
        typeof parsed?.summary === "string" && parsed.summary.trim()
          ? parsed.summary.trim().slice(0, 320)
          : fallbackUploadedVisualAnalysis(uploadedImages).summary,
      needsSupportingStock: Boolean(parsed?.needsSupportingStock),
      assets,
    }
  } catch {
    return fallbackUploadedVisualAnalysis(uploadedImages)
  }
}

function enforceUploadedImagePresentation(
  html: string,
  uploadedImages: UploadedReferenceImage[],
  analysis: UploadedVisualAnalysis,
) {
  let output = html

  for (const [index, image] of uploadedImages.entries()) {
    const asset = analysis.assets[index]
    if (asset?.kind === "logo") continue

    const escaped = image.placeholder
    const regex = new RegExp(`<img([^>]*src=["']${escaped}["'][^>]*)>`, "gi")

    output = output.replace(regex, (full, attrs: string) => {
      const presentation =
        asset?.preserveFullFrame || asset?.kind === "poster" || asset?.kind === "screenshot"
          ? "display:block;position:relative!important;inset:auto!important;float:none!important;width:100%!important;max-width:760px;height:auto!important;max-height:none!important;object-fit:contain!important;object-position:center;margin-left:auto;margin-right:auto;z-index:5!important;"
          : "display:block;position:relative;width:100%;max-width:760px;height:auto;object-fit:cover;object-position:center;margin-left:auto;margin-right:auto;"

      if (/\sstyle=["'][^"']*["']/i.test(attrs)) {
        const nextAttrs = attrs.replace(
          /\sstyle=(["'])([^"']*)\1/i,
          (_m: string, quote: string, style: string) => ` style=${quote}${style};${presentation}${quote}`,
        )
        return `<img${nextAttrs}>`
      }

      return `<img${attrs} style="${presentation}">`
    })
  }

  return output
}

function buildUploadedImagesBlock(
  uploadedImages: UploadedReferenceImage[],
  analysis: UploadedVisualAnalysis,
) {
  if (!uploadedImages.length) return ""

  return `
IMAGENS CARREGADAS DIRETAMENTE PELO UTILIZADOR — ASSETS PRINCIPAIS:
Identidade visual detetada: ${analysis.summary}
Imagens externas adicionais: ${analysis.needsSupportingStock ? "permitidas apenas para preencher lacunas reais" : "não são necessárias; evita stock remoto"}

${uploadedImages
  .map((image, index) => {
    const asset = analysis.assets[index]
    return `${index + 1}. Ficheiro: ${image.name}
   SRC OBRIGATÓRIO: ${image.placeholder}
   Conteúdo visual: ${asset?.summary || image.name}
   Tipo: ${asset?.kind || "other"}
   Melhor utilização: ${asset?.bestUse || "prominent feature media"}
   Preservar enquadramento completo: ${asset?.preserveFullFrame !== false ? "sim" : "não"}`
  })
  .join("\n\n")}

Estas imagens são assets reais enviados pelo utilizador.
- Usa o token SRC OBRIGATÓRIO exatamente no atributo src; o servidor insere o ficheiro real no fim.
- NÃO transformes estes uploads em ícones, avatares ou miniaturas w-16/w-20/w-24/w-32, salvo se o tipo for explicitamente "logo".
- Posters, screenshots, dashboards e peças com texto/UI devem aparecer grandes, legíveis e com object-fit: contain; nunca cortes informação importante.
- Dá prioridade a pelo menos uma imagem carregada acima da dobra (hero ou bloco imediatamente seguinte) quando for visualmente adequada.
- Distribui as restantes em blocos de destaque, galeria ou prova visual, evitando três cartões quase iguais.
- Se "Imagens externas adicionais" disser que não são necessárias, não uses Flickr, Unsplash, Openverse nem outro stock remoto.
`
}

function extractVisualQueries(value: string) {
  const cleaned = value
    .toLocaleLowerCase("pt-PT")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, " ")

  const words = cleaned
    .split(/\s+/)
    .filter((word) => word.length >= 4 && !STOP_WORDS.has(word))

  const unique = Array.from(new Set(words)).slice(0, 8)
  const queries: string[] = []

  if (unique.length >= 2) queries.push(unique.slice(0, 3).join(" "))
  if (unique.length >= 4) queries.push(unique.slice(2, 5).join(" "))
  if (unique.length >= 6) queries.push(unique.slice(5, 8).join(" "))
  if (!queries.length && unique.length) queries.push(unique.join(" "))

  return Array.from(new Set(queries)).slice(0, 3)
}

async function searchOpenverse(query: string, limit = 4): Promise<ContextImage[]> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 4500)

  try {
    const url = new URL("https://api.openverse.org/v1/images/")
    url.searchParams.set("q", query)
    url.searchParams.set("page_size", String(Math.min(limit, 10)))
    url.searchParams.set("mature", "false")

    const response = await fetch(url, {
      headers: { "User-Agent": "Lumin-AI-Studio/1.0" },
      signal: controller.signal,
      cache: "no-store",
    })

    if (!response.ok) return []
    const data = await response.json().catch(() => null)
    const results = Array.isArray(data?.results) ? data.results : []

    return results
      .map((item: any): ContextImage | null => {
        const usableUrl = typeof item?.thumbnail === "string" && /^https?:\/\//i.test(item.thumbnail)
          ? item.thumbnail
          : typeof item?.url === "string" && /^https?:\/\//i.test(item.url)
            ? item.url
            : null

        if (!usableUrl) return null

        return {
          url: usableUrl,
          thumbnail: typeof item?.thumbnail === "string" ? item.thumbnail : undefined,
          title: typeof item?.title === "string" ? item.title : undefined,
          creator: typeof item?.creator === "string" ? item.creator : undefined,
          source: typeof item?.source === "string" ? item.source : undefined,
          license: typeof item?.license === "string" ? item.license : undefined,
          licenseUrl: typeof item?.license_url === "string" ? item.license_url : undefined,
          query,
        }
      })
      .filter((item: ContextImage | null): item is ContextImage => Boolean(item))
      .slice(0, limit)
  } catch {
    return []
  } finally {
    clearTimeout(timeout)
  }
}

async function resolveContextImages(prompt: string, businessName?: string) {
  const seed = `${businessName || ""} ${prompt}`.trim()
  const queries = extractVisualQueries(seed)
  if (!queries.length) return [] as ContextImage[]

  const groups = await Promise.all(queries.map((query) => searchOpenverse(query, 3)))
  const seen = new Set<string>()
  const output: ContextImage[] = []

  for (const image of groups.flat()) {
    if (seen.has(image.url)) continue
    seen.add(image.url)
    output.push(image)
    if (output.length >= 8) break
  }

  return output
}

function buildContextImageBlock(images: ContextImage[]) {
  if (!images.length) return ""

  return `\nIMAGENS CONTEXTUAIS PESQUISADAS AUTOMATICAMENTE PELO LUMIN:\n${images
    .map((image, index) => {
      const attribution = [image.creator, image.license].filter(Boolean).join(" · ")
      return `${index + 1}. ${image.url}\n   Tema pesquisado: ${image.query}${image.title ? `\n   Título: ${image.title}` : ""}${attribution ? `\n   Crédito/licença: ${attribution}` : ""}${image.licenseUrl ? `\n   Licença: ${image.licenseUrl}` : ""}`
    })
    .join("\n")}\nUsa estas imagens nas secções visualmente adequadas. Quando houver crédito/licença, preserva uma atribuição discreta no HTML (por exemplo no rodapé ou legenda) sem prejudicar o design.`
}

export async function POST(req: Request) {
  try {
    const creditMode = req.headers.get("x-lumin-credit-mode") || "full"
    const economyMode = creditMode === "fallback"
    const body = (await req.json()) as WebCraftRequest
    const mode: Mode = body.mode === "app" ? "app" : "website"
    const prompt = body.prompt?.trim()
    const refinement = body.refinement?.trim()
    const currentHtml = body.currentHtml?.trim()
    const language = body.language?.trim() || "Português de Portugal (PT-PT)"
    const currentYear = new Date().getFullYear()
    const referenceImages = cleanReferenceImages(body.referenceImages)
    const uploadedImages = cleanUploadedImages(body.uploadedImages)
    const maskedCurrentHtml = currentHtml ? maskUploadedImagesInHtml(currentHtml, uploadedImages) : undefined

    if (!prompt && !refinement) {
      return Response.json({ error: "Indica o que queres criar ou alterar." }, { status: 400 })
    }

    const isRefinement = Boolean(currentHtml && refinement)
    const uploadVisualAnalysis = await analyzeUploadedImages(
      uploadedImages,
      prompt || refinement || body.businessName || "website",
      economyMode,
    )
    const shouldSearchStock =
      !isRefinement &&
      Boolean(prompt) &&
      referenceImages.length === 0 &&
      (uploadedImages.length === 0 || uploadVisualAnalysis.needsSupportingStock)

    const visualContext = shouldSearchStock && prompt
      ? await resolveVisualContext({
          prompt,
          businessName: body.businessName,
          language,
          economy: economyMode,
        })
      : {
          images: [],
          brief: "",
          plan: {
            businessType: body.businessName || "business",
            location: "",
            audience: "",
            style: "",
            mood: "",
            avoid: [],
            slots: [],
          },
        }
    const materializedVisuals = await materializeContextImages(
      visualContext,
      economyMode ? 4 : 6,
    )
    const stableVisualContext = materializedVisuals.context
    const contextAssets = materializedVisuals.assets
    const contextImages = stableVisualContext.images

    const urlReferenceBlock = referenceImages.length
      ? `\nIMAGENS DE REFERÊNCIA POR URL FORNECIDAS PELO UTILIZADOR:\n${referenceImages.map((url, index) => `${index + 1}. ${url}`).join("\n")}\nUsa estas imagens prioritariamente nas secções onde fizerem sentido. Não as substituas por imagens genéricas salvo se o utilizador pedir.\n`
      : ""
    const uploadedImagesBlock = buildUploadedImagesBlock(uploadedImages, uploadVisualAnalysis)
    const referenceBlock = `${uploadedImagesBlock}${urlReferenceBlock}`
    const contextImageBlock = buildVisualContextBlock(stableVisualContext)

    const system = `És o motor interno do Lumin AI Studio, um agente de criação de aplicações e websites prontos a usar.

OBJETIVO:
- Produzir uma experiência funcional, visualmente profissional e utilizável imediatamente no browser.
- Trabalhar como um construtor iterativo: criar, receber pedidos de alteração e devolver sempre o projeto completo atualizado.
- Nunca remover funcionalidades existentes quando o utilizador pede apenas uma alteração localizada, salvo se for explicitamente pedido.

CONTEXTO TEMPORAL:
- Ano atual: ${currentYear}.
- Nunca inventes datas históricas como 2023, 2024 ou 2025 em copyright quando a intenção for representar o presente.
- Para copyright, prefere JavaScript dinâmico com new Date().getFullYear() ou usa ${currentYear}.
- Não assumes que bibliotecas/APIs antigas continuam atuais quando a funcionalidade depender delas.

MODO ATUAL: ${mode === "app" ? "APLICAÇÃO WEB" : "WEBSITE"}
IDIOMA VISÍVEL: ${language}

REGRAS DE SAÍDA:
1. Devolve APENAS HTML completo, começando por <!DOCTYPE html>.
2. Um único ficheiro executável no browser, sem markdown nem explicações.
3. Tailwind via CDN é permitido: <script src="https://cdn.tailwindcss.com"></script>.
4. Podes usar JavaScript vanilla no próprio HTML para estado, formulários, modais, filtros, tabelas, dashboards, navegação e interações.
5. Não uses lorem ipsum. Usa conteúdo realista.
6. Design responsivo, mobile-first e acessível.
7. O produto visível é Lumin AI Studio. Nunca exponhas REBORN AI ou o fornecedor/modelo de IA no conteúdo do cliente.
8. Se fizer sentido assinar o projeto, usa discretamente "Powered by Lumin AI Studio".
9. Não inventes integrações externas como se estivessem ligadas. Quando uma função depender de backend real, cria a interface e comportamento local/demonstração claramente funcional no preview.
10. Se pedirem login, CRM, dashboard, e-commerce, reservas, pipeline, etc., cria fluxos navegáveis e dados demo coerentes.
11. Para aplicações, privilegia layout de produto SaaS: sidebar/topbar, estados, cards, tabelas e ações funcionais.
12. Para websites, privilegia SEO, navegação, CTA, formulários e secções comerciais.
13. Todo o código deve estar pronto a abrir/publicar sem passos adicionais.
14. NUNCA uses href="null", href="undefined", action="null", URLs vazios ou destinos inventados. Para navegação interna num website de uma só página usa âncoras reais como #servicos, #contacto e garante que o id correspondente existe. Para links externos usa apenas https://, mailto: ou tel: válidos.
15. Se um CTA ainda não tiver destino real, usa um botão com comportamento local/demonstrativo ou uma âncora interna válida; nunca uses "null", "undefined", "/null" ou JavaScript que navegue para valores inexistentes.

IMAGENS E CONTEXTO VISUAL — OBRIGATÓRIO:
16. Antes de desenhar, infere do pedido entre 3 e 8 conceitos visuais concretos.
17. Nunca uses imagens sem relação com o tema, URLs vazias, caminhos inventados como /images/hero.jpg, /assets/photo.png, placeholder.com, picsum, loremflickr ou qualquer URL de imagem que não tenha sido fornecida pelo LUMIN ou pelo utilizador.
18. Se receberes imagens/tokens do LUMIN Visual Director, usa APENAS esses assets para fotografia e associa cada um exclusivamente à respetiva SECTION/PURPOSE.
19. Se uma secção não tiver um asset real fornecido, NÃO inventes um <img>. Usa tipografia, cor, CSS, ícones/SVG inline ou layout editorial até existir uma imagem real.
20. Hero, secções editoriais, cartões de produto/serviço e galerias só devem ter fotografia quando existir um asset válido do Visual Director ou upload do utilizador.
21. Todo <img> tem de usar um SRC real recebido no prompt: data:image/... ou token __LUMIN_UPLOAD_IMAGE_N__/__LUMIN_CONTEXT_IMAGE_N__. Usa alt text descritivo, dimensões responsivas e object-fit adequado.
22. Se existirem IMAGENS DE REFERÊNCIA fornecidas pelo utilizador, dá-lhes prioridade absoluta e reutiliza-as fielmente.
23. Não uses imagens de celebridades, marcas protegidas ou pessoas identificáveis como se fossem o cliente, salvo se o utilizador tiver fornecido essas imagens.
24. Quando uma imagem pesquisada trouxer crédito/licença, mantém atribuição discreta e legível no HTML.
25. Trata o bloco LUMIN VISUAL DIRECTOR como direção criativa: cada imagem tem uma secção, intenção e assunto; respeita essa associação.
26. Nunca uses a mesma fotografia em duas secções diferentes salvo pedido explícito.
27. Nunca uses thumbnails quando existir um IMAGE URL de alta resolução.
28. Mantém um único DNA visual no projeto: fotografia, luz, tratamento, densidade e enquadramento devem parecer parte da mesma marca.
29. Hero: usa imagem de alta qualidade, composição forte e espaço seguro para copy; evita rostos ou elementos importantes tapados pelo texto.
30. Não enchas todas as secções com fotografia. Usa imagem apenas quando acrescenta contexto, desejo, prova, produto ou confiança.
31. Para <img>, usa object-fit: cover sem distorção; lazy loading fora do hero e alt text específico ao conteúdo.
32. Se uma imagem curada contradizer o conteúdo final, omite-a em vez de a usar só porque está disponível.
33. Tokens com o formato __LUMIN_UPLOAD_IMAGE_N__ representam imagens reais carregadas pelo utilizador. Usa-os exatamente no src quando escolheres esse upload e nunca os alteres, encurtes, transformes em URL, CSS background textual ou texto visível.
34. Imagens carregadas pelo utilizador têm prioridade sobre stock quando representam diretamente o negócio, produto, espaço, equipa ou identidade visual.
35. Nunca apresentes um upload do utilizador como miniatura decorativa se for poster, screenshot, dashboard, fotografia editorial ou peça de marketing. Usa-o como media principal, normalmente com largura responsiva e altura automática.
36. Se o bloco de uploads indicar que stock adicional não é necessário, não uses URLs de stock remoto em hero, fundos ou secções; constrói a página com os uploads, gradientes, CSS, SVG e tipografia.
37. Quando um upload contém texto ou interface, usa object-fit: contain e preserva a peça inteira; não a cortes para preencher quadrados.
38. Posters, screenshots, dashboards e peças de marketing com texto próprio nunca devem servir de background por baixo de headline, menu, botões ou copy adicional. Coloca-os num bloco de media autónomo, sem sobreposição de texto.
39. Em mobile, qualquer bloco que contenha um upload principal deve empilhar verticalmente: imagem a 100% da largura disponível, altura automática, sem position:absolute e sem conteúdo a sair do viewport.
40. Evita overflow horizontal: containers flex/grid devem usar min-width: 0 nos filhos; nenhuma imagem, card ou bloco pode ultrapassar 100vw.
41. Se o HTML atual já tiver um poster/screenshot atrás de texto, não preserves essa composição: move o upload para um bloco autónomo e coloca headline, parágrafo e CTAs num bloco separado acima ou abaixo. A regra de não sobreposição tem prioridade sobre a preservação do layout anterior.
42. Quando o Visual Director fornecer IMAGE URL no formato __LUMIN_CONTEXT_IMAGE_N__, usa esse token exatamente em src ou background-image. Não inventes, encurtes nem substituas o token; o servidor incorpora a fotografia real no HTML final.
43. Em WEBSITE, usa JavaScript apenas quando necessário. Executa inicialização depois de DOMContentLoaded, verifica se cada elemento existe antes de o usar e não assumes IDs/seletores que não estejam presentes no HTML.
44. As imagens geradas pelo LUMIN Visual Director já foram criadas especificamente para cada secção. Respeita rigorosamente SECTION, PURPOSE e MUST SHOW; nunca troques uma imagem de quartos por spa, hero por restaurante, ou qualquer outro contexto.
45. PROIBIDO inventar src de imagens. Antes de devolver o HTML, verifica mentalmente cada <img>: se o src não veio de um upload/token/asset do LUMIN, remove esse <img> e mantém o layout elegante sem fotografia.
46. Nunca dependas de hotlinks externos para o WEBSITE final. O servidor do LUMIN materializa os assets válidos; qualquer imagem externa inventada será substituída por fallback.

PRESERVAÇÃO:
- Em refinamentos, parte obrigatoriamente do HTML atual.
- Mantém as funcionalidades, estilos e conteúdo que não tenham sido pedidos para alterar.
- Faz a menor alteração necessária para cumprir o pedido e devolve novamente o HTML COMPLETO.`

    const userPrompt = isRefinement
      ? `HTML ATUAL:\n${stripCodeFence(maskedCurrentHtml!)}\n\nALTERAÇÃO PEDIDA:\n${refinement}${referenceBlock}\n\nDevolve o HTML completo atualizado.`
      : `Cria ${mode === "app" ? "uma aplicação web" : "um website"} completo para este pedido:\n${prompt}\n\n${body.businessName ? `Nome do negócio/projeto: ${body.businessName}\n` : ""}${body.businessEmail ? `Contacto: ${body.businessEmail}\n` : ""}${referenceBlock}${contextImageBlock}\nDevolve o HTML completo.`

    const { value: result, model: usedModel, attempts: modelAttempts } = await withModelFallback(
      (model) =>
        generateText({
          model,
          system,
          prompt: userPrompt,
        }),
      { kind: "text", economy: economyMode, label: "webcraft-generation" },
    )

    const fixedHtml = validateAndFixHtml(result.text)
    const presentationFixedHtml = enforceUploadedImagePresentation(
      fixedHtml,
      uploadedImages,
      uploadVisualAnalysis,
    )
    const restoredUploadsHtml = restoreUploadedImagesInHtml(presentationFixedHtml, uploadedImages)
    let restoredHtml = restoredUploadsHtml
    let imageSizeDrops = 0
    const includedContextTokens = new Set<string>()

    for (const asset of contextAssets) {
      if (!restoredHtml.includes(asset.token)) continue
      const withAsset = restoredHtml.split(asset.token).join(asset.dataUrl)
      if (Buffer.byteLength(withAsset, "utf8") <= MAX_WEBCRAFT_RESPONSE_BYTES) {
        restoredHtml = withAsset
        includedContextTokens.add(asset.token)
      } else {
        restoredHtml = removeContextImageTokenFromHtml(restoredHtml, asset.token)
        imageSizeDrops += 1
      }
    }

    let stabilized = await stabilizeGeneratedImagesInHtml(restoredHtml)
    if (Buffer.byteLength(stabilized.html, "utf8") > MAX_WEBCRAFT_RESPONSE_BYTES) {
      const reduced = removeNonUserImageDataUntilWithinLimit(
        stabilized.html,
        uploadedImages,
        MAX_WEBCRAFT_RESPONSE_BYTES,
      )
      stabilized = { ...stabilized, html: reduced.html }
      imageSizeDrops += reduced.dropped
    }

    if (Buffer.byteLength(stabilized.html, "utf8") > MAX_WEBCRAFT_RESPONSE_BYTES) {
      return Response.json(
        { error: "O projeto excede o limite de tamanho do preview. Reduz o número ou o tamanho das imagens carregadas e tenta novamente." },
        { status: 413 },
      )
    }

    const retainedContextAssets = contextAssets.filter(
      (asset) => includedContextTokens.has(asset.token) && stabilized.html.includes(asset.dataUrl),
    )
    const generatedImageCount = retainedContextAssets.filter((asset) => asset.source === "generated").length
    const curatedImageCount = retainedContextAssets.filter((asset) => asset.source !== "generated").length

    return new Response(stabilized.html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "X-Lumin-Context-Images": String(generatedImageCount + curatedImageCount),
        "X-Lumin-Generated-Images": String(generatedImageCount),
        "X-Lumin-Curated-Images": String(curatedImageCount),
        "X-Lumin-Image-Size-Drops": String(imageSizeDrops),
        "X-Lumin-Uploaded-Images": String(uploadedImages.length),
        "X-Lumin-Image-Repairs": String(stabilized.repairs),
        "X-Lumin-AI-Mode": economyMode ? "fallback" : "full",
        "X-Lumin-AI-Model": usedModel,
        "X-Lumin-AI-Attempts": String(modelAttempts),
      },
    })
  } catch (error: any) {
    console.error("[lumin-studio] generation error:", error)
    return Response.json({ error: error?.message || "Erro ao gerar projeto" }, { status: 500 })
  }
}
