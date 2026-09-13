import { NextResponse } from "next/server"
import { generateLuminText } from "@/lib/lumin-ai-runtime"

export const maxDuration = 120

type Slide = { title: string; content: string[]; imageQuery?: string; layout?: string }

const THEMES: Record<string, { bg: string; panel: string; text: string; muted: string; accent: string }> = {
  modern: { bg: "#0b1220", panel: "#111b2e", text: "#f8fafc", muted: "#9aa9bd", accent: "#4f8cff" },
  tech: { bg: "#020617", panel: "#0b1220", text: "#e2e8f0", muted: "#7dd3fc", accent: "#06b6d4" },
  elegant: { bg: "#120f0b", panel: "#1d1710", text: "#fff8e7", muted: "#cbb998", accent: "#d4af37" },
  pitch: { bg: "#070707", panel: "#101010", text: "#fafafa", muted: "#aaa", accent: "#00e98a" },
  neon: { bg: "#0d001a", panel: "#18052b", text: "#f5efff", muted: "#c4a7ff", accent: "#bf00ff" },
  ocean: { bg: "#06283a", panel: "#0b3a52", text: "#effbff", muted: "#8edcf7", accent: "#38bdf8" },
  sunset: { bg: "#231006", panel: "#3b160b", text: "#fff7ed", muted: "#fdba74", accent: "#fb923c" },
  nature: { bg: "#062617", panel: "#0b3a24", text: "#f0fdf4", muted: "#9be7b5", accent: "#4ade80" },
  corporate: { bg: "#f8fafc", panel: "#ffffff", text: "#0f172a", muted: "#64748b", accent: "#1d4ed8" },
  creative: { bg: "#fff7ff", panel: "#ffffff", text: "#3b0764", muted: "#8b5ea7", accent: "#a855f7" },
  minimal: { bg: "#fafafa", panel: "#ffffff", text: "#171717", muted: "#737373", accent: "#171717" },
  pastel: { bg: "#fffdf2", panel: "#ffffff", text: "#292524", muted: "#9f7aea", accent: "#f472b6" },
}

function imageUrl(topic: string, q: string, i: number) {
  const prompt = `premium presentation editorial image about ${topic}; ${q}; realistic, coherent, cinematic composition, no text, no logo, no watermark`
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1280&height=800&model=flux&nologo=true&seed=${47 + i * 29}`
}

function safeSlides(text: string, count: number, topic: string): Slide[] {
  try {
    const match = text.match(/\[[\s\S]*\]/)
    const parsed = match ? JSON.parse(match[0]) : []
    if (Array.isArray(parsed) && parsed.length) {
      return parsed.slice(0, count).map((s: any, i: number) => ({
        title: String(s?.title || `Slide ${i + 1}`),
        content: Array.isArray(s?.content) ? s.content.slice(0, 5).map(String) : [String(s?.content || "")],
        imageQuery: String(s?.imageQuery || s?.title || topic),
        layout: String(s?.layout || (i % 2 ? "image-left" : "image-right")),
      }))
    }
  } catch {}
  return [
    { title: topic, content: ["Apresentação criada pelo Lumin AI"], imageQuery: topic, layout: "hero" },
    { title: "Visão geral", content: ["Contexto", "Oportunidade", "Próximos passos"], imageQuery: topic },
    { title: "Obrigado", content: ["Perguntas e próximos passos"], imageQuery: topic, layout: "end" },
  ]
}

function buildHtml(topic: string, slides: Slide[], template: string) {
  const t = THEMES[template] || THEMES.modern
  const slidesHtml = slides.map((s, i) => {
    const isFirst = i === 0
    const isLast = i === slides.length - 1
    const img = imageUrl(topic, s.imageQuery || s.title, i)
    if (isFirst) return `<section class="slide active"><img class="bgimg" src="${img}" onerror="this.style.display='none'"/><div class="shade"></div><div class="hero"><div class="brand">LUMIN AI</div><h1>${s.title}</h1><p>${s.content[0] || ""}</p></div><span class="num">1 / ${slides.length}</span></section>`
    if (isLast) return `<section class="slide"><div class="center"><div class="brand">LUMIN AI</div><h2>${s.title}</h2><p>${s.content.join(" · ")}</p></div><span class="num">${i + 1} / ${slides.length}</span></section>`
    const bullets = s.content.map(x => `<li>${x}</li>`).join("")
    return `<section class="slide split ${s.layout === "image-left" ? "reverse" : ""}"><div class="copy"><div class="kicker">${String(i).padStart(2,"0")}</div><h2>${s.title}</h2><ul>${bullets}</ul></div><div class="visual"><img src="${img}" onerror="this.style.display='none'"/></div><span class="num">${i + 1} / ${slides.length}</span></section>`
  }).join("")

  return `<!doctype html><html lang="pt"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${topic}</title><style>
*{box-sizing:border-box}html,body{margin:0;width:100%;height:100%;overflow:hidden;background:${t.bg};font-family:Inter,Arial,sans-serif;color:${t.text}}.wrap{width:100%;height:100%;position:relative}.slide{position:absolute;inset:0;display:flex;opacity:0;pointer-events:none;transform:translateX(32px);transition:.35s ease;background:${t.bg}}.slide.active{opacity:1;pointer-events:auto;transform:none}.bgimg{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}.shade{position:absolute;inset:0;background:linear-gradient(90deg,${t.bg} 0%,${t.bg}ee 35%,transparent 100%)}.hero{position:relative;z-index:2;max-width:62%;padding:9vw;align-self:center}.brand{color:${t.accent};letter-spacing:.35em;font-size:12px;font-weight:800;margin-bottom:24px}.hero h1,.center h2,.copy h2{font-size:clamp(34px,5vw,72px);line-height:1.03;margin:0 0 20px}.hero p,.center p{color:${t.muted};font-size:clamp(16px,2vw,24px);line-height:1.5}.split{flex-direction:row}.split.reverse{flex-direction:row-reverse}.copy{width:58%;padding:8vw 7vw;display:flex;flex-direction:column;justify-content:center}.visual{width:42%;overflow:hidden;background:${t.panel}}.visual img{width:100%;height:100%;object-fit:cover}.kicker{color:${t.accent};font-weight:800;margin-bottom:18px}.copy h2{font-size:clamp(30px,4vw,58px)}ul{list-style:none;padding:0;margin:10px 0 0}li{position:relative;padding:14px 0 14px 28px;border-bottom:1px solid rgba(127,127,127,.16);font-size:clamp(16px,1.7vw,23px);line-height:1.45}li:before{content:"";position:absolute;left:0;top:24px;width:8px;height:8px;border-radius:50%;background:${t.accent}}.center{margin:auto;text-align:center;max-width:800px;padding:40px}.center h2{color:${t.text}}.num{position:absolute;right:28px;bottom:24px;color:${t.muted};font-size:12px}.controls{position:fixed;right:24px;bottom:24px;z-index:10;display:flex;gap:10px}.controls button{width:46px;height:46px;border-radius:999px;border:1px solid ${t.accent};background:${t.panel};color:${t.accent};font-size:20px}.bar{position:fixed;left:0;bottom:0;height:3px;background:${t.accent};z-index:12;transition:.3s}@media(max-width:720px){.hero{max-width:90%;padding:11vw 7vw}.split,.split.reverse{flex-direction:column}.copy{width:100%;height:62%;padding:10vw 7vw}.visual{width:100%;height:38%}.controls{right:16px;bottom:16px}}
</style></head><body><div class="wrap">${slidesHtml}</div><div class="bar" id="bar"></div><div class="controls"><button id="prev">←</button><button id="next">→</button></div><script>const s=[...document.querySelectorAll('.slide')];let i=0;function show(n){i=Math.max(0,Math.min(s.length-1,n));s.forEach((x,j)=>x.classList.toggle('active',j===i));document.getElementById('bar').style.width=((i+1)/s.length*100)+'%'};document.getElementById('prev').onclick=()=>show(i-1);document.getElementById('next').onclick=()=>show(i+1);addEventListener('keydown',e=>{if(e.key==='ArrowRight'||e.key===' ')show(i+1);if(e.key==='ArrowLeft')show(i-1)});show(0)</script></body></html>`
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const prompt = String(body?.prompt || "").trim()
    const template = String(body?.template || "modern")
    const count = Math.max(4, Math.min(20, Number(body?.slides || 8)))
    if (!prompt) return NextResponse.json({ success: false, error: "Indica o tema da apresentação." }, { status: 400 })

    const system = `És o Lumin AI Slides. Cria apresentações profissionais, comerciais e visualmente fortes. Mantém coerência entre slides, evita texto genérico e usa linguagem clara. Se o pedido for comercial, estrutura para persuadir sem inventar dados. Responde apenas JSON válido.`
    const result = await generateLuminText({
      system,
      prompt: `Tema: ${prompt}\nCria exatamente ${count} slides. O primeiro é capa e o último fecha a apresentação. Para cada slide devolve title, content (2 a 5 pontos curtos), imageQuery em inglês e layout (image-left ou image-right). JSON array apenas.`,
      maxOutputTokens: 5000,
    })
    const slides = safeSlides(result.text, count, prompt)
    return NextResponse.json({ success: true, html: buildHtml(prompt, slides, template), slides, modelFallbackUsed: result.failures.length > 0 })
  } catch (error: any) {
    console.error("[Lumin Slides V2]", error)
    return NextResponse.json({ success: false, error: "O Lumin não conseguiu gerar a apresentação neste momento. Tenta novamente em alguns segundos." }, { status: 503 })
  }
}
