import { generateText } from "ai"
import { NextResponse } from "next/server"

const EBOOK_STYLES = {
  modern: {
    fontFamily: "'Segoe UI', system-ui, sans-serif",
    headerColor: "#1e40af",
    textColor: "#1f2937",
    bgColor: "#ffffff",
    accentColor: "#3b82f6",
    coverBg: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
  },
  classic: {
    fontFamily: "'Georgia', 'Times New Roman', serif",
    headerColor: "#7c2d12",
    textColor: "#292524",
    bgColor: "#fef3c7",
    accentColor: "#b45309",
    coverBg: "linear-gradient(135deg, #92400e 0%, #78350f 100%)",
  },
  minimal: {
    fontFamily: "'Inter', system-ui, sans-serif",
    headerColor: "#171717",
    textColor: "#404040",
    bgColor: "#fafafa",
    accentColor: "#525252",
    coverBg: "linear-gradient(135deg, #374151 0%, #111827 100%)",
  },
  dark: {
    fontFamily: "'SF Pro', system-ui, sans-serif",
    headerColor: "#e2e8f0",
    textColor: "#cbd5e1",
    bgColor: "#0f172a",
    accentColor: "#818cf8",
    coverBg: "linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)",
  },
  nature: {
    fontFamily: "'Merriweather', Georgia, serif",
    headerColor: "#166534",
    textColor: "#14532d",
    bgColor: "#f0fdf4",
    accentColor: "#22c55e",
    coverBg: "linear-gradient(135deg, #166534 0%, #15803d 100%)",
  },
  ocean: {
    fontFamily: "'Source Sans Pro', sans-serif",
    headerColor: "#0e7490",
    textColor: "#164e63",
    bgColor: "#ecfeff",
    accentColor: "#06b6d4",
    coverBg: "linear-gradient(135deg, #0891b2 0%, #0e7490 100%)",
  },
  sunset: {
    fontFamily: "'Playfair Display', serif",
    headerColor: "#9a3412",
    textColor: "#431407",
    bgColor: "#fff7ed",
    accentColor: "#f97316",
    coverBg: "linear-gradient(135deg, #ea580c 0%, #dc2626 100%)",
  },
  royal: {
    fontFamily: "'Cormorant Garamond', serif",
    headerColor: "#581c87",
    textColor: "#3b0764",
    bgColor: "#faf5ff",
    accentColor: "#a855f7",
    coverBg: "linear-gradient(135deg, #7e22ce 0%, #581c87 100%)",
  },
  tech: {
    fontFamily: "'JetBrains Mono', monospace",
    headerColor: "#0ea5e9",
    textColor: "#0c4a6e",
    bgColor: "#f0f9ff",
    accentColor: "#38bdf8",
    coverBg: "linear-gradient(135deg, #0284c7 0%, #0369a1 100%)",
  },
  vintage: {
    fontFamily: "'Libre Baskerville', serif",
    headerColor: "#78716c",
    textColor: "#44403c",
    bgColor: "#fafaf9",
    accentColor: "#a8a29e",
    coverBg: "linear-gradient(135deg, #57534e 0%, #44403c 100%)",
  },
  neon: {
    fontFamily: "'Rajdhani', sans-serif",
    headerColor: "#f0abfc",
    textColor: "#e879f9",
    bgColor: "#18181b",
    accentColor: "#d946ef",
    coverBg: "linear-gradient(135deg, #c026d3 0%, #9333ea 100%)",
  },
  magazine: {
    fontFamily: "'Montserrat', sans-serif",
    headerColor: "#be123c",
    textColor: "#1f2937",
    bgColor: "#ffffff",
    accentColor: "#e11d48",
    coverBg: "linear-gradient(135deg, #be123c 0%, #9f1239 100%)",
  },
}

export async function POST(req: Request) {
  try {
    const { prompt, title, author = "Reborn AI", style = "modern", chapters = 5 } = await req.json()

    const bookStyle = EBOOK_STYLES[style as keyof typeof EBOOK_STYLES] || EBOOK_STYLES.modern

    const { text } = await generateText({
      model: process.env.AI_MODEL || "deepseek-chat",
      prompt: `Escreve um ebook profissional sobre: "${prompt}"
Título: "${title || prompt}"
Autor: ${author}

Gera exatamente ${chapters} capítulos completos.
Cada capítulo deve ter: title, content (texto completo do capítulo com pelo menos 4 parágrafos detalhados)

REGRA DE IDENTIDADE: Esta ferramenta chama-se REBORN AI. NUNCA menciones "Gemini", "Google", "GPT", "OpenAI", "Claude" ou qualquer nome de modelo/empresa no conteúdo gerado.

Responde APENAS com JSON array, sem markdown:
[{"title": "Capítulo 1: ...", "content": "Texto completo do capítulo..."}]`,
    })

    let chaptersData
    try {
      const jsonMatch = text.match(/\[[\s\S]*\]/)
      chaptersData = jsonMatch ? JSON.parse(jsonMatch[0]) : []
    } catch {
      chaptersData = [
        { title: "Introdução", content: `Este ebook sobre "${prompt}" foi gerado automaticamente pelo Reborn AI.` },
      ]
    }

    const finalTitle = title || prompt
    const coverImageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(`book cover for "${finalTitle}", professional, elegant, ${style} style`)}?width=800&height=1200&nologo=true`

    const html = `<!DOCTYPE html>
<html lang="pt">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${finalTitle}</title>
  <link href="https://fonts.googleapis.com/css2?family=Merriweather:wght@400;700&family=Playfair+Display:wght@400;700&family=Source+Sans+Pro:wght@400;600&family=Cormorant+Garamond:wght@400;600&family=JetBrains+Mono:wght@400;500&family=Libre+Baskerville:wght@400;700&family=Rajdhani:wght@400;600&family=Montserrat:wght@400;600&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: ${bookStyle.fontFamily};
      background: ${bookStyle.bgColor};
      color: ${bookStyle.textColor};
      line-height: 1.9;
    }
    .cover {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      text-align: center;
      padding: 60px 40px;
      background: ${bookStyle.coverBg};
      color: white;
      position: relative;
      overflow: hidden;
    }
    .cover::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: url('${coverImageUrl}') center/cover;
      opacity: 0.15;
    }
    .cover-content {
      position: relative;
      z-index: 1;
    }
    .cover h1 {
      font-size: 3.5rem;
      margin-bottom: 30px;
      line-height: 1.2;
      text-shadow: 2px 2px 20px rgba(0,0,0,0.3);
    }
    .cover .subtitle {
      font-size: 1.3rem;
      opacity: 0.9;
      margin-bottom: 40px;
    }
    .cover .author {
      font-size: 1.5rem;
      margin-top: 40px;
      font-weight: 600;
    }
    .cover .generator {
      font-size: 0.9rem;
      opacity: 0.7;
      margin-top: 60px;
      padding-top: 20px;
      border-top: 1px solid rgba(255,255,255,0.3);
    }
    .content-wrapper {
      max-width: 800px;
      margin: 0 auto;
      padding: 60px 30px;
    }
    .toc {
      margin-bottom: 60px;
      padding: 40px;
      background: ${bookStyle.bgColor === "#ffffff" || bookStyle.bgColor === "#fafafa" ? "#f8fafc" : "rgba(255,255,255,0.05)"};
      border-radius: 12px;
      border: 1px solid ${bookStyle.bgColor === "#ffffff" ? "#e5e7eb" : "rgba(255,255,255,0.1)"};
    }
    .toc h2 {
      color: ${bookStyle.headerColor};
      margin-bottom: 25px;
      font-size: 1.8rem;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .toc h2::before {
      content: '📚';
    }
    .toc ul { list-style: none; }
    .toc li {
      padding: 12px 0;
      border-bottom: 1px solid ${bookStyle.bgColor === "#ffffff" ? "#e5e7eb" : "rgba(255,255,255,0.1)"};
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .toc li:last-child { border-bottom: none; }
    .toc a {
      color: ${bookStyle.accentColor};
      text-decoration: none;
      font-size: 1.1rem;
      transition: all 0.2s;
    }
    .toc a:hover { 
      color: ${bookStyle.headerColor};
      padding-left: 10px;
    }
    .toc .page-num {
      color: ${bookStyle.textColor};
      opacity: 0.5;
      font-size: 0.9rem;
    }
    .chapter {
      margin-bottom: 80px;
      page-break-before: always;
    }
    .chapter-header {
      margin-bottom: 40px;
      padding-bottom: 20px;
      border-bottom: 3px solid ${bookStyle.accentColor};
    }
    .chapter-number {
      font-size: 0.9rem;
      color: ${bookStyle.accentColor};
      text-transform: uppercase;
      letter-spacing: 2px;
      margin-bottom: 10px;
    }
    .chapter h2 {
      color: ${bookStyle.headerColor};
      font-size: 2.2rem;
      line-height: 1.3;
    }
    .chapter p {
      margin-bottom: 24px;
      text-align: justify;
      font-size: 1.1rem;
    }
    .chapter p:first-of-type::first-letter {
      font-size: 3.5rem;
      float: left;
      line-height: 1;
      margin-right: 10px;
      color: ${bookStyle.accentColor};
      font-weight: bold;
    }
    .footer {
      text-align: center;
      padding: 60px 40px;
      margin-top: 60px;
      background: ${bookStyle.coverBg};
      color: white;
    }
    .footer p { margin: 10px 0; }
    @media print {
      .cover { page-break-after: always; }
      .chapter { page-break-before: always; }
      body { font-size: 11pt; }
    }
    @media (max-width: 600px) {
      .cover h1 { font-size: 2rem; }
      .content-wrapper { padding: 30px 20px; }
      .chapter h2 { font-size: 1.6rem; }
    }
  </style>
</head>
<body>
  <div class="cover">
    <div class="cover-content">
      <h1>${finalTitle}</h1>
      <p class="subtitle">Um guia completo gerado por inteligência artificial</p>
      <p class="author">por ${author}</p>
      <p class="generator">Gerado com Reborn AI</p>
    </div>
  </div>

  <div class="content-wrapper">
    <nav class="toc">
      <h2>Índice</h2>
      <ul>
        ${chaptersData.map((ch: any, i: number) => `<li><a href="#chapter-${i + 1}">${ch.title}</a><span class="page-num">${i + 3}</span></li>`).join("")}
      </ul>
    </nav>

    ${chaptersData
      .map(
        (ch: any, i: number) => `
    <article class="chapter" id="chapter-${i + 1}">
      <div class="chapter-header">
        <div class="chapter-number">Capítulo ${i + 1}</div>
        <h2>${ch.title.replace(/^Capítulo \d+:\s*/i, "")}</h2>
      </div>
      ${ch.content
        .split("\n\n")
        .filter((p: string) => p.trim())
        .map((p: string) => `<p>${p}</p>`)
        .join("")}
    </article>
    `,
      )
      .join("")}
  </div>

  <footer class="footer">
    <p><strong>${finalTitle}</strong></p>
    <p>por ${author}</p>
    <p style="opacity: 0.7; margin-top: 20px;">Gerado automaticamente por Reborn AI</p>
  </footer>
</body>
</html>`

    return NextResponse.json({
      success: true,
      html,
      chapters: chaptersData,
      title: finalTitle,
      author,
    })
  } catch (error: any) {
    console.error("Ebook generation error:", error)
    return NextResponse.json({ success: false, error: error.message || "Erro ao gerar ebook" }, { status: 500 })
  }
}
