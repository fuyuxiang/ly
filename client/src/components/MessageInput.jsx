import { useRef, useState } from 'react'

const TEXT_FILE_PATTERN = /\.(txt|md|markdown|csv|json|xml|html|css|js|jsx|ts|tsx|py|java|c|cpp|h|hpp|go|rs|php|rb|sh|sql|yaml|yml|log)$/i
const IMAGE_PATTERN = /\.(png|jpg|jpeg|gif|webp|svg|bmp)$/i
const DOCUMENT_PATTERN = /\.(pdf|docx|xlsx|xls|pptx)$/i
const MAX_FILE_CHARS = 50000

function formatFileSize(size) {
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / 1024 / 1024).toFixed(1)} MB`
}

function isImage(file) {
  return file.type.startsWith('image/') || IMAGE_PATTERN.test(file.name)
}

function isDocument(file) {
  return DOCUMENT_PATTERN.test(file.name)
}

function isTextFile(file) {
  return file.type.startsWith('text/') || file.type === 'application/json' || TEXT_FILE_PATTERN.test(file.name)
}

function readAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsDataURL(file)
  })
}

function readAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsText(file)
  })
}

async function parseFileOnServer(file) {
  const formData = new FormData()
  formData.append('file', file)
  const res = await fetch('/api/parse-file', { method: 'POST', body: formData })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown error' }))
    throw new Error(err.error || `Server error: ${res.status}`)
  }
  return res.json()
}

async function processAttachment(file) {
  if (isImage(file)) {
    const dataUrl = await readAsDataUrl(file)
    return { type: 'image', dataUrl, name: file.name, size: file.size }
  }

  if (isDocument(file)) {
    const result = await parseFileOnServer(file)
    if (result.images) {
      return { type: 'pdf_images', images: result.images, name: file.name, size: file.size }
    }
    return { type: 'document', text: result.text, name: file.name, size: file.size }
  }

  if (isTextFile(file)) {
    let content = await readAsText(file)
    if (content.length > MAX_FILE_CHARS) {
      content = content.slice(0, MAX_FILE_CHARS) + `\n\n[文件内容过长，已截取前 ${MAX_FILE_CHARS} 个字符]`
    }
    return { type: 'text', text: content, name: file.name, size: file.size }
  }

  return { type: 'unknown', text: `[不支持的文件类型: ${file.name}]`, name: file.name, size: file.size }
}

function buildMessageContent(text, attachments) {
  const contentParts = []
  const textParts = []

  if (text) {
    textParts.push(text)
  }

  const images = []
  for (const att of attachments) {
    if (att.type === 'image') {
      images.push(att)
    } else if (att.type === 'pdf_images') {
      for (const dataUrl of att.images) {
        images.push({ dataUrl })
      }
    } else if (att.type === 'document' || att.type === 'text') {
      textParts.push(`\n--- ${att.name} (${formatFileSize(att.size)}) ---\n${att.text}`)
    } else {
      textParts.push(`\n${att.text}`)
    }
  }

  if (!text && textParts.length === 0 && images.length > 0) {
    textParts.push('请分析这些图片。')
  } else if (!text && textParts.length > 0) {
    textParts.unshift('请分析这些附件。')
  }

  const combinedText = textParts.join('\n')

  let content
  if (images.length === 0) {
    content = combinedText
  } else {
    contentParts.push({ type: 'text', text: combinedText })
    for (const img of images) {
      contentParts.push({ type: 'image_url', image_url: { url: img.dataUrl } })
    }
    content = contentParts
  }

  const fileNames = attachments.map(att => att.name).filter(Boolean)
  const fileSuffix = fileNames.length > 0 ? `[${fileNames.join(', ')}]` : ''
  const display = text
    ? (fileSuffix ? `${text} ${fileSuffix}` : text)
    : (fileSuffix || '请分析这些附件。')
  return { display, content }
}

export default function MessageInput({ onSend, onStop, disabled, streaming }) {
  const [input, setInput] = useState('')
  const [attachments, setAttachments] = useState([])
  const [processingFiles, setProcessingFiles] = useState(false)
  const fileInputRef = useRef(null)
  const canSubmit = streaming || input.trim().length > 0 || attachments.length > 0

  async function handleSubmit(e) {
    e.preventDefault()
    if (streaming) {
      onStop?.()
      return
    }
    const text = input.trim()
    if (!text && attachments.length === 0) return

    setProcessingFiles(true)
    try {
      const processed = await Promise.all(attachments.map(file => processAttachment(file)))
      const { display, content } = buildMessageContent(text, processed)
      setInput('')
      setAttachments([])
      onSend(content, display)
    } catch (err) {
      console.error('File processing error:', err)
      setInput('')
      setAttachments([])
      onSend(text || `[文件处理失败: ${err.message}]`)
    } finally {
      setProcessingFiles(false)
    }
  }

  function handleUploadClick() {
    if (disabled || streaming || processingFiles) return
    fileInputRef.current?.click()
  }

  function handleFileChange(e) {
    const selectedFiles = Array.from(e.target.files || [])
    if (selectedFiles.length > 0) {
      setAttachments(prev => [...prev, ...selectedFiles])
    }
    e.target.value = ''
  }

  function handleRemoveAttachment(index) {
    setAttachments(prev => prev.filter((_, i) => i !== index))
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  return (
    <form className={`message-input ${streaming ? 'is-streaming' : ''}`} onSubmit={handleSubmit}>
      <input
        ref={fileInputRef}
        className="file-input"
        type="file"
        multiple
        onChange={handleFileChange}
      />
      {attachments.length > 0 && (
        <div className="attachment-list">
          {attachments.map((file, index) => (
            <div className="attachment-chip" key={`${file.name}-${file.size}-${index}`}>
              <span className="attachment-name">{file.name}</span>
              <span className="attachment-size">{formatFileSize(file.size)}</span>
              <button
                type="button"
                className="attachment-remove"
                onClick={() => handleRemoveAttachment(index)}
                aria-label="移除附件"
                title="移除附件"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12"/>
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
      <button
        type="button"
        className="upload-btn"
        onClick={handleUploadClick}
        aria-label="上传文件"
        title="上传文件"
        disabled={disabled || streaming || processingFiles}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 16V4"/>
          <path d="M7 9l5-5 5 5"/>
          <path d="M20 16v3a2 2 0 01-2 2H6a2 2 0 01-2-2v-3"/>
        </svg>
      </button>
      <textarea
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={streaming ? '正在生成回复...' : processingFiles ? '正在读取文件...' : '输入问题或任务...'}
        rows={1}
        disabled={(disabled && !streaming) || processingFiles}
      />
      <button
        type="submit"
        className="send-btn"
        aria-label={streaming ? '停止' : '发送'}
        disabled={!canSubmit || processingFiles || (disabled && !streaming)}
      >
        {streaming ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <rect x="6" y="6" width="12" height="12" rx="2"/>
          </svg>
        ) : (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 19V5M5 12l7-7 7 7"/>
          </svg>
        )}
      </button>
    </form>
  )
}
