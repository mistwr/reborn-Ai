export const maxDuration = 60

// Free image generation providers — tried in order, first success wins
const PROVIDERS = [
  {
    name: "pollinations-flux",
    generate: (prompt: string, w: number, h: number, seed: number) =>
      `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=${w}&height=${h}&model=flux&nologo=true&seed=${seed}`,
    type: "url" as const,
  },
  {
    name: "pollinations-turbo",
    generate: (prompt: string, w: number, h: number, seed: number) =>
      `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=${w}&height=${h}&model=turbo&nologo=true&seed=${seed}`,
    type: "url" as const,
  },
  {
    name: "pollinations-default",
    generate: (prompt: string, w: number, h: number, seed: number) =>
      `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=${w}&height=${h}&nologo=true&seed=${seed}`,
    type: "url" as const,
  },
]

export async function POST(req: Request) {
  try {
    const { prompt, width = 1024, height = 1024, model = "flux" } = await req.json()

    if (!prompt) {
      return Response.json({ error: "Prompt não fornecido" }, { status: 400 })
    }

    const seed = Math.floor(Math.random() * 9999999)

    // Try providers in order
    for (const provider of PROVIDERS) {
      try {
        const url = provider.generate(prompt, width, height, seed)

        // Verify the URL is reachable (HEAD request with timeout)
        const check = await fetch(url, {
          method: "HEAD",
          signal: AbortSignal.timeout(8000),
        })

        if (check.ok || check.status === 200) {
          return Response.json({
            url,
            provider: "Reborn AI",
            seed,
            success: true,
          })
        }
      } catch {
        // Try next provider
        continue
      }
    }

    // Fallback: return Pollinations URL directly without verification
    const seed2 = Math.floor(Math.random() * 9999999)
    const fallbackUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=${width}&height=${height}&nologo=true&seed=${seed2}`
    return Response.json({ url: fallbackUrl, provider: "Reborn AI", seed: seed2, success: true })
  } catch (error: any) {
    console.error("Image generation error:", error)
    return Response.json({ error: error?.message || "Falha ao gerar imagem" }, { status: 500 })
  }
}
