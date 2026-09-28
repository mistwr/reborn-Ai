import { createHmac, timingSafeEqual } from "node:crypto"
import { resolveOAuthAppCredentials } from "@/lib/connectors/provider-settings"
import { getConnectedTwilioByAccountSid, getConnectionSecret, getLatestConnectedTwilio } from "@/lib/connectors/store"
import { generateLuminText } from "@/lib/lumin-ai-runtime"

export const runtime = "nodejs"
export const maxDuration = 60

function xmlEscape(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
}

function publicRequestUrl(request: Request) {
  const original = new URL(request.url)
  const proto = request.headers.get("x-forwarded-proto") || original.protocol.replace(":", "") || "https"
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || original.host
  return `${proto}://${host}${original.pathname}${original.search}`
}

function validateTwilioSignature(request: Request, params: Array<[string, string]>, authToken: string) {
  if (!authToken) return false

  const signature = request.headers.get("x-twilio-signature")
  if (!signature) return false

  const sorted = [...params].sort(([aKey, aValue], [bKey, bValue]) => {
    const keyOrder = aKey.localeCompare(bKey)
    return keyOrder !== 0 ? keyOrder : aValue.localeCompare(bValue)
  })

  let payload = publicRequestUrl(request)
  for (const [key, value] of sorted) payload += key + value

  const expected = createHmac("sha1", authToken).update(payload, "utf8").digest("base64")
  const left = Buffer.from(signature)
  const right = Buffer.from(expected)

  return left.length === right.length && timingSafeEqual(left, right)
}

function twiml(message: string, status = 200) {
  const safe = xmlEscape(message.trim() || "Estou aqui. Em que te posso ajudar?")
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?><Response><Message><Body>${safe}</Body></Message></Response>`,
    {
      status,
      headers: {
        "Content-Type": "text/xml; charset=utf-8",
        "Cache-Control": "no-store",
      },
    },
  )
}

export async function GET() {
  const [vaultConnection, fallback] = await Promise.all([
    getLatestConnectedTwilio().catch(() => null),
    resolveOAuthAppCredentials("twilio").catch(() => null),
  ])
  return Response.json({
    ok: true,
    service: "Lumin WhatsApp",
    configured: Boolean(vaultConnection?.secret_id || fallback?.configured),
    source: vaultConnection?.secret_id ? "connector-vault" : fallback?.source || "missing",
  })
}

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get("content-type") || ""
    if (!contentType.includes("application/x-www-form-urlencoded")) {
      return twiml("Pedido inválido.", 415)
    }

    const raw = await request.text()
    const body = new URLSearchParams(raw)
    const params = Array.from(body.entries())
    const accountSid = String(body.get("AccountSid") || "").trim()

    const vaultConnection = accountSid
      ? await getConnectedTwilioByAccountSid(accountSid).catch(() => null)
      : null
    const vaultSecret = vaultConnection?.secret_id
      ? await getConnectionSecret(vaultConnection.id).catch(() => "")
      : ""

    let authToken = vaultSecret
    if (!authToken) {
      const fallback = await resolveOAuthAppCredentials("twilio").catch(() => null)
      authToken = fallback?.clientSecret || ""
    }

    if (!authToken) {
      console.error("[Lumin WhatsApp] Twilio credentials are not configured", { accountSid })
      return twiml("O Lumin WhatsApp ainda não está configurado no servidor.", 503)
    }

    if (!validateTwilioSignature(request, params, authToken)) {
      console.warn("[Lumin WhatsApp] rejected invalid Twilio signature")
      return new Response("Forbidden", { status: 403 })
    }

    const from = body.get("From") || ""
    const text = (body.get("Body") || "").trim()
    const numMedia = Number(body.get("NumMedia") || "0")

    if (!from.startsWith("whatsapp:")) {
      return twiml("Este endpoint está configurado apenas para WhatsApp.", 400)
    }

    if (!text && numMedia > 0) {
      return twiml("Recebi o ficheiro. Para já responde-me também com uma frase a dizer o que queres que eu faça com ele.")
    }

    if (!text) {
      return twiml("Olá 👋 Sou o Lumin AI. Escreve-me uma mensagem e eu respondo-te por aqui.")
    }

    const result = await generateLuminText({
      system: `Tu és o Lumin AI a falar diretamente com uma pessoa pelo WhatsApp.

IDENTIDADE
- O teu nome é Lumin AI.
- Se perguntarem quem és, apresenta-te como Lumin AI.
- Nunca digas que és Twilio, PhishGuard ou outro serviço técnico.
- Não reveles modelos, fornecedores ou infraestrutura interna.

IDIOMA E ESTILO
- Por defeito responde em Português de Portugal.
- Escreve como numa conversa real de WhatsApp: natural, direto, curto e humano.
- Evita markdown pesado e respostas demasiado longas.
- Se precisares de esclarecer algo, faz apenas uma pergunta de cada vez.

COMERCIAL
- Podes explicar o Lumin AI, qualificar interesse, responder a dúvidas e encaminhar a pessoa para falar com um humano quando fizer sentido.
- Não inventes preços, condições, clientes ou resultados.
- Não uses pressão enganadora nem falsas urgências.

Responde apenas à mensagem recebida.`,
      prompt: text.slice(0, 4000),
      maxOutputTokens: 900,
      temperature: 0.5,
      retryRounds: 2,
    })

    const answer = result.text.trim()
    const finalAnswer =
      answer.length > 3500
        ? answer.slice(0, 3450).trimEnd() + "\n\nContinua a conversa e eu desenvolvo o resto."
        : answer

    console.info("[Lumin WhatsApp] replied", {
      from: from.replace(/\d(?=\d{3})/g, "*"),
      messageSid: body.get("MessageSid") || "",
      charsIn: text.length,
      charsOut: finalAnswer.length,
      model: result.model,
      fallbacks: result.failures.length,
    })

    return twiml(finalAnswer)
  } catch (error) {
    console.error("[Lumin WhatsApp] error", error)
    return twiml("O Lumin teve um erro momentâneo. Tenta novamente.", 500)
  }
}
