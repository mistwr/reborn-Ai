import test from "node:test"
import assert from "node:assert/strict"
import { generateLuminText, streamText } from "../lib/lumin-ai-runtime"
import { getLuminOrigin } from "../lib/stripe/config"
import { GET as publishStatus, POST as publish } from "../app/api/webcraft-v2/publish/route"
import { POST as live } from "../app/api/live/route"
import { POST as webcraft } from "../app/api/webcraft-v2/route"

const originalFetch = globalThis.fetch
const originalEnv = { ...process.env }

function jsonResponse(data: unknown) {
  return new Response(JSON.stringify(data), { headers: { "Content-Type": "application/json" } })
}

test.afterEach(() => {
  globalThis.fetch = originalFetch
  for (const key of Object.keys(process.env)) if (!(key in originalEnv)) delete process.env[key]
  Object.assign(process.env, originalEnv)
})

function isolateProviders() {
  for (const key of ["AI_GATEWAY_API_KEY", "VERCEL_OIDC_TOKEN", "OPENAI_API_KEY", "OPENAI_BASE_URL", "GOOGLE_GENERATIVE_AI_API_KEY", "GEMINI_API_KEY", "HUGGINGFACE_API_KEY"]) delete process.env[key]
  process.env.AI_PROVIDER = "openai"
}

test("Netlify's OpenAI credentials use their configured endpoint without contacting Vercel", async () => {
  isolateProviders()
  process.env.OPENAI_API_KEY = "test-key-only"
  process.env.OPENAI_BASE_URL = "https://gateway.example.invalid/v1"
  const requests: string[] = []
  globalThis.fetch = async (input, init) => {
    const url = String(input instanceof Request ? input.url : input)
    requests.push(url)
    if (!url.startsWith("https://gateway.example.invalid/v1/")) throw new Error("Unexpected provider endpoint")
    return jsonResponse({ id: "resp_test", object: "response", output: [{ type: "message", role: "assistant", content: [{ type: "output_text", text: "Olá, Miguel.", annotations: [] }] }] })
  }
  const result = await generateLuminText({ system: "Respond briefly.", prompt: "Olá", models: ["openai/gpt-5.6-luna"], retryRounds: 1 })
  assert.equal(result.text, "Olá, Miguel.")
  assert.equal(requests.length, 1)
  assert.ok(requests.every(url => !url.includes("vercel")))
})

test("Live camera frames reach the direct Gemini provider", async () => {
  isolateProviders()
  process.env.AI_PROVIDER = "google"
  process.env.GOOGLE_GENERATIVE_AI_API_KEY = "test-key-only"
  const requests: Array<{ url: string; body: any }> = []
  globalThis.fetch = async (input, init) => {
    const url = String(input instanceof Request ? input.url : input)
    const body = JSON.parse(String(init?.body || "{}"))
    requests.push({ url, body })
    if (!url.includes("generativelanguage.googleapis.com")) throw new Error("Unexpected provider endpoint")
    return jsonResponse({ candidates: [{ content: { role: "model", parts: [{ text: "Vejo a imagem enviada." }] }, finishReason: "STOP" }] })
  }
  const result = await generateLuminText({ system: "Describe the real image.", messages: [{ role: "user", content: [{ type: "text", text: "O que vês?" }, { type: "image", image: "data:image/png;base64,AQID" }] }], retryRounds: 1 })
  assert.equal(result.text, "Vejo a imagem enviada.")
  assert.equal(requests.length, 1)
  assert.deepEqual(requests[0].body.contents[0].parts[1].inlineData, { mimeType: "image/png", data: "AQID" })
})

test("missing AI credentials fail without making requests to Vercel", async () => {
  isolateProviders()
  const requests: string[] = []
  globalThis.fetch = async input => { requests.push(String(input)); throw new Error("No network expected") }
  await assert.rejects(() => generateLuminText({ system: "Test", prompt: "Test", retryRounds: 1 }), /configurad|credenciais/i)
  assert.deepEqual(requests, [])
})

test("billing links default to the migrated Netlify app", () => {
  for (const key of ["NEXTAUTH_URL", "NEXT_PUBLIC_SITE_URL", "LUMIN_AUTH_REDIRECT_URL"]) delete process.env[key]
  assert.equal(getLuminOrigin(), "https://elaborate-begonia-9d097b.netlify.app")
})

test("WebCraft publication status describes Netlify configuration", async () => {
  delete process.env.NETLIFY_AUTH_TOKEN
  const response = await publishStatus()
  const data = await response.json()
  assert.equal(data.provider, "netlify")
  assert.equal(data.configured, false)
  assert.equal(data.manualDeployUrl, "https://app.netlify.com/drop")
})

test("Live answers through the configured provider instead of a Vercel gateway", async () => {
  isolateProviders()
  process.env.GOOGLE_GENERATIVE_AI_API_KEY = "test-key-only"
  globalThis.fetch = async (input) => {
    assert.ok(String(input).includes("generativelanguage.googleapis.com"))
    return jsonResponse({ candidates: [{ content: { role: "model", parts: [{ text: "Olá! Como posso ajudar?" }] }, finishReason: "STOP" }] })
  }
  const response = await live(new Request("https://lumin.test/api/live", { method: "POST", body: JSON.stringify({ message: "Olá" }), headers: { "Content-Type": "application/json" } }))
  assert.equal(response.status, 200)
  assert.equal(await response.text(), "Olá! Como posso ajudar?")
})

test("static WebCraft export can be published manually without creating remote resources", async () => {
  delete process.env.NETLIFY_AUTH_TOKEN
  globalThis.fetch = async () => { assert.fail("Manual export must not make network requests") }
  const response = await publish(new Request("https://lumin.test/api/webcraft-v2/publish", { method: "POST", body: JSON.stringify({ mode: "website", previewHtml: "<!doctype html><html><body>Olá</body></html>" }) }))
  assert.equal(response.status, 503)
  const data = await response.json()
  assert.equal(data.code, "NETLIFY_NOT_CONFIGURED")
  assert.equal(data.manualDeployUrl, "https://app.netlify.com/drop")
})

test("publication of Next.js source requires a build instead of uploading source as a live site", async () => {
  globalThis.fetch = async () => { assert.fail("No unbuilt source should be deployed") }
  const response = await publish(new Request("https://lumin.test/api/webcraft-v2/publish", { method: "POST", body: JSON.stringify({ mode: "app", files: [{ path: "app/page.tsx", content: "export default function Page() { return <h1>Olá</h1> }" }] }) }))
  assert.equal(response.status, 409)
  assert.equal((await response.json()).code, "NETLIFY_BUILD_REQUIRED")
})

test("publication rejects anonymous access before spending deployment credits", async () => {
  process.env.NETLIFY_AUTH_TOKEN = "test-token-only"
  globalThis.fetch = async () => { assert.fail("Anonymous deployment must not make network requests") }
  const response = await publish(new Request("https://lumin.test/api/webcraft-v2/publish", { method: "POST", body: JSON.stringify({ mode: "website", previewHtml: "<html><body>Teste</body></html>" }) }))
  assert.equal(response.status, 401)
})

test("OpenAI text streaming uses the injected Netlify base URL", async () => {
  isolateProviders()
  process.env.OPENAI_API_KEY = "test-key-only"
  process.env.OPENAI_BASE_URL = "https://gateway.example.invalid/v1"
  globalThis.fetch = async input => {
    assert.ok(String(input).startsWith("https://gateway.example.invalid/v1/"))
    return new Response('event: response.output_text.delta\ndata: {"type":"response.output_text.delta","delta":"Olá"}\n\nevent: response.output_text.delta\ndata: {"type":"response.output_text.delta","delta":"!"}\n\n', { headers: { "Content-Type": "text/event-stream" } })
  }
  const response = streamText({ prompt: "Olá" }).toTextStreamResponse()
  assert.equal(await response.text(), "Olá!")
})

test("WebCraft refines HTML using a direct provider", async () => {
  isolateProviders()
  process.env.GOOGLE_GENERATIVE_AI_API_KEY = "test-key-only"
  globalThis.fetch = async input => {
    assert.ok(String(input).includes("generativelanguage.googleapis.com"))
    return jsonResponse({ candidates: [{ content: { role: "model", parts: [{ text: '<!doctype html><html lang="pt"><head><title>Clínica</title></head><body><h1>Marque a sua consulta</h1></body></html>' }] }, finishReason: "STOP" }] })
  }
  const response = await webcraft(new Request("https://lumin.test/api/webcraft-v2", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ currentHtml: "<html><body><h1>Clínica</h1></body></html>", refinement: "Acrescenta uma chamada à ação." }) }))
  assert.equal(response.status, 200)
  assert.match(await response.text(), /Marque a sua consulta/)
})

// Removing the early progress response would make this regression test fail:
// a slow initial visual plan must not leave Netlify's middleware waiting for headers.
test("initial WebCraft generation responds before the AI finishes and delivers the completed project", async () => {
  isolateProviders()
  process.env.GOOGLE_GENERATIVE_AI_API_KEY = "test-key-only"
  let release!: () => void
  const pendingAI = new Promise<void>(resolve => { release = resolve })
  globalThis.fetch = async (input, init) => {
    const url = String(input instanceof Request ? input.url : input)
    if (!url.includes("generativelanguage.googleapis.com")) return jsonResponse({ results: [] })
    await pendingAI
    const body = JSON.parse(String(init?.body || "{}"))
    const system = JSON.stringify(body.systemInstruction)
    const text = system.includes("photographic direction")
      ? JSON.stringify({ businessType: "Lumin", slots: [] })
      : '<!doctype html><html lang="pt"><head><title>Lumin</title></head><body><h1>Lumin AI</h1></body></html>'
    return jsonResponse({ candidates: [{ content: { role: "model", parts: [{ text }] }, finishReason: "STOP" }] })
  }
  const responsePromise = webcraft(new Request("https://lumin.test/api/webcraft-v2", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/x-ndjson" },
    body: JSON.stringify({ prompt: "Gera um site para o luminai" }),
  }))
  let response: Response | null = null
  try {
    response = await Promise.race([responsePromise, new Promise<null>(resolve => setTimeout(() => resolve(null), 150))])
    assert.ok(response, "Response headers must arrive while AI generation is still pending")
    assert.match(response.headers.get("content-type") || "", /application\/x-ndjson/)
    const reader = response.body!.getReader()
    const first = await reader.read()
    assert.equal(JSON.parse(new TextDecoder().decode(first.value).trim()).type, "progress")
    release()
    let rest = ""
    const decoder = new TextDecoder()
    while (true) { const chunk = await reader.read(); if (chunk.done) break; rest += decoder.decode(chunk.value, { stream: true }) }
    const events = rest.trim().split("\n").map(line => JSON.parse(line))
    const completed = events.find(event => event.type === "complete")
    assert.match(completed?.html || "", /<h1>Lumin AI<\/h1>/)
    assert.equal(completed.stats.mode, "full")
  } finally {
    release()
    await responsePromise
  }
})
