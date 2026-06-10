const USE_MOCK = import.meta.env.VITE_USE_MOCK === "true";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";
const AUTH_STORAGE_KEY = "chatbot-tca-auth";

const ERROR_MESSAGES_BY_CODE = {
  authentication_failed: "Usuário ou senha incorretos.",
  not_authenticated: "Faça login para continuar.",
  token_not_valid: "Sua sessão expirou. Faça login novamente.",
  user_not_found: "Usuário não encontrado.",
};

function createClientId(prefix = "client") {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }

  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

function normalizeErrorText(text, fallbackMessage) {
  if (!text) {
    return fallbackMessage;
  }

  if (text.includes("authentication_failed") || text.includes("Usuário e/ou senha")) {
    return ERROR_MESSAGES_BY_CODE.authentication_failed;
  }

  if (text.includes("token_not_valid")) {
    return ERROR_MESSAGES_BY_CODE.token_not_valid;
  }

  if (text.includes("not_authenticated")) {
    return ERROR_MESSAGES_BY_CODE.not_authenticated;
  }

  return text;
}

function getErrorMessageFromValue(value, fallbackMessage) {
  if (!value) {
    return fallbackMessage;
  }

  if (typeof value === "string") {
    return normalizeErrorText(value, fallbackMessage);
  }

  if (Array.isArray(value)) {
    const messages = value
      .map((item) => getErrorMessageFromValue(item, ""))
      .filter(Boolean);

    return messages.join(" ") || fallbackMessage;
  }

  if (typeof value === "object") {
    if (value.code && ERROR_MESSAGES_BY_CODE[value.code]) {
      return ERROR_MESSAGES_BY_CODE[value.code];
    }

    if (value.string) {
      return normalizeErrorText(value.string, fallbackMessage);
    }

    if (value.detail) {
      return getErrorMessageFromValue(value.detail, fallbackMessage);
    }

    if (value.message) {
      return getErrorMessageFromValue(value.message, fallbackMessage);
    }

    const fieldMessages = Object.entries(value)
      .map(([field, fieldValue]) => {
        const message = getErrorMessageFromValue(fieldValue, "");
        return message ? `${field}: ${message}` : "";
      })
      .filter(Boolean);

    return fieldMessages.join(" ") || fallbackMessage;
  }

  return fallbackMessage;
}

async function parseResponse(response, fallbackMessage) {
  if (!response.ok) {
    let errorMessage = `${fallbackMessage} (${response.status})`;

    try {
      const data = await response.clone().json();
      errorMessage = getErrorMessageFromValue(data, errorMessage);
    } catch {
      const text = await response.text();
      errorMessage = text
        ? normalizeErrorText(text.slice(0, 220), errorMessage)
        : errorMessage;
    }

    throw new Error(errorMessage);
  }

  return response.json();
}

export function getStoredAuth() {
  const storedAuth = localStorage.getItem(AUTH_STORAGE_KEY);

  if (!storedAuth) {
    return null;
  }

  try {
    return JSON.parse(storedAuth);
  } catch {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    return null;
  }
}

function storeAuth(authData) {
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authData));
}

export function clearStoredAuth() {
  localStorage.removeItem(AUTH_STORAGE_KEY);
}

function getAuthHeaders() {
  const authData = getStoredAuth();

  if (!authData?.access) {
    throw new Error("Faça login para continuar.");
  }

  return {
    Authorization: `Bearer ${authData.access}`,
  };
}

export async function login(username, password) {
  const response = await fetch(`${API_BASE_URL}/token/pair`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      username,
      password,
    }),
  });

  const data = await parseResponse(response, "Não foi possível fazer login");
  storeAuth({
    username,
    access: data.access,
    refresh: data.refresh,
  });

  return getStoredAuth();
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
      ...getAuthHeaders(),
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

  const response = await fetch(`${API_BASE_URL}/sessions`, {
    headers: getAuthHeaders(),
  });

  return parseResponse(response, "Erro ao listar sessões");
}

export async function getSessionHistory(sessionId) {
  if (USE_MOCK) {
    return [];
  }

  const response = await fetch(`${API_BASE_URL}/history/${sessionId}`, {
    headers: getAuthHeaders(),
  });

  return parseResponse(response, "Erro ao carregar histórico");
}

export async function deleteSession(sessionId) {
  if (USE_MOCK) {
    return { detail: "Sessão removida com sucesso." };
  }

  const response = await fetch(`${API_BASE_URL}/sessions/${sessionId}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });

  return parseResponse(response, "Erro ao excluir sessão");
}
