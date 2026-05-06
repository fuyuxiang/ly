function formatConversationDate(timestamp) {
  if (!timestamp) return ''

  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(timestamp))
}

export default function Sidebar({ open, conversations, activeId, onNewChat, onSelectChat, onDeleteChat, onClearAll, onToggle }) {
  return (
    <aside className={`sidebar ${open ? 'open' : 'closed'}`} aria-label="会话导航">
      <div className="sidebar-header">
        <div className="sidebar-spacer" aria-hidden="true"></div>
        <button className="toggle-sidebar" onClick={onToggle} aria-label="收起侧边栏">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="2"/>
            <path d="M9 3v18"/>
          </svg>
        </button>
      </div>

      <div className="sidebar-actions">
        <button className="new-chat-btn" onClick={onNewChat}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 5v14M5 12h14"/>
          </svg>
          <span>开启新对话</span>
        </button>
      </div>

      <div className="sidebar-section">
        <div className="sidebar-label">
          <span>最近会话</span>
          <small>{conversations.length}</small>
          {conversations.length > 0 && (
            <button className="clear-all-btn" onClick={onClearAll} aria-label="清除所有对话">
              清除
            </button>
          )}
        </div>
        <div className="conversation-list">
          {conversations.length === 0 ? (
            <div className="conversation-empty">
              <span>暂无会话</span>
            </div>
          ) : (
            conversations.map(conv => (
              <div
                key={conv.id}
                className={`conversation-item ${conv.id === activeId ? 'active' : ''}`}
                onClick={() => onSelectChat(conv.id)}
              >
                <div className="conv-main">
                  <span className="conv-title">{conv.title}</span>
                  <span className="conv-meta">
                    {(conv.messages?.length || 0)} 条消息
                    {formatConversationDate(conv.createdAt) && ` · ${formatConversationDate(conv.createdAt)}`}
                  </span>
                </div>
                <button
                  className="delete-btn"
                  onClick={e => { e.stopPropagation(); onDeleteChat(conv.id) }}
                  aria-label="删除对话"
                  title="删除对话"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14"/>
                  </svg>
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </aside>
  )
}
