import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'

export default function MessageBubble({ role, content, thinking }) {
  if (thinking) {
    return (
      <div className="message assistant">
        <div className="assistant-avatar" aria-hidden="true">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 3l2.6 5.4L20 11l-5.4 2.6L12 19l-2.6-5.4L4 11l5.4-2.6L12 3z"/>
          </svg>
        </div>
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

  function renderMarkdown(text) {
    return (
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code({ className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || '')
            const codeString = String(children).replace(/\n$/, '')
            if (match) {
              return (
                <SyntaxHighlighter
                  style={oneDark}
                  language={match[1]}
                  PreTag="div"
                  customStyle={{ borderRadius: '8px', fontSize: '0.85em' }}
                >
                  {codeString}
                </SyntaxHighlighter>
              )
            }
            return <code className="inline-code" {...props}>{children}</code>
          }
        }}
      >
        {text}
      </ReactMarkdown>
    )
  }

  function renderText(text) {
    return String(text || '').split('\n').map((line, i) => (
      <p key={i}>{line || ' '}</p>
    ))
  }

  function renderUserDisplay(display) {
    return (
      <div className="user-display">
        {display.attachments?.length > 0 && (
          <div className="user-file-list">
            {display.attachments.map((file, i) => (
              <div className="user-file-card" key={`${file.name}-${i}`}>
                <span className="user-file-icon" aria-hidden="true">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M14 2H7a2 2 0 00-2 2v16a2 2 0 002 2h10a2 2 0 002-2V7z"/>
                    <path d="M14 2v5h5"/>
                  </svg>
                </span>
                <span className="user-file-main">
                  <span className="user-file-name">{file.name}</span>
                  <span className="user-file-meta">{[file.label, file.size].filter(Boolean).join(' · ')}</span>
                </span>
              </div>
            ))}
          </div>
        )}
        {display.text && (
          <div className="user-message-text">
            {renderText(display.text)}
          </div>
        )}
      </div>
    )
  }

  function renderContent() {
    if (!Array.isArray(content)) {
      if (role === 'assistant') {
        return renderMarkdown(content || '')
      }
      if (content?.type === 'user_message_display') {
        return renderUserDisplay(content)
      }
      return renderText(content)
    }

    return content.map((part, i) => {
      if (part.type === 'text') {
        if (role === 'assistant') {
          return <div key={i}>{renderMarkdown(part.text)}</div>
        }
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
      {role === 'assistant' && (
        <div className="assistant-avatar" aria-hidden="true">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 3l2.6 5.4L20 11l-5.4 2.6L12 19l-2.6-5.4L4 11l5.4-2.6L12 3z"/>
          </svg>
        </div>
      )}
      <div className="message-stack">
        <div className="message-content">
          {renderContent()}
        </div>
      </div>
    </div>
  )
}
