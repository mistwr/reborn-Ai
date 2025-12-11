import { generateText } from "ai"
import { NextResponse } from "next/server"

const PRESENTATION_TEMPLATES = {
  modern: {
    name: "Moderno",
    bgColor: "#0f172a",
    textColor: "#f8fafc",
    accentColor: "#3b82f6",
    gradient: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
  },
  corporate: {
    name: "Corporativo",
    bgColor: "#ffffff",
    textColor: "#1e293b",
    accentColor: "#059669",
    gradient: "linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)",
  },
  creative: {
    name: "Criativo",
    bgColor: "#fef3c7",
    textColor: "#78350f",
    accentColor: "#f59e0b",
    gradient: "linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)",
  },
  minimal: {
    name: "Minimalista",
    bgColor: "#fafafa",
    textColor: "#171717",
    accentColor: "#737373",
    gradient: "linear-gradient(135deg, #fafafa 0%, #f5f5f5 100%)",
  },
  dark: {
    name: "Escuro",
    bgColor: "#18181b",
    textColor: "#fafafa",
    accentColor: "#a855f7",
    gradient: "linear-gradient(135deg, #18181b 0%, #27272a 100%)",
  },
  gradient: {
    name: "Gradiente",
    bgColor: "#667eea",
    textColor: "#ffffff",
    accentColor: "#fbbf24",
    gradient: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
  },
  ocean: {
    name: "Oceano",
    bgColor: "#0c4a6e",
    textColor: "#f0f9ff",
    accentColor: "#38bdf8",
    gradient: "linear-gradient(135deg, #0c4a6e 0%, #075985 100%)",
  },
  sunset: {
    name: "Pôr do Sol",
    bgColor: "#7c2d12",
    textColor: "#fff7ed",
    accentColor: "#fb923c",
    gradient: "linear-gradient(135deg, #ea580c 0%, #dc2626 100%)",
  },
  nature: {
    name: "Natureza",
    bgColor: "#14532d",
    textColor: "#f0fdf4",
    accentColor: "#4ade80",
    gradient: "linear-gradient(135deg, #14532d 0%, #166534 100%)",
  },
  tech: {
    name: "Tecnologia",
    bgColor: "#020617",
    textColor: "#e2e8f0",
    accentColor: "#06b6d4",
    gradient: "linear-gradient(135deg, #020617 0%, #0f172a 100%)",
  },
  elegant: {
    name: "Elegante",
    bgColor: "#1c1917",
    textColor: "#fafaf9",
    accentColor: "#d4af37",
    gradient: "linear-gradient(135deg, #1c1917 0%, #292524 100%)",
  },
  playful: {
    name: "Divertido",
    bgColor: "#fdf4ff",
    textColor: "#701a75",
    accentColor: "#e879f9",
    gradient: "linear-gradient(135deg, #fdf4ff 0%, #fae8ff 100%)",
  },
}

export async function POST(req: Request) {
  try {
    const { prompt, template = "modern", slides = 10 } = await req.json()

    const templateStyle =
      PRESENTATION_TEMPLATES[template as keyof typeof PRESENTATION_TEMPLATES] || PRESENTATION_TEMPLATES.modern

    const { text } = await generateText({
      model: "google/gemini-2.0-flash-001",
      prompt: `Cria uma apresentação profissional sobre: "${prompt}"

Gera exatamente ${slides} slides em formato JSON array.
Cada slide deve ter: title, content (array de 3-5 bullet points concisos), imageQuery (descrição curta em inglês para gerar imagem relacionada)

O primeiro slide é o título principal, o último é conclusão/obrigado.

Responde APENAS com o JSON array, sem markdown:
[{"title": "...", "content": ["..."], "imageQuery": "..."}]`,
    })

    let slidesData
    try {
      const jsonMatch = text.match(/\[[\s\S]*\]/)
      slidesData = jsonMatch ? JSON.parse(jsonMatch[0]) : []
    } catch {
      slidesData = [{ title: prompt, content: ["Apresentação gerada por Reborn AI"], imageQuery: "presentation" }]
    }

    const html = `<!DOCTYPE html>
<html lang="pt">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${prompt} - Reborn AI Presentation</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Inter', system-ui, sans-serif; overflow: hidden; }
    .slides-container { width: 100vw; height: 100vh; position: relative; }
    .slide {
      width: 100%;
      height: 100%;
      display: none;
      position: relative;
      background: ${templateStyle.gradient};
      color: ${templateStyle.textColor};
    }
    .slide.active { display: flex; }
    .slide-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: center;
      padding: 60px 80px;
      z-index: 2;
    }
    .slide-image {
      width: 45%;
      height: 100%;
      position: relative;
      overflow: hidden;
    }
    .slide-image img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      opacity: 0.9;
    }
    .slide-image::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: linear-gradient(90deg, ${templateStyle.bgColor} 0%, transparent 100%);
      z-index: 1;
    }
    .slide.title-slide {
      justify-content: center;
      align-items: center;
      text-align: center;
    }
    .slide.title-slide .slide-content {
      max-width: 900px;
    }
    .slide h1 {
      font-size: 4rem;
      margin-bottom: 30px;
      font-weight: 700;
      line-height: 1.1;
    }
    .slide h2 {
      font-size: 2.8rem;
      margin-bottom: 40px;
      font-weight: 600;
      color: ${templateStyle.accentColor};
    }
    .slide ul {
      list-style: none;
      font-size: 1.4rem;
      line-height: 2;
    }
    .slide li {
      padding: 12px 0;
      padding-left: 40px;
      position: relative;
      opacity: 0.95;
    }
    .slide li::before {
      content: "";
      position: absolute;
      left: 0;
      top: 50%;
      transform: translateY(-50%);
      width: 12px;
      height: 12px;
      background: ${templateStyle.accentColor};
      border-radius: 50%;
    }
    .slide-number {
      position: absolute;
      bottom: 30px;
      left: 40px;
      font-size: 0.9rem;
      opacity: 0.5;
    }
    .progress {
      position: fixed;
      bottom: 0;
      left: 0;
      height: 4px;
      background: ${templateStyle.accentColor};
      transition: width 0.3s;
      z-index: 100;
    }
    .controls {
      position: fixed;
      bottom: 30px;
      right: 30px;
      display: flex;
      gap: 10px;
      z-index: 100;
    }
    .controls button {
      width: 50px;
      height: 50px;
      border: 2px solid ${templateStyle.accentColor};
      border-radius: 50%;
      background: transparent;
      color: ${templateStyle.accentColor};
      font-size: 1.2rem;
      cursor: pointer;
      transition: all 0.2s;
    }
    .controls button:hover {
      background: ${templateStyle.accentColor};
      color: ${templateStyle.bgColor};
    }
    .controls button:disabled {
      opacity: 0.3;
      cursor: not-allowed;
    }
    .logo {
      position: fixed;
      top: 20px;
      right: 30px;
      font-size: 0.85rem;
      opacity: 0.6;
      font-weight: 500;
      z-index: 100;
    }
    @media (max-width: 900px) {
      .slide-image { display: none; }
      .slide h1 { font-size: 2.5rem; }
      .slide h2 { font-size: 1.8rem; }
      .slide ul { font-size: 1.1rem; }
      .slide-content { padding: 40px; }
    }
    @media print {
      .slide { page-break-after: always; display: flex !important; }
      .controls, .progress { display: none; }
    }
  </style>
</head>
<body>
  <div class="slides-container">
    ${slidesData
      .map(
        (slide: any, i: number) => `
    <div class="slide${i === 0 ? " active title-slide" : ""}${i === slidesData.length - 1 ? " title-slide" : ""}" data-index="${i}">
      <div class="slide-content">
        ${i === 0 || i === slidesData.length - 1 ? `<h1>${slide.title}</h1>` : `<h2>${slide.title}</h2>`}
        ${
          i !== 0 && i !== slidesData.length - 1
            ? `<ul>${slide.content.map((item: string) => `<li>${item}</li>`).join("")}</ul>`
            : `<p style="font-size: 1.3rem; opacity: 0.8;">${i === 0 ? "Gerado por Reborn AI" : slide.content.join(" • ")}</p>`
        }
      </div>
      ${
        i !== 0 && i !== slidesData.length - 1
          ? `<div class="slide-image">
        <img src="https://image.pollinations.ai/prompt/${encodeURIComponent(slide.imageQuery || slide.title)}?width=800&height=1000&nologo=true" alt="${slide.title}" loading="lazy" />
      </div>`
          : ""
      }
      <div class="slide-number">${i + 1} / ${slidesData.length}</div>
    </div>
    `,
      )
      .join("")}
  </div>
  <div class="progress" id="progress"></div>
  <div class="controls">
    <button id="prev">←</button>
    <button id="next">→</button>
  </div>
  <div class="logo">REBORN AI</div>
  <script>
    let current = 0;
    const slides = document.querySelectorAll('.slide');
    const total = slides.length;
    const progress = document.getElementById('progress');
    const prevBtn = document.getElementById('prev');
    const nextBtn = document.getElementById('next');

    function showSlide(n) {
      slides.forEach(s => s.classList.remove('active'));
      current = Math.max(0, Math.min(n, total - 1));
      slides[current].classList.add('active');
      progress.style.width = ((current + 1) / total * 100) + '%';
      prevBtn.disabled = current === 0;
      nextBtn.disabled = current === total - 1;
    }

    prevBtn.onclick = () => showSlide(current - 1);
    nextBtn.onclick = () => showSlide(current + 1);
    document.onkeydown = (e) => {
      if (e.key === 'ArrowRight' || e.key === ' ') showSlide(current + 1);
      if (e.key === 'ArrowLeft') showSlide(current - 1);
      if (e.key === 'f') document.documentElement.requestFullscreen?.();
      if (e.key === 'Escape') document.exitFullscreen?.();
    };
    showSlide(0);
  </script>
</body>
</html>`

    return NextResponse.json({
      success: true,
      html,
      slides: slidesData,
      template: templateStyle.name,
    })
  } catch (error: any) {
    console.error("Presentation generation error:", error)
    return NextResponse.json({ success: false, error: error.message || "Erro ao gerar apresentação" }, { status: 500 })
  }
}
