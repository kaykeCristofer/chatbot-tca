import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

async function importApiWithEnv(env = {}) {
  vi.resetModules();
  vi.unstubAllEnvs();

  for (const [key, value] of Object.entries(env)) {
    vi.stubEnv(key, value);
  }

  return import("./chatbotApi.js");
}

describe("chatbotApi", () => {
  beforeEach(() => {
    globalThis.fetch = vi.fn();
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  test("sendMessage posts the expected payload to the backend", async () => {
    const { sendMessage } = await importApiWithEnv({
      VITE_API_BASE_URL: "/api",
      VITE_USE_MOCK: "false",
    });
    localStorage.setItem("chatbot-tca-auth", JSON.stringify({ access: "access-token" }));
    fetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ session_id: "session-1", response: "Ola" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const result = await sendMessage("session-1", "Oi");

    expect(fetch).toHaveBeenCalledWith("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer access-token",
      },
      body: JSON.stringify({ session_id: "session-1", message: "Oi" }),
    });
    expect(result).toEqual({ session_id: "session-1", response: "Ola" });
  });

  test("uses mock mode without calling fetch", async () => {
    const { sendMessage, listSessions, getSessionHistory, deleteSession } = await importApiWithEnv({
      VITE_USE_MOCK: "true",
    });

    await expect(sendMessage(null, "Teste")).resolves.toEqual({
      session_id: expect.any(String),
      response: 'Resposta simulada para: "Teste"',
    });
    await expect(listSessions()).resolves.toEqual([]);
    await expect(getSessionHistory("session-1")).resolves.toEqual([]);
    await expect(deleteSession("session-1")).resolves.toEqual({
      detail: "Sessão removida com sucesso.",
    });
    expect(fetch).not.toHaveBeenCalled();
  });

  test("surfaces json error details from the API", async () => {
    const { sendMessage } = await importApiWithEnv({ VITE_USE_MOCK: "false" });
    localStorage.setItem("chatbot-tca-auth", JSON.stringify({ access: "access-token" }));
    fetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ detail: "Erro ao consultar o provedor LLM" }), {
        status: 502,
        headers: { "Content-Type": "application/json" },
      }),
    );

    await expect(sendMessage(null, "Oi")).rejects.toThrow("Erro ao consultar o provedor LLM");
  });

  test("calls session and history endpoints", async () => {
    const { listSessions, getSessionHistory, deleteSession } = await importApiWithEnv({
      VITE_API_BASE_URL: "/api",
      VITE_USE_MOCK: "false",
    });
    localStorage.setItem("chatbot-tca-auth", JSON.stringify({ access: "access-token" }));
    const okJsonResponse = () =>
      new Response(JSON.stringify([]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    fetch
      .mockResolvedValueOnce(okJsonResponse())
      .mockResolvedValueOnce(okJsonResponse())
      .mockResolvedValueOnce(okJsonResponse());

    await listSessions();
    await getSessionHistory("session-1");
    await deleteSession("session-1");

    expect(fetch).toHaveBeenNthCalledWith(1, "/api/sessions", {
      headers: { Authorization: "Bearer access-token" },
    });
    expect(fetch).toHaveBeenNthCalledWith(2, "/api/history/session-1", {
      headers: { Authorization: "Bearer access-token" },
    });
    expect(fetch).toHaveBeenNthCalledWith(3, "/api/sessions/session-1", {
      method: "DELETE",
      headers: { Authorization: "Bearer access-token" },
    });
  });

  test("logs in and stores auth tokens", async () => {
    const { login, getStoredAuth } = await importApiWithEnv({
      VITE_API_BASE_URL: "/api",
      VITE_USE_MOCK: "false",
    });
    fetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ access: "access-token", refresh: "refresh-token" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    await expect(login("kayke", "senha")).resolves.toEqual({
      username: "kayke",
      access: "access-token",
      refresh: "refresh-token",
    });
    expect(fetch).toHaveBeenCalledWith("/api/token/pair", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "kayke", password: "senha" }),
    });
    expect(getStoredAuth()).toEqual({
      username: "kayke",
      access: "access-token",
      refresh: "refresh-token",
    });
  });

  test("shows a friendly message for invalid login credentials", async () => {
    const { login } = await importApiWithEnv({
      VITE_API_BASE_URL: "/api",
      VITE_USE_MOCK: "false",
    });
    fetch.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          detail: "Usuário e/ou senha incorreto(s)",
          code: "authentication_failed",
        }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        },
      ),
    );

    await expect(login("kayke", "senha-errada")).rejects.toThrow(
      "Usuário ou senha incorretos.",
    );
  });

  test("normalizes raw ErrorDetail text from auth errors", async () => {
    const { login } = await importApiWithEnv({
      VITE_API_BASE_URL: "/api",
      VITE_USE_MOCK: "false",
    });
    fetch.mockResolvedValueOnce(
      new Response(
        "{'detail': ErrorDetail(string='Usuário e/ou senha incorreto(s)', code='authentication_failed'), 'code': ErrorDetail(string='authentication_failed', code='authentication_failed')}",
        {
          status: 401,
          headers: { "Content-Type": "text/plain" },
        },
      ),
    );

    await expect(login("kayke", "senha-errada")).rejects.toThrow(
      "Usuário ou senha incorretos.",
    );
  });
});
