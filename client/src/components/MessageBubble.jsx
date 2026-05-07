import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'

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
    return (text || '').split('\n').map((line, i) => (
      <p key={i}>{line || ' '}</p>
    ))
  }

  function renderContent() {
    if (!Array.isArray(content)) {
      if (role === 'assistant') {
        return renderMarkdown(content || '')
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
      <div className="message-stack">
        <div className="message-content">
          {renderContent()}
        </div>
      </div>
    </div>
  )
}
