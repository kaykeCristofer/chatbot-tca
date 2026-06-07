import os
from pathlib import Path
from dotenv import load_dotenv
from django.core.asgi import get_asgi_application

# asgi.py → core/ → src/ → backend/ → .env
load_dotenv(Path(__file__).resolve().parent.parent.parent / ".env")


os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings.development')

application = get_asgi_application()
