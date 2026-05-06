export default function MessageBubble({ role, content, thinking }) {
  if (thinking) {
    return (
      <div className="message assistant">
        <div className="message-stack">
          <div className="message-content thinking">
            <span className="thinking-dot"></span>
            <span className="thinking-dot"></span>
            <span className="thinking-dot"></span>
          </div>
        </div>
      </div>
    )
  }

  function renderText(text) {
    return (text || '').split('\n').map((line, i) => (
      <p key={i}>{line || ' '}</p>
    ))
  }

  function renderContent() {
    if (!Array.isArray(content)) {
      return renderText(content)
    }

    return content.map((part, i) => {
      if (part.type === 'text') {
        return <div key={i}>{renderText(part.text)}</div>
      }
      if (part.type === 'image_url') {
        return (
          <img
            key={i}
            src={part.image_url.url}
            alt="uploaded"
            className="message-image"
          />
        )
      }
      return null
    })
  }

  return (
    <div className={`message ${role}`}>
      <div className="message-stack">
        <div className="message-content">
          {renderContent()}
        </div>
      </div>
    </div>
  )
}
