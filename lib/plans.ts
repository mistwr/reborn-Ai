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
    description: "Para experimentar e criar a sério",
    priceInCents: 0,
    currency: "eur",
    interval: "month",
    tokensPerDay: 15000,
    features: [
      "15.000 tokens por dia",
      "Chat com IA",
      "Geração de imagens standard",
      "WebCraft básico + download HTML",
      "Banco de imagens",
      "Ferramentas essenciais",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    description: "Para criadores e negócios",
    priceInCents: 999,
    currency: "eur",
    interval: "month",
    tokensPerDay: 50000,
    popular: true,
    features: [
      "50.000 tokens por dia",
      "Todas as ferramentas de IA",
      "WebCraft Full-Stack + publicação",
      "Geração de imagens avançada",
      "Marketing Studio completo",
      "Clipper AI para vídeos",
      "Ebooks e apresentações",
      "SMS e WhatsApp em massa",
      "Suporte prioritário",
      "Sem fidelização",
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
