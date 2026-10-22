import { WEBCRAFT_STREAM_TYPE, webcraftStats } from "./webcraft-protocol"

export function webcraftTimeoutSignal(milliseconds: number, parent?: AbortSignal) {
  const signals = AbortSignal as typeof AbortSignal & { any(signals: AbortSignal[]): AbortSignal }
  const timeout = AbortSignal.timeout(milliseconds)
  return parent ? signals.any([parent, timeout]) : timeout
}

// Start the response before visual planning or generation. Netlify's edge
// middleware otherwise times out while waiting for the buffered HTML headers.
export function streamWebcraft(
  requestSignal: AbortSignal,
  generate: (signal: AbortSignal, progress: (message: string) => void) => Promise<Response>,
) {
  const controller = new AbortController()
  let stopped = false
  let cleanup = () => {}
  const body = new ReadableStream<Uint8Array>({
    start(output) {
      const encoder = new TextEncoder()
      let message = "A preparar o teu projeto…"
      const send = (event: object) => {
        if (!stopped) output.enqueue(encoder.encode(JSON.stringify(event) + "\n"))
      }
      const finish = () => {
        if (stopped) return
        stopped = true
        cleanup()
        output.close()
      }
      const disconnect = () => { controller.abort(); finish() }
      const heartbeat = setInterval(() => send({ type: "progress", message }), 4000)
      // Leave time to flush the terminal event before Netlify's 60s function cap.
      const deadline = setTimeout(() => {
        controller.abort(new DOMException("WebCraft deadline exceeded", "TimeoutError"))
        send({ type: "error", code: "GENERATION_TIMEOUT", message: "A geração demorou demasiado. Tenta um pedido mais curto ou reduz o número de imagens." })
        finish()
      }, 54_000)
      cleanup = () => {
        clearInterval(heartbeat)
        clearTimeout(deadline)
        requestSignal.removeEventListener("abort", disconnect)
      }
      requestSignal.addEventListener("abort", disconnect, { once: true })
      if (requestSignal.aborted) { disconnect(); return }
      send({ type: "progress", message })
      void generate(controller.signal, next => {
        message = next
        send({ type: "progress", message })
      }).then(async response => {
        if (stopped) return
        if (!response.ok) {
          const data = await response.json().catch(() => null)
          send({ type: "error", code: "GENERATION_FAILED", message: data?.error || "Não foi possível concluir o projeto." })
        } else {
          send({ type: "complete", html: await response.text(), stats: webcraftStats(response.headers) })
        }
        finish()
      }).catch(error => {
        send({ type: "error", code: "GENERATION_FAILED", message: error?.message || "Não foi possível concluir o projeto." })
        finish()
      })
    },
    cancel() { stopped = true; controller.abort(); cleanup() },
  })
  return new Response(body, {
    headers: { "Content-Type": `${WEBCRAFT_STREAM_TYPE}; charset=utf-8`, "Cache-Control": "no-store, no-transform", "X-Accel-Buffering": "no" },
  })
}
