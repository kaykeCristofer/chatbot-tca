from .base import *
import os
from django.core.exceptions import ImproperlyConfigured

DEBUG = False
SECRET_KEY = os.environ.get("DJANGO_SECRET_KEY")

if not SECRET_KEY:
    raise ImproperlyConfigured("DJANGO_SECRET_KEY deve ser definida em produção.")

ALLOWED_HOSTS = [
    os.environ.get("EC2_PUBLIC_IP", ""),     # IP da EC2
    os.environ.get("EC2_PUBLIC_DNS", ""),    # DNS público da EC2
    os.environ.get("APP_DOMAIN", ""),        # domínio opcional
    "localhost",
    "127.0.0.1",
]

CSRF_TRUSTED_ORIGINS = [
    origin
    for origin in [
        os.environ.get("CSRF_TRUSTED_ORIGIN"),
        f"http://{os.environ.get('EC2_PUBLIC_IP')}" if os.environ.get("EC2_PUBLIC_IP") else None,
        f"http://{os.environ.get('EC2_PUBLIC_DNS')}" if os.environ.get("EC2_PUBLIC_DNS") else None,
        f"https://{os.environ.get('APP_DOMAIN')}" if os.environ.get("APP_DOMAIN") else None,
    ]
    if origin
]

USE_X_FORWARDED_HOST = True
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")

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
