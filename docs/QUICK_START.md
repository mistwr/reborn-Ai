# Reborn AI - Quick Start Guide

## 🚀 Início Rápido

### 1. Instalação

```bash
cd /vercel/share/v0-project
pnpm install
```

### 2. Configurar Variáveis de Ambiente

Criar `.env.local`:

```env
# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=reborn-ai-dev-secret-key-change-in-production

# AI Models (Open Source, Gratuito)
AI_MODEL=deepseek-chat
AI_VISION_MODEL=gpt-4-vision-preview
AI_GATEWAY_API_KEY=default
```

### 3. Executar Dev Server

```bash
pnpm dev
```

Aceder a: http://localhost:3000

---

## 📡 APIs Disponíveis

### Chat - `/api/chat`
**Modelo:** DeepSeek Chat (Open Source)

```javascript
// POST /api/chat
{
  "message": "Olá, tudo bem?",
  "messages": [],  // histórico
  "image": "data:image/jpeg;base64,..."  // opcional
}
```

### Vision - `/api/vision`
**Modelo:** GPT-4 Vision

```javascript
// POST /api/vision
{
  "files": [{
    "dataUrl": "data:image/jpeg;base64,...",
    "mimeType": "image/jpeg",
    "name": "foto.jpg"
  }],
  "mode": "describe",  // ocr, describe, data, identify
  "customPrompt": ""   // opcional
}
```

### Live Mode - `/api/live`
**Modelo:** DeepSeek Chat

```javascript
// POST /api/live
{
  "message": "Olá",
  "conversationHistory": [],
  "mode": "voice",  // voice, video, both
  "userName": "João"
}
```

### Generate Website - `/api/generate-website`
**Modelo:** DeepSeek Chat

```javascript
// POST /api/generate-website
{
  "prompt": "Um site de portfólio para designer",
  "template": "portfolio",
  "category": "portfolio",
  "palette": { "primary": "#3b82f6", "colors": [...] },
  "features": ["gallery", "testimonials"],
  "businessName": "John Design",
  "businessPhone": "+351 912 345 678",
  "businessEmail": "john@example.com"
}
```

### Generate Presentation - `/api/generate-presentation`
**Modelo:** DeepSeek Chat

```javascript
// POST /api/generate-presentation
{
  "prompt": "Apresentação sobre IA em 2024",
  "template": "modern",  // 12 templates disponíveis
  "slides": 10           // 3-15 slides
}
```

### Generate Ebook - `/api/generate-ebook`
**Modelo:** DeepSeek Chat

```javascript
// POST /api/generate-ebook
{
  "prompt": "Guia de Marketing Digital",
  "title": "Marketing Digital 2024",
  "author": "Reborn AI",
  "style": "modern",     // 12 estilos
  "chapters": 5          // 3-15 capítulos
}
```

### Generate Image - `/api/generate-image`
**Providers:** Pollinations.ai (Flux, Turbo)

```javascript
// POST /api/generate-image
{
  "prompt": "Um gato fofo brincando",
  "aspectRatio": "1:1",  // 1:1, 16:9, 9:16
  "width": 512,
  "height": 512
}
```

### Pro Image Generator - `/api/pro/generate-image`
**Providers:** Pollinations.ai + Styles

```javascript
// POST /api/pro/generate-image
{
  "prompt": "Cidade futurista",
  "aspectRatio": "16:9",
  "style": "Fotorealista",  // Fotorealista, Anime, Digital Art
  "quantity": 1
}
```

### Process Video - `/api/pro/process-video`
**Ferramenta:** FFmpeg.wasm

```javascript
// POST /api/pro/process-video
{
  "videoUrl": "...",
  "clipDuration": 15,     // 15, 30, 60 seconds
  "format": "tiktok",     // tiktok, reels, shorts, youtube
  "timestamps": [0, 15]   // opcional
}
```

---

## 🎨 Modules

### Pro Tab Modules

1. **WebCraft Pro** - Template library com live editing
   - 15+ templates
   - Click-to-edit
   - Image swap modal
   - Theme builder
   - HTML export

2. **Image Generator Pro** - Geração avançada
   - Aspect ratios (1:1, 16:9, 9:16)
   - Estilos (Fotorealista, Anime, Digital Art)
   - Real-time generation
   - History tracking

3. **Clipper AI** - Processamento de vídeo
   - FFmpeg.wasm local
   - Clip extraction (15s/30s/60s)
   - Vertical format (TikTok/Reels)
   - Backend fallback

4. **Global Export** - PDF/EPUB
   - Theme builder integration
   - PDF export (html2pdf)
   - EPUB export (JSZip)
   - Chapter-based customization

---

## 🌍 Environment Variables

### Required
- `NEXTAUTH_URL` - Base URL for auth (default: http://localhost:3000)
- `NEXTAUTH_SECRET` - Secret key for NextAuth

### Optional (AI Models)
- `AI_MODEL` - Chat model (default: deepseek-chat)
- `AI_VISION_MODEL` - Vision model (default: gpt-4-vision-preview)
- `AI_GATEWAY_API_KEY` - Gateway key (default: default)

### All Variables in `.env.local`
```env
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=dev-secret-key

AI_MODEL=deepseek-chat
AI_VISION_MODEL=gpt-4-vision-preview
AI_GATEWAY_API_KEY=default
```

---

## 📦 Dependencies

### AI & LLM
- `ai` - Vercel AI SDK
- `deepseek-chat` - Open source model

### Image Generation
- `pollinations` - Free image API
- `unsplash-js` - Photo API

### Video Processing
- `@ffmpeg/ffmpeg` - Local video processing
- `@ffmpeg/util` - Utilities

### Export & Storage
- `html2pdf.js` - PDF export
- `jszip` - EPUB/ZIP generation
- `react-easy-crop` - Image cropping

### State Management
- `zustand` - Lightweight state store

### UI Components
- `shadcn/ui` - Component library
- `tailwindcss` - Utility CSS

---

## 🔧 Development Commands

```bash
# Start dev server
pnpm dev

# Build for production
pnpm build

# Run production build
pnpm start

# Type check
pnpm type-check

# Lint code
pnpm lint

# Format code
pnpm format
```

---

## 📁 Project Structure

```
/vercel/share/v0-project/
├── app/
│   ├── page.tsx              # Main page with Pro tab
│   ├── api/
│   │   ├── chat/route.ts     # Chat API (DeepSeek)
│   │   ├── vision/route.ts   # Vision API
│   │   ├── live/route.ts     # Live mode API
│   │   ├── generate-website/ # Website generator
│   │   ├── generate-presentation/ # Slides
│   │   ├── generate-ebook/   # Ebook generator
│   │   ├── generate-image/   # Image generation
│   │   └── pro/              # Pro features
│   │       ├── generate-image/
│   │       ├── process-video/
│   │       └── export/
│   └── layout.tsx
│
├── components/
│   ├── pro/
│   │   ├── webcraft-pro-tab.tsx
│   │   ├── image-generator-pro-tab.tsx
│   │   ├── clipper-ai-tab.tsx
│   │   ├── global-export-tab.tsx
│   │   ├── template-library.tsx
│   │   ├── live-editor.tsx
│   │   └── index.ts
│   └── ui/                   # shadcn components
│
├── lib/
│   ├── ai-config.ts          # AI configuration (DeepSeek, Pollinations, etc)
│   ├── stores/
│   │   ├── webcraft-store.ts
│   │   ├── image-generator-store.ts
│   │   └── clipper-store.ts
│   ├── templates.ts          # HTML templates
│   ├── theme-builder.ts      # Theme utilities
│   └── export-utils.ts       # PDF/EPUB export
│
├── .env.local                # Environment variables
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── next.config.mjs
└── docs/
    ├── AI_APIS_OPEN_SOURCE.md # This guide
    └── QUICK_START.md          # Quick start
```

---

## 🎯 Key Features

### Open Source & Free
✅ DeepSeek Chat (Open Source)
✅ Pollinations.ai (Free image generation)
✅ FFmpeg.wasm (Local video processing)
✅ JSZip (EPUB generation)
✅ html2pdf.js (PDF export)

### No API Keys Required
✅ All providers support key-less usage
✅ Unlimited quotas
✅ Always works

### Modern Stack
✅ Next.js 16 with App Router
✅ TypeScript
✅ Tailwind CSS 4.1.9
✅ shadcn/ui components
✅ Zustand for state management

---

## 🐛 Troubleshooting

### Port Already in Use
```bash
# Use different port
pnpm dev -- -p 3001
```

### Module Not Found
```bash
# Reinstall dependencies
pnpm install --force
```

### CORS Issues
✅ All APIs are same-origin (no CORS needed)

### Image Generation Fails
✅ Fallback providers automatically used
✅ Check internet connection

### Video Processing Hangs
✅ FFmpeg.wasm requires significant memory
✅ Try smaller video files first

---

## 📚 Resources

- **Next.js Docs:** https://nextjs.org/docs
- **Vercel AI SDK:** https://sdk.vercel.ai
- **DeepSeek:** https://github.com/deepseek-ai
- **Tailwind CSS:** https://tailwindcss.com
- **shadcn/ui:** https://ui.shadcn.com

---

## ✅ Checklist

- [ ] `.env.local` created with required variables
- [ ] `pnpm install` completed
- [ ] `pnpm dev` running without errors
- [ ] Can access http://localhost:3000
- [ ] Chat responds with DeepSeek model
- [ ] Images generate from Pollinations.ai
- [ ] Pro tab visible in sidebar

---

**Status:** ✅ All systems operational
**Last Updated:** 2024
**Open Source:** Yes, fully free and unlimited
