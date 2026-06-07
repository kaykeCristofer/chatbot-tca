# ==========================================
# ESTÁGIO 1: BASE
# ==========================================
FROM python:3.12-slim AS base

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt


# ==========================================
# ESTÁGIO 2: DESENVOLVIMENTO
# ==========================================
FROM base AS development

# Código injetado via volume no docker-compose
# --reload habilita hot-reload ao salvar arquivos
CMD ["uvicorn", "core.asgi:application", \
     "--host", "0.0.0.0", \
     "--port", "8000", \
     "--reload", \
     "--app-dir", "src"]


# ==========================================
# ESTÁGIO 3: PRODUÇÃO
# ==========================================
FROM base AS production

COPY ./src ./src

RUN adduser --disabled-password --no-create-home django_user && \
    chown -R django_user:django_user /app

USER django_user

# Uvicorn + ASGI — essencial para async funcionar em produção
CMD ["uvicorn", "core.asgi:application", \
     "--host", "0.0.0.0", \
     "--port", "8000", \
     "--workers", "4", \
     "--app-dir", "src"]