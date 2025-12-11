# Reborn AI Clipper - Guia de Configuração

## Visão Geral

O Clipper AI é um módulo estilo Opus Clip que permite transformar vídeos longos em clipes curtos otimizados para TikTok, Reels e YouTube Shorts.

## Arquitetura

\`\`\`
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Frontend      │     │   Vercel API    │     │  Cloudflare     │
│   (Next.js)     │────▶│   Routes        │────▶│  Worker         │
│   /clipper      │     │   /api/clipper  │     │  (FFmpeg WASM)  │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                              │
                              ▼
                        ┌─────────────────┐
                        │   AssemblyAI    │
                        │   (Transcrição) │
                        └─────────────────┘
\`\`\`

## Configuração

### 1. AssemblyAI (Transcrição)

1. Criar conta em https://www.assemblyai.com
2. Obter API key (free tier: 100h/mês)
3. Adicionar ao Vercel:
   \`\`\`
   ASSEMBLYAI_API_KEY=sua_api_key_aqui
   \`\`\`

### 2. Cloudflare Worker (Processamento de Vídeo)

#### Passo 1: Instalar Wrangler
\`\`\`bash
npm install -g wrangler
wrangler login
\`\`\`

#### Passo 2: Criar Projeto
\`\`\`bash
wrangler init clipper-worker
cd clipper-worker
\`\`\`

#### Passo 3: Instalar Dependências
\`\`\`bash
npm install @ffmpeg/ffmpeg @ffmpeg/util
\`\`\`

#### Passo 4: Configurar wrangler.toml
\`\`\`toml
name = "clipper-worker"
main = "src/index.ts"
compatibility_date = "2024-01-01"
compatibility_flags = ["nodejs_compat"]

[vars]
ALLOWED_ORIGIN = "https://your-app.vercel.app"

[[r2_buckets]]
binding = "CLIPS_BUCKET"
bucket_name = "reborn-clips"
\`\`\`

#### Passo 5: Criar Bucket R2
\`\`\`bash
wrangler r2 bucket create reborn-clips
\`\`\`

#### Passo 6: Deploy
\`\`\`bash
wrangler deploy
\`\`\`

#### Passo 7: Adicionar URL ao Vercel
\`\`\`
CLOUDFLARE_CLIPPER_WORKER_URL=https://clipper-worker.your-account.workers.dev
\`\`\`

## Modo Demo

Sem as configurações acima, o Clipper funciona em modo demo:
- Transcrição simulada com texto de exemplo
- Thumbnails gerados via Pollinations.ai
- Sem processamento real de vídeo

## Limitações

### Vercel
- Timeout: 60s (Pro) / 10s (Hobby)
- Payload máximo: 4.5MB
- Por isso delegamos vídeo para Cloudflare

### Cloudflare Workers
- RAM: 128MB
- CPU time: 30s
- Recomendado: vídeos até 100MB / 10min

### AssemblyAI Free Tier
- 100 horas de transcrição/mês
- Funcionalidades básicas

## Alternativas para Escala

Para vídeos maiores ou mais processamento:

1. **AWS Lambda + FFmpeg Layer**
   - Até 15 min de execução
   - 10GB de memória

2. **Google Cloud Run**
   - Containers Docker
   - Sem limite de execução

3. **Servidor Dedicado**
   - VPS com FFmpeg instalado
   - Processamento em background

## APIs Utilizadas

| Serviço | Uso | Custo |
|---------|-----|-------|
| AssemblyAI | Transcrição | Free: 100h/mês |
| Cloudflare R2 | Armazenamento | Free: 10GB/mês |
| Cloudflare Workers | Processamento | Free: 100k req/dia |
| Pollinations.ai | Thumbnails | Grátis |

## Estrutura de Ficheiros

\`\`\`
app/
├── clipper/
│   └── page.tsx          # UI do Clipper
├── api/
│   └── clipper/
│       ├── transcribe/
│       │   └── route.ts  # API AssemblyAI
│       ├── analyze/
│       │   └── route.ts  # Análise viral
│       └── process/
│           └── route.ts  # Coordenação
cloudflare-worker/
└── clipper-worker.ts     # Worker FFmpeg
docs/
└── CLIPPER_SETUP.md      # Este ficheiro
\`\`\`

## Troubleshooting

### Erro: "Timeout na transcrição"
- Vídeo muito longo para free tier
- Solução: usar vídeos < 30 min

### Erro: "Ficheiro muito grande"
- Limite de 500MB no upload
- Solução: comprimir vídeo antes

### Erro: "Cloudflare Worker não configurado"
- Modo demo ativo
- Solução: seguir passos de configuração

## Suporte

Para questões ou bugs, abrir issue no repositório.
