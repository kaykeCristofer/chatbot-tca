import { useEffect, useState } from "react";
import {
  clearStoredAuth,
  deleteSession,
  getSessionHistory,
  getStoredAuth,
  listSessions,
  login,
  sendMessage,
} from "../api/chatbotApi";
import MessageBubble from "./MessageBubble";
import SessionInfo from "./SessionInfo";

function formatMessageTime(dateValue = new Date()) {
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(dateValue));
}

function formatSessionLabel(dateValue = new Date()) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(dateValue));
}

function createClientId(prefix = "client") {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }

  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

function createDraftSession() {
  const now = new Date();

  return {
    id: createClientId("draft"),
    sessionId: null,
    createdAt: now.toISOString(),
    createdLabel: formatSessionLabel(now),
    historyLoaded: true,
    messages: [],
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
  const [authSession, setAuthSession] = useState(() => getStoredAuth());
  const [loginForm, setLoginForm] = useState({ username: "", password: "" });
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [copiedSessionId, setCopiedSessionId] = useState(false);
  const [theme, setTheme] = useState("dark");
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const activeSession = sessions.find((session) => session.id === activeSessionId);
  const sessionId = activeSession?.sessionId ?? null;
  const messages = activeSession?.messages ?? [];

  useEffect(() => {
    if (!authSession?.access) {
      return;
    }

    let ignore = false;

    async function loadSessions() {
      try {
        setLoadingSession(true);
        const data = await listSessions();

        if (ignore) {
          return;
        }

        const loadedSessions = data.map((session) => ({
          id: session.session_id,
          sessionId: session.session_id,
          createdAt: session.created_at,
          createdLabel: formatSessionLabel(session.created_at),
          historyLoaded: false,
          messages: [],
          messageCount: session.message_count,
        }));

        setSessions(loadedSessions);
        setActiveSessionId(loadedSessions[0]?.id ?? null);
      } catch {
        if (!ignore) {
          setError("Não foi possível carregar as sessões do backend.");
        }
      } finally {
        if (!ignore) {
          setLoadingSession(false);
        }
      }
    }

    loadSessions();

    return () => {
      ignore = true;
    };
  }, [authSession]);

  useEffect(() => {
    if (!activeSession || !activeSession.sessionId || activeSession.historyLoaded) {
      return;
    }

    let ignore = false;

    async function loadHistory() {
      try {
        setLoadingMessage(true);
        const history = await getSessionHistory(activeSession.sessionId);

        if (ignore) {
          return;
        }

        const messagesFromHistory = history.map((message) => ({
          role: message.role === "human" ? "user" : "bot",
          content: message.content,
          time: formatMessageTime(message.created_at),
        }));

        setSessions((previousSessions) =>
          previousSessions.map((session) =>
            session.id === activeSession.id
              ? { ...session, historyLoaded: true, messages: messagesFromHistory }
              : session,
          ),
        );
      } catch {
        if (!ignore) {
          setError("Não foi possível carregar o histórico da sessão.");
        }
      } finally {
        if (!ignore) {
          setLoadingMessage(false);
        }
      }
    }

    loadHistory();

    return () => {
      ignore = true;
    };
  }, [activeSession]);

  function createNewSession() {
    const newSession = createDraftSession();

    setSessions((previousSessions) => [newSession, ...previousSessions]);
    setActiveSessionId(newSession.id);
    setCopiedSessionId(false);

    return newSession.id;
  }

  function handleCreateSession() {
    if (sessions.length === 0) {
      return;
    }

    setError("");
    createNewSession();
  }

  function handleSelectSession(selectedSessionId) {
    setActiveSessionId(selectedSessionId);
    setInputValue("");
    setError("");
    setCopiedSessionId(false);
  }

  async function handleDeleteSession() {
    if (!activeSessionId) {
      return;
    }

    try {
      setError("");

      if (sessionId) {
        await deleteSession(sessionId);
      }

      const remainingSessions = sessions.filter((session) => session.id !== activeSessionId);

      setSessions(remainingSessions);
      setActiveSessionId(remainingSessions[0]?.id ?? null);
      setInputValue("");
      setCopiedSessionId(false);
    } catch {
      setError("Não foi possível excluir a sessão.");
    }
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

  async function handleLogin(event) {
    event.preventDefault();

    try {
      setLoginLoading(true);
      setLoginError("");
      const data = await login(loginForm.username.trim(), loginForm.password);
      setAuthSession(data);
      setLoginForm({ username: "", password: "" });
      setSessions([]);
      setActiveSessionId(null);
      setError("");
    } catch (requestError) {
      setLoginError(requestError.message || "Não foi possível fazer login.");
    } finally {
      setLoginLoading(false);
    }
  }

  function handleLogout() {
    clearStoredAuth();
    setAuthSession(null);
    setSessions([]);
    setActiveSessionId(null);
    setInputValue("");
    setError("");
    setCopiedSessionId(false);
  }

  async function handleSendMessage(event) {
    event.preventDefault();

    const trimmedMessage = inputValue.trim();

    if (!trimmedMessage) {
      return;
    }

    let targetSessionKey = activeSessionId;
    let targetBackendSessionId = sessionId;

    const userMessage = {
      role: "user",
      content: trimmedMessage,
      time: formatMessageTime(),
    };

    setInputValue("");
    setError("");

    try {
      if (!targetSessionKey) {
        setLoadingSession(true);
        targetSessionKey = createNewSession();
      }

      setLoadingMessage(true);

      setSessions((previousSessions) =>
        previousSessions.map((session) =>
          session.id === targetSessionKey
            ? {
                ...session,
                historyLoaded: true,
                messages: [...session.messages, userMessage],
              }
            : session,
        ),
      );

      const data = await sendMessage(targetBackendSessionId, trimmedMessage);
      targetBackendSessionId = data.session_id;

      const botMessage = {
        role: "bot",
        content: data.response,
        time: formatMessageTime(),
      };

      setSessions((previousSessions) =>
        previousSessions.map((session) =>
          session.id === targetSessionKey
            ? {
                ...session,
                id: targetBackendSessionId,
                sessionId: targetBackendSessionId,
                historyLoaded: true,
                messages: [...session.messages, botMessage],
              }
            : session,
        ),
      );
      setActiveSessionId(targetBackendSessionId);
    } catch (requestError) {
      setError(requestError.message || "Erro ao consultar o chatbot.");
    } finally {
      setLoadingSession(false);
      setLoadingMessage(false);
    }
  }

  function handleMessageKeyDown(event) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
    }
  }

  if (!authSession?.access) {
    return (
      <main className="auth-page">
        <form className="auth-panel" onSubmit={handleLogin}>
          <div className="auth-brand">
            <span className="brand-mark auth-mark">
              <span>::</span>
            </span>
            <div>
              <h1>Chatbot TCA</h1>
              <p>Acesse para carregar suas sessões.</p>
            </div>
          </div>

          <label>
            Usuário
            <input
              type="text"
              value={loginForm.username}
              onChange={(event) =>
                setLoginForm((currentForm) => ({
                  ...currentForm,
                  username: event.target.value,
                }))
              }
              autoComplete="username"
              disabled={loginLoading}
              required
            />
          </label>

          <label>
            Senha
            <input
              type="password"
              value={loginForm.password}
              onChange={(event) =>
                setLoginForm((currentForm) => ({
                  ...currentForm,
                  password: event.target.value,
                }))
              }
              autoComplete="current-password"
              disabled={loginLoading}
              required
            />
          </label>

          {loginError && <div className="error-message">{loginError}</div>}

          <button className="auth-submit" type="submit" disabled={loginLoading}>
            {loginLoading ? "Entrando..." : "Entrar"}
          </button>
        </form>
      </main>
    );
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
          <span className="button-label">{loadingSession ? "Carregando..." : "Nova sessão"}</span>
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
              <span
                className={`button-symbol ${
                  theme === "dark" ? "sun-symbol" : "moon-symbol"
                }`}
              >
                {theme === "dark" ? "☼" : "☪︎"}
              </span>
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
            <button
              className="logout-button"
              type="button"
              onClick={handleLogout}
              title={`Sair de ${authSession.username}`}
            >
              Sair
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
                    : "Digite uma mensagem para registrar a sessão no backend."}
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
                time={formatMessageTime()}
              />
            )}
          </div>

          {error && <div className="error-message">{error}</div>}

          <form className="chat-form" onSubmit={handleSendMessage}>
            <textarea
              placeholder="Digite sua mensagem..."
              value={inputValue}
              onChange={(event) => setInputValue(event.target.value)}
              onKeyDown={handleMessageKeyDown}
              disabled={loadingSession || loadingMessage}
              rows={1}
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
