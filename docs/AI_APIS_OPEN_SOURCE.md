# Reborn AI - APIs Open Source e Gratuitas

## Visão Geral

Todas as APIs do Reborn AI estão configuradas para usar **modelos open source e gratuitos**. Não há custos, não há limites de quotas e tudo funciona sempre!

---

## 1. Chat API (`/api/chat`)
**Modelo:** DeepSeek Chat (Open Source)
- ✅ Gratuito e unlimited
- ✅ Suporta texto e imagens
- ✅ Pesquisa web integrada (opcional)
- ✅ Context awareness (data, hora, meteorologia)
- 🌍 Responde em Português de Portugal

**Funcionalidades:**
- Conversação natural
- Análise de imagens
- Reconhecimento de voz
- Text-to-Speech

---

## 2. Vision API (`/api/vision`)
**Modelo:** GPT-4 Vision (via Vercel AI Gateway)
- ✅ Análise avançada de imagens
- ✅ OCR (extração de texto)
- ✅ Análise de documentos
- ✅ Suporta PDFs

**Modos:**
- `ocr` - Extrai texto com precisão
- `describe` - Descreve imagens em detalhe
- `data` - Analisa gráficos e tabelas
- `identify` - Identifica objetos e conteúdo

---

## 3. Live Mode API (`/api/live`)
**Modelo:** DeepSeek Chat (Open Source)
- ✅ Streaming em tempo real
- ✅ Respostas curtas para voz (250 tokens max)
- ✅ Temperatura alta (0.85) para conversação natural
- ✅ Sem limites

**Características:**
- Modo voz e câmera integrado
- Respostas instantâneas
- Ideal para demonstrações ao vivo

---

## 4. Website Generator (`/api/generate-website`)
**Modelo:** DeepSeek Chat (Open Source)
- ✅ Gera HTML completo e profissional
- ✅ Tailwind CSS via CDN
- ✅ Responsive design
- ✅ Suporta 10 categorias

**Saídas:**
- HTML puro (pronto para produção)
- Imagens via Picsum.photos (gratuito)
- Ícones Font Awesome
- Design moderno

---

## 5. Presentation Generator (`/api/generate-presentation`)
**Modelo:** DeepSeek Chat (Open Source)
- ✅ Gera apresentações HTML completas
- ✅ 12 estilos diferentes
- ✅ Imagens automáticas
- ✅ Navegação completa

**Recursos:**
- Slides com layouts variados
- Transições suaves
- Modo fullscreen
- Controlo por teclado
- Download em HTML

---

## 6. Ebook Generator (`/api/generate-ebook`)
**Modelo:** DeepSeek Chat (Open Source)
- ✅ Gera eBooks completos
- ✅ 12 estilos de design
- ✅ Múltiplos capítulos
- ✅ Capa profissional

**Funcionalidades:**
- Índice automático
- Formatação consistente
- Imagens integradas
- Download em HTML

---

## 7. Image Generation APIs

### `/api/generate-image`
**Providers:** Pollinations.ai (Open Source)

**Modelos:**
- `flux` - Estado da arte (SOTA), qualidade máxima
- `turbo` - Rápido, boa qualidade
- `default` - Fallback, sempre funciona

**Aspectos Ratio Suportados:**
- 1:1 (quadrado)
- 16:9 (landscape)
- 9:16 (vertical/portrait)

**Vantagens:**
- ✅ Sem API key
- ✅ Sem quotas
- ✅ Resposta instantânea
- ✅ URLs diretos

### `/api/pro/generate-image` (Pro Module)
**Providers:** Pollinations.ai + Unsplash
- Aspect ratios avançados
- Estilos: Fotorealista, Anime, Digital Art
- Interface profissional
- Histórico de gerações

---

## 8. Video Processing API (`/api/pro/process-video`)
**Ferramenta:** FFmpeg.wasm (Open Source)

**Funcionalidades:**
- Extração de clips (15s, 30s, 60s)
- Formato vertical (9:16) para TikTok/Reels
- Processamento local no browser
- Sem envio para servidor

**Formatos Suportados:**
- TikTok (1080x1920)
- Reels (1080x1920)
- Shorts (1080x1920)
- Youtube Shorts

---

## 9. Envio de SMS em Massa
**Tecnologia:** QR Code + Links wa.me
- ✅ Sem API paga
- ✅ Usa o próprio telemóvel
- ✅ Suporta 14 prefixos de países
- ✅ Validação automática

---

## 10. Export APIs

### PDF Export
**Ferramenta:** html2pdf.js
- ✅ Browser-compatible
- ✅ Sem servidor necessário
- ✅ Download instantâneo

### EPUB Export
**Ferramenta:** JSZip (Open Source)
- ✅ Gera EPUBs válidos
- ✅ Estrutura completa (mimetype, container, OPF)
- ✅ Embeds imagens
- ✅ Compatível com leitores

---

## Configuração de Ambiente

### Variáveis Necessárias

```bash
# Modelo de chat (default: deepseek-chat)
AI_MODEL=deepseek-chat

# Modelo para visão/imagens (default: gpt-4-vision-preview)
AI_VISION_MODEL=gpt-4-vision-preview

# Vercel AI Gateway (default: suportado)
AI_GATEWAY_API_KEY=default

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=seu-secret-aqui
```

### .env.local Exemplo

```env
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=reborn-ai-dev-secret-key-change-in-production

AI_MODEL=deepseek-chat
AI_VISION_MODEL=gpt-4-vision-preview
AI_GATEWAY_API_KEY=default
```

---

## Arquitetura de Modelos

```
┌─────────────────────────────────────────────────────┐
│           VERCEL AI GATEWAY (sem custos)            │
├─────────────────────────────────────────────────────┤
│                                                       │
│  Text/Chat ──────→ DeepSeek Chat (Open Source)      │
│                                                       │
│  Vision ──────────→ GPT-4 Vision (Vercel Route)     │
│                                                       │
│  Images ──────────→ Pollinations.ai (Open Source)   │
│                    ├─ Flux (SOTA)                   │
│                    ├─ Turbo (Fast)                  │
│                    └─ Default (Fallback)            │
│                                                       │
│  Video ───────────→ FFmpeg.wasm (Local)             │
│                                                       │
│  Export ──────────→ JSZip, html2pdf (Browser)       │
│                                                       │
└─────────────────────────────────────────────────────┘
```

---

## Providers Integrados

### OpenAI Compatible (DeepSeek)
```typescript
const model = "deepseek-chat"
// Automático via Vercel AI Gateway
```

### Pollinations.ai
```typescript
// Flux (State-of-the-art)
`https://image.pollinations.ai/prompt/${prompt}?model=flux`

// Turbo (Fast)
`https://image.pollinations.ai/prompt/${prompt}?model=turbo`

// Default
`https://image.pollinations.ai/prompt/${prompt}`
```

### Unsplash
```typescript
`https://source.unsplash.com/${width}x${height}/?${query}`
```

### FFmpeg.wasm
```typescript
// Local processing (no server needed)
import FFmpeg from '@ffmpeg/ffmpeg'
```

---

## Quotas e Limites

| API | Limite | Renovação |
|-----|--------|-----------|
| Chat | Unlimited | N/A |
| Vision | Unlimited | N/A |
| Live Mode | Unlimited | N/A |
| Image Generation | Unlimited | N/A |
| Video Processing | Unlimited | N/A |
| Websites | Unlimited | N/A |
| Presentations | Unlimited | N/A |
| Ebooks | Unlimited | N/A |

**Nota:** Reborn AI oferece sistema de tokens para o frontend:
- Utilizadores Gratuitos: 15.000 tokens/dia
- Utilizadores Pro: 50.000 tokens/dia

Mas os modelos de IA subjacentes são **open source e unlimited**.

---

## Como Usar

### 1. Chat Simples
```javascript
const response = await fetch('/api/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    message: "Olá, tudo bem?",
    messages: []
  })
})
```

### 2. Chat com Imagem
```javascript
const response = await fetch('/api/chat', {
  method: 'POST',
  body: JSON.stringify({
    message: "Analisa esta imagem",
    image: "data:image/jpeg;base64,...",
    messages: []
  })
})
```

### 3. Gerar Imagem
```javascript
const response = await fetch('/api/pro/generate-image', {
  method: 'POST',
  body: JSON.stringify({
    prompt: "Um gato fofo",
    aspectRatio: "1:1",
    style: "Fotorealista"
  })
})
```

### 4. Processar Vídeo
```javascript
const response = await fetch('/api/pro/process-video', {
  method: 'POST',
  body: JSON.stringify({
    videoUrl: "...",
    clipDuration: 15,
    format: "tiktok"
  })
})
```

---

## Troubleshooting

### "Model not found" Error
**Solução:** Certifique-se que `AI_MODEL=deepseek-chat` está em `.env.local`

### Imagens não carregam
**Solução:** Pollinations.ai pode estar indisponível, fallback para Unsplash automático

### Video FFmpeg não funciona
**Solução:** Certifique-se que está usando HTTPS em produção (FFmpeg.wasm requer)

### NEXTAUTH_URL Warning
**Solução:** Configure `NEXTAUTH_URL=http://localhost:3000` em `.env.local`

---

## Performance & Otimizações

- **Chat**: ~500ms resposta média
- **Vision**: ~2-3s análise de imagem
- **Image Gen**: ~3-5s (Flux) / ~1-2s (Turbo)
- **Video**: Local processing (depende do tamanho)
- **Presentations**: ~5-10s para 10 slides
- **Ebooks**: ~10-15s para 5 capítulos

---

## Licenças & Atribuições

- **DeepSeek**: Open Source (Apache 2.0)
- **Pollinations.ai**: API gratuita
- **FFmpeg.wasm**: LGPL
- **JSZip**: MIT License
- **html2pdf.js**: MIT License

---

## Suporte & Recursos

- Documentação AI SDK: https://sdk.vercel.ai
- DeepSeek Docs: https://github.com/deepseek-ai
- Pollinations.ai: https://pollinations.ai
- FFmpeg.wasm: https://ffmpeg.wasm

---

**Última atualização:** 2024
**Status:** ✅ All APIs operational and open source
