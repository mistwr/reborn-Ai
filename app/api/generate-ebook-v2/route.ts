import { NextResponse } from "next/server"
import { generateLuminText } from "@/lib/lumin-ai-runtime"

export const maxDuration = 120

type Chapter = { title: string; content: string; imageQuery?: string }

function imageUrl(subject: string, style: string, seed: number, width = 1200, height = 675) {
  const p = `premium editorial illustration for an ebook about ${subject}, ${style} visual style, directly relevant, cinematic composition, no text, no logo, no watermark`
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(p)}?width=${width}&height=${height}&model=flux&nologo=true&seed=${seed}`
}

function safeChapters(text: string, count: number, topic: string): Chapter[] {
  try {
    const match = text.match(/\[[\s\S]*\]/)
    const parsed = match ? JSON.parse(match[0]) : []
    if (Array.isArray(parsed) && parsed.length) {
      return parsed.slice(0, count).map((c: any, i: number) => ({
        title: String(c?.title || `Capítulo ${i + 1}`),
        content: String(c?.content || ""),
        imageQuery: String(c?.imageQuery || c?.title || topic),
      }))
    }
  } catch {}
  return [{ title: "Introdução", content: `Introdução a ${topic}.`, imageQuery: topic }]
}

function buildHtml(title: string, author: string, topic: string, chapters: Chapter[], style: string) {
  const cover = imageUrl(`${title}; ${topic}`, style, 41, 900, 1200)
  const chaptersHtml = chapters.map((c, i) => {
    const img = imageUrl(`${topic}; ${c.imageQuery || c.title}`, style, 100 + i * 19)
    const paragraphs = c.content.split(/\n\n+/).filter(Boolean).map(p => `<p>${p}</p>`).join("")
    return `<article class="chapter" id="c${i + 1}"><img class="hero" src="${img}" onerror="this.style.display='none'"/><div class="eyebrow">CAPÍTULO ${i + 1}</div><h2>${c.title.replace(/^Cap[ií]tulo \d+:?\s*/i, "")}</h2>${paragraphs}</article>`
  }).join("")

  return `<!doctype html><html lang="pt"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title><style>
*{box-sizing:border-box}body{margin:0;background:#f7f3ea;color:#1f1b17;font-family:Georgia,serif;line-height:1.8}.cover{min-height:100vh;display:grid;place-items:center;text-align:center;padding:60px 28px;color:white;position:relative;overflow:hidden;background:#120f0b}.cover:before{content:"";position:absolute;inset:0;background:url('${cover}') center/cover;opacity:.38}.cover:after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,.25),rgba(0,0,0,.75))}.cover .inner{position:relative;z-index:2;max-width:800px}.brand{font:700 12px/1.2 Arial,sans-serif;letter-spacing:.4em;color:#e7bd63;margin-bottom:28px}.cover h1{font-size:clamp(42px,7vw,84px);line-height:1.02;margin:0 0 24px}.cover .sub{font-size:20px;opacity:.85}.cover .author{margin-top:42px;font:600 16px Arial,sans-serif}.book{max-width:860px;margin:0 auto;padding:70px 24px}.toc{padding:32px;border:1px solid #d9cdb9;border-radius:18px;background:#fffaf0;margin-bottom:70px}.toc h2{margin-top:0}.toc a{color:#7a551c;text-decoration:none}.toc li{padding:10px 0;border-bottom:1px solid #eadfce}.chapter{page-break-before:always;margin:0 0 90px}.chapter .hero{width:100%;aspect-ratio:16/9;object-fit:cover;border-radius:20px;margin-bottom:32px}.eyebrow{font:800 11px Arial,sans-serif;letter-spacing:.28em;color:#a56b1d}.chapter h2{font-size:clamp(30px,5vw,54px);line-height:1.08;margin:10px 0 28px}.chapter p{font-size:19px;margin:0 0 24px}.footer{text-align:center;padding:60px 24px;background:#120f0b;color:#f7e3ad}.footer .brand{margin:0 0 14px}@media(max-width:640px){.book{padding:45px 18px}.chapter p{font-size:17px}}
</style></head><body><section class="cover"><div class="inner"><div class="brand">LUMIN AI</div><h1>${title}</h1><div class="sub">Conteúdo criado com estrutura, contexto e coerência editorial</div><div class="author">por ${author}</div></div></section><main class="book"><nav class="toc"><h2>Índice</h2><ol>${chapters.map((c,i)=>`<li><a href="#c${i+1}">${c.title}</a></li>`).join("")}</ol></nav>${chaptersHtml}</main><footer class="footer"><div class="brand">LUMIN AI</div><strong>${title}</strong><div>por ${author}</div></footer></body></html>`
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const prompt = String(body?.prompt || "").trim()
    const title = String(body?.title || prompt).trim()
    const author = String(body?.author || "Lumin AI").trim()
    const style = String(body?.style || "modern")
    const count = Math.max(1, Math.min(20, Number(body?.chapters || 5)))
    if (!prompt) return NextResponse.json({ success: false, error: "Indica o tema do ebook." }, { status: 400 })

    const result = await generateLuminText({
      system: `És o Lumin AI Ebooks. Escreves livros úteis, claros e coerentes. Mantém continuidade entre capítulos, evita repetições e adapta o tom ao tema e ao público. Não inventes dados factuais. Responde apenas JSON válido.`,
      prompt: `Tema: ${prompt}\nTítulo: ${title}\nAutor: ${author}\nCria exatamente ${count} capítulos. Cada capítulo deve ter title, content com pelo menos 4 parágrafos substanciais e imageQuery em inglês descrevendo uma imagem editorial específica. JSON array apenas.`,
      maxOutputTokens: 8000,
    })

    const chapters = safeChapters(result.text, count, prompt)
    return NextResponse.json({ success: true, html: buildHtml(title, author, prompt, chapters, style), chapters, title, author, modelFallbackUsed: result.failures.length > 0 })
  } catch (error: any) {
    console.error("[Lumin Ebook V2]", error)
    return NextResponse.json({ success: false, error: "O Lumin não conseguiu gerar o ebook neste momento. Tenta novamente em alguns segundos." }, { status: 503 })
  }
}
