import { POST as ttsPost } from "@/app/api/live-tts/route"

export const maxDuration = 60

export async function GET() {
  const req = new Request("http://local/api/live-tts", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ text: "Olá. Eu sou o Reborn AI e agora falo contigo em português de Portugal.", speed: 1 }),
  })

  const res = await ttsPost(req)
  const type = res.headers.get("content-type") || ""
  const provider = res.headers.get("x-reborn-tts") || ""
  const body = await res.arrayBuffer()

  return Response.json({
    ok: res.ok,
    status: res.status,
    contentType: type,
    provider,
    bytes: body.byteLength,
    looksLikeAudio: type.startsWith("audio/") && body.byteLength > 1000,
  })
}
