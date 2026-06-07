import { useState } from "react";
import { createSession, sendMessage } from "../api/chatbotApi";
import MessageBubble from "./MessageBubble";
import SessionInfo from "./SessionInfo";

function getCurrentTime() {
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date());
}

function getSessionDateTime() {
  const now = new Date();

  return {
    dateTime: now.toISOString(),
    label: new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(now),
  };
}

function getSessionTitle(session) {
  const firstUserMessage = session.messages.find((message) => message.role === "user");

  if (!firstUserMessage) {
    return "Sessão atual";
  }

  return firstUserMessage.content.length > 28
    ? `${firstUserMessage.content.slice(0, 28)}...`
    : firstUserMessage.content;
}

export default function ChatBox() {
  const [sessions, setSessions] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [inputValue, setInputValue] = useState("");
  const [loadingSession, setLoadingSession] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState(false);
  const [error, setError] = useState("");
  const [copiedSessionId, setCopiedSessionId] = useState(false);
  const [theme, setTheme] = useState("dark");
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const activeSession = sessions.find((session) => session.id === activeSessionId);
  const sessionId = activeSession?.id ?? null;
  const messages = activeSession?.messages ?? [];

  async function createNewSession() {
    const data = await createSession();
    const createdAt = getSessionDateTime();
    const newSession = {
      id: data.session_id,
      createdAt: createdAt.dateTime,
      createdLabel: createdAt.label,
      messages: [],
    };

    setSessions((previousSessions) => [newSession, ...previousSessions]);
    setActiveSessionId(data.session_id);
    setCopiedSessionId(false);

    return data.session_id;
  }

  async function handleCreateSession() {
    if (sessions.length === 0) {
      return;
    }

    try {
      setError("");
      setLoadingSession(true);
      await createNewSession();
    } catch {
      setError("Não foi possível iniciar uma nova sessão.");
    } finally {
      setLoadingSession(false);
    }
  }

  function handleSelectSession(selectedSessionId) {
    setActiveSessionId(selectedSessionId);
    setInputValue("");
    setError("");
    setCopiedSessionId(false);
  }

  function handleDeleteSession() {
    if (!activeSessionId) {
      return;
    }

    const remainingSessions = sessions.filter((session) => session.id !== activeSessionId);

    setSessions(remainingSessions);
    setActiveSessionId(remainingSessions[0]?.id ?? null);
    setInputValue("");
    setError("");
    setCopiedSessionId(false);
  }

  async function handleCopySessionId() {
    if (!sessionId) {
      return;
    }

    try {
      await navigator.clipboard.writeText(sessionId);
      setCopiedSessionId(true);
      setTimeout(() => setCopiedSessionId(false), 1600);
    } catch {
      setError("Não foi possível copiar o ID da sessão.");
    }
  }

  function handleToggleTheme() {
    setTheme((currentTheme) => (currentTheme === "dark" ? "light" : "dark"));
  }

  function handleToggleSidebar() {
    setIsSidebarCollapsed((currentValue) => !currentValue);
  }

  async function handleSendMessage(event) {
    event.preventDefault();

    const trimmedMessage = inputValue.trim();

    if (!trimmedMessage) {
      return;
    }

    let targetSessionId = sessionId;

    const userMessage = {
      role: "user",
      content: trimmedMessage,
      time: getCurrentTime(),
    };

    setInputValue("");
    setError("");

    try {
      if (!targetSessionId) {
        setLoadingSession(true);
        targetSessionId = await createNewSession();
      }

      setLoadingMessage(true);

      setSessions((previousSessions) =>
        previousSessions.map((session) =>
          session.id === targetSessionId
            ? {
                ...session,
                messages: [...session.messages, userMessage],
              }
            : session,
        ),
      );

      const data = await sendMessage(targetSessionId, trimmedMessage);

      const botMessage = {
        role: "bot",
        content: data.answer,
        time: getCurrentTime(),
      };

      setSessions((previousSessions) =>
        previousSessions.map((session) =>
          session.id === targetSessionId
            ? {
                ...session,
                messages: [...session.messages, botMessage],
              }
            : session,
        ),
      );
    } catch {
      setError("Erro ao consultar o chatbot.");
    } finally {
      setLoadingSession(false);
      setLoadingMessage(false);
    }
  }

  return (
    <div
      className={[
        "chat-shell",
        theme === "light" ? "light-theme" : "",
        isSidebarCollapsed ? "sidebar-collapsed" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <aside className="sidebar">
        <div className="brand-row">
          <button
            className="brand-mark"
            type="button"
            onClick={() => isSidebarCollapsed && setIsSidebarCollapsed(false)}
            aria-label={isSidebarCollapsed ? "Expandir menu" : "Chatbot TCA"}
            title={isSidebarCollapsed ? "Expandir menu" : "Chatbot TCA"}
          >
            <span>::</span>
          </button>
          <div className="brand-copy">
            <h1>Chatbot TCA</h1>
          </div>
          <button
            className="icon-button compact"
            type="button"
            onClick={handleToggleSidebar}
            aria-expanded={!isSidebarCollapsed}
            aria-label={isSidebarCollapsed ? "Expandir menu" : "Recolher menu"}
            title={isSidebarCollapsed ? "Expandir menu" : "Recolher menu"}
          >
            <span className="button-symbol">{isSidebarCollapsed ? "☰" : "×"}</span>
          </button>
        </div>

        <button
          className="new-session-button"
          onClick={handleCreateSession}
          disabled={loadingSession || sessions.length === 0}
          title={
            sessions.length === 0
              ? "Digite uma mensagem para iniciar a primeira sessão"
              : "Criar nova sessão"
          }
        >
          <span>+</span>
          <span className="button-label">{loadingSession ? "Criando..." : "Nova sessão"}</span>
        </button>

        <section className="session-list" aria-label="Sessões recentes">
          <h2>Sessões recentes</h2>

          {sessions.length > 0 ? (
            sessions.map((session) => (
              <button
                className={`session-item${session.id === activeSessionId ? " active" : ""}`}
                key={session.id}
                type="button"
                onClick={() => handleSelectSession(session.id)}
              >
                <span className="session-icon">▣</span>
                <span className="session-copy">
                  <strong>{getSessionTitle(session)}</strong>
                  <small>{session.createdLabel}</small>
                </span>
                <span className="session-menu">⋮</span>
              </button>
            ))
          ) : (
            <div className="empty-session-card">
              Nenhuma sessão iniciada.
            </div>
          )}
        </section>

        <button className="profile-card" type="button">
          <span className="profile-avatar">?</span>
          <span className="profile-copy">
            <strong>Visitante</strong>
            <small>Sem usuário vinculado</small>
          </span>
          <span className="profile-chevron">⌄</span>
        </button>
      </aside>

      <main className="chat-main">
        <header className="topbar">
          <div className="session-heading">
            <h2>{sessionId ? "Sessão atual" : "Nova conversa"}</h2>
            <p className={sessionId ? "" : "inactive"}>
              <span className="status-dot"></span>
              {sessionId ? "Ativa" : "Aguardando sessão"}
            </p>
          </div>

          <div className="topbar-actions">
            <SessionInfo
              sessionId={sessionId}
              copied={copiedSessionId}
              onCopy={handleCopySessionId}
            />
            <button
              className="icon-button"
              type="button"
              onClick={handleToggleTheme}
              aria-label={theme === "dark" ? "Ativar tema claro" : "Ativar tema escuro"}
              title={theme === "dark" ? "Tema claro" : "Tema escuro"}
            >
              <span className="button-symbol">{theme === "dark" ? "☼" : "☾"}</span>
            </button>
            <button
              className="icon-button danger"
              type="button"
              onClick={handleDeleteSession}
              aria-label="Excluir sessão"
              disabled={!sessionId}
              title="Excluir sessão atual"
            >
              <span className="button-symbol trash-symbol">🗑</span>
            </button>
          </div>
        </header>

        <section className="conversation-panel">
          <div className="messages-container">
            {messages.length === 0 && (
              <div className="empty-chat">
                <strong>{sessionId ? "Pronto para conversar" : "Nenhuma sessão iniciada"}</strong>
                <p>
                  {sessionId
                    ? "Envie sua primeira mensagem para começar."
                    : "Digite uma mensagem para iniciar uma sessão automaticamente."}
                </p>
              </div>
            )}

            {messages.map((message, index) => (
              <MessageBubble
                key={`${message.role}-${index}`}
                role={message.role}
                content={message.content}
                time={message.time}
              />
            ))}

            {loadingMessage && (
              <MessageBubble
                role="bot"
                content="Chatbot está digitando..."
                time={getCurrentTime()}
              />
            )}
          </div>

          {error && <div className="error-message">{error}</div>}

          <form className="chat-form" onSubmit={handleSendMessage}>
            <input
              type="text"
              placeholder="Digite sua mensagem..."
              value={inputValue}
              onChange={(event) => setInputValue(event.target.value)}
              disabled={loadingSession || loadingMessage}
            />

            <button type="submit" disabled={loadingSession || loadingMessage}>
              <span>↗</span>
              Enviar
            </button>
          </form>
        </section>

        <p className="disclaimer">
          As respostas podem conter imprecisões. Verifique informações importantes.
        </p>
      </main>
    </div>
  );
}
