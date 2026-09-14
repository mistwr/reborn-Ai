# Lumin AI Studio — Migration Plan

Este documento define a consolidação técnica do antigo Reborn AI para Lumin AI Studio sem perder funcionalidades existentes.

## Princípios

- Preservar funcionalidades que já funcionam.
- Migrar por fases pequenas, testáveis e reversíveis.
- Manter compatibilidade temporária com chaves internas antigas quando necessário.
- Remover duplicação visual antes de grandes refactors.
- Tratar `app/page.tsx` como legado a decompor, não como base para novas funcionalidades.

## Fases

### 1. Welcome e identidade
Concluído no PR #28.

- Um único composer real.
- Welcome Lumin responsivo.
- Orb Lumin preto/dourado.
- Remoção de navegação duplicada no welcome.

### 2. Documentação e direção do produto
Em curso no PR #29.

- README atualizado.
- STATUS realista.
- Remoção de claims antigos e incorretos.

### 3. Shell da aplicação

Objetivo: reduzir a responsabilidade de `app/page.tsx`.

Componentes alvo:

- `LuminAppShell`
- `LuminSidebar`
- `LuminTopbar`
- `LuminChatSurface`
- `LuminComposer`
- `LuminToolSurface`

A primeira extração deve preservar exatamente o estado e callbacks existentes. Não alterar lógica de negócio durante a extração.

### 4. Routing interno de ferramentas

Cada módulo deve renderizar numa superfície única, sem páginas visuais aninhadas:

- Chat
- Live
- Imagens
- Vision
- WebCraft
- Apresentações
- Ebooks
- Marketing
- Messaging
- Clipper
- Export

### 5. WebCraft V2

- Pesquisa/seleção de imagens contextuais.
- Referências visuais fornecidas pelo utilizador.
- Preview desktop/tablet/mobile.
- Refinamento iterativo sem apagar o projeto anterior.
- Export/publicação.

### 6. Agentic runtime

Integrar Browser Agent, aprovações e login handoff na experiência Lumin em vez de HUDs independentes.

### 7. Limpeza final

Depois de estabilizada a nova shell:

- remover componentes Reborn não usados;
- migrar nomes de storage/eventos internos quando seguro;
- atualizar documentação técnica;
- adicionar testes de smoke para chat, WebCraft, imagens e Browser Agent.

## Regra de segurança de migração

Nenhum módulo deve ser removido apenas por parecer legado. Primeiro confirmar uso, criar substituto e validar build/deploy antes de eliminar código.
