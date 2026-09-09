import { generateText } from "ai"
import { NextResponse } from "next/server"

const TEMPLATES: Record<string, {
  name: string
  bg: string
  text: string
  accent: string
  muted: string
  gradient: string
  titleGradient: string
  font: string
}> = {
  modern: {
    name: "Moderno",
    bg: "#0f172a", text: "#f8fafc", accent: "#3b82f6", muted: "#94a3b8",
    gradient: "linear-gradient(135deg,#0f172a 0%,#1e3a5f 100%)",
    titleGradient: "linear-gradient(135deg,#3b82f6,#818cf8)",
    font: "Inter",
  },
  tech: {
    name: "Tecnologia",
    bg: "#020617", text: "#e2e8f0", accent: "#06b6d4", muted: "#64748b",
    gradient: "linear-gradient(135deg,#020617 0%,#0f172a 100%)",
    titleGradient: "linear-gradient(135deg,#06b6d4,#3b82f6)",
    font: "Inter",
  },
  elegant: {
    name: "Elegante",
    bg: "#1c1917", text: "#fafaf9", accent: "#d4af37", muted: "#a8a29e",
    gradient: "linear-gradient(135deg,#1c1917 0%,#2c2420 100%)",
    titleGradient: "linear-gradient(135deg,#d4af37,#f5c842)",
    font: "Georgia",
  },
  corporate: {
    name: "Corporativo",
    bg: "#ffffff", text: "#0f172a", accent: "#1d4ed8", muted: "#64748b",
    gradient: "linear-gradient(135deg,#f8fafc 0%,#e2e8f0 100%)",
    titleGradient: "linear-gradient(135deg,#1d4ed8,#3b82f6)",
    font: "Inter",
  },
  creative: {
    name: "Criativo",
    bg: "#fdf4ff", text: "#3b0764", accent: "#a855f7", muted: "#7e22ce",
    gradient: "linear-gradient(135deg,#fdf4ff 0%,#ede9fe 100%)",
    titleGradient: "linear-gradient(135deg,#a855f7,#ec4899)",
    font: "Inter",
  },
  nature: {
    name: "Natureza",
    bg: "#052e16", text: "#f0fdf4", accent: "#4ade80", muted: "#86efac",
    gradient: "linear-gradient(135deg,#052e16 0%,#14532d 100%)",
    titleGradient: "linear-gradient(135deg,#4ade80,#86efac)",
    font: "Inter",
  },
  sunset: {
    name: "Pôr do Sol",
    bg: "#1a0a00", text: "#fff7ed", accent: "#fb923c", muted: "#fdba74",
    gradient: "linear-gradient(135deg,#7c2d12 0%,#991b1b 100%)",
    titleGradient: "linear-gradient(135deg,#fb923c,#f87171)",
    font: "Inter",
  },
  ocean: {
    name: "Oceano",
    bg: "#0c4a6e", text: "#f0f9ff", accent: "#38bdf8", muted: "#7dd3fc",
    gradient: "linear-gradient(135deg,#0c4a6e 0%,#164e63 100%)",
    titleGradient: "linear-gradient(135deg,#38bdf8,#818cf8)",
    font: "Inter",
  },
  minimal: {
    name: "Minimalista",
    bg: "#ffffff", text: "#171717", accent: "#171717", muted: "#737373",
    gradient: "linear-gradient(135deg,#ffffff 0%,#f5f5f5 100%)",
    titleGradient: "linear-gradient(135deg,#171717,#525252)",
    font: "Inter",
  },
  neon: {
    name: "Neon",
    bg: "#0d001a", text: "#f0f0ff", accent: "#bf00ff", muted: "#7c3aed",
    gradient: "linear-gradient(135deg,#0d001a 0%,#1a0033 100%)",
    titleGradient: "linear-gradient(135deg,#bf00ff,#00d4ff)",
    font: "Inter",
  },
  pitch: {
    name: "Pitch Deck",
    bg: "#0a0a0a", text: "#fafafa", accent: "#00ff88", muted: "#888888",
    gradient: "linear-gradient(135deg,#0a0a0a 0%,#111111 100%)",
    titleGradient: "linear-gradient(135deg,#00ff88,#00d4ff)",
    font: "Inter",
  },
  pastel: {
    name: "Pastel",
    bg: "#fefce8", text: "#1c1917", accent: "#f472b6", muted: "#a78bfa",
    gradient: "linear-gradient(135deg,#fefce8 0%,#fce7f3 100%)",
    titleGradient: "linear-gradient(135deg,#f472b6,#a78bfa)",
    font: "Inter",
  },
}

function getSlideImage(query: string, index: number, topic: string, seed?: number): string {
  const s = seed ?? index * 17 + 42
  const contextualQuery = `${topic} ${query}`.trim().replace(/\s+/g, " ")
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(`professional editorial presentation image about ${contextualQuery}, directly relevant to the slide idea, realistic coherent composition, no text, no logos, no unrelated objects, clean visual storytelling`)}?width=1200&height=800&model=flux&nologo=true&seed=${s}`
}

function buildHtml(
  topic: string,
  slidesData: Array<{ title: string; content: string[]; imageQuery: string; layout?: string; notes?: string }>,
  t: typeof TEMPLATES[string],
  templateId: string,
): string {
  const slides = slidesData.map((slide, i) => {
    const isTitle = i === 0
    const isEnd = i === slidesData.length - 1
    const imgUrl = getSlideImage(slide.imageQuery || slide.title, i, topic)
    const layout = slide.layout || (i % 3 === 0 ? "image-right" : i % 3 === 1 ? "image-left" : "full-text")

    if (isTitle) {
      return `<section class="slide title-slide" data-index="${i}">
  <div class="slide-bg" style="background:${t.gradient}"></div>
  <div class="title-image"><img src="${imgUrl}" alt="" crossorigin="anonymous" onerror="this.style.display='none'"/><div class="img-overlay"></div></div>
  <div class="title-content">
    <div class="tag">Reborn AI</div>
    <h1 class="title-heading">${slide.title}</h1>
    <p class="title-sub">${slide.content[0] || ""}</p>
  </div>
  <div class="slide-num">${i + 1} / ${slidesData.length}</div>
</section>`
    }

    if (isEnd) {
      return `<section class="slide end-slide" data-index="${i}">
  <div class="slide-bg" style="background:${t.gradient}"></div>
  <h2 class="end-title">${slide.title}</h2>
  <p class="end-sub">${slide.content.join(" · ")}</p>
  <div class="end-brand">REBORN AI</div>
  <div class="slide-num">${i + 1} / ${slidesData.length}</div>
</section>`
    }

    const contentHtml = `<ul>${slide.content.map(c => `<li>${c}</li>`).join("")}</ul>`

    if (layout === "image-right") {
      return `<section class="slide split-slide" data-index="${i}">
  <div class="split-text">
    <div class="slide-category">${i}.</div>
    <h2>${slide.title}</h2>
    ${contentHtml}
  </div>
  <div class="split-img">
    <img src="${imgUrl}" alt="${slide.title}" crossorigin="anonymous" onerror="this.style.display='none'"/>
  </div>
  <div class="slide-num">${i + 1} / ${slidesData.length}</div>
</section>`
    }

    if (layout === "image-left") {
      return `<section class="slide split-slide reverse" data-index="${i}">
  <div class="split-img">
    <img src="${imgUrl}" alt="${slide.title}" crossorigin="anonymous" onerror="this.style.display='none'"/>
  </div>
  <div class="split-text">
    <div class="slide-category">${i}.</div>
    <h2>${slide.title}</h2>
    ${contentHtml}
  </div>
  <div class="slide-num">${i + 1} / ${slidesData.length}</div>
</section>`
    }

    return `<section class="slide text-slide" data-index="${i}">
  <div class="slide-bg" style="background:${t.gradient}"></div>
  <div class="text-content">
    <div class="slide-category">${i}.</div>
    <h2>${slide.title}</h2>
    ${contentHtml}
  </div>
  <div class="slide-num">${i + 1} / ${slidesData.length}</div>
</section>`
  })

  return `<!DOCTYPE html>
<html lang="pt">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${topic}</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Georgia&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}
:root{
  --bg:${t.bg};--text:${t.text};--accent:${t.accent};--muted:${t.muted};
  --title-gradient:${t.titleGradient};
}
body{font-family:'${t.font}',system-ui,sans-serif;background:var(--bg);color:var(--text);overflow:hidden;height:100vh}
.slides-wrap{width:100%;height:100vh;position:relative}
.slide{
  width:100%;height:100vh;
  position:absolute;top:0;left:0;
  display:flex;
  opacity:0;pointer-events:none;
  transition:opacity .5s cubic-bezier(.4,0,.2,1),transform .5s cubic-bezier(.4,0,.2,1);
  transform:translateX(60px);
  color:var(--text);
}
.slide.active{opacity:1;pointer-events:all;transform:translateX(0)}
.slide.prev{transform:translateX(-60px)}
.slide-bg{position:absolute;inset:0;z-index:0}
.title-slide{align-items:center;overflow:hidden}
.title-image{position:absolute;right:0;top:0;width:55%;height:100%;z-index:1}
.title-image img{width:100%;height:100%;object-fit:cover}
.img-overlay{position:absolute;inset:0;background:linear-gradient(90deg,var(--bg) 30%,transparent 100%)}
.title-content{position:relative;z-index:2;padding:8vw;max-width:60%}
.tag{display:inline-block;padding:.35rem 1rem;border-radius:999px;border:1px solid var(--accent);color:var(--accent);font-size:.8rem;letter-spacing:.12em;text-transform:uppercase;margin-bottom:2rem}
.title-heading{font-size:clamp(2rem,5vw,4.5rem);font-weight:800;line-height:1.1;background:var(--title-gradient);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;margin-bottom:1.5rem}
.title-sub{font-size:clamp(.9rem,1.5vw,1.3rem);opacity:.7;line-height:1.6;max-width:500px}
.end-slide{flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:60px}
.end-title{font-size:clamp(2.5rem,6vw,5rem);font-weight:800;background:var(--title-gradient);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;margin-bottom:1.5rem}
.end-sub{font-size:1.1rem;opacity:.6;max-width:600px;line-height:1.8;margin-bottom:3rem}
.end-brand{font-size:.85rem;letter-spacing:.3em;text-transform:uppercase;color:var(--accent);opacity:.8}
.split-slide{flex-direction:row}
.split-slide.reverse{flex-direction:row-reverse}
.split-text{flex:1;padding:clamp(30px,5vw,80px);display:flex;flex-direction:column;justify-content:center;background:var(--bg);z-index:2}
.split-img{width:42%;flex-shrink:0;position:relative;overflow:hidden}
.split-img img{width:100%;height:100%;object-fit:cover}
.split-img::before{content:'';position:absolute;inset:0;z-index:1;background:linear-gradient(90deg,var(--bg) 0%,transparent 100%)}
.split-slide.reverse .split-img::before{background:linear-gradient(270deg,var(--bg) 0%,transparent 100%)}
.text-slide{align-items:center;justify-content:center}
.text-content{position:relative;z-index:2;max-width:900px;padding:clamp(30px,5vw,80px)}
.slide-category{font-size:.75rem;letter-spacing:.15em;text-transform:uppercase;color:var(--accent);margin-bottom:1rem;font-weight:500}
h2{font-size:clamp(1.6rem,3vw,2.8rem);font-weight:700;color:var(--text);line-height:1.2;margin-bottom:2rem}
ul{list-style:none}
li{padding:.85rem 0 .85rem 2rem;border-bottom:1px solid color-mix(in srgb,var(--text) 8%,transparent);font-size:clamp(.9rem,1.4vw,1.15rem);line-height:1.6;position:relative;opacity:.9}
li:last-child{border-bottom:none}
li::before{content:'';position:absolute;left:0;top:50%;transform:translateY(-50%);width:8px;height:8px;border-radius:50%;background:var(--accent)}
.slide-num{position:absolute;bottom:24px;right:32px;font-size:.75rem;opacity:.35;letter-spacing:.05em}
#progress-bar{position:fixed;bottom:0;left:0;height:3px;background:var(--accent);transition:width .4s;z-index:1000}
.ctrl{position:fixed;bottom:24px;right:24px;display:flex;gap:10px;z-index:1000}
.ctrl button{width:44px;height:44px;border-radius:50%;border:1.5px solid var(--accent);background:color-mix(in srgb,var(--accent) 12%,transparent);color:var(--accent);font-size:1rem;cursor:pointer;transition:background .2s,transform .1s;display:flex;align-items:center;justify-content:center}
.ctrl button:hover{background:var(--accent);color:var(--bg)}
.ctrl button:active{transform:scale(.93)}
.ctrl button:disabled{opacity:.25;cursor:not-allowed}
#thumb-panel{position:fixed;bottom:80px;left:50%;transform:translateX(-50%);display:flex;gap:6px;z-index:1000;background:color-mix(in srgb,var(--bg) 90%,transparent);padding:8px 12px;border-radius:12px;backdrop-filter:blur(12px);border:1px solid color-mix(in srgb,var(--text) 12%,transparent);max-width:90vw;overflow-x:auto;opacity:0;transition:opacity .3s;pointer-events:none}
#thumb-panel.show{opacity:1;pointer-events:all}
.thumb-dot{width:10px;height:10px;border-radius:50%;background:color-mix(in srgb,var(--text) 25%,transparent);cursor:pointer;transition:background .2s,transform .2s;flex-shrink:0}
.thumb-dot.active{background:var(--accent);transform:scale(1.3)}
#fs-hint{position:fixed;top:20px;right:20px;font-size:.7rem;letter-spacing:.1em;text-transform:uppercase;opacity:.3;z-index:1000;cursor:pointer}
#fs-hint:hover{opacity:.7}
@media(max-width:768px){.split-img{display:none}.title-image{width:100%;opacity:.3}.title-content{max-width:100%;padding:5vw 6vw}.split-text{padding:30px 24px}.text-content{padding:30px 24px}}
@media print{.slide{position:static;opacity:1;transform:none;page-break-after:always;height:100vh}#progress-bar,.ctrl,#thumb-panel,#fs-hint{display:none}}
</style>
</head>
<body>
<div class="slides-wrap">
${slides.join("\n")}
</div>
<div id="progress-bar"></div>
<nav class="ctrl">
  <button id="btn-prev" title="Anterior (←)">&#8592;</button>
  <button id="btn-next" title="Proximo (→)">&#8594;</button>
</nav>
<div id="thumb-panel">
${slidesData.map((_, i) => `<span class="thumb-dot${i===0?" active":""}" data-i="${i}"></span>`).join("")}
</div>
<div id="fs-hint" title="Ecrã completo">[ F ]</div>
<script>
(function(){
  const slides=document.querySelectorAll('.slide');
  const total=slides.length;
  let cur=0,dragging=false,dragX=0;
  const bar=document.getElementById('progress-bar');
  const prev=document.getElementById('btn-prev');
  const next=document.getElementById('btn-next');
  const dots=document.querySelectorAll('.thumb-dot');
  const panel=document.getElementById('thumb-panel');
  const fsHint=document.getElementById('fs-hint');
  function go(n){
    slides[cur].classList.remove('active');
    slides[cur].classList.add('prev');
    setTimeout(()=>slides[cur<n?cur:n+1+(cur-n-1)]?.classList.remove('prev'),600);
    slides.forEach(s=>s.classList.remove('prev'));
    cur=Math.max(0,Math.min(n,total-1));
    slides[cur].classList.add('active');
    bar.style.width=((cur+1)/total*100)+'%';
    prev.disabled=cur===0;
    next.disabled=cur===total-1;
    dots.forEach((d,i)=>d.classList.toggle('active',i===cur));
  }
  prev.onclick=()=>go(cur-1);
  next.onclick=()=>go(cur+1);
  dots.forEach(d=>d.addEventListener('click',()=>go(+d.dataset.i)));
  document.addEventListener('keydown',e=>{
    if(e.key==='ArrowRight'||e.key===' ')go(cur+1);
    if(e.key==='ArrowLeft')go(cur-1);
    if(e.key==='Home')go(0);
    if(e.key==='End')go(total-1);
    if(e.key==='f'||e.key==='F'){document.fullscreenElement?document.exitFullscreen():document.documentElement.requestFullscreen();}
    if(e.key==='Tab'){e.preventDefault();panel.classList.toggle('show');}
  });
  document.addEventListener('touchstart',e=>{dragging=true;dragX=e.touches[0].clientX},{passive:true});
  document.addEventListener('touchend',e=>{
    if(!dragging)return;
    const dx=e.changedTouches[0].clientX-dragX;
    if(Math.abs(dx)>50){dx<0?go(cur+1):go(cur-1);}
    dragging=false;
  });
  fsHint.onclick=()=>document.fullscreenElement?document.exitFullscreen():document.documentElement.requestFullscreen();
  go(0);
})();
</script>
</body>
</html>`
}

export async function POST(req: Request) {
  try {
    const { prompt, template = "modern", slides: slideCount = 10 } = await req.json()
    const t = TEMPLATES[template] ?? TEMPLATES.modern

    const { text } = await generateText({
      model: process.env.AI_MODEL || "deepseek-chat",
      prompt: `Create a professional presentation about: "${prompt}"

Generate exactly ${slideCount} slides as a JSON array.
The deck must have one coherent narrative from problem/context to insight/solution to conclusion. Every slide must clearly relate to the main topic.

Slide 1: title slide (title = main topic, content = [one-line tagline], imageQuery = a concrete visual representation of the main topic)
Slides 2–${slideCount - 1}: content slides with clear titles and 3-5 concise bullet points each
Last slide: conclusion/thank you

IMAGE CONTEXT RULES:
- imageQuery must describe the actual visual subject for that specific slide, not generic stock terms.
- imageQuery must preserve the main topic context plus the slide's unique idea.
- Prefer concrete scenes, objects, people, environments, dashboards or concepts that can be depicted visually.
- Do not use generic queries such as "business", "technology", "presentation", "success" or "team" by themselves.
- Example: if topic is an AI sales dialer and the slide is about CRM integration, use "sales representative using AI dialer CRM dashboard on laptop" rather than "technology dashboard".
- Keep imageQuery in short natural English, 5-12 words, no text overlays.

Alternate layouts: "image-right", "image-left", "full-text" for slides 2+.
Use the same language as the user's request for visible slide content.

IDENTITY RULE: This tool is called REBORN AI. NEVER mention "Gemini", "Google", "GPT", "OpenAI", "Claude" or any model/company name in the generated content. If any slide references the tool, use "Reborn AI" only.

Reply ONLY with valid JSON array, no markdown fences:
[{"title":"...","content":["..."],"imageQuery":"...","layout":"image-right","notes":"..."}]`,
    })

    let slidesData: any[]
    try {
      const m = text.match(/\[[\s\S]*?\](?=\s*$)/m) ?? text.match(/\[[\s\S]*\]/)
      slidesData = m ? JSON.parse(m[0]) : []
    } catch {
      slidesData = [
        { title: prompt, content: ["Gerado por Reborn AI"], imageQuery: prompt },
        { title: "Conclusão", content: ["Obrigado!"], imageQuery: `${prompt} conclusion` },
      ]
    }

    if (!slidesData.length) {
      slidesData = [{ title: prompt, content: ["Apresentação gerada por Reborn AI"], imageQuery: prompt }]
    }

    const html = buildHtml(prompt, slidesData, t, template)

    return NextResponse.json({ success: true, html, slides: slidesData, template: t.name })
  } catch (err: any) {
    console.error("[presentation]", err)
    return NextResponse.json({ success: false, error: err.message ?? "Erro ao gerar" }, { status: 500 })
  }
}
