const USE_MOCK = import.meta.env.VITE_USE_MOCK !== "false";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

export async function createSession() {
  if (USE_MOCK) {
    return {
      session_id: crypto.randomUUID(),
    };
  }

  const response = await fetch(`${API_BASE_URL}/session`, {
    method: "POST",
  });

  if (!response.ok) {
    throw new Error("Erro ao criar sessão");
  }

  return response.json();
}

export async function sendMessage(sessionId, message) {
  if (USE_MOCK) {
    await new Promise((resolve) => setTimeout(resolve, 800));

    return {
      answer: `Resposta simulada para: "${message}"`,
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

  if (!response.ok) {
    throw new Error("Erro ao enviar mensagem");
  }

  return response.json();
}