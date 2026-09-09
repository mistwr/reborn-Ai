export const maxDuration = 60

const MAX_TEXT = 1200

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const text = typeof body?.text === "string" ? body.text.trim().slice(0, MAX_TEXT) : ""
    const speed = Math.min(1.2, Math.max(0.75, Number(body?.speed) || 1))

    if (!text) {
      return Response.json({ available: false, error: "Texto em falta" }, { status: 400 })
    }

    const apiKey = process.env.ELEVENLABS_API_KEY
    const voiceId = process.env.ELEVENLABS_VOICE_ID

    if (!apiKey || !voiceId) {
      return Response.json(
        { available: false, provider: "browser", reason: "Neural TTS not configured" },
        { status: 503 },
      )
    }

    const modelId = process.env.ELEVENLABS_MODEL_ID || "eleven_multilingual_v2"
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
        "xi-api-key": apiKey,
      },
      body: JSON.stringify({
        text,
        model_id: modelId,
        voice_settings: {
          stability: 0.48,
          similarity_boost: 0.78,
          style: 0.22,
          use_speaker_boost: true,
        },
        ...(speed !== 1 ? { speed } : {}),
      }),
    })

    if (!response.ok) {
      const detail = await response.text().catch(() => "")
      console.error("[reborn] Neural TTS provider error", response.status, detail.slice(0, 300))
      return Response.json(
        { available: false, provider: "browser", reason: "Neural provider unavailable" },
        { status: 503 },
      )
    }

    const audio = await response.arrayBuffer()
    return new Response(audio, {
      status: 200,
      headers: {
        "Content-Type": response.headers.get("content-type") || "audio/mpeg",
        "Cache-Control": "no-store",
        "X-Reborn-TTS": "neural",
      },
    })
  } catch (error: any) {
    console.error("[reborn] Live TTS error", error)
    return Response.json({ available: false, provider: "browser" }, { status: 503 })
  }
}
