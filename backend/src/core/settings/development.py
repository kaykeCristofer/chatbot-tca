# src/core/settings/development.py
from .base import *

DEBUG = True

ALLOWED_HOSTS = ["*"]  

# SQLite — arquivo fora do src para não commitar o banco
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": BASE_DIR / "../data/db.sqlite3",
        #        src/  → /data/db.sqlite3
    }
}

# Logs no terminal em dev — útil para ver queries do LangGraph
LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "handlers": {
        "console": {"class": "logging.StreamHandler"},
    },
    "root": {
        "handlers": ["console"],
        "level": "DEBUG",
    },
}