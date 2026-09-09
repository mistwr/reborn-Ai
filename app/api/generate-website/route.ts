import { streamText } from "ai"
import { getAIModel } from "@/lib/ai-config"

export const maxDuration = 60

export async function POST(req: Request) {
  try {
    const { prompt, template, category, palette, features, businessName, businessPhone, businessEmail, language } =
      await req.json()

    if (!prompt && !template) {
      return Response.json({ error: "Prompt ou template é obrigatório" }, { status: 400 })
    }

    const featuresText = features?.length ? `Inclui as seguintes secções: ${features.join(", ")}` : ""

    const contactInfo =
      businessName || businessPhone || businessEmail
        ? `Informações de contacto:
         - Nome: ${businessName || "Empresa"}
         - Telefone: ${businessPhone || "+351 XXX XXX XXX"}
         - Email: ${businessEmail || "info@empresa.com"}`
        : ""

    const colorInfo = palette
      ? `Usa este esquema de cores:
         - Cor primária: ${palette.primary}
         - Cor escura: ${palette.colors[0]}
         - Cor clara: ${palette.colors[2]}
         Nome da paleta: ${palette.name}`
      : ""

    const requestedLanguage = typeof language === "string" && language.trim() ? language.trim() : "idioma do pedido do utilizador"

    const result = streamText({
      model: getAIModel(),
      system: `És o REBORN AI WebCraft, especialista em criar websites profissionais e modernos.

IDIOMA:
- Escreve todo o conteúdo visível do website no ${requestedLanguage}.
- Se o idioma não estiver explícito, deteta-o pelo pedido do utilizador.
- Se não for possível determinar, usa Português de Portugal (PT-PT).

REQUISITOS OBRIGATÓRIOS:
1. HTML completo num único ficheiro começando por <!DOCTYPE html>
2. Usa Tailwind CSS via CDN: <script src="https://cdn.tailwindcss.com"></script>
3. Adiciona Font Awesome: <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
4. JavaScript vanilla para interatividade
5. Design profissional, moderno e RESPONSIVO (mobile-first)
6. Conteúdo realista e relevante; nunca uses lorem ipsum
7. Meta tags completas para SEO
8. Animações subtis com CSS transitions
9. Navegação funcional com smooth scroll
10. Footer profissional com links e redes sociais

${category ? `CATEGORIA DO NEGÓCIO: ${category}` : ""}
${template ? `TEMPLATE: ${template}` : ""}
${colorInfo}
${featuresText}
${contactInfo}

SECÇÕES ESPECIAIS:
- Se incluir "chatbot": adiciona um botão flutuante de chat no canto inferior direito com widget simples
- Se incluir "newsletter": adiciona formulário de subscrição de email
- Se incluir "testimonials": adiciona slider/carrossel de testemunhos
- Se incluir "gallery": adiciona galeria de imagens com lightbox
- Se incluir "pricing": adiciona tabela de preços com destaque no plano recomendado

IDENTIDADE - REGRA ABSOLUTA:
- Esta ferramenta chama-se REBORN AI. Nunca menciones o fornecedor/modelo de IA no conteúdo gerado.
- Se o footer ou qualquer secção mencionar a ferramenta de criação, usa "Criado com Reborn AI" ou "Powered by Reborn AI".

IMAGENS:
- Usa Lorem Picsum para imagens genéricas: https://picsum.photos/LARGURA/ALTURA?random=NUMERO
- Hero: https://picsum.photos/1920/1080?random=1
- Equipa/Avatares: https://i.pravatar.cc/400?img=NUMERO
- Features/Cards: https://picsum.photos/800/600?random=2
- Galeria: https://picsum.photos/600/400?random=3
- Produtos: https://picsum.photos/500/500?random=5
- Usa números random diferentes para evitar repetição.

IMPORTANTE:
- Devolve APENAS o código HTML puro
- Não inclua explicações nem markdown
- O código deve estar pronto a abrir/publicar`,
      prompt: `Cria um website completo e profissional para: ${prompt || `Um negócio de ${category || template}`}`,
    })

    return result.toTextStreamResponse()
  } catch (error: any) {
    console.error("[reborn] Website error:", error)
    return Response.json({ error: error?.message || "Erro ao gerar website" }, { status: 500 })
  }
}
