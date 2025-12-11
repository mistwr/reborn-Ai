import { generateText } from "ai"

export async function POST(request: Request) {
  try {
    const { prompt, style } = await request.json()

    const systemPrompt = `You are an expert web developer. Generate a complete, modern, responsive HTML website based on the user's request.
    
Style preference: ${style || "modern"}

Requirements:
- Generate ONLY valid HTML with embedded CSS and JavaScript
- Use modern CSS (flexbox, grid, animations)
- Make it fully responsive
- Include beautiful gradients and shadows
- Use Google Fonts
- Add smooth animations and hover effects
- Include meta tags for SEO
- Make it visually stunning and professional
- Do NOT include any markdown, explanations, or code blocks - ONLY pure HTML

Return ONLY the HTML code starting with <!DOCTYPE html> and ending with </html>`

    const { text } = await generateText({
      model: "anthropic/claude-sonnet-4-20250514",
      system: systemPrompt,
      prompt: prompt,
      maxTokens: 8000,
    })

    // Clean the response
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
    html = html.trim()

    return Response.json({ html })
  } catch (error) {
    console.error("Generate website error:", error)
    return Response.json({ error: "Failed to generate website" }, { status: 500 })
  }
}
