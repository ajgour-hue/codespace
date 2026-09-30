import { useState, useRef, useEffect, useCallback } from 'react'

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1.5 px-3.5 py-3">
      {[0, 1, 2].map(i => (
        <div key={i} className="w-1.5 h-1.5 rounded-full"
          style={{
            background: '#3B82F6',
            animation: 'typing-dot 1.2s ease-in-out infinite',
            animationDelay: `${i * 0.2}s`
          }} />
      ))}
    </div>
  )
}

const ACTIVITY_STYLES = {
  reading: { color: '#3B82F6', label: 'READ' },
  updating: { color: '#F59E0B', label: 'EDIT' },
  success: { color: '#22C55E', label: 'DONE' },
  info: { color: '#64748B', label: 'INFO' }
}

function ActivityLog({ lines }) {
  if (!lines.length) return null
  return (
    <div className="mt-1.5 rounded-lg overflow-hidden" style={{ background: '#0D1118', border: '1px solid rgba(255,255,255,0.06)' }}>
      {lines.map((line, i) => {
        const cfg = ACTIVITY_STYLES[line.type] || ACTIVITY_STYLES.info
        return (
          <div key={i} className="flex items-start gap-2 px-2.5 py-1.5"
            style={{ borderBottom: i < lines.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none' }}>
            <span className="shrink-0 mt-1 rounded-full" style={{ width: 5, height: 5, background: cfg.color }} />
            <span className="text-[10px] font-mono tracking-wide shrink-0 mt-px" style={{ color: cfg.color, opacity: 0.85 }}>
              {cfg.label}
            </span>
            <span className="text-xs font-mono break-all leading-relaxed" style={{ color: '#94A3B8' }}>{line.text}</span>
          </div>
        )
      })}
    </div>
  )
}

function Avatar() {
  return (
    <div className="w-7 h-7 rounded-lg shrink-0 mr-2 flex items-center justify-center"
      style={{
        background: 'linear-gradient(160deg, rgba(59,130,246,0.18), rgba(37,99,235,0.06))',
        border: '1px solid rgba(59,130,246,0.28)',
        marginTop: '2px',
        boxShadow: '0 0 12px rgba(59,130,246,0.08)'
      }}>
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="4 17 10 11 4 5" />
        <line x1="12" y1="19" x2="20" y2="19" />
      </svg>
    </div>
  )
}

function Message({ msg }) {
  const isUser = msg.role === 'user'
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} animate-fadeIn`}>
      {!isUser && <Avatar />}
      <div className="max-w-[85%]">
        <div className="px-3.5 py-2.5 rounded-2xl"
          style={{
            fontSize: '13.5px',
            lineHeight: '1.55',
            ...(isUser ? {
              background: 'linear-gradient(135deg, rgba(59,130,246,0.16), rgba(139,92,246,0.08))',
              border: '1px solid rgba(59,130,246,0.24)',
              color: '#F8FAFC',
              borderBottomRightRadius: '4px'
            } : {
              background: '#151A23',
              border: '1px solid rgba(255,255,255,0.08)',
              color: '#94A3B8',
              borderBottomLeftRadius: '4px'
            })
          }}>
          {msg.content}
        </div>
        {msg.activity && msg.activity.length > 0 && (
          <ActivityLog lines={msg.activity} />
        )}
        <div className={`text-[10px] mt-1 px-1 tracking-wide font-medium ${isUser ? 'text-right' : 'text-left'}`} style={{ color: '#64748B' }}>
          {new Date(msg.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    </div>
  )
}

function parseActivityLine(line) {
  if (!line.trim()) return null
  if (line.startsWith('Reading files')) return { type: 'reading', text: line }
  if (line.startsWith('Updating files')) return { type: 'updating', text: line }
  if (line.toLowerCase().includes('success')) return { type: 'success', text: line }
  return { type: 'info', text: line }
}

export default function AiChat({ sandboxId, onFilesChanged }) {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: 'Hi! I can modify your sandbox project. Describe what you want to build or change, and I\'ll update the code for you.',
      activity: [],
      time: Date.now()
    }
  ])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const bottomRef = useRef(null)
  const esRef = useRef(null)
  const textareaRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = useCallback(async () => {
    const text = input.trim()
    if (!text || streaming || !sandboxId) return

    setInput('')
    setStreaming(true)

    const userMsg = { role: 'user', content: text, activity: [], time: Date.now() }
    setMessages(prev => [...prev, userMsg])

    // Add placeholder AI message
    const aiMsgId = Date.now() + 1
    setMessages(prev => [...prev, { id: aiMsgId, role: 'assistant', content: '', activity: [], time: Date.now(), pending: true }])

    let aiContent = ''
    let activityLines = []

    try {
      // Use fetch with SSE manually
      const response = await fetch('/api/ai/invoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ message: text, projectId: sandboxId })
      })

      if (!response.ok) throw new Error(`Server error: ${response.status}`)

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      const updateMsg = () => {
        setMessages(prev => prev.map(m =>
          m.id === aiMsgId
            ? { ...m, content: aiContent || '…', activity: [...activityLines], pending: !aiContent }
            : m
        ))
      }

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop()

        for (const line of lines) {
          if (!line.trim()) continue
          const parsed = parseActivityLine(line)
          if (parsed) {
            activityLines = [...activityLines, parsed]
            // If looks like final AI text response
            if (parsed.type === 'info' && line.length > 30) {
              aiContent = line
            }
          }
          updateMsg()
        }
      }

      // If no textual content came through, construct a summary
      if (!aiContent) {
        const updates = activityLines.filter(l => l.type === 'success')
        aiContent = updates.length
          ? 'Done! Files have been updated successfully.'
          : 'Changes applied to your project.'
      }

      setMessages(prev => prev.map(m =>
        m.id === aiMsgId
          ? { ...m, content: aiContent, activity: activityLines, pending: false }
          : m
      ))

      // Trigger file explorer refresh
      onFilesChanged?.()
    } catch (err) {
      setMessages(prev => prev.map(m =>
        m.id === aiMsgId
          ? { ...m, content: `Error: ${err.message}`, activity: activityLines, pending: false }
          : m
      ))
    } finally {
      setStreaming(false)
    }
  }, [input, streaming, sandboxId, onFilesChanged])

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const isReady = !!sandboxId && !streaming
  const canSend = !!input.trim() && isReady

  return (
    <div className="flex flex-col h-full"
      style={{
        background: '#080B12',
        borderLeft: '1px solid rgba(255,255,255,0.08)',
        fontFamily: "'Inter', 'Geist', system-ui, -apple-system, sans-serif"
      }}>

      {/* Header */}
      <div className="flex items-center gap-2.5 px-4 py-3.5 shrink-0"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: '#0B0F17' }}>
        <div className="w-7 h-7 rounded-lg flex items-center justify-center"
          style={{ background: 'linear-gradient(160deg, rgba(59,130,246,0.18), rgba(37,99,235,0.06))', border: '1px solid rgba(59,130,246,0.28)' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="4 17 10 11 4 5" />
            <line x1="12" y1="19" x2="20" y2="19" />
          </svg>
        </div>
        <div className="min-w-0">
          <h2 className="text-[13px] font-semibold leading-tight tracking-tight" style={{ color: '#F8FAFC' }}>AI Assistant</h2>
          <p className="text-[11.5px] leading-tight mt-0.5" style={{ color: '#94A3B8' }}>Powered by Gemini</p>
        </div>
        <div className="ml-auto flex items-center gap-1.5 shrink-0">
          <div className="w-1.5 h-1.5 rounded-full" style={{ background: streaming ? '#F59E0B' : '#22C55E', boxShadow: `0 0 6px ${streaming ? '#F59E0B' : '#22C55E'}` }} />
          <span className="text-[11.5px] font-medium tracking-wide" style={{ color: '#94A3B8' }}>{streaming ? 'Working' : 'Active'}</span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3.5 py-4 flex flex-col gap-4">
        {messages.map((msg, i) => (
          <div key={msg.id || i}>
            {msg.pending && !msg.content ? (
              <div className="flex justify-start">
                <Avatar />
                <div className="rounded-2xl overflow-hidden" style={{ background: '#151A23', border: '1px solid rgba(255,255,255,0.08)', borderBottomLeftRadius: '4px' }}>
                  <TypingIndicator />
                  {msg.activity && msg.activity.length > 0 && <ActivityLog lines={msg.activity} />}
                </div>
              </div>
            ) : (
              <Message msg={msg} />
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="shrink-0 px-3.5 pb-3.5 pt-2.5"
        style={{ borderTop: '1px solid rgba(255,255,255,0.06)', background: '#0B0F17' }}>
        <div className="flex items-end gap-2.5 rounded-xl pl-3.5 pr-2 py-2.5"
          style={{
            background: '#0D1118',
            border: '1px solid rgba(255,255,255,0.08)',
            transition: 'border-color 0.2s, box-shadow 0.2s'
          }}
          onFocusCapture={e => {
            e.currentTarget.style.borderColor = 'rgba(59,130,246,0.45)'
            e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59,130,246,0.08)'
          }}
          onBlurCapture={e => {
            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'
            e.currentTarget.style.boxShadow = 'none'
          }}>
          <textarea
            ref={textareaRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={sandboxId ? 'Describe what you want to build…' : 'Create a sandbox first…'}
            disabled={!sandboxId || streaming}
            rows={1}
            className="flex-1 resize-none outline-none bg-transparent placeholder:text-[#64748B]"
            style={{
              color: '#F8FAFC',
              caretColor: '#3B82F6',
              maxHeight: '120px',
              fontSize: '13.5px',
              lineHeight: '1.55',
              fontFamily: 'inherit',
              padding: '5px 0'
            }}
            onInput={e => {
              e.target.style.height = 'auto'
              e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
            }}
          />
          <button
            onClick={sendMessage}
            disabled={!canSend}
            className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200 cursor-pointer disabled:cursor-not-allowed"
            style={{
              background: canSend
                ? 'linear-gradient(135deg, #3B82F6, #8B5CF6)'
                : 'rgba(255,255,255,0.05)',
              color: canSend ? '#080B12' : '#64748B',
              boxShadow: canSend ? '0 0 14px rgba(59,130,246,0.35)' : 'none'
            }}>
            {streaming ? (
              <div className="w-3.5 h-3.5 rounded-full border-2 border-t-transparent"
                style={{ borderColor: '#3B82F6', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13"/>
                <polygon points="22 2 15 22 11 13 2 9 22 2"/>
              </svg>
            )}
          </button>
        </div>
        <p className="text-[10px] mt-1.5 text-center tracking-wide font-medium" style={{ color: '#64748B' }}>
          Enter to send · Shift + Enter for newline
        </p>
      </div>
    </div>
  )
}