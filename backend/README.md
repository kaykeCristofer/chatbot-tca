# Projeto Backend

Backend Django + Django Ninja para o chatbot do projeto.

## Visao geral

O backend fica em `src/` e usa:

- Django 5
- Django Ninja para a API
- LangChain e LangGraph para a camada de LLM
- SQLite em desenvolvimento
- PostgreSQL em produção

## Estrutura

- `src/manage.py` - ponto de entrada do Django
- `src/core/` - configuracao principal do projeto
- `src/chatbot/` - app principal da aplicacao
- `data/` - banco SQLite local de desenvolvimento
- `Dockerfile` - build da imagem
- `docker-compose.yml` - ambiente local com Docker

## Requisitos

- Python 3.12+
- Docker e Docker Compose, se quiser subir via container
- Um arquivo `.env` na raiz do backend

## Variaveis de ambiente

As variaveis mais importantes sao:

- `DJANGO_SECRET_KEY`
- `DJANGO_SETTINGS_MODULE`
- `LLM_PROVIDER`
- `LLM_MODEL`
- `LLM_API_KEY`
- `POSTGRES_DB`
- `POSTGRES_USER`
- `POSTGRES_PASSWORD`
- `POSTGRES_HOST`
- `POSTGRES_PORT`
- `EC2_PUBLIC_IP`
- `EC2_PUBLIC_DNS`

Exemplo minimo de `.env` para desenvolvimento com SQLite:

```env
DJANGO_SECRET_KEY=change-me
DJANGO_SETTINGS_MODULE=core.settings.development
LLM_PROVIDER=claude
LLM_MODEL=claude-haiku-4-5-20251001
LLM_API_KEY=change-me
```

Exemplo minimo de `.env` para PostgreSQL:

```env
DJANGO_SECRET_KEY=change-me
DJANGO_SETTINGS_MODULE=core.settings.production
LLM_PROVIDER=claude
LLM_MODEL=claude-haiku-4-5-20251001
LLM_API_KEY=change-me
POSTGRES_DB=chatbot
POSTGRES_USER=chatbot_user
POSTGRES_PASSWORD=chatbot_password
POSTGRES_HOST=db
POSTGRES_PORT=5432
```

## Executando sem Docker

1. Crie e ative a virtualenv.

```bash
python -m venv venv
source venv/bin/activate
```

2. Instale as dependencias.

```bash
pip install -r requirements.txt
```

3. Aplique as migracoes.

```bash
python src/manage.py migrate
```

4. Crie um superusuario, se precisar acessar o admin.

```bash
python src/manage.py createsuperuser
```

5. Suba o servidor de desenvolvimento.

```bash
python src/manage.py runserver 0.0.0.0:8000
```

## Executando com Docker

### Desenvolvimento com SQLite

```bash
docker compose up --build
```

### Desenvolvimento ou homologacao com PostgreSQL

```bash
DJANGO_SETTINGS_MODULE=core.settings.production docker compose --profile postgres up --build
```

## Deploy com frontend na EC2

Para producao com frontend + backend + PostgreSQL, use o compose da raiz do projeto:

```bash
docker compose --env-file ./backend/.env -f docker-compose.prod.yml up --build -d
```

Esse compose builda o frontend com Nginx na porta `80` e encaminha `/api` para o backend internamente.

No host EC2, a porta publicada e controlada por `FRONTEND_HTTP_PORT` no `.env` do backend. Por padrao use:

```env
FRONTEND_HTTP_PORT=8080
```

Assim evita conflito se a porta `80` ja estiver ocupada.

Se publicar em `8080`, use tambem:

```env
CSRF_TRUSTED_ORIGIN=http://SEU_IP_PUBLICO:8080
```

Se quiser executar as migracoes dentro do container:

```bash
docker compose exec app python src/manage.py migrate
docker compose exec app python src/manage.py createsuperuser
```

## Build da imagem

```bash
docker build -t backend-chatbot --target production .
```

## Rotas principais

- `GET /api/health` - verifica se a aplicacao esta no ar
- `POST /api/chat` - envia uma mensagem para o chatbot
- `GET /api/sessions` - lista sessoes ativas
- `GET /api/history/{session_id}` - retorna o historico de uma sessao
- `DELETE /api/sessions/{session_id}` - remove uma sessao

O admin do Django fica em `/admin/`.

## Testes

Para rodar os testes automatizados do backend:

```powershell
venv\Scripts\python src\manage.py test chatbot
```

A suite cobre:

- gerenciamento de sessoes;
- persistencia e recuperacao de historico;
- endpoints da API;
- integracao com banco de dados de teste;
- grafo LangGraph com LLM mockado;
- fabrica de LLM;
- testes smoke de performance com LLM mockado.

Os testes reais com Gemini ficam desativados por padrao para evitar consumo da chave de API. Para executa-los explicitamente:

```powershell
$env:RUN_GEMINI_INTEGRATION_TESTS="true"
venv\Scripts\python src\manage.py test chatbot.test_gemini_integration
```

Esses testes fazem uma chamada real ao Gemini e podem demorar mais que a suite normal.

## Rotina comum de desenvolvimento

- As alteracoes em `src/` entram no container via volume.
- O SQLite local fica em `data/db.sqlite3`.
- O Postgres sobe somente com o profile `postgres`.

## Solucao de problemas

- Se o container nao enxergar variaveis do `.env`, confira se o arquivo esta na pasta `backend/`.
- Se o PostgreSQL nao subir, verifique se `POSTGRES_PASSWORD` esta definido.
- Se der erro de importacao de `core`, confirme se `PYTHONPATH` aponta para `/app/src`.
- Se o SQLite nao persistir, confira se a pasta `data/` existe e esta montada no compose.
