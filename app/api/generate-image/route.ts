export const maxDuration = 60

// =============================================================================
// FREE IMAGE GENERATION PROVIDERS — No API keys required
// Multiple fallbacks ensure images always generate even if one provider fails
// =============================================================================

interface ImageProvider {
  name: string
  priority: number
  generate: (prompt: string, w: number, h: number, seed: number) => string | Promise<string | null>
  isAsync?: boolean
}

// URL-based providers (instant, no API calls)
const URL_PROVIDERS: ImageProvider[] = [
  // Pollinations.ai — Primary, supports multiple models
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
  // GetImg.ai free tier — Stable Diffusion
  {
    name: "getimg-free",
    priority: 4,
    generate: (prompt, w, h, seed) =>
      `https://api.getimg.ai/v1/stable-diffusion/text-to-image?prompt=${encodeURIComponent(prompt)}&width=${Math.min(w, 512)}&height=${Math.min(h, 512)}&seed=${seed}`,
  },
  // Lexica.art — Search-based (finds similar AI images)
  {
    name: "lexica",
    priority: 5,
    generate: (prompt, _w, _h, _seed) =>
      `https://lexica.art/api/v1/search?q=${encodeURIComponent(prompt)}`,
  },
]

// API-based providers (async, may have rate limits)
const API_PROVIDERS = [
  // Craiyon (DALL-E Mini) — Completely free, no API key
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
        
        if (data.images && data.images.length > 0) {
          // Craiyon returns base64 WebP images
          return `data:image/webp;base64,${data.images[0]}`
        }
        return null
      } catch {
        return null
      }
    },
  },
  // Prodia Free Tier — Very fast, SDXL
  {
    name: "prodia-free",
    priority: 11,
    generate: async (prompt: string, w: number, h: number): Promise<string | null> => {
      try {
        // Prodia has a free demo endpoint
        const response = await fetch("https://api.prodia.com/v1/sdxl/generate", {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "Accept": "application/json",
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
  // DeepAI — Free tier available
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

// Reliable fallback providers (always work)
const FALLBACK_PROVIDERS = [
  // Picsum — High quality stock photos (not AI but reliable)
  {
    name: "picsum",
    generate: (_prompt: string, w: number, h: number, seed: number) =>
      `https://picsum.photos/seed/${seed}/${w}/${h}`,
  },
  // LoremFlickr — Category-based stock photos
  {
    name: "loremflickr", 
    generate: (prompt: string, w: number, h: number, _seed: number) => {
      const keywords = prompt.split(" ").slice(0, 3).join(",")
      return `https://loremflickr.com/${w}/${h}/${encodeURIComponent(keywords)}`
    },
  },
  // PlaceImg alternative
  {
    name: "placeholder",
    generate: (_prompt: string, w: number, h: number, seed: number) =>
      `https://placehold.co/${w}x${h}/1a1a2e/eaeaea?text=Reborn+AI&font=roboto`,
  },
]

async function verifyImageUrl(url: string, timeout = 5000): Promise<boolean> {
  try {
    const response = await fetch(url, {
      method: "HEAD",
      signal: AbortSignal.timeout(timeout),
    })
    return response.ok || response.status === 302 || response.status === 301
  } catch {
    return false
  }
}

export async function POST(req: Request) {
  try {
    const { prompt, width = 1024, height = 1024, model = "flux", quality = "standard" } = await req.json()

    if (!prompt || typeof prompt !== "string") {
      return Response.json({ error: "Prompt nao fornecido" }, { status: 400 })
    }

    const seed = Math.floor(Math.random() * 9999999)
    const w = Math.min(Math.max(Number(width) || 1024, 256), 1536)
    const h = Math.min(Math.max(Number(height) || 1024, 256), 1536)

    // Enhanced prompt for better results
    const enhancedPrompt = quality === "hd" 
      ? `${prompt}, high quality, detailed, professional, 4k, sharp focus`
      : prompt

    // Strategy 1: Try API providers first (higher quality but may fail)
    if (quality !== "fast") {
      for (const provider of API_PROVIDERS) {
        try {
          const result = await provider.generate(enhancedPrompt, w, h)
          if (result) {
            return Response.json({
              url: result,
              provider: "Reborn AI",
              seed,
              success: true,
              isBase64: result.startsWith("data:"),
              quality: "ai-generated",
            })
          }
        } catch {
          continue
        }
      }
    }

    // Strategy 2: Try URL-based providers
    for (const provider of URL_PROVIDERS) {
      try {
        const url = provider.generate(enhancedPrompt, w, h, seed) as string
        
        // Skip verification for Pollinations (they generate on-demand)
        if (provider.name.startsWith("pollinations")) {
          return Response.json({
            url,
            provider: "Reborn AI",
            seed,
            success: true,
            quality: "ai-generated",
          })
        }

        // Verify other URLs
        const isValid = await verifyImageUrl(url)
        if (isValid) {
          return Response.json({
            url,
            provider: "Reborn AI", 
            seed,
            success: true,
          })
        }
      } catch {
        continue
      }
    }

    // Strategy 3: Fallback to reliable stock photo providers
    for (const provider of FALLBACK_PROVIDERS) {
      try {
        const url = provider.generate(prompt, w, h, seed)
        const isValid = await verifyImageUrl(url, 3000)
        if (isValid) {
          return Response.json({
            url,
            provider: "Reborn AI",
            seed,
            success: true,
            quality: "stock",
            note: "Imagem de stock utilizada como alternativa",
          })
        }
      } catch {
        continue
      }
    }

    // Ultimate fallback: Return Pollinations URL without verification
    const fallbackUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=${w}&height=${h}&nologo=true&seed=${seed + 1}`
    
    return Response.json({ 
      url: fallbackUrl, 
      provider: "Reborn AI", 
      seed,
      success: true,
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
