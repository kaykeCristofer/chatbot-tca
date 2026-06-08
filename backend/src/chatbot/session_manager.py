# src/chatbot/session_manager.py
from uuid import UUID
from .models import Session, Message


async def get_or_create_session(session_id: UUID | None) -> Session:
    """
    Recebe o session_id vindo da requisição.
    - Se for None → cria uma sessão nova (primeiro contato do usuário)
    - Se tiver ID → busca a sessão existente no banco
    - Se o ID não existir no banco → cria uma nova (segurança)
    """
    if session_id is None:
        session = await Session.objects.acreate()
        return session

    try:
        session = await Session.objects.aget(id=session_id)
        return session
    except Session.DoesNotExist:
        # ID inválido ou expirado — cria uma sessão nova
        session = await Session.objects.acreate()
        return session


async def load_history(session: Session) -> list[dict]:
    """
    Carrega todas as mensagens da sessão em ordem cronológica.
    Retorna uma lista de dicts que o LangGraph vai consumir.

    Formato:
        [
            {"role": "human", "content": "Olá"},
            {"role": "ai",    "content": "Olá! Como posso ajudar?"},
            ...
        ]
    """
    history = []
    async for message in Message.objects.filter(session=session):
        history.append({
            "role": message.role,
            "content": message.content,
        })
    return history


async def save_messages(session: Session, human_text: str, ai_text: str) -> None:
    """
    Persiste a troca completa (pergunta + resposta) no banco.
    Sempre salva os dois juntos para manter o histórico consistente.
    """
    await Message.objects.acreate(
        session=session,
        role="human",
        content=human_text,
    )
    await Message.objects.acreate(
        session=session,
        role="ai",
        content=ai_text,
    )