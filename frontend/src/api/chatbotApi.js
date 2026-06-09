const USE_MOCK = import.meta.env.VITE_USE_MOCK === "true";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";

function createClientId(prefix = "client") {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }

  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

async function parseResponse(response, fallbackMessage) {
  if (!response.ok) {
    let errorMessage = `${fallbackMessage} (${response.status})`;

    try {
      const data = await response.clone().json();
      errorMessage = data.detail || data.message || errorMessage;
    } catch {
      const text = await response.text();
      errorMessage = text ? `${errorMessage}: ${text.slice(0, 160)}` : errorMessage;
    }

    throw new Error(errorMessage);
  }

  return response.json();
}

export async function sendMessage(sessionId, message) {
  if (USE_MOCK) {
    await new Promise((resolve) => setTimeout(resolve, 800));

    return {
      session_id: sessionId || createClientId("mock-session"),
      response: `Resposta simulada para: "${message}"`,
    };
  }

  const response = await fetch(`${API_BASE_URL}/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      session_id: sessionId,
      message,
    }),
  });

  return parseResponse(response, "Erro ao enviar mensagem");
}

export async function listSessions() {
  if (USE_MOCK) {
    return [];
  }

  const response = await fetch(`${API_BASE_URL}/sessions`);

  return parseResponse(response, "Erro ao listar sessões");
}

export async function getSessionHistory(sessionId) {
  if (USE_MOCK) {
    return [];
  }

  const response = await fetch(`${API_BASE_URL}/history/${sessionId}`);

  return parseResponse(response, "Erro ao carregar histórico");
}

export async function deleteSession(sessionId) {
  if (USE_MOCK) {
    return { detail: "Sessão removida com sucesso." };
  }

  const response = await fetch(`${API_BASE_URL}/sessions/${sessionId}`, {
    method: "DELETE",
  });

  return parseResponse(response, "Erro ao excluir sessão");
}
