import { generateText } from "ai"

export async function POST(request: Request) {
  try {
    const { topic, chapters, style } = await request.json()

    const systemPrompt = `You are an expert author and content creator. Generate a complete ebook in HTML format.

Topic: ${topic}
Number of chapters: ${chapters || 5}
Style: ${style || "informative"}

Requirements:
- Generate a complete ebook with introduction, chapters, and conclusion
- Each chapter should have substantial content (at least 500 words)
- Include a table of contents
- Use proper HTML structure with headings, paragraphs, lists
- Add CSS for beautiful typography and print-friendly layout
- Include page breaks between chapters
- Make it professional and engaging
- Return ONLY valid HTML starting with <!DOCTYPE html>`

    const { text } = await generateText({
      model: "anthropic/claude-sonnet-4-20250514",
      system: systemPrompt,
      prompt: `Create an ebook about: ${topic}`,
      maxTokens: 16000,
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
    console.error("Generate ebook error:", error)
    return Response.json({ error: "Failed to generate ebook" }, { status: 500 })
  }
}
