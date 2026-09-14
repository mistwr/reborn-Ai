# Lumin AI Studio — Shell Architecture

## Objetivo

Separar a estrutura visual e de navegação da lógica histórica concentrada em `app/page.tsx`.

## Estrutura alvo

```text
app/page.tsx
  -> LuminAppShell
      -> LuminSidebar
      -> LuminTopbar
      -> LuminChatSurface
          -> ChatWelcome
          -> MessageList
          -> LuminComposer
      -> LuminToolSurface
```

## Regras de refactor

1. Extrair UI antes de mover estado.
2. Passar estado e callbacks por props na primeira fase.
3. Só criar stores/contextos depois de a interface estar estável.
4. Um único composer por superfície de chat.
5. Mobile usa a mesma árvore lógica que desktop; muda apenas apresentação.
6. Módulos existentes continuam acessíveis pelo mesmo `activeTab` durante a migração.
7. Browser Agent, auth, Live e WebCraft não devem ser reescritos durante a extração da shell.

## Ordem de extração

1. Topbar e sidebar.
2. Composer.
3. Lista de mensagens e welcome.
4. Superfície de ferramentas.
5. Estado de navegação.
6. Limpeza do código morto em `app/page.tsx`.

## Critérios de aceitação

- sem regressão no chat;
- sem composer duplicado;
- sem scroll vertical vazio no mobile;
- sidebar e topbar responsivos;
- todas as tabs continuam acessíveis;
- build Vercel e preview Netlify passam antes do merge.
