export type LuminConnectorDefinition = {
  id: string
  name: string
  category: string
  description: string
  mode: "oauth" | "native" | "generic"
  capabilities: string[]
  enabledNow: boolean
}

export const LUMIN_CONNECTOR_CATALOG: LuminConnectorDefinition[] = [
  { id:"google", name:"Google", category:"Produtividade", description:"Conta Google e identidade", mode:"oauth", capabilities:["identity"], enabledNow:false },
  { id:"gmail", name:"Gmail", category:"Produtividade", description:"Ler, pesquisar e trabalhar email", mode:"oauth", capabilities:["read","search","draft","send"], enabledNow:false },
  { id:"calendar", name:"Google Calendar", category:"Produtividade", description:"Agenda, eventos e disponibilidade", mode:"oauth", capabilities:["read","create","update"], enabledNow:false },
  { id:"drive", name:"Google Drive", category:"Produtividade", description:"Ficheiros e documentos", mode:"oauth", capabilities:["read","search","create"], enabledNow:false },
  { id:"instagram", name:"Instagram", category:"Redes sociais", description:"Conteúdo, métricas e comunidade", mode:"oauth", capabilities:["analytics","publish","comments"], enabledNow:false },
  { id:"facebook", name:"Facebook", category:"Redes sociais", description:"Páginas, publicações e métricas", mode:"oauth", capabilities:["analytics","publish"], enabledNow:false },
  { id:"whatsapp", name:"WhatsApp", category:"Comunicação", description:"Mensagens e atendimento", mode:"oauth", capabilities:["read","send"], enabledNow:false },
  { id:"metricool", name:"Metricool", category:"Marketing", description:"Analytics, agenda e publicação social", mode:"oauth", capabilities:["analytics","schedule","publish"], enabledNow:false },
  { id:"canva", name:"Canva", category:"Criação", description:"Designs e conteúdos visuais", mode:"oauth", capabilities:["create","edit","export"], enabledNow:false },
  { id:"github", name:"GitHub", category:"Desenvolvimento", description:"Repos, código, issues e pull requests", mode:"oauth", capabilities:["read","write","deploy"], enabledNow:false },
  { id:"vercel", name:"Vercel", category:"Desenvolvimento", description:"Projetos, deploys e observabilidade", mode:"oauth", capabilities:["read","deploy"], enabledNow:false },
  { id:"supabase", name:"Supabase", category:"Desenvolvimento", description:"Base de dados, auth e funções", mode:"oauth", capabilities:["read","write"], enabledNow:false },
  { id:"stripe", name:"Stripe", category:"Negócio", description:"Pagamentos, subscrições e clientes", mode:"oauth", capabilities:["read","payments"], enabledNow:false },
  { id:"twilio", name:"Twilio", category:"Comunicação", description:"Voz, SMS e telefonia", mode:"oauth", capabilities:["voice","sms"], enabledNow:false },
  { id:"close", name:"Close CRM", category:"Vendas", description:"Leads, chamadas e pipeline", mode:"oauth", capabilities:["read","write"], enabledNow:false },
  { id:"resend", name:"Resend", category:"Comunicação", description:"Email transacional e campanhas", mode:"oauth", capabilities:["send","analytics"], enabledNow:false },
  { id:"figma", name:"Figma", category:"Criação", description:"Design e handoff", mode:"oauth", capabilities:["read","create"], enabledNow:false },
  { id:"railway", name:"Railway", category:"Desenvolvimento", description:"Serviços, deploys e logs", mode:"oauth", capabilities:["read","deploy"], enabledNow:false },
  { id:"netlify", name:"Netlify", category:"Desenvolvimento", description:"Sites e deploys", mode:"oauth", capabilities:["read","deploy"], enabledNow:false },
  { id:"mcp", name:"MCP remoto", category:"Universal", description:"Liga qualquer servidor MCP compatível", mode:"generic", capabilities:["tools"], enabledNow:true },
  { id:"openapi", name:"OpenAPI", category:"Universal", description:"Importa uma API através de openapi.json", mode:"generic", capabilities:["read"], enabledNow:true },
  { id:"rest", name:"REST API", category:"Universal", description:"Liga uma API HTTPS com ou sem chave", mode:"generic", capabilities:["read"], enabledNow:true },
]

export function connectorDefinition(id: string) {
  const root = id.split(":")[0]
  return LUMIN_CONNECTOR_CATALOG.find((item) => item.id === root) || null
}
