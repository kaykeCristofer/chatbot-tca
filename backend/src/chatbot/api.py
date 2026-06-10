from uuid import UUID
from ninja import NinjaAPI
from ninja.errors import HttpError
from ninja_jwt.authentication import JWTAuth
# === ADICIONADO: Importar os routers de autenticação do ninja_jwt ===
from ninja_jwt.routers.obtain import obtain_pair_router

from django.contrib.auth.models import User
from .schemas import ChatRequest, ChatResponse, MessageOut, SessionOut
from .session_manager import (
    get_or_create_session,
    validate_session_ownership,
    validate_session_ownership_sync,
)
from .models import Session, Message
from .graph import chat_graph


api = NinjaAPI(
    title="Chatbot Multiusuário",
    version="1.0",
    description="API de chatbot com sessões isoladas por usuário.",
)

# === ADICIONADO: Registrar as rotas de Token JWT diretamente na API ===
# Isso criará os endpoints: /api/token/pair, /api/token/refresh e /api/token/verify
api.add_router("/token/", obtain_pair_router)


# Instância de autenticação JWT para os endpoints protegidos
auth = JWTAuth()


# ==========================================
# ENDPOINT 1: ENVIAR MENSAGEM
# ==========================================
@api.post("/chat", response=ChatResponse, auth=auth)
async def chat(request, body: ChatRequest):
    """
    Endpoint principal protegido por JWT.
    """
    user: User = request.auth  # Recebe o usuário autenticado via JWT
    
    # Passo 1 — garante que existe uma sessão válida para este usuário
    session = await get_or_create_session(user, body.session_id)

    # Passo 2 — dispara o grafo com o estado inicial
    try:
        result = await chat_graph.ainvoke({
            "session": session,
            "user_input": body.message,
            "history": [],
            "response": "",
        })
    except Exception as exc:
        return api.create_response(
            request,
            {"detail": f"Erro ao consultar o provedor LLM: {exc}"},
            status=502,
        )

    # Passo 3 — devolve resposta + session_id para o cliente guardar
    return ChatResponse(
        session_id=session.id,
        response=result["response"],
    )


# ==========================================
# ENDPOINT 2: LISTAR SESSÕES DO USUÁRIO
# ==========================================
@api.get("/sessions", response=list[SessionOut], auth=auth)
def list_sessions(request):
    """
    Lista apenas as sessões do usuário autenticado.
    Garante isolamento entre usuários.
    """
    user: User = request.auth
    
    sessions = []
    for session in Session.objects.filter(user=user):
        count = Message.objects.filter(session=session).count()
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
@api.get("/history/{session_id}", response=list[MessageOut], auth=auth)
def get_history(request, session_id: UUID):
    """
    Retorna o histórico completo de mensagens de uma sessão.
    Valida que a sessão pertence ao usuário autenticado.
    """
    user: User = request.auth
    
    # Valida ownership antes de retornar histórico
    session = validate_session_ownership_sync(user, session_id)

    messages = []
    for msg in Message.objects.filter(session=session):
        messages.append(MessageOut(
            role=msg.role,
            content=msg.content,
            created_at=msg.created_at,
        ))
    return messages


# ==========================================
# ENDPOINT 4: DELETAR SESSÃO
# ==========================================
@api.delete("/sessions/{session_id}", auth=auth)
def delete_session(request, session_id: UUID):
    """
    Remove uma sessão e todo seu histórico do banco.
    Valida que a sessão pertence ao usuário autenticado.
    """
    user: User = request.auth
    
    # Valida ownership antes de deletar
    session = validate_session_ownership_sync(user, session_id)
    
    session.delete()
    return {"detail": "Sessão removida com sucesso."}


# ==========================================
# ENDPOINT 5: HEALTH CHECK (sem autenticação)
# ==========================================
@api.get("/health")
def health(request):
    """
    Verifica se a aplicação está no ar.
    NÃO requer autenticação.
    """
    return {"status": "ok"}
