# src/chatbot/session_manager.py
from uuid import UUID
from django.contrib.auth.models import User
from ninja.errors import HttpError
from .models import Session, Message


async def validate_session_ownership(user: User, session_id: UUID) -> Session:
    """
    Valida se a sessão pertence ao usuário autenticado.
    Se a sessão não existir ou não pertencer ao user → lança 403.
    
    Retorna a sessão se tudo estiver OK.
    """
    try:
        session = await Session.objects.aget(id=session_id, user=user)
        return session
    except Session.DoesNotExist:
        raise HttpError(403, "Você não tem permissão para acessar esta sessão.")


def validate_session_ownership_sync(user: User, session_id: UUID) -> Session:
    """
    Versão síncrona para endpoints que usam o ORM padrão do Django.
    """
    try:
        return Session.objects.get(id=session_id, user=user)
    except Session.DoesNotExist:
        raise HttpError(403, "Você não tem permissão para acessar esta sessão.")


async def get_or_create_session(user: User, session_id: UUID | None) -> Session:
    """
    Recebe o usuário autenticado e o session_id vindo da requisição.
    
    - Se session_id for None → cria uma sessão nova para o usuário
    - Se tiver ID → valida que a sessão pertence ao user
    - Se a validação falhar → lança 403
    
    Isso garante que nenhum usuário possa acessar sessão de outro.
    """
    if session_id is None:
        # Primeira mensagem do usuário → cria nova sessão
        session = await Session.objects.acreate(user=user)
        return session

    # Usuário está tentando retomar uma sessão existente
    # Valida que a sessão pertence a ele
    return await validate_session_ownership(user, session_id)


async def load_history(session: Session) -> list[dict]:
    """
    Carrega todas as mensagens da sessão em ordem cronológica.
    A sessão já foi validada em get_or_create_session, então é seguro carregar.
    
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
    
    A sessão já foi validada, então é seguro salvar.
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
