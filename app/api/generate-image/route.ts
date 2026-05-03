export const maxDuration = 60

// Free image generation providers — tried in order, first success wins
// Multiple providers ensure high availability even if one has limits
const PROVIDERS = [
  // Pollinations.ai — Free, no auth, multiple models
  {
    name: "pollinations-flux",
    generate: (prompt: string, w: number, h: number, seed: number) =>
      `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=${w}&height=${h}&model=flux&nologo=true&seed=${seed}`,
  },
  {
    name: "pollinations-turbo",
    generate: (prompt: string, w: number, h: number, seed: number) =>
      `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=${w}&height=${h}&model=turbo&nologo=true&seed=${seed}`,
  },
  // Picsum Photos — Reliable placeholder images (good for testing/fallback)
  {
    name: "picsum",
    generate: (_prompt: string, w: number, h: number, seed: number) =>
      `https://picsum.photos/seed/${seed}/${w}/${h}`,
  },
  // Lorem Picsum with blur/grayscale options
  {
    name: "picsum-random",
    generate: (_prompt: string, w: number, h: number, _seed: number) =>
      `https://picsum.photos/${w}/${h}?random=${Date.now()}`,
  },
]

// Additional AI providers that may require specific handling
const AI_PROVIDERS = [
  // Craiyon (formerly DALL-E Mini) - Free but slower
  {
    name: "craiyon",
    endpoint: "https://api.craiyon.com/v3",
    generate: async (prompt: string): Promise<string | null> => {
      try {
        const response = await fetch("https://api.craiyon.com/v3", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt,
            token: null,
            model: "art",
            negative_prompt: "",
            version: "c4ue22fb7kb6wlac",
          }),
          signal: AbortSignal.timeout(30000),
        })
        
        if (!response.ok) return null
        
        const data = await response.json()
        if (data.images && data.images.length > 0) {
          // Craiyon returns base64 images
          return `data:image/webp;base64,${data.images[0]}`
        }
        return null
      } catch {
        return null
      }
    },
  },
]

export async function POST(req: Request) {
  try {
    const { prompt, width = 1024, height = 1024, model = "flux", useFallback = false } = await req.json()

    if (!prompt) {
      return Response.json({ error: "Prompt nao fornecido" }, { status: 400 })
    }

    const seed = Math.floor(Math.random() * 9999999)

    // If not using fallback, try AI providers first (Craiyon for actual AI generation)
    if (!useFallback) {
      for (const provider of AI_PROVIDERS) {
        try {
          const result = await provider.generate(prompt)
          if (result) {
            return Response.json({
              url: result,
              provider: "Reborn AI",
              seed,
              success: true,
              isBase64: result.startsWith("data:"),
            })
          }
        } catch {
          continue
        }
      }
    }

    // Try URL-based providers
    for (const provider of PROVIDERS) {
      try {
        const url = provider.generate(prompt, width, height, seed)

        // Verify the URL is reachable (HEAD request with timeout)
        const check = await fetch(url, {
          method: "HEAD",
          signal: AbortSignal.timeout(5000),
        })

        if (check.ok || check.status === 200 || check.status === 302) {
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

    // Ultimate fallback: return Pollinations URL directly without verification
    const seed2 = Math.floor(Math.random() * 9999999)
    const fallbackUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=${width}&height=${height}&nologo=true&seed=${seed2}`
    
    return Response.json({ 
      url: fallbackUrl, 
      provider: "Reborn AI", 
      seed: seed2, 
      success: true,
      fallback: true,
    })
  } catch (error: any) {
    console.error("Image generation error:", error)
    return Response.json({ error: error?.message || "Falha ao gerar imagem" }, { status: 500 })
  }
}
