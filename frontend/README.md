# Frontend - Chatbot TCA

Interface React + Vite para conversar com o backend do Chatbot TCA.

## Tecnologias

- React
- Vite
- React Markdown
- Fetch API

## Requisitos

- Node.js 20+
- npm
- Backend rodando em `http://localhost:8000`, quando `VITE_USE_MOCK=false`

## Configuracao

Copie o arquivo de exemplo:

```bash
cp .env.example .env
```

Configuracao padrao para usar o backend local:

```env
VITE_USE_MOCK=false
VITE_API_BASE_URL=/api
```

O Vite encaminha chamadas de `/api` para `http://localhost:8000`, conforme `vite.config.js`.

Para testar somente a interface, sem backend:

```env
VITE_USE_MOCK=true
VITE_API_BASE_URL=/api
```

Sempre reinicie o Vite depois de alterar `.env`.

## Instalacao

```bash
npm install
```

## Rodando em desenvolvimento

```bash
npm run dev
```

Abra a URL exibida no terminal, normalmente:

```text
http://localhost:5173/
```

Se a porta estiver ocupada, o Vite usara outra porta, como `5174`.

## Scripts

```bash
npm run dev
npm run test
npm run build
npm run preview
npm run lint
```

## Testes

Para rodar os testes automatizados do frontend:

```bash
npm run test
```

A suite usa Vitest e Testing Library para validar:

- cliente da API em `src/api/chatbotApi.js`;
- modo mock sem backend;
- tratamento de erros da API;
- fluxo principal do `ChatBox`;
- carregamento de historico;
- exclusao de sessao;
- componentes `MessageBubble` e `SessionInfo`.

Tambem e recomendado validar lint e build:

```bash
npm run lint
npm run build
```

## Fluxo da aplicacao

1. O frontend carrega sessoes existentes com `GET /api/sessions`.
2. Ao enviar a primeira mensagem, chama `POST /api/chat` com `session_id: null`.
3. O backend cria a sessao e retorna `session_id`.
4. As proximas mensagens reutilizam o mesmo `session_id`.
5. Ao selecionar uma sessao existente, o frontend carrega o historico com `GET /api/history/{session_id}`.
6. Ao excluir uma sessao, chama `DELETE /api/sessions/{session_id}`.

## Observacoes

- Respostas do bot sao renderizadas como Markdown.
- `Enter` envia a mensagem.
- `Shift + Enter` quebra linha no campo de texto.
