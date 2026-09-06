import { streamText } from "ai"

export const maxDuration = 60

const DEFAULT_AI_MODEL = "google/gemini-3.6-flash"

export async function POST(req: Request) {
  try {
    const { prompt, template, category, palette, features, businessName, businessPhone, businessEmail } =
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

    const result = streamText({
      model: process.env.AI_MODEL || DEFAULT_AI_MODEL,
      system: `Você é um expert web developer especializado em criar websites profissionais e modernos.

REQUISITOS OBRIGATÓRIOS:
1. HTML completo em um único arquivo começando com <!DOCTYPE html>
2. Use Tailwind CSS via CDN: <script src="https://cdn.tailwindcss.com"></script>
3. Adicione ícones Font Awesome: <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
4. JavaScript vanilla para interatividade
5. Design profissional, moderno e RESPONSIVO (mobile-first)
6. Conteúdo realista e relevante (NUNCA use lorem ipsum)
7. Meta tags completas para SEO
8. Animações sutis com CSS transitions
9. Navegação funcional com smooth scroll
10. Footer profissional com links e redes sociais

${category ? `CATEGORIA DO NEGÓCIO: ${category}` : ""}
${template ? `TEMPLATE: ${template}` : ""}
${colorInfo}
${featuresText}
${contactInfo}

SECÇÕES ESPECIAIS:
- Se incluir "chatbot": Adicione um botão flutuante de chat no canto inferior direito com widget de chat simples
- Se incluir "newsletter": Adicione formulário de subscrição de email funcional
- Se incluir "testimonials": Adicione slider/carrossel de testemunhos
- Se incluir "gallery": Adicione galeria de imagens com lightbox
- Se incluir "pricing": Adicione tabela de preços com destaque no plano recomendado

IDENTIDADE - REGRA ABSOLUTA:
- Esta ferramenta chama-se REBORN AI. NUNCA menciones "Gemini", "Google", "GPT", "OpenAI", "Claude", "Anthropic", "Flash" ou qualquer outro modelo/empresa no conteúdo gerado.
- Se o footer ou qualquer secção mencionar a ferramenta de criação, usa SEMPRE "Criado com Reborn AI" ou "Powered by Reborn AI".

IMAGENS DE ALTA QUALIDADE (OBRIGATORIO):
- Use Lorem Picsum para imagens: https://picsum.photos/LARGURA/ALTURA?random=NUMERO
- Para Hero: https://picsum.photos/1920/1080?random=1
- Para Equipa/Avatares: https://i.pravatar.cc/400?img=NUMERO (1-70)
- Para Features/Cards: https://picsum.photos/800/600?random=2
- Para Galeria: https://picsum.photos/600/400?random=3, ?random=4, etc
- Para Produtos: https://picsum.photos/500/500?random=5
- MUDA o numero ?random=X para cada imagem ter conteudo diferente
- Para logos de clientes usa: https://logo.clearbit.com/google.com, microsoft.com, apple.com, etc
- NUNCA uses imagens quebradas ou placeholders cinzentos

IMPORTANTE: 
- Retorne APENAS o código HTML puro
- Não inclua explicações ou markdown
- O código deve estar pronto para produção
- Todas as imagens DEVEM carregar (usa picsum.photos e pravatar.cc)`,
      prompt: `Crie um website completo e profissional para: ${prompt || `Um negócio de ${category || template}`}`,
    })

    return result.toTextStreamResponse()
  } catch (error: any) {
    console.error("[reborn] Website error:", error)
    return Response.json({ error: "Erro ao gerar website" }, { status: 500 })
  }
}
