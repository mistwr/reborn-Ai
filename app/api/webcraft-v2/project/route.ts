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

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as ProjectRequest
    const prompt = body.prompt?.trim()
    if (!prompt) return Response.json({ error: "Falta a descrição do projeto." }, { status: 400 })

    const projectName = slugify(body.projectName || prompt.slice(0, 40))
    const language = body.language?.trim() || "Português de Portugal (PT-PT)"
    const visualReference = body.currentHtml?.slice(0, 30000) || ""
    const currentYear = new Date().getFullYear()

    const result = await generateText({
      model: getAIModel(),
      system: `És o motor interno full-stack do Lumin AI Studio. Gera código de uma aplicação Next.js 16 App Router realmente executável.\n\nCONTEXTO:\n- Ano atual: ${currentYear}.\n- O produto visível chama-se Lumin AI Studio. Nunca mostres REBORN AI ao cliente final.\n- Copyright e datas devem ser atuais; quando possível usa ano dinâmico.\n\nREGRAS:\n- Responde apenas com blocos <file path="caminho">conteúdo</file>.\n- Podes criar ficheiros apenas dentro de app/, components/, lib/ e supabase/.\n- Tens obrigatoriamente de gerar app/page.tsx.\n- Usa TypeScript/React e CSS normal; não importes bibliotecas que não estejam no package base.\n- Supabase já estará configurado em lib/supabase/client.ts e server.ts. Usa-o quando fizer sentido.\n- Para Auth no cliente usa a publishable key através do helper existente. Nunca uses service_role/secret key no browser.\n- Se criares tabelas, inclui supabase/migrations/0001_init.sql, ativa RLS em todas as tabelas public e cria políticas por utilizador com auth.uid() = user_id.\n- UPDATE deve ter USING e WITH CHECK.\n- Não uses auth.role() nem SECURITY DEFINER.\n- Não uses user_metadata para autorização.\n- Não finjas integrações que não existam.\n- Cria estados vazios/erro/loading e uma experiência mobile responsiva.\n- Texto visível em ${language}.\n- Limite: até 10 ficheiros gerados para manter o projeto simples e robusto.`,
      prompt: `PROJETO PEDIDO:\n${prompt}\n\n${visualReference ? `REFERÊNCIA VISUAL DO PREVIEW ATUAL (preserva a identidade e estrutura quando útil):\n${visualReference}` : ""}\n\nGera agora os ficheiros específicos da aplicação.`,
    })

    const generated = parseFiles(result.text)
    if (!generated.some((file) => file.path === "app/page.tsx")) {
      return Response.json({ error: "O modelo não devolveu um projeto válido. Tenta novamente." }, { status: 502 })
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
