# Lumin AI Studio — Estado Atual

Última atualização: setembro de 2026.

## Estado

O projeto está funcional e em evolução ativa. Não deve ser tratado como “100% concluído”: a prioridade atual é consolidar a experiência Lumin AI Studio, simplificar a arquitetura visual e remover dependências/documentação herdadas do Reborn AI.

## Base técnica atual

- Next.js 15.5.x
- React 19.x
- TypeScript
- Tailwind CSS 4
- Vercel AI SDK
- NextAuth
- Zustand
- FFmpeg.wasm
- JSZip / html2pdf

## Capacidades já existentes

### Assistente e multimodal
- Chat geral
- Vision/análise de imagens e documentos
- Live/voz
- Runtime resiliente com múltiplos providers e fallbacks

### Criação
- Geração de imagens
- WebCraft V2 para websites e aplicações web
- Refinamento iterativo preservando o projeto atual
- Preview responsivo
- Ebooks
- Apresentações
- Marketing
- Messaging
- Clipper
- Exportação

### Agentes
- Browser Agent
- Sessões persistentes
- Cookies persistentes
- Aprovação/rejeição de ações
- Navegação multi-step
- Login handoff
- Chromium em sandbox Vercel

## Consolidação Lumin AI Studio

### Fase 1 — concluída
- homepage Lumin introduzida
- composer visual duplicado removido
- navegação móvel duplicada removida
- espaçamento mobile reduzido
- identidade visual preta/dourada reforçada
- orb Lumin sem avatar robótico central

### Fase 2 — em curso
- remover referências visuais/documentais antigas a Reborn AI
- atualizar README e documentação principal
- manter compatibilidade interna onde renomear storage/events possa quebrar utilizadores existentes

### Fase 3 — próxima
- reduzir o tamanho e responsabilidade de `app/page.tsx`
- criar uma shell Lumin única
- separar chat, navegação, composer e áreas de ferramenta em componentes próprios
- garantir comportamento consistente em mobile, tablet e desktop

### Fase 4 — WebCraft
- melhorar pesquisa/seleção de imagens contextuais
- tornar geração e refinamento mais previsíveis
- reforçar preview, edição e publicação
- preservar integralmente funcionalidades não alteradas em refinamentos

### Fase 5 — Agentes
- integrar Browser Agent de forma nativa na UX Lumin
- apresentar estado, passos e aprovações sem parecer uma camada separada
- manter credenciais e sessões protegidas no lado servidor

## Notas importantes

Documentação antiga em `docs/` pode conter referências a Reborn AI, providers anteriores, versões antigas ou afirmações de “zero API keys / unlimited” que já não devem ser consideradas verdade operacional.

A referência correta para dependências é `package.json`. Para comportamento atual, prevalece o código em `main`.

## Objetivo

Lumin AI Studio deve funcionar como uma única plataforma de IA: pensar, criar, analisar, navegar e executar — com uma interface coerente e sem expor a história técnica do Reborn AI ao utilizador final.
