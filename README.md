# Chatbot TCA

Aplicacao de chatbot com frontend React, backend Django/Django Ninja, gerenciamento de sessoes e integracao com provedores de LLM via LangChain.

## Visao geral

O projeto foi separado em duas partes:

- `frontend/`: interface web do chat.
- `backend/`: API responsavel por sessoes, historico e comunicacao com o LLM.

## Tecnologias

Frontend:

- React
- Vite
- React Markdown

Backend:

- Python
- Django
- Django Ninja
- LangChain
- LangGraph
- SQLite em desenvolvimento
- PostgreSQL em producao

## Estrutura

```text
chatbot-tca/
├── backend/
│   ├── src/
│   │   ├── chatbot/
│   │   └── core/
│   ├── requirements.txt
│   ├── .env.example
│   └── README.md
├── frontend/
│   ├── src/
│   ├── package.json
│   ├── .env.example
│   └── README.md
└── README.md
```

## Requisitos

- Python 3.12+
- Node.js 20+
- npm
- Chave de API de um provedor LLM configurado no backend

Providers suportados no backend:

- `gemini`
- `claude`
- `openai`

## Configurando variaveis de ambiente

Backend:

```bash
cd backend
cp .env.example .env
```

Edite `backend/.env` e informe sua chave:

```env
DJANGO_SECRET_KEY=dev-secret
DJANGO_SETTINGS_MODULE=core.settings.development
LLM_PROVIDER=gemini
LLM_MODEL=models/gemini-flash-latest
LLM_API_KEY=coloque-sua-chave-aqui
```

Frontend:

```bash
cd frontend
cp .env.example .env
```

Configuracao padrao:

```env
VITE_USE_MOCK=false
VITE_API_BASE_URL=/api
```

## Rodando o backend

Em um terminal:

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python3 src/manage.py migrate
python3 src/manage.py runserver 0.0.0.0:8000
```

Teste se a API esta no ar:

```text
http://localhost:8000/api/health
```

Resposta esperada:

```json
{"status":"ok"}
```

## Rodando o frontend

Em outro terminal:

```bash
cd frontend
npm install
npm run dev
```

Abra a URL exibida pelo Vite, normalmente:

```text
http://localhost:5173/
```

## Testando sem backend

No `frontend/.env`, altere:

```env
VITE_USE_MOCK=true
```

Depois reinicie o Vite:

```bash
npm run dev
```

## Rotas principais da API

- `GET /api/health`: verifica se o backend esta no ar.
- `POST /api/chat`: envia mensagem para o chatbot.
- `GET /api/sessions`: lista sessoes existentes.
- `GET /api/history/{session_id}`: retorna o historico de uma sessao.
- `DELETE /api/sessions/{session_id}`: remove uma sessao.

## Fluxo de conversa

1. O frontend lista sessoes existentes.
2. A primeira mensagem e enviada com `session_id: null`.
3. O backend cria uma sessao e retorna o `session_id`.
4. O frontend guarda esse ID e usa nas proximas mensagens.
5. O historico fica salvo no banco de desenvolvimento.

## Comandos uteis

Frontend:

```bash
npm run lint
npm run build
```

Backend:

```bash
python3 src/manage.py check
python3 src/manage.py migrate
```

## Cuidados

- Se alterar variaveis de ambiente, reinicie o servidor correspondente.
- Para usar Gemini, instale as dependencias com `pip install -r requirements.txt`.
