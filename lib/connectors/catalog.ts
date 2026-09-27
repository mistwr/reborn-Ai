export type LuminConnectorDefinition = {
  id: string
  name: string
  category: string
  description: string
  mode: "oauth" | "credentials" | "generic"
  authProvider?: string
  capabilities: string[]
  enabledNow: boolean
}

export const LUMIN_CONNECTOR_CATALOG: LuminConnectorDefinition[] = [
  { id:"google", name:"Google", category:"Produtividade", description:"Liga a conta Google ao Lumin", mode:"oauth", authProvider:"google", capabilities:["identity"], enabledNow:true },
  { id:"gmail", name:"Gmail", category:"Produtividade", description:"Pesquisa e lê email através da conta Google", mode:"oauth", authProvider:"google", capabilities:["read","search"], enabledNow:true },
  { id:"calendar", name:"Google Calendar", category:"Produtividade", description:"Consulta agenda e eventos da conta Google", mode:"oauth", authProvider:"google", capabilities:["read"], enabledNow:true },
  { id:"drive", name:"Google Drive", category:"Produtividade", description:"Pesquisa ficheiros e documentos da conta Google", mode:"oauth", authProvider:"google", capabilities:["read","search"], enabledNow:true },
  { id:"instagram", name:"Instagram", category:"Redes sociais", description:"Liga Instagram profissional através da Meta", mode:"oauth", authProvider:"meta", capabilities:["analytics","read"], enabledNow:true },
  { id:"facebook", name:"Facebook", category:"Redes sociais", description:"Liga Páginas Facebook através da Meta", mode:"oauth", authProvider:"meta", capabilities:["analytics","read"], enabledNow:true },
  { id:"whatsapp", name:"WhatsApp", category:"Comunicação", description:"WhatsApp Business via Meta; requer permissões adicionais da app", mode:"oauth", authProvider:"meta", capabilities:["read","send"], enabledNow:true },
  { id:"metricool", name:"Metricool", category:"Marketing", description:"Liga com token API Metricool", mode:"credentials", capabilities:["analytics","schedule","publish"], enabledNow:true },
  { id:"canva", name:"Canva", category:"Criação", description:"Liga designs e assets do Canva", mode:"oauth", authProvider:"canva", capabilities:["read","create","export"], enabledNow:true },
  { id:"github", name:"GitHub", category:"Desenvolvimento", description:"Liga o perfil e repositórios GitHub", mode:"oauth", authProvider:"github", capabilities:["read"], enabledNow:true },
  { id:"vercel", name:"Vercel", category:"Desenvolvimento", description:"Liga com token da Vercel", mode:"credentials", capabilities:["read","deploy"], enabledNow:true },
  { id:"supabase", name:"Supabase", category:"Desenvolvimento", description:"Liga com Personal Access Token da Supabase", mode:"credentials", capabilities:["read","write"], enabledNow:true },
  { id:"stripe", name:"Stripe", category:"Negócio", description:"Liga com chave restrita ou secreta Stripe", mode:"credentials", capabilities:["read","payments"], enabledNow:true },
  { id:"twilio", name:"Twilio", category:"Comunicação", description:"Liga Account SID + Auth Token/API Key", mode:"credentials", capabilities:["voice","sms"], enabledNow:true },
  { id:"close", name:"Close CRM", category:"Vendas", description:"Liga com API key do Close", mode:"credentials", capabilities:["read","write"], enabledNow:true },
  { id:"resend", name:"Resend", category:"Comunicação", description:"Liga com API key do Resend", mode:"credentials", capabilities:["send","analytics"], enabledNow:true },
  { id:"figma", name:"Figma", category:"Criação", description:"Liga ficheiros Figma por OAuth", mode:"oauth", authProvider:"figma", capabilities:["read"], enabledNow:true },
  { id:"railway", name:"Railway", category:"Desenvolvimento", description:"Liga com token Railway", mode:"credentials", capabilities:["read","deploy"], enabledNow:true },
  { id:"netlify", name:"Netlify", category:"Desenvolvimento", description:"Liga sites Netlify por OAuth", mode:"oauth", authProvider:"netlify", capabilities:["read"], enabledNow:true },
  { id:"mcp", name:"MCP remoto", category:"Universal", description:"Liga qualquer servidor MCP compatível", mode:"generic", capabilities:["tools"], enabledNow:true },
  { id:"openapi", name:"OpenAPI", category:"Universal", description:"Importa uma API através de openapi.json", mode:"generic", capabilities:["read"], enabledNow:true },
  { id:"rest", name:"REST API", category:"Universal", description:"Liga uma API HTTPS com ou sem chave", mode:"generic", capabilities:["read"], enabledNow:true },
]

export function connectorDefinition(id: string) {
  const root = id.split(":")[0]
  return LUMIN_CONNECTOR_CATALOG.find((item) => item.id === root) || null
}
