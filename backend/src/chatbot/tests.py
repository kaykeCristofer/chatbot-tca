import json
import time
from types import SimpleNamespace
from unittest.mock import AsyncMock, Mock, patch
from uuid import uuid4

from asgiref.sync import sync_to_async
from django.test import AsyncClient, TestCase, override_settings
from langchain_core.messages import AIMessage, HumanMessage

from .graph import (
    extract_text_content,
    node_call_llm,
    node_load_history,
    node_save_messages,
)
from .llm_factory import get_llm
from .models import Message, Session
from .session_manager import get_or_create_session, load_history, save_messages


class SessionManagerTests(TestCase):
    async def test_get_or_create_session_creates_session_without_id(self):
        session = await get_or_create_session(None)

        self.assertIsNotNone(session.id)
        self.assertEqual(await Session.objects.acount(), 1)

    async def test_get_or_create_session_reuses_existing_session(self):
        existing_session = await Session.objects.acreate()

        session = await get_or_create_session(existing_session.id)

        self.assertEqual(session.id, existing_session.id)
        self.assertEqual(await Session.objects.acount(), 1)

    async def test_get_or_create_session_creates_new_session_for_unknown_id(self):
        session = await get_or_create_session(uuid4())

        self.assertIsNotNone(session.id)
        self.assertEqual(await Session.objects.acount(), 1)

    async def test_save_messages_persists_human_and_ai_messages_in_order(self):
        session = await Session.objects.acreate()

        await save_messages(session, "Oi", "Ola! Como posso ajudar?")
        history = await load_history(session)

        self.assertEqual(
            history,
            [
                {"role": "human", "content": "Oi"},
                {"role": "ai", "content": "Ola! Como posso ajudar?"},
            ],
        )


class GraphTests(TestCase):
    def test_extract_text_content_accepts_common_provider_formats(self):
        self.assertEqual(extract_text_content("texto direto"), "texto direto")
        self.assertEqual(
            extract_text_content(["parte 1", {"text": "parte 2"}, {"ignored": True}]),
            "parte 1\nparte 2",
        )
        self.assertEqual(extract_text_content({"unexpected": True}), "{'unexpected': True}")

    async def test_node_load_history_converts_database_messages_to_langchain_messages(self):
        session = await Session.objects.acreate()
        await save_messages(session, "Pergunta", "Resposta")

        state = await node_load_history(
            {"session": session, "user_input": "Nova", "history": [], "response": ""}
        )

        self.assertIsInstance(state["history"][0], HumanMessage)
        self.assertIsInstance(state["history"][1], AIMessage)
        self.assertEqual(state["history"][0].content, "Pergunta")
        self.assertEqual(state["history"][1].content, "Resposta")

    async def test_node_call_llm_uses_system_history_and_current_user_message(self):
        llm = SimpleNamespace(ainvoke=AsyncMock(return_value=SimpleNamespace(content="Resposta")))
        session = await Session.objects.acreate()
        state = {
            "session": session,
            "user_input": "Pergunta atual",
            "history": [HumanMessage(content="Pergunta anterior"), AIMessage(content="Resposta anterior")],
            "response": "",
        }

        with patch("chatbot.graph.get_llm", return_value=llm):
            result = await node_call_llm(state)

        messages = llm.ainvoke.await_args.args[0]
        self.assertIn("portugues", messages[0].content.lower().replace("ê", "e"))
        self.assertEqual(messages[1].content, "Pergunta anterior")
        self.assertEqual(messages[2].content, "Resposta anterior")
        self.assertEqual(messages[3].content, "Pergunta atual")
        self.assertEqual(result["response"], "Resposta")

    async def test_node_save_messages_persists_the_exchange(self):
        session = await Session.objects.acreate()

        await node_save_messages(
            {"session": session, "user_input": "Oi", "history": [], "response": "Ola"}
        )

        self.assertEqual(await Message.objects.filter(session=session).acount(), 2)


class LLMFactoryTests(TestCase):
    @override_settings(LLM_API_KEY="")
    def test_get_llm_requires_api_key(self):
        with self.assertRaisesMessage(ValueError, "LLM_API_KEY"):
            get_llm()

    @override_settings(LLM_PROVIDER="invalid", LLM_MODEL="test-model", LLM_API_KEY="secret")
    def test_get_llm_rejects_invalid_provider(self):
        with self.assertRaisesMessage(ValueError, "LLM_PROVIDER 'invalid' inválido"):
            get_llm()

    @override_settings(LLM_PROVIDER="gemini", LLM_MODEL="models/test", LLM_API_KEY="secret")
    def test_get_llm_builds_gemini_provider(self):
        provider = Mock(return_value="gemini-client")

        with patch.dict("sys.modules", {"langchain_google_genai": SimpleNamespace(ChatGoogleGenerativeAI=provider)}):
            self.assertEqual(get_llm(), "gemini-client")

        provider.assert_called_once_with(model="models/test", google_api_key="secret")


@override_settings(SECRET_KEY="test-secret")
class ChatAPITests(TestCase):
    async def test_health_endpoint(self):
        response = await AsyncClient().get("/api/health")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"status": "ok"})

    async def test_chat_creates_session_and_returns_llm_response(self):
        fake_graph = SimpleNamespace(
            ainvoke=AsyncMock(return_value={"response": "Resposta do chatbot"})
        )

        with patch("chatbot.api.chat_graph", fake_graph):
            response = await AsyncClient().post(
                "/api/chat",
                data=json.dumps({"session_id": None, "message": "Oi"}),
                content_type="application/json",
            )

        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["response"], "Resposta do chatbot")
        self.assertTrue(data["session_id"])
        self.assertEqual(await Session.objects.acount(), 1)
        self.assertEqual(fake_graph.ainvoke.await_args.args[0]["user_input"], "Oi")

    async def test_chat_returns_502_when_llm_provider_fails(self):
        fake_graph = SimpleNamespace(ainvoke=AsyncMock(side_effect=RuntimeError("timeout")))

        with patch("chatbot.api.chat_graph", fake_graph):
            response = await AsyncClient().post(
                "/api/chat",
                data=json.dumps({"session_id": None, "message": "Oi"}),
                content_type="application/json",
            )

        self.assertEqual(response.status_code, 502)
        self.assertIn("Erro ao consultar o provedor LLM", response.json()["detail"])
        self.assertEqual(await Message.objects.acount(), 0)

    async def test_history_endpoint_returns_messages_for_session(self):
        session = await Session.objects.acreate()
        await save_messages(session, "Pergunta", "Resposta")

        response = await AsyncClient().get(f"/api/history/{session.id}")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            [item["role"] for item in response.json()],
            ["human", "ai"],
        )

    async def test_history_endpoint_returns_404_for_unknown_session(self):
        response = await AsyncClient().get(f"/api/history/{uuid4()}")

        self.assertEqual(response.status_code, 404)

    async def test_delete_session_removes_session_and_messages(self):
        session = await Session.objects.acreate()
        await save_messages(session, "Pergunta", "Resposta")

        response = await AsyncClient().delete(f"/api/sessions/{session.id}")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(await Session.objects.acount(), 0)
        self.assertEqual(await Message.objects.acount(), 0)

    async def test_list_sessions_returns_message_counts(self):
        session = await Session.objects.acreate()
        await save_messages(session, "Pergunta", "Resposta")

        response = await AsyncClient().get("/api/sessions")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()[0]["session_id"], str(session.id))
        self.assertEqual(response.json()[0]["message_count"], 2)


@override_settings(SECRET_KEY="test-secret")
class PerformanceSmokeTests(TestCase):
    async def test_chat_endpoint_latency_with_mocked_llm_stays_reasonable(self):
        fake_graph = SimpleNamespace(
            ainvoke=AsyncMock(return_value={"response": "Resposta rapida"})
        )

        started_at = time.perf_counter()
        with patch("chatbot.api.chat_graph", fake_graph):
            response = await AsyncClient().post(
                "/api/chat",
                data=json.dumps({"session_id": None, "message": "Oi"}),
                content_type="application/json",
            )
        elapsed_ms = (time.perf_counter() - started_at) * 1000

        self.assertEqual(response.status_code, 200)
        self.assertLess(elapsed_ms, 1000)

    async def test_history_endpoint_handles_larger_conversation(self):
        session = await Session.objects.acreate()
        messages = [
            Message(session=session, role="human" if index % 2 == 0 else "ai", content=f"Mensagem {index}")
            for index in range(100)
        ]
        await sync_to_async(Message.objects.bulk_create)(messages)

        started_at = time.perf_counter()
        response = await AsyncClient().get(f"/api/history/{session.id}")
        elapsed_ms = (time.perf_counter() - started_at) * 1000

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.json()), 100)
        self.assertLess(elapsed_ms, 1000)
