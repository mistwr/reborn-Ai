import { POST as generateImage } from "@/app/api/generate-image/route"

export const maxDuration = 90

export async function GET() {
  const req = new Request("http://local/api/generate-image", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      prompt: "Um cavalo branco a correr numa praia ao pôr do sol, fotografia realista, corpo inteiro claramente visível",
      width: 768,
      height: 768,
      quality: "hd",
      style: "fotografia realista",
      validate: true,
    }),
  })

  const res = await generateImage(req)
  const body = await res.json()
  return Response.json({ status: res.status, ...body })
}
