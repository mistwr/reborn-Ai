"use client"

import { useMemo, useState } from "react"
import type { LucideIcon } from "lucide-react"
import {
  ArrowLeft,
  BookOpen,
  Eye,
  FolderOpen,
  Globe,
  ImagePlus,
  Images,
  Megaphone,
  MessageSquare,
  Presentation,
  Radio,
  Scissors,
  Search,
  Sparkles,
  Wand2,
} from "lucide-react"

type ToolCategory = "Criar" | "Analisar" | "Comunicar" | "Descobrir"

type ToolItem = {
  title: string
  description: string
  category: ToolCategory
  tab: string
  icon: LucideIcon
}

const categories = ["Todas", "Criar", "Analisar", "Comunicar", "Descobrir"] as const

const tools: ToolItem[] = [
  {
    title: "Os meus projetos",
    description: "Reabre as tuas criações para continuar, refinar ou exportar.",
    category: "Criar",
    tab: "webcraft",
    icon: FolderOpen,
  },
  {
    title: "Criar sites e aplicações",
    description: "Descreve o que precisas e gera um website ou uma app web.",
    category: "Criar",
    tab: "webcraft",
    icon: Globe,
  },
  {
    title: "Gerar imagens",
    description: "Cria imagens a partir de uma descrição.",
    category: "Criar",
    tab: "images",
    icon: ImagePlus,
  },
  {
    title: "Apresentações",
    description: "Prepara slides para apresentar uma ideia ou projeto.",
    category: "Criar",
    tab: "presentations",
    icon: Presentation,
  },
  {
    title: "eBooks",
    description: "Organiza um tema em capítulos e prepara um livro digital.",
    category: "Criar",
    tab: "ebooks",
    icon: BookOpen,
  },
  {
    title: "Criar clips",
    description: "Transforma vídeo longo em clips curtos.",
    category: "Criar",
    tab: "clipper",
    icon: Scissors,
  },
  {
    title: "Analisar documentos",
    description: "Faz perguntas a PDFs, imagens e outros documentos.",
    category: "Analisar",
    tab: "vision",
    icon: Eye,
  },
  {
    title: "Melhorar imagens",
    description: "Aumenta e melhora imagens existentes.",
    category: "Analisar",
    tab: "imageenhancer",
    icon: Wand2,
  },
  {
    title: "Falar com o Lumin",
    description: "Usa voz e vídeo em tempo real.",
    category: "Comunicar",
    tab: "live",
    icon: Radio,
  },
  {
    title: "Mensagens",
    description: "Cria e gere mensagens para os teus canais.",
    category: "Comunicar",
    tab: "sms",
    icon: MessageSquare,
  },
  {
    title: "Marketing",
    description: "Prepara conteúdos e campanhas para a tua marca.",
    category: "Comunicar",
    tab: "marketing",
    icon: Megaphone,
  },
  {
    title: "Banco de imagens",
    description: "Procura imagens para usar nos teus projetos.",
    category: "Descobrir",
    tab: "imagebank",
    icon: Images,
  },
  {
    title: "Creator Intelligence",
    description: "Explora tendências e informação para criadores.",
    category: "Descobrir",
    tab: "creator-intelligence",
    icon: Sparkles,
  },
]

interface LuminToolsHubProps {
  onSelect: (tab: string) => void
}

export function LuminToolsHub({ onSelect }: LuminToolsHubProps) {
  const [category, setCategory] = useState<(typeof categories)[number]>("Todas")
  const [query, setQuery] = useState("")

  const filteredTools = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("pt-PT")
    return tools.filter((tool) => {
      const matchesCategory = category === "Todas" || tool.category === category
      const matchesQuery =
        !normalizedQuery ||
        tool.title.toLocaleLowerCase("pt-PT").includes(normalizedQuery) ||
        tool.description.toLocaleLowerCase("pt-PT").includes(normalizedQuery)
      return matchesCategory && matchesQuery
    })
  }, [category, query])

  return (
    <div className="flex-1 overflow-y-auto bg-background">
      <div className="mx-auto w-full max-w-6xl space-y-7 px-4 py-6 sm:px-6 md:py-9">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm font-medium text-primary">
              <Sparkles className="h-4 w-4" />
              Lumin AI Studio
            </div>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">O que queres fazer?</h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-foreground/75 sm:text-base">
              Escolhe uma ferramenta. As tuas criações ficam no respetivo espaço para poderes continuar mais tarde.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onSelect("chat")}
            className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm font-medium transition hover:bg-muted"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar ao chat
          </button>
        </header>

        <div className="flex flex-col gap-3 sm:flex-row">
          <label className="relative block flex-1">
            <span className="sr-only">Procurar ferramentas</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Procurar uma ferramenta"
              className="h-11 w-full rounded-xl border border-border bg-card pl-10 pr-3 text-sm outline-none transition placeholder:text-muted-foreground focus:border-primary/50 focus:ring-2 focus:ring-primary/15"
            />
          </label>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {categories.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setCategory(item)}
                aria-pressed={category === item}
                className={`shrink-0 rounded-xl border px-3 py-2 text-sm font-medium transition ${
                  category === item
                    ? "border-primary/40 bg-primary/10 text-primary"
                    : "border-border bg-card text-foreground/75 hover:bg-muted"
                }`}
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        {filteredTools.length > 0 ? (
          <section aria-label="Ferramentas disponíveis" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {filteredTools.map(({ title, description, category: itemCategory, tab, icon: Icon }) => (
              <button
                key={title}
                type="button"
                onClick={() => onSelect(tab)}
                className="group flex min-h-36 flex-col rounded-2xl border border-border bg-card p-5 text-left transition hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-lg hover:shadow-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <span className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </span>
                <span className="text-base font-semibold">{title}</span>
                <span className="mt-1 text-sm leading-relaxed text-foreground/70">{description}</span>
                <span className="mt-auto pt-4 text-xs font-medium text-primary">{itemCategory}</span>
              </button>
            ))}
          </section>
        ) : (
          <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-foreground/75">
            Não encontrei ferramentas com esse nome.
          </div>
        )}

        <footer className="border-t border-border pt-4 text-xs text-foreground/65">
          As ferramentas disponíveis dependem do teu acesso e das funcionalidades ativas na conta.
        </footer>
      </div>
    </div>
  )
}
