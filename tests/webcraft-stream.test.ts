import test from "node:test"
import assert from "node:assert/strict"
import { readWebcraftResponse, WEBCRAFT_STREAM_TYPE } from "../lib/webcraft-protocol"
import { streamWebcraft } from "../lib/webcraft-stream"

test("a project taking longer than the observed 30s header timeout keeps delivering progress", async t => {
  t.mock.timers.enable({ apis: ["setInterval", "setTimeout"] })
  let release!: () => void
  const pending = new Promise<void>(resolve => { release = resolve })
  const response = streamWebcraft(new AbortController().signal, async () => {
    await pending
    return new Response("<!doctype html><html><body>Pronto</body></html>")
  })
  const progress: string[] = []
  const result = readWebcraftResponse(response, message => progress.push(message))
  t.mock.timers.tick(31_000)
  release()
  assert.match((await result).html, /Pronto/)
  assert.ok(progress.length >= 2)
})

test("a generation that exceeds the total budget stops the AI and returns a readable error", async t => {
  t.mock.timers.enable({ apis: ["setInterval", "setTimeout"] })
  let generationSignal: AbortSignal | undefined
  const response = streamWebcraft(new AbortController().signal, signal => {
    generationSignal = signal
    return new Promise((_, reject) => signal.addEventListener("abort", () => reject(signal.reason), { once: true }))
  })
  const result = readWebcraftResponse(response, () => {})
  const rejected = assert.rejects(result, /geração demorou demasiado/i)
  t.mock.timers.tick(54_000)
  await rejected
  assert.equal(generationSignal?.aborted, true)
})

test("closing the browser response cancels pending AI work", async () => {
  let generationSignal: AbortSignal | undefined
  const response = streamWebcraft(new AbortController().signal, signal => {
    generationSignal = signal
    return new Promise((_, reject) => signal.addEventListener("abort", () => reject(signal.reason), { once: true }))
  })
  const reader = response.body!.getReader()
  await reader.read()
  await reader.cancel()
  assert.equal(generationSignal?.aborted, true)
})

test("stream parser preserves Portuguese and HTML when events are split across network packets", async () => {
  const html = '<!doctype html><html><body><h1>Olá, criação</h1><script>console.log("ok")</script></body></html>'
  const bytes = new TextEncoder().encode(JSON.stringify({ type: "complete", html, stats: { count: 0, generated: 0, curated: 0, dropped: 0, mode: "full", model: "test" } }) + "\n")
  const response = new Response(new ReadableStream({ start(controller) {
    for (let index = 0; index < bytes.length; index++) controller.enqueue(bytes.slice(index, index + 1))
    controller.close()
  } }), { headers: { "Content-Type": WEBCRAFT_STREAM_TYPE } })
  assert.equal((await readWebcraftResponse(response, () => {})).html, html)
})

test("an interrupted stream cannot become a successfully saved project", async () => {
  const response = new Response('{"type":"progress","message":"A construir…"}\n', { headers: { "Content-Type": WEBCRAFT_STREAM_TYPE } })
  await assert.rejects(readWebcraftResponse(response, () => {}), /antes de o projeto ficar pronto/)
})

test("plain HTML from a platform timeout becomes a useful error message", async () => {
  const response = new Response("<html>Gateway timeout</html>", { status: 504, headers: { "Content-Type": "text/html" } })
  await assert.rejects(readWebcraftResponse(response, () => {}), /geração demorou demasiado/i)
})
