export async function POST(request: Request) {
  try {
    const { prompt } = await request.json()

    // Using Hugging Face for image generation
    const response = await fetch(
      "https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-xl-base-1.0",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ inputs: prompt }),
      },
    )

    if (!response.ok) {
      throw new Error("Image generation failed")
    }

    const blob = await response.blob()
    const arrayBuffer = await blob.arrayBuffer()
    const base64 = Buffer.from(arrayBuffer).toString("base64")
    const imageUrl = `data:image/png;base64,${base64}`

    return Response.json({ imageUrl })
  } catch (error) {
    console.error("Image generation error:", error)
    return Response.json({ error: "Failed to generate image" }, { status: 500 })
  }
}
