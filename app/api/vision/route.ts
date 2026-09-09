import { streamText } from "ai"
import { getVisionModel } from "@/lib/ai-config"

export const maxDuration = 120

const MAX_IMAGE_SIZE = 3 * 1024 * 1024
const MAX_TOTAL_SIZE = 4 * 1024 * 1024

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

function jsonError(error: string, code: string, status: number) {
  return new Response(JSON.stringify({ error, code }), {
    status,
    headers: { "Content-Type": "application/json" },
  })
}

export async function POST(req: Request) {
  try {
    const contentLength = req.headers.get("content-length")
    if (contentLength && Number(contentLength) > 4.5 * 1024 * 1024) {
      return jsonError(
        "Ficheiro muito grande. Usa imagens até 3 MB ou comprime o ficheiro antes de enviar.",
        "FILE_TOO_LARGE",
        413,
      )
    }

    const body = await req.json()
    const { files, mode = "describe", customPrompt = "" } = body

    if (!Array.isArray(files) || files.length === 0) {
      return jsonError("Nenhum ficheiro enviado.", "NO_FILE", 400)
    }

    const systemPrompt = `IDENTIDADE: O teu nome é REBORN AI Vision.
És o sistema de visão computacional e OCR da plataforma Reborn AI.
Analisa imagens, PDFs, screenshots e outros ficheiros visuais com precisão profissional.
Responde no idioma do utilizador. Quando não for possível determinar o idioma, usa Português de Portugal.
Usa Markdown para organizar as respostas de forma clara e legível.`

    const contentParts: any[] = []
    const instruction = customPrompt.trim() ? customPrompt.trim() : MODE_PROMPTS[mode] || MODE_PROMPTS.describe
    contentParts.push({ type: "text", text: instruction })

    let totalSize = 0

    for (const file of files) {
      const { dataUrl, mimeType, name } = file || {}

      if (typeof dataUrl !== "string" || typeof mimeType !== "string") continue

      const base64Data = dataUrl.split(",")[1]
      if (!base64Data) continue

      const fileSize = (base64Data.length * 3) / 4
      totalSize += fileSize

      if (fileSize > MAX_IMAGE_SIZE && mimeType !== "application/pdf") {
        return jsonError(
          `A imagem ${name ? `"${name}" ` : ""}ultrapassa 3 MB. Comprime-a antes de enviar.`,
          "IMAGE_TOO_LARGE",
          413,
        )
      }

      if (totalSize > MAX_TOTAL_SIZE) {
        return jsonError(
          `Os ficheiros totalizam ${(totalSize / 1024 / 1024).toFixed(1)} MB. O máximo permitido é 4 MB.`,
          "TOTAL_SIZE_EXCEEDED",
          413,
        )
      }

      if (mimeType === "application/pdf") {
        contentParts.push({
          type: "file",
          data: Buffer.from(base64Data, "base64"),
          mimeType: "application/pdf",
        })
      } else if (mimeType.startsWith("image/")) {
        contentParts.push({
          type: "image",
          image: `data:${mimeType};base64,${base64Data}`,
        })
      } else {
        return jsonError(`Formato não suportado: ${mimeType}`, "UNSUPPORTED_FILE_TYPE", 415)
      }

      if (files.length > 1 && name) {
        contentParts.push({ type: "text", text: `[Ficheiro: ${name}]` })
      }
    }

    if (contentParts.length <= 1) {
      return jsonError("Nenhum ficheiro válido foi enviado.", "NO_VALID_FILE", 400)
    }

    const result = streamText({
      model: getVisionModel(),
      system: systemPrompt,
      messages: [{ role: "user", content: contentParts }],
      maxTokens: 2048,
    })

    return result.toTextStreamResponse()
  } catch (error: any) {
    console.error("Vision API error:", error)

    if (error?.message?.includes("Too Large") || error?.message?.includes("PAYLOAD")) {
      return jsonError(
        "Ficheiro muito grande. Usa imagens menores ou comprime antes de enviar.",
        "PAYLOAD_TOO_LARGE",
        413,
      )
    }

    return jsonError(error?.message || "Erro na análise visual", "VISION_ERROR", 500)
  }
}
