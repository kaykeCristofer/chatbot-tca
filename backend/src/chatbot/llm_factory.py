# src/chatbot/llm_factory.py
from django.conf import settings


def get_llm():
    """
    Instancia o modelo LLM correto baseado na variável LLM_PROVIDER do .env.
    Suporta: claude, openai, gemini.

    Configuração no .env:
        LLM_PROVIDER=claude
        LLM_MODEL=claude-haiku-4-5-20251001
        LLM_API_KEY=sk-ant-...
    """
    provider = settings.LLM_PROVIDER
    model = settings.LLM_MODEL
    api_key = settings.LLM_API_KEY
    timeout = settings.LLM_TIMEOUT_SECONDS

    if not api_key:
        raise ValueError("LLM_API_KEY não definida no .env")

    if provider == "claude":
        from langchain_anthropic import ChatAnthropic
        return ChatAnthropic(
            model=model,
            api_key=api_key,
            timeout=timeout,
        )

    elif provider == "openai":
        from langchain_openai import ChatOpenAI
        return ChatOpenAI(
            model=model,
            api_key=api_key,
            timeout=timeout,
        )

    elif provider == "gemini":
        from langchain_google_genai import ChatGoogleGenerativeAI
        return ChatGoogleGenerativeAI(
            model=model,
            google_api_key=api_key,
            timeout=timeout,
        )

    else:
        raise ValueError(
            f"LLM_PROVIDER '{provider}' inválido. "
            f"Use: claude, openai ou gemini"
        )
