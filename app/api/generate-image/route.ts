export const maxDuration = 60

interface ImageProvider {
  name: string
  priority: number
  generate: (prompt: string, w: number, h: number, seed: number) => string | Promise<string | null>
}

const URL_PROVIDERS: ImageProvider[] = [
  {
    name: "pollinations-flux",
    priority: 1,
    generate: (prompt, w, h, seed) =>
      `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=${w}&height=${h}&model=flux&nologo=true&seed=${seed}`,
  },
  {
    name: "pollinations-turbo",
    priority: 2,
    generate: (prompt, w, h, seed) =>
      `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=${w}&height=${h}&model=turbo&nologo=true&seed=${seed}`,
  },
  {
    name: "pollinations-default",
    priority: 3,
    generate: (prompt, w, h, seed) =>
      `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=${w}&height=${h}&nologo=true&seed=${seed}`,
  },
  {
    name: "getimg-free",
    priority: 4,
    generate: (prompt, w, h, seed) =>
      `https://api.getimg.ai/v1/stable-diffusion/text-to-image?prompt=${encodeURIComponent(prompt)}&width=${Math.min(w, 512)}&height=${Math.min(h, 512)}&seed=${seed}`,
  },
  {
    name: "lexica",
    priority: 5,
    generate: (prompt) => `https://lexica.art/api/v1/search?q=${encodeURIComponent(prompt)}`,
  },
]

const API_PROVIDERS = [
  {
    name: "craiyon",
    priority: 10,
    generate: async (prompt: string): Promise<string | null> => {
      try {
        const response = await fetch("https://api.craiyon.com/v3", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt,
            token: null,
            model: "art",
            negative_prompt: "blurry, bad quality, distorted",
            version: "c4ue22fb7kb6wlac",
          }),
          signal: AbortSignal.timeout(25000),
        })

        if (!response.ok) return null
        const data = await response.json()
        if (Array.isArray(data.images) && data.images.length > 0) {
          return `data:image/webp;base64,${data.images[0]}`
        }
        return null
      } catch {
        return null
      }
    },
  },
  {
    name: "prodia-free",
    priority: 11,
    generate: async (prompt: string, w: number, h: number): Promise<string | null> => {
      try {
        const response = await fetch("https://api.prodia.com/v1/sdxl/generate", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            prompt,
            negative_prompt: "blurry, bad quality",
            width: Math.min(w, 1024),
            height: Math.min(h, 1024),
            steps: 20,
            cfg_scale: 7,
          }),
          signal: AbortSignal.timeout(20000),
        })

        if (!response.ok) return null
        const data = await response.json()
        return data.imageUrl || data.image || null
      } catch {
        return null
      }
    },
  },
  {
    name: "deepai",
    priority: 12,
    generate: async (prompt: string): Promise<string | null> => {
      try {
        const formData = new FormData()
        formData.append("text", prompt)

        const response = await fetch("https://api.deepai.org/api/text2img", {
          method: "POST",
          body: formData,
          signal: AbortSignal.timeout(20000),
        })

        if (!response.ok) return null
        const data = await response.json()
        return data.output_url || null
      } catch {
        return null
      }
    },
  },
]

const FALLBACK_PROVIDERS = [
  {
    name: "picsum",
    generate: (_prompt: string, w: number, h: number, seed: number) =>
      `https://picsum.photos/seed/${seed}/${w}/${h}`,
  },
  {
    name: "loremflickr",
    generate: (prompt: string, w: number, h: number) => {
      const keywords = prompt.split(" ").slice(0, 3).join(",")
      return `https://loremflickr.com/${w}/${h}/${encodeURIComponent(keywords)}`
    },
  },
  {
    name: "placeholder",
    generate: (_prompt: string, w: number, h: number) =>
      `https://placehold.co/${w}x${h}/1a1a2e/eaeaea?text=Reborn+AI&font=roboto`,
  },
]

function isImageDataUrl(value: string) {
  return value.startsWith("data:image/")
}

async function verifyImageUrl(url: string, timeout = 5000): Promise<boolean> {
  try {
    if (isImageDataUrl(url)) return true

    const response = await fetch(url, {
      method: "HEAD",
      redirect: "follow",
      signal: AbortSignal.timeout(timeout),
    })

    if (!response.ok) return false
    const contentType = response.headers.get("content-type")?.toLowerCase() || ""
    return contentType.startsWith("image/")
  } catch {
    return false
  }
}

export async function POST(req: Request) {
  try {
    const { prompt, width = 1024, height = 1024, quality = "standard" } = await req.json()

    if (!prompt || typeof prompt !== "string") {
      return Response.json({ error: "Prompt não fornecido" }, { status: 400 })
    }

    const seed = Math.floor(Math.random() * 9999999)
    const w = Math.min(Math.max(Number(width) || 1024, 256), 1536)
    const h = Math.min(Math.max(Number(height) || 1024, 256), 1536)

    const enhancedPrompt = quality === "hd"
      ? `${prompt}, high quality, detailed, professional, 4k, sharp focus`
      : prompt

    if (quality !== "fast") {
      for (const provider of API_PROVIDERS) {
        try {
          const result = await provider.generate(enhancedPrompt, w, h)
          if (!result) continue

          const valid = isImageDataUrl(result) || await verifyImageUrl(result, 6000)
          if (!valid) continue

          return Response.json({
            url: result,
            provider: "Reborn AI",
            providerSource: provider.name,
            seed,
            success: true,
            isBase64: isImageDataUrl(result),
            quality: "ai-generated",
          })
        } catch {
          continue
        }
      }
    }

    for (const provider of URL_PROVIDERS) {
      try {
        const url = provider.generate(enhancedPrompt, w, h, seed) as string

        if (provider.name.startsWith("pollinations")) {
          return Response.json({
            url,
            provider: "Reborn AI",
            providerSource: provider.name,
            seed,
            success: true,
            quality: "ai-generated",
          })
        }

        const valid = await verifyImageUrl(url)
        if (!valid) continue

        return Response.json({
          url,
          provider: "Reborn AI",
          providerSource: provider.name,
          seed,
          success: true,
          quality: "ai-generated",
        })
      } catch {
        continue
      }
    }

    for (const provider of FALLBACK_PROVIDERS) {
      try {
        const url = provider.generate(prompt, w, h, seed)
        const valid = await verifyImageUrl(url, 4000)
        if (!valid) continue

        return Response.json({
          url,
          provider: "Reborn AI",
          providerSource: provider.name,
          seed,
          success: true,
          quality: "stock",
          note: "Imagem de stock utilizada como alternativa",
        })
      } catch {
        continue
      }
    }

    const fallbackUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=${w}&height=${h}&nologo=true&seed=${seed + 1}`

    return Response.json({
      url: fallbackUrl,
      provider: "Reborn AI",
      providerSource: "pollinations-fallback",
      seed,
      success: true,
      quality: "ai-generated",
      fallback: true,
    })
  } catch (error: any) {
    console.error("Image generation error:", error)
    return Response.json({
      error: error?.message || "Falha ao gerar imagem",
      code: "GENERATION_ERROR",
    }, { status: 500 })
  }
}
