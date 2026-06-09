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
    fetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ session_id: "session-1", response: "Ola" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const result = await sendMessage("session-1", "Oi");

    expect(fetch).toHaveBeenCalledWith("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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

    expect(fetch).toHaveBeenNthCalledWith(1, "/api/sessions");
    expect(fetch).toHaveBeenNthCalledWith(2, "/api/history/session-1");
    expect(fetch).toHaveBeenNthCalledWith(3, "/api/sessions/session-1", { method: "DELETE" });
  });
});
