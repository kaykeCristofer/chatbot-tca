import json
import os
import time
import unittest

from django.conf import settings
from django.test import Client, TestCase

from .models import Message, Session


RUN_GEMINI_TESTS = os.environ.get("RUN_GEMINI_INTEGRATION_TESTS") == "true"


@unittest.skipUnless(
    RUN_GEMINI_TESTS,
    "Defina RUN_GEMINI_INTEGRATION_TESTS=true para rodar testes reais do Gemini.",
)
class GeminiIntegrationTests(TestCase):
    """
    Testes reais do Gemini, desligados por padrão para não consumir cota.

    Quando habilitada, a classe faz uma única chamada real ao /api/chat em
    setUpTestData e reaproveita o resultado nos cinco testes abaixo.
    """

    @classmethod
    def setUpTestData(cls):
        cls.provider = settings.LLM_PROVIDER
        cls.model = settings.LLM_MODEL
        cls.api_key_configured = bool(settings.LLM_API_KEY)
        cls.prompt = "Responda apenas com a palavra OK."

        started_at = time.perf_counter()
        response = Client().post(
            "/api/chat",
            data=json.dumps({"session_id": None, "message": cls.prompt}),
            content_type="application/json",
        )
        cls.elapsed_ms = (time.perf_counter() - started_at) * 1000
        cls.status_code = response.status_code

        try:
            cls.payload = response.json()
        except ValueError:
            cls.payload = {}

    def test_gemini_configuration_is_ready(self):
        self.assertEqual(self.provider, "gemini")
        self.assertTrue(self.api_key_configured)
        self.assertTrue(self.model)

    def test_chat_endpoint_returns_success_with_real_gemini(self):
        self.assertEqual(self.status_code, 200)
        self.assertIn("session_id", self.payload)
        self.assertIn("response", self.payload)
        self.assertTrue(self.payload["response"].strip())

    def test_real_gemini_response_follows_basic_instruction(self):
        self.assertIn("OK", self.payload["response"].upper())

    def test_real_chat_latency_stays_within_interactive_limit(self):
        self.assertLess(self.elapsed_ms, 30000)

    def test_real_chat_persists_session_and_history(self):
        session_id = self.payload["session_id"]

        self.assertTrue(Session.objects.filter(id=session_id).exists())
        self.assertEqual(Message.objects.filter(session_id=session_id).count(), 2)
        self.assertEqual(
            list(Message.objects.filter(session_id=session_id).values_list("role", flat=True)),
            ["human", "ai"],
        )
