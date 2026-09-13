type ValidationIssue = {
  code: string
  level: "error" | "warning" | "info"
  message: string
}

type ValidationResult = {
  score: number
  issues: ValidationIssue[]
  fixedHtml: string
}

function ensureViewport(html: string) {
  if (/name=["']viewport["']/i.test(html)) return html
  return html.replace(/<head(\s[^>]*)?>/i, (match) => `${match}\n<meta name="viewport" content="width=device-width, initial-scale=1" />`)
}

function ensureLang(html: string) {
  if (/<html[^>]*\slang=/i.test(html)) return html
  return html.replace(/<html(\s[^>]*)?>/i, (_match, attrs = "") => `<html${attrs} lang="pt-PT">`)
}

function normalizeBranding(html: string) {
  return html
    .replace(/Powered by\s+Reborn AI/gi, "Powered by Lumin AI Studio")
    .replace(/Criado com\s+Reborn AI/gi, "Criado com Lumin AI Studio")
    .replace(/REBORN AI WebCraft/gi, "Lumin AI Studio")
}

function normalizeCopyright(html: string, year: number) {
  return html.replace(/(©|&copy;|copyright\s*)\s*(20(?:1\d|2[0-5]))/gi, (_m, prefix) => `${prefix} ${year}`)
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const input = typeof body?.html === "string" ? body.html.trim() : ""
    if (!input) return Response.json({ error: "Falta o HTML a validar." }, { status: 400 })

    const issues: ValidationIssue[] = []
    const currentYear = new Date().getFullYear()

    if (!/^<!doctype html>/i.test(input)) {
      issues.push({ code: "doctype", level: "error", message: "DOCTYPE HTML em falta." })
    }
    if (!/<html[\s>]/i.test(input)) {
      issues.push({ code: "html-root", level: "error", message: "Elemento <html> em falta." })
    }
    if (!/<head[\s>]/i.test(input)) {
      issues.push({ code: "head", level: "error", message: "Elemento <head> em falta." })
    }
    if (!/<body[\s>]/i.test(input)) {
      issues.push({ code: "body", level: "error", message: "Elemento <body> em falta." })
    }
    if (!/name=["']viewport["']/i.test(input)) {
      issues.push({ code: "viewport", level: "warning", message: "Meta viewport em falta para mobile." })
    }
    if (!/<html[^>]*\slang=/i.test(input)) {
      issues.push({ code: "lang", level: "warning", message: "Idioma do documento não está definido." })
    }
    if (/Powered by\s+Reborn AI|Criado com\s+Reborn AI|REBORN AI WebCraft/i.test(input)) {
      issues.push({ code: "branding", level: "warning", message: "Branding interno Reborn exposto ao utilizador." })
    }

    const oldYearRegex = /(©|&copy;|copyright\s*)\s*(20(?:1\d|2[0-5]))/gi
    let match: RegExpExecArray | null
    while ((match = oldYearRegex.exec(input))) {
      const year = Number(match[2])
      if (year < currentYear) {
        issues.push({ code: "stale-year", level: "warning", message: `Copyright antigo detetado (${year}); ano atual é ${currentYear}.` })
        break
      }
    }

    if (/<form[\s>]/i.test(input) && !/<label[\s>]/i.test(input)) {
      issues.push({ code: "form-labels", level: "warning", message: "Existem formulários sem labels visíveis; rever acessibilidade." })
    }
    if (/href=["']#["']/i.test(input)) {
      issues.push({ code: "empty-links", level: "info", message: "Existem links vazios (#) que podem precisar de destino real." })
    }
    if (/lorem ipsum/i.test(input)) {
      issues.push({ code: "lorem", level: "warning", message: "Foi encontrado conteúdo Lorem Ipsum." })
    }

    let fixedHtml = input
    if (!/^<!doctype html>/i.test(fixedHtml)) fixedHtml = `<!DOCTYPE html>\n${fixedHtml}`
    fixedHtml = ensureViewport(fixedHtml)
    fixedHtml = ensureLang(fixedHtml)
    fixedHtml = normalizeBranding(fixedHtml)
    fixedHtml = normalizeCopyright(fixedHtml, currentYear)

    const penalty = issues.reduce((sum, issue) => sum + (issue.level === "error" ? 20 : issue.level === "warning" ? 8 : 2), 0)
    const result: ValidationResult = {
      score: Math.max(0, 100 - penalty),
      issues,
      fixedHtml,
    }

    return Response.json(result)
  } catch (error: any) {
    return Response.json({ error: error?.message || "Erro ao validar projeto" }, { status: 500 })
  }
}
