# src/chatbot/graph.py
from typing import TypedDict
from langchain_core.messages import BaseMessage, HumanMessage, AIMessage, SystemMessage
from langgraph.graph import StateGraph, END
from .llm_factory import get_llm
from .session_manager import load_history, save_messages
from .models import Session


# ==========================================
# ESTADO DO GRAFO
# ==========================================
class ChatState(TypedDict):
    """
    Representa o estado que trafega entre os nós do grafo.
    Cada nó recebe esse dict, processa e devolve atualizado.
    """
    session: Session      # sessão do usuário (vinda do banco)
    user_input: str       # pergunta que o usuário enviou
    history: list[BaseMessage]  # histórico carregado do banco
    response: str         # resposta gerada pelo LLM


def extract_text_content(content) -> str:
    """
    Alguns providers retornam texto direto; outros retornam blocos com metadata.
    A API do frontend deve receber apenas o texto final.
    """
    if isinstance(content, str):
        return content

    if isinstance(content, list):
        text_parts = []
        for item in content:
            if isinstance(item, str):
                text_parts.append(item)
            elif isinstance(item, dict) and isinstance(item.get("text"), str):
                text_parts.append(item["text"])

        if text_parts:
            return "\n".join(text_parts)

    return str(content)


# ==========================================
# NÓ 1: CARREGAR HISTÓRICO
# ==========================================
async def node_load_history(state: ChatState) -> ChatState:
    """
    Busca todas as mensagens anteriores da sessão no banco
    e converte para o formato que o LangChain entende.
    """
    raw_history = await load_history(state["session"])

    # Converte dict → objetos LangChain
    messages = []
    for msg in raw_history:
        if msg["role"] == "human":
            messages.append(HumanMessage(content=msg["content"]))
        else:
            messages.append(AIMessage(content=msg["content"]))

    return {**state, "history": messages}


# ==========================================
# NÓ 2: CHAMAR O LLM
# ==========================================
async def node_call_llm(state: ChatState) -> ChatState:
    """
    Monta o prompt completo (sistema + histórico + nova pergunta)
    e envia para o LLM configurado no .env.
    """
    llm = get_llm()

    # Monta a lista de mensagens para o LLM
    messages = [
        SystemMessage(content=(
            "Você é um assistente prestativo e objetivo. "
            "Responda sempre em português, de forma clara e direta."
        )),
        *state["history"],              # histórico da conversa
        HumanMessage(content=state["user_input"]),  # nova pergunta
    ]

    result = await llm.ainvoke(messages)

    return {**state, "response": extract_text_content(result.content)}


# ==========================================
# NÓ 3: SALVAR MENSAGENS
# ==========================================
async def node_save_messages(state: ChatState) -> ChatState:
    """
    Persiste a pergunta do usuário e a resposta do LLM no banco.
    Sempre salva os dois juntos para manter o histórico consistente.
    """
    await save_messages(
        session=state["session"],
        human_text=state["user_input"],
        ai_text=state["response"],
    )
    return state


# ==========================================
# MONTAGEM DO GRAFO
# ==========================================
def build_graph():
    """
    Define a ordem de execução dos nós:
    load_history → call_llm → save_messages → END
    """
    graph = StateGraph(ChatState)

    # Registra os nós
    graph.add_node("load_history", node_load_history)
    graph.add_node("call_llm", node_call_llm)
    graph.add_node("save_messages", node_save_messages)

    # Define o fluxo
    graph.set_entry_point("load_history")
    graph.add_edge("load_history", "call_llm")
    graph.add_edge("call_llm", "save_messages")
    graph.add_edge("save_messages", END)

    return graph.compile()


# Instância única reutilizada em toda a aplicação
chat_graph = build_graph()
