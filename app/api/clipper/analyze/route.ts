import { generateText } from "ai"

export async function POST(request: Request) {
  try {
    const { transcript } = await request.json()

    const { text } = await generateText({
      model: "anthropic/claude-sonnet-4-20250514",
      system: `You are an expert video editor. Analyze the transcript and identify the most engaging, viral-worthy clips.

For each clip, provide:
1. Start time (in seconds)
2. End time (in seconds)
3. The text content
4. A score from 1-10 for viral potential
5. A brief reason why this clip would perform well

Focus on:
- Emotional moments
- Surprising statements
- Quotable phrases
- Actionable advice
- Controversial opinions
- Funny moments

Return JSON array format:
[{"start": 0, "end": 30, "text": "...", "score": 9, "reason": "..."}]`,
      prompt: `Analyze this transcript and find the best clips:\n\n${transcript}`,
    })

    const clips = JSON.parse(text)
    return Response.json({ clips })
  } catch (error) {
    console.error("Analyze error:", error)
    return Response.json({ error: "Failed to analyze" }, { status: 500 })
  }
}
