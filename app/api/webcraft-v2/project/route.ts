import { generateText } from "ai"
import { getAIModel } from "@/lib/ai-config"

export const maxDuration = 60

type ProjectRequest = {
  prompt?: string
  currentHtml?: string
  projectName?: string
  language?: string
}

type ProjectFile = { path: string; content: string }

const BASE_CSS = `:root {
  color-scheme: light;
  --background: #f6f7fb;
  --foreground: #111827;
  --card: #ffffff;
  --muted: #6b7280;
  --border: #e5e7eb;
  --primary: #6d5dfc;
}
* { box-sizing: border-box; }
html { scroll-behavior: smooth; }
body { margin: 0; background: var(--background); color: var(--foreground); font-family: Arial, Helvetica, sans-serif; }
button, input, textarea, select { font: inherit; }
a { color: inherit; text-decoration: none; }
`

function slugify(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48) || "lumin-ai-app"
}

function parseFiles(output: string): ProjectFile[] {
  const files: ProjectFile[] = []
  const regex = /<file\s+path="([^"]+)">\s*([\s\S]*?)\s*<\/file>/g
  let match: RegExpExecArray | null
  while ((match = regex.exec(output))) {
    const path = match[1].trim().replace(/^\/+/, "")
    if (!path || path.includes("..")) continue
    if (!/^(app|components|lib|supabase)\//.test(path)) continue
    if (!/\.(tsx|ts|css|sql|md)$/.test(path)) continue
    files.push({ path, content: match[2].trim() + "\n" })
  }
  return files
}

function scaffoldFiles(name: string): ProjectFile[] {
  const packageJson = {
    name,
    version: "0.1.0",
    private: true,
    scripts: { dev: "next dev", build: "next build", start: "next start" },
    dependencies: {
      "@supabase/ssr": "0.12.7",
      "@supabase/supabase-js": "2.116.0",
      next: "16.3.4",
      react: "19.3.0",
      "react-dom": "19.3.0",
    },
    devDependencies: {
      "@types/node": "22.18.6",
      "@types/react": "19.1.16",
      "@types/react-dom": "19.1.9",
      typescript: "5.9.2",
    },
  }

  return [
    { path: "package.json", content: JSON.stringify(packageJson, null, 2) + "\n" },
    { path: "next.config.ts", content: `import type { NextConfig } from "next"\n\nconst nextConfig: NextConfig = {}\n\nexport default nextConfig\n` },
    { path: "tsconfig.json", content: JSON.stringify({ compilerOptions: { target: "ES2017", lib: ["dom", "dom.iterable", "esnext"], allowJs: false, skipLibCheck: true, strict: true, noEmit: true, esModuleInterop: true, module: "esnext", moduleResolution: "bundler", resolveJsonModule: true, isolatedModules: true, jsx: "react-jsx", incremental: true, plugins: [{ name: "next" }], paths: { "@/*": ["./*"] } }, include: ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"], exclude: ["node_modules"] }, null, 2) + "\n" },
    { path: ".env.example", content: "NEXT_PUBLIC_SUPABASE_URL=\nNEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=\n" },
    { path: ".gitignore", content: ".next\nnode_modules\n.env\n.env.local\n.vercel\n" },
    { path: "app/globals.css", content: BASE_CSS },
    { path: "app/layout.tsx", content: `import type { Metadata } from "next"\nimport "./globals.css"\n\nexport const metadata: Metadata = { title: ${JSON.stringify(name)}, description: "Built with Lumin AI Studio" }\n\nexport default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {\n  return <html lang="pt"><body>{children}</body></html>\n}\n` },
    { path: "lib/supabase/client.ts", content: `import { createBrowserClient } from "@supabase/ssr"\n\nexport function createClient() {\n  return createBrowserClient(\n    process.env.NEXT_PUBLIC_SUPABASE_URL!,\n    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!\n  )\n}\n` },
    { path: "lib/supabase/server.ts", content: `import { createServerClient } from "@supabase/ssr"\nimport { cookies } from "next/headers"\n\nexport async function createClient() {\n  const cookieStore = await cookies()\n  return createServerClient(\n    process.env.NEXT_PUBLIC_SUPABASE_URL!,\n    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,\n    {\n      cookies: {\n        getAll() { return cookieStore.getAll() },\n        setAll(cookiesToSet, _headers) {\n          try {\n            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))\n          } catch {\n            // Server Components cannot always write cookies; proxy refresh handles this.\n          }\n        },\n      },\n    }\n  )\n}\n` },
    { path: "proxy.ts", content: `import { createServerClient } from "@supabase/ssr"\nimport { NextResponse, type NextRequest } from "next/server"\n\nexport async function proxy(request: NextRequest) {\n  let response = NextResponse.next({ request })\n  const supabase = createServerClient(\n    process.env.NEXT_PUBLIC_SUPABASE_URL!,\n    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,\n    { cookies: {\n      getAll() { return request.cookies.getAll() },\n      setAll(cookiesToSet, headers) {\n        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))\n        response = NextResponse.next({ request })\n        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))\n        Object.entries(headers).forEach(([key, value]) => response.headers.set(key, value))\n      },\n    } }\n  )\n  await supabase.auth.getUser()\n  return response\n}\n\nexport const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"] }\n` },
    { path: "README.md", content: `# ${name}\n\nProjeto gerado pelo Lumin AI Studio.\n\n## Arranque\n1. Copia \`.env.example\` para \`.env.local\`.\n2. Preenche URL e publishable key do Supabase.\n3. Executa \`npm install\` e depois \`npm run dev\`.\n4. Se existir SQL em \`supabase/migrations\`, aplica-o ao teu projeto Supabase antes de usar dados reais.\n\nNunca coloques uma service role/secret key em variáveis \`NEXT_PUBLIC_*\`.\n` },
  ]
}

type EmbeddedAsset = {
  token: string
  dataUrl: string
}

function maskEmbeddedImages(html: string) {
  const assets: EmbeddedAsset[] = []
  const seen = new Map<string, string>()
  const pattern = /data:image\/(?:jpeg|jpg|png|webp);base64,[a-z0-9+/=\s]+/gi

  const maskedHtml = html.replace(pattern, (dataUrl) => {
    const existing = seen.get(dataUrl)
    if (existing) return existing
    const token = `__LUMIN_EMBEDDED_ASSET_${assets.length + 1}__`
    seen.set(dataUrl, token)
    assets.push({ token, dataUrl })
    return token
  })

  return { maskedHtml, assets }
}

function restoreEmbeddedImages(files: ProjectFile[], assets: EmbeddedAsset[]) {
  if (!assets.length) return files
  return files.map((file) => {
    let content = file.content
    for (const asset of assets) {
      content = content.split(asset.token).join(asset.dataUrl)
    }
    return { ...file, content }
  })
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as ProjectRequest
    const prompt = body.prompt?.trim()
    if (!prompt) return Response.json({ error: "Falta a descrição do projeto." }, { status: 400 })

    const projectName = slugify(body.projectName || prompt.slice(0, 40))
    const language = body.language?.trim() || "Português de Portugal (PT-PT)"
    const { maskedHtml, assets: embeddedAssets } = maskEmbeddedImages(body.currentHtml || "")
    const visualReference = maskedHtml.slice(0, 50000)
    const embeddedAssetGuide = embeddedAssets.length
      ? `\nASSETS DO PREVIEW:\n${embeddedAssets
          .map((asset, index) => `${index + 1}. ${asset.token} = imagem real do preview; usa este token exatamente no src quando essa imagem fizer sentido.`)
          .join("\n")}\nNão transformes estes tokens em URLs nem inventes substitutos. O servidor volta a inserir as imagens reais no fim.\n`
      : ""
    const currentYear = new Date().getFullYear()

    const result = await generateText({
      model: getAIModel(),
      system: `És o motor interno full-stack do Lumin AI Studio. Gera código de uma aplicação Next.js 16 App Router realmente executável.\n\nCONTEXTO:\n- Ano atual: ${currentYear}.\n- O produto visível chama-se Lumin AI Studio. Nunca mostres REBORN AI ao cliente final.\n- Copyright e datas devem ser atuais; quando possível usa ano dinâmico.\n\nREGRAS:\n- Responde apenas com blocos <file path="caminho">conteúdo</file>.\n- Podes criar ficheiros apenas dentro de app/, components/, lib/ e supabase/.\n- Tens obrigatoriamente de gerar app/page.tsx.\n- Usa TypeScript/React e CSS normal; não importes bibliotecas que não estejam no package base.\n- Supabase já estará configurado em lib/supabase/client.ts e server.ts. Usa-o quando fizer sentido.\n- Para Auth no cliente usa a publishable key através do helper existente. Nunca uses service_role/secret key no browser.\n- Se criares tabelas, inclui supabase/migrations/0001_init.sql, ativa RLS em todas as tabelas public e cria políticas por utilizador com auth.uid() = user_id.\n- UPDATE deve ter USING e WITH CHECK.\n- Não uses auth.role() nem SECURITY DEFINER.\n- Não uses user_metadata para autorização.\n- Não finjas integrações que não existam.\n- Cria estados vazios/erro/loading e uma experiência mobile responsiva.\n- Texto visível em ${language}.\n- Limite: até 10 ficheiros gerados para manter o projeto simples e robusto.
- Se a referência visual contiver tokens __LUMIN_EMBEDDED_ASSET_N__, usa-os exatamente como src de <img> quando corresponderem à estrutura visual. Não coloques base64 no raciocínio nem inventes URLs alternativas.
- Mantém imagens de marketing/posters/screenshots grandes e legíveis; não as reduzas a ícones ou avatares.`,
      prompt: `PROJETO PEDIDO:\n${prompt}\n\n${visualReference ? `REFERÊNCIA VISUAL DO PREVIEW ATUAL (preserva a identidade e estrutura quando útil):\n${visualReference}` : ""}${embeddedAssetGuide}\n\nGera agora os ficheiros específicos da aplicação.`,
    })

    let generated = restoreEmbeddedImages(parseFiles(result.text), embeddedAssets)
    if (!generated.some((file) => file.path === "app/page.tsx")) {
      const retry = await generateText({
        model: getAIModel(),
        system: `És o motor full-stack do Lumin AI Studio. Responde EXCLUSIVAMENTE com blocos <file path="...">...</file>. Gera obrigatoriamente app/page.tsx em React/TypeScript, sem markdown fences. Usa apenas app/, components/, lib/ e supabase/. Texto visível em ${language}.`,
        prompt: `Cria uma versão Next.js App Router simples, robusta e responsiva deste projeto: ${prompt}. Preserva a identidade do preview descrito abaixo, mas prioriza devolver código válido.\n\n${visualReference.slice(0, 18000)}${embeddedAssetGuide}`,
      })
      generated = restoreEmbeddedImages(parseFiles(retry.text), embeddedAssets)
    }

    if (!generated.some((file) => file.path === "app/page.tsx")) {
      return Response.json({ error: "Não foi possível converter o preview em Full-Stack desta vez. Tenta novamente." }, { status: 502 })
    }

    const base = scaffoldFiles(projectName)
    const merged = new Map<string, ProjectFile>()
    for (const file of base) merged.set(file.path, file)
    for (const file of generated) merged.set(file.path, file)

    return Response.json({
      name: projectName,
      framework: "Next.js 16 + Supabase",
      files: Array.from(merged.values()),
    })
  } catch (error: any) {
    console.error("[lumin-ai-studio] full-stack error:", error)
    return Response.json({ error: error?.message || "Erro ao gerar projeto full-stack" }, { status: 500 })
  }
}
