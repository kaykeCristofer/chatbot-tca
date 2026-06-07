### DEV — só o app com SQLite
docker compose up

### DEV — app + Postgres
docker compose --profile postgres up

### PRODUÇÃO (EC2) — build da imagem de prod + Postgres
docker compose --profile postgres up --build \
  -e DJANGO_SETTINGS_MODULE=core.settings.production