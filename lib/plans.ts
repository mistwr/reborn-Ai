export interface Plan {
  id: string
  name: string
  description: string
  priceInCents: number
  currency: string
  interval: "month" | "year"
  features: string[]
  tokensPerDay: number
  popular?: boolean
}

export const PLANS: Plan[] = [
  {
    id: "free",
    name: "Gratuito",
    description: "Para experimentar a plataforma",
    priceInCents: 0,
    currency: "eur",
    interval: "month",
    tokensPerDay: 15000,
    features: [
      "15.000 tokens por dia",
      "Chat com IA",
      "Geracao de imagens",
      "Banco de imagens",
      "Acesso basico a ferramentas",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    description: "Para criadores e negocios",
    priceInCents: 999, // 9.99 EUR
    currency: "eur",
    interval: "month",
    tokensPerDay: 50000,
    popular: true,
    features: [
      "50.000 tokens por dia",
      "Todas as ferramentas de IA",
      "WebCraft - Criador de websites",
      "Marketing Studio completo",
      "Clipper AI para videos",
      "Ebooks e apresentacoes",
      "SMS e WhatsApp em massa",
      "Suporte prioritario",
      "Sem fidelizacao",
    ],
  },
]

export const PRO_PLAN = PLANS.find((p) => p.id === "pro")!
export const FREE_PLAN = PLANS.find((p) => p.id === "free")!

export function getPlanById(id: string): Plan | undefined {
  return PLANS.find((p) => p.id === id)
}

export function formatPrice(priceInCents: number, currency: string = "eur"): string {
  return new Intl.NumberFormat("pt-PT", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(priceInCents / 100)
}
