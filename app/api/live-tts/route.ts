export const runtime = "nodejs"
export const maxDuration = 60

const MAX_TEXT = 1200
const GATEWAY_SPEECH_MODEL = process.env.REBORN_TTS_MODEL || "openai/tts-1"
const GATEWAY_VOICE = process.env.REBORN_TTS_VOICE || "onyx"

async function gatewayTts(text: string, speed: number) {
  const token = process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN
  if (!token) return null

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 12000)

  try {
    const response = await fetch("https://ai-gateway.vercel.sh/v4/ai/speech-model", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "ai-model-id": GATEWAY_SPEECH_MODEL,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text,
        voice: GATEWAY_VOICE,
        outputFormat: "mp3",
        speed,
        language: "pt-PT",
      }),
      signal: controller.signal,
    })

    if (!response.ok) {
      const detail = await response.text().catch(() => "")
      console.error("[reborn] AI Gateway TTS error", response.status, detail.slice(0, 300))
      return null
    }

    const result = await response.json().catch(() => null)
    if (!result?.audio || typeof result.audio !== "string") return null

    return {
      audio: Buffer.from(result.audio, "base64"),
      contentType: "audio/mpeg",
      provider: "vercel-ai-gateway",
      model: GATEWAY_SPEECH_MODEL,
      voice: GATEWAY_VOICE,
    }
  } catch (error) {
    console.warn("[reborn] AI Gateway TTS unavailable", error)
    return null
  } finally {
    clearTimeout(timeout)
  }
}

async function elevenLabsTts(text: string, speed: number) {
  const apiKey = process.env.ELEVENLABS_API_KEY
  const voiceId = process.env.ELEVENLABS_VOICE_ID
  if (!apiKey || !voiceId) return null

  const modelId = process.env.ELEVENLABS_MODEL_ID || "eleven_multilingual_v2"
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 12000)

  try {
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
      signal: controller.signal,
    })

    if (!response.ok) {
      const detail = await response.text().catch(() => "")
      console.error("[reborn] ElevenLabs TTS provider error", response.status, detail.slice(0, 300))
      return null
    }

    return {
      audio: Buffer.from(await response.arrayBuffer()),
      contentType: response.headers.get("content-type") || "audio/mpeg",
      provider: "elevenlabs",
    }
  } catch (error) {
    console.warn("[reborn] ElevenLabs TTS unavailable", error)
    return null
  } finally {
    clearTimeout(timeout)
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const text = typeof body?.text === "string" ? body.text.trim().slice(0, MAX_TEXT) : ""
    const speed = Math.min(1.2, Math.max(0.75, Number(body?.speed) || 1))

    if (!text) {
      return Response.json({ available: false, error: "Texto em falta" }, { status: 400 })
    }

    const gateway = await gatewayTts(text, speed)
    if (gateway) {
      return new Response(gateway.audio, {
        status: 200,
        headers: {
          "Content-Type": gateway.contentType,
          "Cache-Control": "no-store",
          "X-Reborn-TTS": gateway.provider,
          "X-Reborn-TTS-Model": gateway.model,
          "X-Reborn-TTS-Voice": gateway.voice,
        },
      })
    }

    const eleven = await elevenLabsTts(text, speed)
    if (eleven) {
      return new Response(eleven.audio, {
        status: 200,
        headers: {
          "Content-Type": eleven.contentType,
          "Cache-Control": "no-store",
          "X-Reborn-TTS": eleven.provider,
        },
      })
    }

    return Response.json(
      { available: false, provider: "browser", reason: "Neural providers unavailable" },
      { status: 503 },
    )
  } catch (error) {
    console.error("[reborn] Live TTS error", error)
    return Response.json({ available: false, provider: "browser" }, { status: 503 })
  }
}
