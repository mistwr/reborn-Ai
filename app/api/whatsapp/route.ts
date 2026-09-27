import { resolveOAuthAppCredentials } from "@/lib/connectors/provider-settings"\nimport { createHmac, timingSafeEqual } from "node:crypto"

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

function validateTwilioSignature(request: Request, params: Array<[string, string]>) {
  const authToken = process.env.TWILIO_AUTH_TOKEN
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
  return Response.json({
    ok: true,
    service: "Lumin WhatsApp",
    configured: Boolean(process.env.TWILIO_AUTH_TOKEN),
  })
}

export async function POST(request: Request) {
  try {
    if (!process.env.TWILIO_AUTH_TOKEN) {
      console.error("[Lumin WhatsApp] TWILIO_AUTH_TOKEN is not configured")
      return twiml("O Lumin WhatsApp ainda não está configurado no servidor.", 503)
    }

    const contentType = request.headers.get("content-type") || ""
    if (!contentType.includes("application/x-www-form-urlencoded")) {
      return twiml("Pedido inválido.", 415)
    }

    const raw = await request.text()
    const body = new URLSearchParams(raw)
    const params = Array.from(body.entries())

    if (!validateTwilioSignature(request, params, credentials.clientSecret)) {
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

    const chatUrl = new URL("/api/chat", publicRequestUrl(request))
    const response = await fetch(chatUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Lumin-Channel": "whatsapp",
      },
      body: JSON.stringify({
        message: text.slice(0, 4000),
        enableSearch: true,
        userPreferences: {
          style:
            "WhatsApp: responde em Português de Portugal, de forma natural, direta e curta. Evita markdown pesado. Se precisares de mais informação, faz apenas uma pergunta de cada vez.",
        },
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(45000),
    })

    if (!response.ok) {
      const detail = await response.text().catch(() => "")
      console.error("[Lumin WhatsApp] chat failed", response.status, detail.slice(0, 500))
      return twiml("Tive uma falha momentânea a pensar nessa resposta. Envia-me a mensagem outra vez daqui a pouco.")
    }

    const answer = (await response.text()).trim()
    const finalAnswer =
      answer.length > 3500
        ? answer.slice(0, 3450).trimEnd() + "\n\nContinua a conversa e eu desenvolvo o resto."
        : answer

    console.info("[Lumin WhatsApp] replied", {
      from: from.replace(/\d(?=\d{3})/g, "*"),
      messageSid: body.get("MessageSid") || "",
      charsIn: text.length,
      charsOut: finalAnswer.length,
    })

    return twiml(finalAnswer)
  } catch (error) {
    console.error("[Lumin WhatsApp] error", error)
    return twiml("O Lumin teve um erro momentâneo. Tenta novamente.", 500)
  }
}
