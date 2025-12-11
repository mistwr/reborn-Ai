import { generateText } from "ai"

export async function POST(request: Request) {
  try {
    const { topic, slides, style } = await request.json()

    const systemPrompt = `You are an expert presentation designer. Generate a complete presentation in HTML format.

Topic: ${topic}
Number of slides: ${slides || 10}
Style: ${style || "professional"}

Requirements:
- Generate a complete HTML presentation with multiple slides
- Each slide should have a title and content
- Use CSS for beautiful slide layouts
- Include transitions between slides
- Add navigation controls (previous/next)
- Make slides visually appealing with gradients, icons
- Include speaker notes as hidden elements
- Return ONLY valid HTML starting with <!DOCTYPE html>`

    const { text } = await generateText({
      model: "anthropic/claude-sonnet-4-20250514",
      system: systemPrompt,
      prompt: `Create a presentation about: ${topic}`,
      maxTokens: 12000,
    })

    let html = text.trim()
    if (html.startsWith("```html")) {
      html = html.slice(7)
    }
    if (html.startsWith("```")) {
      html = html.slice(3)
    }
    if (html.endsWith("```")) {
      html = html.slice(0, -3)
    }

    return Response.json({ html })
  } catch (error) {
    console.error("Generate presentation error:", error)
    return Response.json({ error: "Failed to generate presentation" }, { status: 500 })
  }
}
