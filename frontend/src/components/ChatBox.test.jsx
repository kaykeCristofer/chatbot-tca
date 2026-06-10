import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";

import {
  clearStoredAuth,
  deleteSession,
  getSessionHistory,
  getStoredAuth,
  listSessions,
  login,
  sendMessage,
} from "../api/chatbotApi";
import ChatBox from "./ChatBox";
import MessageBubble from "./MessageBubble";
import SessionInfo from "./SessionInfo";

vi.mock("../api/chatbotApi", () => ({
  clearStoredAuth: vi.fn(),
  deleteSession: vi.fn(),
  getSessionHistory: vi.fn(),
  getStoredAuth: vi.fn(),
  listSessions: vi.fn(),
  login: vi.fn(),
  sendMessage: vi.fn(),
}));

describe("ChatBox", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getStoredAuth.mockReturnValue({ username: "kayke", access: "access-token" });
    login.mockResolvedValue({ username: "kayke", access: "access-token" });
    listSessions.mockResolvedValue([]);
    getSessionHistory.mockResolvedValue([]);
    sendMessage.mockResolvedValue({ session_id: "session-1", response: "Resposta do bot" });
    deleteSession.mockResolvedValue({ detail: "Sessao removida com sucesso." });
  });

  test("renders login form when there is no stored auth", () => {
    getStoredAuth.mockReturnValue(null);

    render(<ChatBox />);

    expect(screen.getByText("Acesse para carregar suas sessões.")).toBeTruthy();
    expect(screen.getByLabelText("Usuário")).toBeTruthy();
    expect(screen.getByLabelText("Senha")).toBeTruthy();
  });

  test("renders the empty state when there are no backend sessions", async () => {
    render(<ChatBox />);

    await waitFor(() => expect(listSessions).toHaveBeenCalledTimes(1));

    expect(screen.getByText("Nenhuma sessão iniciada.")).toBeTruthy();
    expect(screen.getByPlaceholderText("Digite sua mensagem...")).toBeTruthy();
  });

  test("sends the first message and replaces the draft session with the backend session", async () => {
    const user = userEvent.setup();
    render(<ChatBox />);

    await waitFor(() => expect(listSessions).toHaveBeenCalledTimes(1));
    await user.type(screen.getByPlaceholderText("Digite sua mensagem..."), "Oi chatbot");
    await user.click(screen.getByRole("button", { name: /Enviar/ }));

    await waitFor(() => {
      expect(sendMessage).toHaveBeenCalledWith(null, "Oi chatbot");
    });

    expect(await screen.findAllByText("Oi chatbot")).toHaveLength(2);
    expect(await screen.findByText("Resposta do bot")).toBeTruthy();
    expect(screen.getByText("session-1")).toBeTruthy();
  });

  test("loads history when selecting an existing backend session", async () => {
    listSessions.mockResolvedValue([
      {
        session_id: "session-1",
        created_at: "2026-06-08T10:00:00Z",
        last_activity: "2026-06-08T10:00:00Z",
        message_count: 2,
      },
    ]);
    getSessionHistory.mockResolvedValue([
      { role: "human", content: "Pergunta salva", created_at: "2026-06-08T10:01:00Z" },
      { role: "ai", content: "Resposta salva", created_at: "2026-06-08T10:02:00Z" },
    ]);

    render(<ChatBox />);

    expect(await screen.findAllByText("Pergunta salva")).toHaveLength(2);
    expect(await screen.findByText("Resposta salva")).toBeTruthy();
    expect(getSessionHistory).toHaveBeenCalledWith("session-1");
  });

  test("shows API errors and keeps the typed message visible", async () => {
    const user = userEvent.setup();
    sendMessage.mockRejectedValue(new Error("Falha no provedor"));

    render(<ChatBox />);

    await waitFor(() => expect(listSessions).toHaveBeenCalledTimes(1));
    await user.type(screen.getByPlaceholderText("Digite sua mensagem..."), "Oi");
    await user.click(screen.getByRole("button", { name: /Enviar/ }));

    expect(await screen.findByText("Falha no provedor")).toBeTruthy();
    expect(screen.getAllByText("Oi")).toHaveLength(2);
  });

  test("deletes an active backend session", async () => {
    const user = userEvent.setup();
    listSessions.mockResolvedValue([
      {
        session_id: "session-1",
        created_at: "2026-06-08T10:00:00Z",
        last_activity: "2026-06-08T10:00:00Z",
        message_count: 0,
      },
    ]);

    render(<ChatBox />);

    await screen.findByText("session-1");
    await user.click(screen.getByRole("button", { name: "Excluir sessão" }));

    await waitFor(() => expect(deleteSession).toHaveBeenCalledWith("session-1"));
    expect(screen.getByText("Nenhuma sessão iniciada.")).toBeTruthy();
  });

  test("clears auth and chat state on logout", async () => {
    const user = userEvent.setup();
    render(<ChatBox />);

    await waitFor(() => expect(listSessions).toHaveBeenCalledTimes(1));
    await user.click(screen.getByRole("button", { name: "Sair" }));

    expect(clearStoredAuth).toHaveBeenCalledTimes(1);
    expect(screen.getByText("Acesse para carregar suas sessões.")).toBeTruthy();
  });
});

describe("MessageBubble", () => {
  test("renders bot markdown content", () => {
    render(<MessageBubble role="bot" content="**Resposta** com markdown" time="10:30" />);

    expect(screen.getByText("Resposta")).toBeTruthy();
    expect(screen.getByText(/com markdown/)).toBeTruthy();
  });

  test("renders user text and delivery checkmarks", () => {
    render(<MessageBubble role="user" content="Mensagem do usuario" time="10:31" />);

    expect(screen.getByText("Mensagem do usuario")).toBeTruthy();
    expect(screen.getByText("✓✓")).toBeTruthy();
  });
});

describe("SessionInfo", () => {
  test("shows waiting state without a session id", () => {
    render(<SessionInfo sessionId={null} copied={false} onCopy={vi.fn()} />);

    expect(screen.getByText("Aguardando sessão")).toBeTruthy();
  });

  test("copies session id through the provided handler", async () => {
    const user = userEvent.setup();
    const onCopy = vi.fn();

    render(<SessionInfo sessionId="session-1" copied={false} onCopy={onCopy} />);

    await user.click(screen.getByRole("button", { name: "Copiar ID da sessão" }));

    expect(onCopy).toHaveBeenCalledTimes(1);
  });
});
