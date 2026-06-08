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

## Deploy na AWS EC2 com Docker

O projeto inclui um compose de producao na raiz:

```text
docker-compose.prod.yml
```

Esse compose sobe:

- `frontend`: build React servido por Nginx na porta `80`.
- por padrao, essa porta interna `80` e publicada no host como `8080`, para evitar conflito caso a EC2 ja use a porta `80`.
- `backend`: Django/Django Ninja com Uvicorn em modo producao.
- `db`: PostgreSQL privado na rede Docker.

### Preparando a EC2

Na instancia EC2, instale Docker e Docker Compose Plugin. Depois libere no Security Group:

- `8080/tcp` para acessar o frontend, se mantiver `FRONTEND_HTTP_PORT=8080`.
- `22/tcp` para SSH.

A porta `8000` do backend nao precisa ficar publica, porque o Nginx do frontend encaminha `/api` internamente para o container `backend`.

Se a porta `80` estiver livre e voce quiser usar HTTP padrao, altere `FRONTEND_HTTP_PORT=80`.

### Configurando variaveis

Crie o `.env` do backend:

```bash
cd backend
cp .env.example .env
```

Para producao, ajuste pelo menos:

```env
DJANGO_SECRET_KEY=uma-chave-segura
DJANGO_SETTINGS_MODULE=core.settings.production
LLM_PROVIDER=gemini
LLM_MODEL=models/gemini-flash-latest
LLM_API_KEY=sua-chave-real

POSTGRES_DB=chatbot
POSTGRES_USER=chatbot_user
POSTGRES_PASSWORD=senha-forte
POSTGRES_HOST=db
POSTGRES_PORT=5432

EC2_PUBLIC_IP=seu-ip-publico
EC2_PUBLIC_DNS=seu-dns-publico
APP_DOMAIN=
CSRF_TRUSTED_ORIGIN=
FRONTEND_HTTP_PORT=8080
```

Se usar a porta `8080`, recomenda-se preencher:

```env
CSRF_TRUSTED_ORIGIN=http://SEU_IP_PUBLICO:8080
```

Se usar dominio com HTTPS futuramente, preencha `APP_DOMAIN` e configure o proxy/HTTPS.

### Subindo em producao

Na raiz do projeto:

```bash
docker compose --env-file ./backend/.env -f docker-compose.prod.yml up --build -d
```

O container do backend executa as migracoes automaticamente antes de iniciar o Uvicorn.

Para acompanhar logs:

```bash
docker compose --env-file ./backend/.env -f docker-compose.prod.yml logs -f
```

Para testar:

```text
http://SEU_IP_PUBLICO/
http://SEU_IP_PUBLICO:8080/
http://SEU_IP_PUBLICO:8080/api/health
```

### Atualizando o deploy

Depois de enviar novas alteracoes para a EC2:

```bash
git pull
docker compose --env-file ./backend/.env -f docker-compose.prod.yml up --build -d
```

### Parando os containers

```bash
docker compose --env-file ./backend/.env -f docker-compose.prod.yml down
```

Para apagar tambem o volume do banco:

```bash
docker compose --env-file ./backend/.env -f docker-compose.prod.yml down -v
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
