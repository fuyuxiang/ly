import { useState, useEffect } from 'react'
import Sidebar from './components/Sidebar'
import ChatArea from './components/ChatArea'
import './App.css'

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2)
}

function getMessageTitleText(message) {
  const displayContent = message.display || message.content

  if (displayContent?.type === 'user_message_display') {
    return displayContent.text || displayContent.attachments?.[0]?.name || '文件对话'
  }

  if (Array.isArray(displayContent)) {
    return displayContent.find(p => p.type === 'text')?.text || '图片对话'
  }

  return String(displayContent || '新对话')
}

function App() {
  const [conversations, setConversations] = useState(() => {
    const saved = localStorage.getItem('mygpt-conversations')
    return saved ? JSON.parse(saved) : []
  })
  const [activeId, setActiveId] = useState(() => {
    const saved = localStorage.getItem('mygpt-active')
    return saved || null
  })
  const [sidebarOpen, setSidebarOpen] = useState(true)

  useEffect(() => {
    localStorage.setItem('mygpt-conversations', JSON.stringify(conversations))
  }, [conversations])

  useEffect(() => {
    if (activeId) {
      localStorage.setItem('mygpt-active', activeId)
    } else {
      localStorage.removeItem('mygpt-active')
    }
  }, [activeId])

  const activeConversation = conversations.find(c => c.id === activeId)

  function handleNewChat() {
    const id = generateId()
    const newConv = { id, title: '新对话', messages: [], createdAt: Date.now() }
    setConversations(prev => [newConv, ...prev])
    setActiveId(id)
    return id
  }

  function handleSelectChat(id) {
    setActiveId(id)
  }

  function handleUpdateMessages(conversationId, messages) {
    setConversations(prev => prev.map(c => {
      if (c.id !== conversationId) return c
      if (c.title !== '新对话' || messages.length === 0) return { ...c, messages }
      const firstMsg = messages[0]
      const text = getMessageTitleText(firstMsg)
      const title = text.slice(0, 20) + (text.length > 20 ? '...' : '')
      return { ...c, messages, title }
    }))
  }

  function handleRenameChat(id, title) {
    const nextTitle = title.trim()
    if (!nextTitle) return

    setConversations(prev => prev.map(c => (
      c.id === id ? { ...c, title: nextTitle } : c
    )))
  }

  function handleDeleteChat(id) {
    setConversations(prev => prev.filter(c => c.id !== id))
    if (activeId === id) {
      const remaining = conversations.filter(c => c.id !== id)
      setActiveId(remaining.length > 0 ? remaining[0].id : null)
    }
  }

  function handleClearAll() {
    setConversations([])
    setActiveId(null)
    localStorage.removeItem('mygpt-conversations')
    localStorage.removeItem('mygpt-active')
  }

  return (
    <div className="app">
      <Sidebar
        open={sidebarOpen}
        conversations={conversations}
        activeId={activeId}
        onNewChat={handleNewChat}
        onSelectChat={handleSelectChat}
        onDeleteChat={handleDeleteChat}
        onClearAll={handleClearAll}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
      />
      <ChatArea
        conversation={activeConversation}
        onUpdateMessages={handleUpdateMessages}
        onRenameConversation={handleRenameChat}
        onNewChat={handleNewChat}
        sidebarOpen={sidebarOpen}
        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
      />
    </div>
  )
}

export default App
