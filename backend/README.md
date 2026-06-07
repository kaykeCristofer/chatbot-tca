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

## Rotina comum de desenvolvimento

- As alteracoes em `src/` entram no container via volume.
- O SQLite local fica em `data/db.sqlite3`.
- O Postgres sobe somente com o profile `postgres`.

## Solucao de problemas

- Se o container nao enxergar variaveis do `.env`, confira se o arquivo esta na pasta `backend/`.
- Se o PostgreSQL nao subir, verifique se `POSTGRES_PASSWORD` esta definido.
- Se der erro de importacao de `core`, confirme se `PYTHONPATH` aponta para `/app/src`.
- Se o SQLite nao persistir, confira se a pasta `data/` existe e esta montada no compose.