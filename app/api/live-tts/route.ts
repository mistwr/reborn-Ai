export const runtime = "nodejs"
export const maxDuration = 60

const MAX_TEXT = 1200
const EDGE_VOICE = process.env.REBORN_EDGE_TTS_VOICE || "pt-PT-DuarteNeural"

function cleanForSsml(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&apos;")
}

async function edgeTts(text: string, speed: number) {
  const { MsEdgeTTS, OUTPUT_FORMAT } = await import("msedge-tts")
  const tts = new MsEdgeTTS()
  await tts.setMetadata(EDGE_VOICE, OUTPUT_FORMAT.WEBM_24KHZ_16BIT_MONO_OPUS)

  const { audioStream } = tts.toStream(cleanForSsml(text), { rate: speed })
  const chunks: Buffer[] = []

  await new Promise<void>((resolve, reject) => {
    audioStream.on("data", (chunk: Buffer | Uint8Array) => chunks.push(Buffer.from(chunk)))
    audioStream.on("end", resolve)
    audioStream.on("close", resolve)
    audioStream.on("error", reject)
  })

  if (!chunks.length) throw new Error("Edge TTS returned no audio")
  return Buffer.concat(chunks)
}

async function elevenLabsTts(text: string, speed: number) {
  const apiKey = process.env.ELEVENLABS_API_KEY
  const voiceId = process.env.ELEVENLABS_VOICE_ID
  if (!apiKey || !voiceId) return null

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
    console.error("[reborn] ElevenLabs TTS provider error", response.status, detail.slice(0, 300))
    return null
  }

  return {
    audio: Buffer.from(await response.arrayBuffer()),
    contentType: response.headers.get("content-type") || "audio/mpeg",
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

    try {
      const audio = await edgeTts(text, speed)
      return new Response(audio, {
        status: 200,
        headers: {
          "Content-Type": "audio/webm; codecs=opus",
          "Cache-Control": "no-store",
          "X-Reborn-TTS": "edge-neural",
          "X-Reborn-TTS-Voice": EDGE_VOICE,
        },
      })
    } catch (error) {
      console.warn("[reborn] Edge neural TTS unavailable, trying next provider", error)
    }

    const eleven = await elevenLabsTts(text, speed)
    if (eleven) {
      return new Response(eleven.audio, {
        status: 200,
        headers: {
          "Content-Type": eleven.contentType,
          "Cache-Control": "no-store",
          "X-Reborn-TTS": "elevenlabs",
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
