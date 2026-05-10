import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import MessageBubble from './MessageBubble'
import MessageInput from './MessageInput'

function normalizeMessageContent(content) {
  if (Array.isArray(content)) return content
  if (typeof content === 'string') return content
  if (content?.type === 'user_message_display') return content.text || ''
  return String(content || '')
}

function hasMessageContent(content) {
  const normalized = normalizeMessageContent(content)
  if (Array.isArray(normalized)) return normalized.length > 0
  return normalized.trim().length > 0
}

function buildConversationMemory(messages) {
  return messages
    .filter(message => ['system', 'user', 'assistant'].includes(message.role))
    .filter(message => hasMessageContent(message.content))
    .map(message => ({
      role: message.role,
      content: normalizeMessageContent(message.content),
    }))
}

export default function ChatArea({ conversation, onUpdateMessages, onRenameConversation, onNewChat, sidebarOpen, onToggleSidebar }) {
  const [streaming, setStreaming] = useState(false)
  const [editingConversationId, setEditingConversationId] = useState(null)
  const [titleDraft, setTitleDraft] = useState('')
  const messagesEndRef = useRef(null)
  const abortRef = useRef(null)
  const pendingMessageRef = useRef(null)
  const titleInputRef = useRef(null)

  const messages = useMemo(() => conversation?.messages || [], [conversation])
  const editingTitle = conversation?.id === editingConversationId
  const quickPrompts = [
    '帮我把这个想法整理成执行计划',
    '总结一段文字，并提炼重点',
    '写一封清晰、专业的邮件',
    '分析一个技术方案的利弊',
  ]

  const handleSend = useCallback(async (content, display) => {
    if (!conversation) {
      pendingMessageRef.current = { content, display }
      onNewChat()
      return
    }

    const conversationId = conversation.id
    const userMessage = { role: 'user', content, display: display || content }
    const newMessages = [...messages, userMessage]
    const conversationMemory = buildConversationMemory(newMessages)
    onUpdateMessages(conversationId, newMessages)

    setStreaming(true)
    const assistantMessage = { role: 'assistant', content: '' }
    const streamMessages = [...newMessages, assistantMessage]
    onUpdateMessages(conversationId, streamMessages)

    try {
      const controller = new AbortController()
      abortRef.current = controller

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: conversationMemory }),
        signal: controller.signal,
      })

      if (!res.body) {
        throw new Error('服务端没有返回可读取的响应流')
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let fullContent = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const data = line.slice(6)
          if (data === '[DONE]') break

          try {
            const parsed = JSON.parse(data)
            if (parsed.error) {
              fullContent += `\n\n[错误: ${parsed.error}]`
            } else {
              const delta = parsed.choices?.[0]?.delta?.content || ''
              fullContent += delta
            }
          } catch {
            // Ignore malformed stream chunks and keep reading the response.
          }
        }

        onUpdateMessages(conversationId, [...newMessages, { role: 'assistant', content: fullContent }])
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        onUpdateMessages(conversationId, [...newMessages, { role: 'assistant', content: `[请求失败: ${err.message}]` }])
      }
    } finally {
      setStreaming(false)
      abortRef.current = null
    }
  }, [conversation, messages, onNewChat, onUpdateMessages])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (editingTitle) {
      titleInputRef.current?.focus()
      titleInputRef.current?.select()
    }
  }, [editingTitle])

  useEffect(() => {
    if (conversation && pendingMessageRef.current) {
      const { content, display } = pendingMessageRef.current
      pendingMessageRef.current = null
      handleSend(content, display)
    }
  }, [conversation, handleSend])

  function handleStop() {
    abortRef.current?.abort()
    setStreaming(false)
  }

  function handleStartEditTitle() {
    if (!conversation) return
    setTitleDraft(conversation.title)
    setEditingConversationId(conversation.id)
  }

  function handleSaveTitle() {
    if (!conversation) return
    const nextTitle = titleDraft.trim()
    if (nextTitle && nextTitle !== conversation.title) {
      onRenameConversation(conversation.id, nextTitle)
    }
    setEditingConversationId(null)
  }

  function handleTitleKeyDown(e) {
    if (e.key === 'Escape') {
      e.preventDefault()
      setTitleDraft(conversation?.title || '')
      setEditingConversationId(null)
    }
  }

  if (!conversation) {
    return (
      <div className="chat-area">
        <div className="chat-header">
          {!sidebarOpen && (
            <button className="toggle-sidebar" onClick={onToggleSidebar} aria-label="打开侧边栏">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 12h18M3 6h18M3 18h18"/>
              </svg>
            </button>
          )}
          <div className="chat-status">
            <span className="status-dot"></span>
            就绪
          </div>
        </div>
        <div className="chat-empty">
          <div className="empty-logo" aria-hidden="true">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9">
              <path d="M12 3l2.6 5.4L20 11l-5.4 2.6L12 19l-2.6-5.4L4 11l5.4-2.6L12 3z"/>
            </svg>
          </div>
          <div className="empty-copy">
            <h1>有什么可以帮忙的？</h1>
          </div>
          <div className="prompt-grid">
            {quickPrompts.map(prompt => (
              <button key={prompt} type="button" onClick={() => handleSend(prompt)}>
                {prompt}
              </button>
            ))}
          </div>
          <MessageInput onSend={handleSend} disabled={false} />
        </div>
      </div>
    )
  }

  return (
    <div className="chat-area">
      <div className="chat-header">
        {!sidebarOpen && (
          <button className="toggle-sidebar" onClick={onToggleSidebar} aria-label="打开侧边栏">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 12h18M3 6h18M3 18h18"/>
            </svg>
          </button>
        )}
        <div className="chat-title-block">
          {editingTitle ? (
            <form className="title-edit-form" onSubmit={e => { e.preventDefault(); handleSaveTitle() }}>
              <input
                ref={titleInputRef}
                value={titleDraft}
                onChange={e => setTitleDraft(e.target.value)}
                onBlur={handleSaveTitle}
                onKeyDown={handleTitleKeyDown}
                aria-label="会话名称"
              />
            </form>
          ) : (
            <button className="editable-title" type="button" onClick={handleStartEditTitle} title="重命名会话">
              <span>{conversation.title}</span>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 20h9"/>
                <path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/>
              </svg>
            </button>
          )}
        </div>
        <div className={`chat-status ${streaming ? 'is-busy' : ''}`}>
          <span className="status-dot"></span>
          {streaming ? '生成中' : `${messages.length} 条消息`}
        </div>
      </div>
      <div className="chat-messages">
        {messages.map((msg, i) => {
          if (streaming && i === messages.length - 1 && msg.role === 'assistant' && !msg.content) {
            return null
          }
          return <MessageBubble key={i} role={msg.role} content={msg.role === 'user' ? (msg.display || msg.content) : msg.content} />
        })}
        {streaming && (messages.length === 0 || messages[messages.length - 1].role !== 'assistant' || !messages[messages.length - 1].content) && (
          <MessageBubble thinking />
        )}
        <div ref={messagesEndRef} />
      </div>
      <div className="chat-input-wrapper">
        <MessageInput onSend={handleSend} onStop={handleStop} disabled={streaming} streaming={streaming} />
      </div>
    </div>
  )
}
