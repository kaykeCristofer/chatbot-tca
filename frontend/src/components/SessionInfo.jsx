export default function SessionInfo({ sessionId, copied, onCopy }) {
  if (!sessionId) {
    return (
      <div className="session-id-card">
        <span>ID da sessão</span>
        <strong>Aguardando sessão</strong>
      </div>
    );
  }

  return (
    <div className="session-id-card">
      <span>ID da sessão</span>
      <strong>{sessionId}</strong>
      <button
        type="button"
        className="copy-button"
        onClick={onCopy}
        aria-label="Copiar ID da sessão"
        title={copied ? "ID copiado" : "Copiar ID da sessão"}
      >
        {copied ? "✓" : "⧉"}
      </button>
    </div>
  );
}
