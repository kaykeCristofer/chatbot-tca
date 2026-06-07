# src/chatbot/schemas.py
from ninja import Schema
from uuid import UUID
from datetime import datetime


class ChatRequest(Schema):
    """
    O que o cliente envia em cada mensagem.
    Na primeira mensagem session_id vem None.
    Nas seguintes, o cliente reutiliza o session_id recebido.
    """
    session_id: UUID | None = None
    message: str


class ChatResponse(Schema):
    """
    O que a API devolve após processar a mensagem.
    O cliente deve guardar o session_id para as próximas requisições.
    """
    session_id: UUID
    response: str


class MessageOut(Schema):
    """
    Representa uma mensagem individual no histórico.
    """
    role: str
    content: str
    created_at: datetime


class SessionOut(Schema):
    """
    Representa uma sessão com o número de mensagens trocadas.
    Usado no endpoint de listagem para debug/apresentação.
    """
    session_id: UUID
    created_at: datetime
    last_activity: datetime
    message_count: int