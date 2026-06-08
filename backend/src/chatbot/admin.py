# src/chatbot/admin.py
from django.contrib import admin
from .models import Session, Message


class MessageInline(admin.TabularInline):
    model = Message
    readonly_fields = ["role", "content", "created_at"]
    extra = 0


@admin.register(Session)
class SessionAdmin(admin.ModelAdmin):
    list_display = ["id", "created_at", "last_activity"]
    inlines = [MessageInline]


@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display = ["session", "role", "content", "created_at"]
    list_filter = ["role", "session"]