# src/chatbot/api.py
from uuid import UUID
from ninja import NinjaAPI
from ninja.errors import HttpError
from .schemas import ChatRequest, ChatResponse, MessageOut, SessionOut
from .session_manager import get_or_create_session
from .models import Session, Message
from .graph import chat_graph


api = NinjaAPI(
    title="Chatbot Multiusuário",
    version="1.0",
    description="API de chatbot com sessões isoladas por usuário.",
)


# ==========================================
# ENDPOINT 1: ENVIAR MENSAGEM
# ==========================================
@api.post("/chat", response=ChatResponse)
async def chat(request, body: ChatRequest):
    """
    Endpoint principal.

    Fluxo:
        1. Cria ou recupera a sessão do usuário
        2. Dispara o grafo LangGraph
        3. Devolve a resposta e o session_id

    Na primeira mensagem o cliente envia session_id=null.
    Nas seguintes, reutiliza o session_id recebido.
    """
    # Passo 1 — garante que existe uma sessão válida
    session = await get_or_create_session(body.session_id)

    # Passo 2 — dispara o grafo com o estado inicial
    result = await chat_graph.ainvoke({
        "session": session,
        "user_input": body.message,
        "history": [],
        "response": "",
    })

    # Passo 3 — devolve resposta + session_id para o cliente guardar
    return ChatResponse(
        session_id=session.id,
        response=result["response"],
    )


# ==========================================
# ENDPOINT 2: LISTAR SESSÕES ATIVAS
# ==========================================
@api.get("/sessions", response=list[SessionOut])
async def list_sessions(request):
    """
    Lista todas as sessões registradas no banco.
    Útil para debug e demonstração na apresentação.
    """
    sessions = []
    async for session in Session.objects.all():
        count = await Message.objects.filter(session=session).acount()
        sessions.append(SessionOut(
            session_id=session.id,
            created_at=session.created_at,
            last_activity=session.last_activity,
            message_count=count,
        ))
    return sessions


# ==========================================
# ENDPOINT 3: HISTÓRICO DE UMA SESSÃO
# ==========================================
@api.get("/history/{session_id}", response=list[MessageOut])
async def get_history(request, session_id: UUID):
    """
    Retorna o histórico completo de mensagens de uma sessão.
    Útil para o frontend renderizar a conversa ao reconectar.
    """
    try:
        session = await Session.objects.aget(id=session_id)
    except Session.DoesNotExist:
        raise HttpError(404, "Sessão não encontrada.")

    messages = []
    async for msg in Message.objects.filter(session=session):
        messages.append(MessageOut(
            role=msg.role,
            content=msg.content,
            created_at=msg.created_at,
        ))
    return messages


# ==========================================
# ENDPOINT 4: DELETAR SESSÃO
# ==========================================
@api.delete("/sessions/{session_id}")
async def delete_session(request, session_id: UUID):
    """
    Remove uma sessão e todo seu histórico do banco.
    Cascade no model garante que as mensagens são apagadas junto.
    """
    try:
        session = await Session.objects.aget(id=session_id)
    except Session.DoesNotExist:
        raise HttpError(404, "Sessão não encontrada.")

    await session.adelete()
    return {"detail": "Sessão removida com sucesso."}


# ==========================================
# ENDPOINT 5: HEALTH CHECK
# ==========================================
@api.get("/health")
def health(request):
    """
    Verifica se a aplicação está no ar.
    Usado pelo Docker e monitoramento na EC2.
    """
    return {"status": "ok"}