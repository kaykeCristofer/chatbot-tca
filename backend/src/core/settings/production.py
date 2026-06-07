from .base import *
import os

DEBUG = False

ALLOWED_HOSTS = [
    os.environ.get("EC2_PUBLIC_IP", ""),     # IP da EC2
    os.environ.get("EC2_PUBLIC_DNS", ""),    # DNS público da EC2
]

# Postgres — todas as vars vêm do .env
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": os.environ.get("POSTGRES_DB", "chatbot"),
        "USER": os.environ.get("POSTGRES_USER", "chatbot_user"),
        "PASSWORD": os.environ.get("POSTGRES_PASSWORD"),
        "HOST": os.environ.get("POSTGRES_HOST", "db"),
        "PORT": os.environ.get("POSTGRES_PORT", "5432"),
    }
}

# Segurança — ativar em produção
SECURE_BROWSER_XSS_FILTER = True
X_CONTENT_TYPE_OPTIONS = "nosniff"