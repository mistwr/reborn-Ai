import { streamText } from "ai"

export const maxDuration = 120

const MODE_PROMPTS: Record<string, string> = {
  ocr: `Extrai TODO o texto visível neste ficheiro com precisão máxima. 
Preserva a estrutura original: parágrafos, listas, tabelas, títulos e subtítulos.
Se houver múltiplas colunas, processa da esquerda para a direita.
Formata a saída em Markdown para máxima legibilidade.
No final, indica o número total de palavras extraídas.`,

  describe: `Descreve este ficheiro em detalhe completo em Português de Portugal.
Analisa:
- Conteúdo visual principal (objetos, pessoas, cenário, cores, composição)
- Texto presente (se algum)
- Contexto e possível propósito
- Detalhes técnicos relevantes (qualidade, estilo, formato)
Organiza a resposta com secções claras em Markdown.`,

  data: `Analisa este ficheiro focando em dados, gráficos, tabelas e informação estruturada.
Extrai e apresenta:
- Todas as tabelas em formato Markdown
- Gráficos: tipo, eixos, valores, tendências
- Estatísticas e métricas relevantes
- Conclusões e insights dos dados apresentados
Sê preciso com números e valores.`,

  identify: `Identifica e cataloga tudo o que está presente neste ficheiro.
Lista detalhadamente:
- Objetos reconhecíveis (marcas, logos, produtos)
- Pessoas (características, expressões, atividade)
- Texto e linguagem detetada
- Localização ou ambiente
- Elementos incomuns ou de interesse especial
Formata como lista estruturada em Markdown.`,
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const {
      files,         // Array de { dataUrl: string, mimeType: string, name: string }
      mode = "describe",
      customPrompt = "",
    } = body

    if (!files || files.length === 0) {
      return new Response(JSON.stringify({ error: "Nenhum ficheiro enviado." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      })
    }

    const systemPrompt = `IDENTIDADE - REGRA ABSOLUTA E INQUEBRAVEL: O teu nome e REBORN AI Vision. NUNCA digas que es Gemini, Google, GPT, Claude, Anthropic, Flash ou qualquer outro modelo/empresa. Responde SEMPRE: "Sou o Reborn AI Vision."

Es o Reborn AI Vision - um sistema avancado de visao computacional e OCR integrado na plataforma Reborn AI.
Analisas imagens, PDFs, screenshots e outros ficheiros visuais com precisao profissional.
Respondes SEMPRE em Portugues de Portugal.
Usas formatacao Markdown para organizar as respostas de forma clara e legivel.`

    // Build the user message content parts
    const contentParts: any[] = []

    // Add instruction text
    const instruction = customPrompt.trim()
      ? customPrompt.trim()
      : MODE_PROMPTS[mode] || MODE_PROMPTS.describe

    contentParts.push({ type: "text", text: instruction })

    // Add each file as an image or file part
    for (const file of files) {
      const { dataUrl, mimeType, name } = file

      // Extract base64 data from data URL
      const base64Data = dataUrl.split(",")[1]
      if (!base64Data) continue

      if (mimeType === "application/pdf") {
        // PDFs sent as file part (Gemini supports PDF natively)
        contentParts.push({
          type: "file",
          data: Buffer.from(base64Data, "base64"),
          mimeType: "application/pdf",
        })
      } else {
        // Images - AI SDK expects image as base64 string or URL
        contentParts.push({
          type: "image",
          image: `data:${mimeType};base64,${base64Data}`,
        })
      }

      // Add filename context if multiple files
      if (files.length > 1) {
        contentParts.push({ type: "text", text: `[Ficheiro: ${name}]` })
      }
    }

    const result = streamText({
      model: "google/gemini-2.0-flash-001" as any,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: contentParts,
        },
      ],
      maxOutputTokens: 4096,
    })

    return result.toTextStreamResponse()
  } catch (error: any) {
    console.error("Vision API error:", error)
    return new Response(JSON.stringify({ error: error?.message || "Erro na análise visual" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }
}
