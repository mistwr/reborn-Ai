import { streamText } from "ai"

export const maxDuration = 60

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
      model: "google/gemini-2.0-flash-001" as any,
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
- Use imagens reais do Unsplash Source: https://source.unsplash.com/featured/1200x800/?keyword
- Para Hero: https://source.unsplash.com/featured/1920x1080/?business,technology
- Para Equipa: https://source.unsplash.com/featured/400x400/?portrait,professional
- Para Produtos: https://source.unsplash.com/featured/800x800/?product
- Para Galeria: https://source.unsplash.com/featured/800x600/?office,workspace
- Substitua "keyword" por palavras relevantes ao negocio
- NUNCA use imagens genericas ou de placeholder cinzento
- Cada imagem deve ter keywords diferentes para variedade

IMPORTANTE: 
- Retorne APENAS o código HTML puro
- Não inclua explicações ou markdown
- O código deve estar pronto para produção
- Todas as imagens devem carregar de fontes reais (Unsplash)`,
      prompt: `Crie um website completo e profissional para: ${prompt || `Um negócio de ${category || template}`}`,
    })

    return result.toTextStreamResponse()
  } catch (error: any) {
    console.error("[v0] Website error:", error)
    return Response.json({ error: "Erro ao gerar website" }, { status: 500 })
  }
}
