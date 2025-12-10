export const maxDuration = 60

export async function POST(req: Request) {
  try {
    const { prompt } = await req.json()

    if (!prompt) {
      return Response.json({ error: "Prompt não fornecido" }, { status: 400 })
    }

    const seed = Math.floor(Math.random() * 1000000)
    const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1024&height=1024&nologo=true&seed=${seed}`

    return Response.json({
      url: imageUrl,
      imageUrl: imageUrl,
      directUrl: imageUrl,
      success: true,
    })
  } catch (error: any) {
    console.error("Image generation error:", error)
    return Response.json({ error: error?.message || "Falha ao gerar imagem" }, { status: 500 })
  }
}
