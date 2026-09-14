# Lumin AI Studio

Lumin AI Studio é a evolução do antigo Reborn AI para uma plataforma multimodal de IA orientada a criação, produtividade e agentes.

## Estado atual

O projeto está em consolidação ativa. A base já inclui:

- chat multimodal com runtime resiliente e fallback entre providers
- Live/voz e análise de imagens/documentos
- geração de imagens
- WebCraft V2 para criar e refinar websites e aplicações web
- apresentações, ebooks, marketing e messaging
- Clipper e ferramentas de exportação
- autenticação e gestão de sessão
- Browser Agent com sessões persistentes, aprovação de ações e Chromium em sandbox
- interface Lumin AI Studio responsiva para mobile, tablet e desktop

## Stack principal

- Next.js 15
- React 19
- TypeScript
- Tailwind CSS
- Vercel AI SDK
- NextAuth
- Zustand
- FFmpeg.wasm
- JSZip / html2pdf

## Direção do produto

A prioridade atual é consolidar todas as funcionalidades numa única experiência Lumin AI Studio, remover restos visuais e documentais do Reborn AI, simplificar a shell principal e reforçar o WebCraft e os agentes.

## Estrutura principal

- `app/` — aplicação Next.js e rotas API
- `components/` — interface e módulos
- `lib/` — runtime, integrações, stores e utilitários
- `docs/` — documentação histórica e técnica
- `public/` — assets públicos

## Deploy

O projeto é publicado automaticamente através dos ambientes ligados ao repositório. Antes de alterações grandes, são usados branches e previews para validar a experiência sem quebrar `main`.

## Nota sobre documentação antiga

Alguns ficheiros em `docs/` ainda descrevem fases anteriores do produto e podem conter referências a Reborn AI, versões antigas de dependências ou providers já substituídos. Considera `package.json`, o código em `main` e este README como referências mais atuais durante a migração.
