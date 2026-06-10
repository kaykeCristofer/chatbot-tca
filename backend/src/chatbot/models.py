# src/chatbot/models.py
import uuid
from django.db import models
from django.contrib.auth.models import User


class Session(models.Model):
    """
    Representa uma sessão de usuário.
    O ID é um UUID gerado automaticamente no momento da conexão.
    Agora cada sessão pertence a um usuário autenticado.
    """
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="sessions",
        help_text="O usuário dono desta sessão.",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    last_activity = models.DateTimeField(auto_now=True)  # atualiza a cada mensagem

    class Meta:
        ordering = ["-last_activity"]
        indexes = [
            models.Index(fields=["user", "-last_activity"]),
        ]

    def __str__(self):
        return f"Session {self.id} ({self.user.username}) — {self.last_activity:%d/%m/%Y %H:%M}"


class Message(models.Model):
    """
    Representa uma mensagem dentro de uma sessão.
    Cada troca (pergunta + resposta) gera dois registros:
        - role='human' → o que o usuário enviou
        - role='ai'    → o que o LLM respondeu
    """
    ROLE_CHOICES = [
        ("human", "Human"),
        ("ai", "AI"),
    ]

    session = models.ForeignKey(
        Session,
        on_delete=models.CASCADE,   # apaga mensagens se a sessão for deletada
        related_name="messages",
    )
    role = models.CharField(max_length=10, choices=ROLE_CHOICES)
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]   # histórico sempre em ordem cronológica

    def __str__(self):
        return f"[{self.role.upper()}] {self.content[:60]}"