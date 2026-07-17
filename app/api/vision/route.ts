import { streamText } from "ai"

export const maxDuration = 120

// Maximum size for image data (3MB to stay under Vercel limits)
const MAX_IMAGE_SIZE = 3 * 1024 * 1024

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

// Compress base64 image by reducing quality/size if needed
function compressBase64Image(base64Data: string, mimeType: string): string {
  // Calculate approximate size
  const sizeInBytes = (base64Data.length * 3) / 4
  
  if (sizeInBytes <= MAX_IMAGE_SIZE) {
    return base64Data
  }
  
  // For now, just truncate if too large (client should compress)
  // In production, would use sharp or similar for proper compression
  console.warn(`Image too large: ${(sizeInBytes / 1024 / 1024).toFixed(2)}MB, max ${MAX_IMAGE_SIZE / 1024 / 1024}MB`)
  return base64Data
}

export async function POST(req: Request) {
  try {
    // Check content length header first
    const contentLength = req.headers.get("content-length")
    if (contentLength && parseInt(contentLength) > 4.5 * 1024 * 1024) {
      return new Response(
        JSON.stringify({ 
          error: "Ficheiro muito grande. Por favor, usa imagens menores (max 3MB) ou comprime o ficheiro antes de enviar.",
          code: "FILE_TOO_LARGE"
        }), 
        { status: 413, headers: { "Content-Type": "application/json" } }
      )
    }

    const body = await req.json()
    const {
      files,
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

    // Track total size
    let totalSize = 0
    const maxTotalSize = 4 * 1024 * 1024 // 4MB total for all files

    // Add each file as an image or file part
    for (const file of files) {
      const { dataUrl, mimeType, name } = file

      // Extract base64 data from data URL
      const base64Data = dataUrl.split(",")[1]
      if (!base64Data) continue

      // Check size
      const fileSize = (base64Data.length * 3) / 4
      totalSize += fileSize
      
      if (totalSize > maxTotalSize) {
        return new Response(
          JSON.stringify({ 
            error: `Ficheiros muito grandes (${(totalSize / 1024 / 1024).toFixed(1)}MB). Maximo permitido: 4MB total. Por favor, comprime as imagens.`,
            code: "TOTAL_SIZE_EXCEEDED"
          }), 
          { status: 413, headers: { "Content-Type": "application/json" } }
        )
      }

      if (mimeType === "application/pdf") {
        // PDFs sent as file part
        contentParts.push({
          type: "file",
          data: Buffer.from(base64Data, "base64"),
          mimeType: "application/pdf",
        })
      } else {
        // Images - use data URL format
        const compressedData = compressBase64Image(base64Data, mimeType)
        contentParts.push({
          type: "image",
          image: `data:${mimeType};base64,${compressedData}`,
        })
      }

      // Add filename context if multiple files
      if (files.length > 1) {
        contentParts.push({ type: "text", text: `[Ficheiro: ${name}]` })
      }
    }

    const result = streamText({
      model: process.env.AI_VISION_MODEL || "gpt-4-vision-preview",
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: contentParts,
        },
      ],
      maxTokens: 2048,
    })

    return result.toTextStreamResponse()
  } catch (error: any) {
    console.error("Vision API error:", error)
    
    // Handle specific errors
    if (error?.message?.includes("Too Large") || error?.message?.includes("PAYLOAD")) {
      return new Response(
        JSON.stringify({ 
          error: "Ficheiro muito grande. Por favor, usa imagens menores ou comprime antes de enviar.",
          code: "PAYLOAD_TOO_LARGE"
        }), 
        { status: 413, headers: { "Content-Type": "application/json" } }
      )
    }
    
    return new Response(JSON.stringify({ error: error?.message || "Erro na análise visual" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }
}
