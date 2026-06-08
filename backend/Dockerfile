# ==========================================
# ESTÁGIO 1: BASE
# ==========================================
FROM python:3.12-slim AS base

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app/src

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt


# ==========================================
# ESTÁGIO 2: DESENVOLVIMENTO
# ==========================================
FROM base AS development

COPY ./src ./src

EXPOSE 8000

CMD ["python", "-m", "uvicorn", "core.asgi:application", "--host", "0.0.0.0", "--port", "8000", "--reload"]


# ==========================================
# ESTÁGIO 3: PRODUÇÃO
# ==========================================
FROM base AS production

COPY ./src ./src
COPY ./entrypoint.sh ./entrypoint.sh

RUN adduser --disabled-password --gecos "" django_user && \
    chmod +x /app/entrypoint.sh && \
    chown -R django_user:django_user /app

USER django_user

EXPOSE 8000

ENTRYPOINT ["/app/entrypoint.sh"]
CMD ["python", "-m", "uvicorn", "core.asgi:application", "--host", "0.0.0.0", "--port", "8000", "--workers", "4"]
