import ReactMarkdown from "react-markdown";

export default function MessageBubble({ role, content, time }) {
  const isUser = role === "user";
  const className = isUser ? "message user-message" : "message bot-message";

  return (
    <div className={className}>
      {!isUser && (
        <div className="bot-avatar" aria-hidden="true">
          <span className="bot-face">::</span>
        </div>
      )}

      <div className="message-stack">
        <div className="message-bubble">
          {isUser ? (
            content
          ) : (
            <ReactMarkdown>{content}</ReactMarkdown>
          )}
        </div>
        <div className="message-time">
          {time}
          {isUser && <span className="checkmark">✓✓</span>}
        </div>
      </div>
    </div>
  );
}
