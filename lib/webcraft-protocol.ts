export type WebcraftStats = {
  count: number
  generated: number
  curated: number
  dropped: number
  mode: string
  model: string
}

export const WEBCRAFT_STREAM_TYPE = "application/x-ndjson"

export function webcraftStats(headers: Headers): WebcraftStats {
  return {
    count: Math.max(0, Number(headers.get("X-Lumin-Context-Images") || 0)),
    generated: Math.max(0, Number(headers.get("X-Lumin-Generated-Images") || 0)),
    curated: Math.max(0, Number(headers.get("X-Lumin-Curated-Images") || 0)),
    dropped: Math.max(0, Number(headers.get("X-Lumin-Image-Size-Drops") || 0)),
    mode: headers.get("X-Lumin-AI-Mode") || "full",
    model: headers.get("X-Lumin-AI-Model") || "LUMIN",
  }
}

export async function readWebcraftResponse(response: Response, onProgress: (message: string) => void) {
  if (!response.ok) {
    const data = await response.json().catch(() => null)
    throw new Error(data?.error || ([502, 504].includes(response.status)
      ? "A geração demorou demasiado e a ligação foi interrompida. Tenta novamente com um pedido mais curto."
      : "Não foi possível gerar o projeto. Tenta novamente."))
  }
  if (!response.body) throw new Error("O WebCraft devolveu uma resposta vazia.")
  if (!response.headers.get("Content-Type")?.includes(WEBCRAFT_STREAM_TYPE)) {
    const html = (await response.text()).replace(/^```html?\n?/i, "").replace(/\n?```$/i, "")
    if (!html.trim()) throw new Error("O WebCraft devolveu uma resposta vazia.")
    return { html, stats: webcraftStats(response.headers) }
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let pending = ""
  let result: { html: string; stats: WebcraftStats } | null = null
  function consume(line: string) {
    if (!line.trim()) return
    const event = JSON.parse(line)
    if (event.type === "error") throw new Error(event.message || "Não foi possível concluir o projeto.")
    if (event.type === "progress" && typeof event.message === "string") onProgress(event.message)
    if (event.type === "complete" && typeof event.html === "string" && event.html.trim()) {
      result = { html: event.html, stats: event.stats }
    }
  }
  try {
    while (true) {
      const { done, value } = await reader.read()
      pending += done ? decoder.decode() : decoder.decode(value, { stream: true })
      let newline: number
      while ((newline = pending.indexOf("\n")) !== -1) {
        consume(pending.slice(0, newline))
        pending = pending.slice(newline + 1)
      }
      if (done) break
    }
    consume(pending)
    if (!result) throw new Error("A ligação terminou antes de o projeto ficar pronto. Tenta novamente.")
    return result as { html: string; stats: WebcraftStats }
  } finally {
    await reader.cancel().catch(() => {})
    reader.releaseLock()
  }
}
