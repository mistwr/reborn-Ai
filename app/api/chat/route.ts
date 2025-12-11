import { generateText } from "ai"

export async function POST(request: Request) {
  try {
    const { messages } = await request.json()

    const formattedMessages = messages.map((m: { role: string; content: string }) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }))

    const { text } = await generateText({
      model: "anthropic/claude-sonnet-4-20250514",
      system: "You are a helpful AI assistant. Respond in Portuguese if the user writes in Portuguese.",
      messages: formattedMessages,
    })

    return Response.json({ message: text })
  } catch (error) {
    console.error("Chat error:", error)
    return Response.json({ error: "Failed to generate response" }, { status: 500 })
  }
}
