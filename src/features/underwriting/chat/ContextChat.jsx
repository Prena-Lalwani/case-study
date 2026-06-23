import { useEffect, useRef, useState } from 'react'
import PropTypes from 'prop-types'
import {
  TbBubble,
  TbLoader2,
  TbSend,
  TbSparkles,
  TbTrash,
  TbUser,
  TbX,
} from 'react-icons/tb'
import { getGeminiModel } from '../../../lib/gemini'

const MAX_TURNS = 10  // keep last 10 messages in context

/* ── Minimal markdown renderer (bold + bullets + line breaks) ─────────── */
const renderInline = text => {
  /* Handle **bold** */
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  return parts.map((p, i) => {
    if (p.startsWith('**') && p.endsWith('**')) {
      return <strong key={i} className="text-gray-900">{p.slice(2, -2)}</strong>
    }
    return <span key={i}>{p}</span>
  })
}

const renderMarkdown = text => {
  const lines = text.split('\n')
  const blocks = []
  let listBuf = []

  const flushList = () => {
    if (listBuf.length) {
      blocks.push(
        <ul key={`l${blocks.length}`} className="list-disc pl-5 space-y-1 my-1.5 marker:text-tertiary">
          {listBuf.map((item, i) => <li key={i}>{renderInline(item)}</li>)}
        </ul>
      )
      listBuf = []
    }
  }

  for (const raw of lines) {
    const line = raw.trimEnd()
    const m = line.match(/^[-*]\s+(.+)$/)
    if (m) {
      listBuf.push(m[1])
    } else {
      flushList()
      if (line.trim()) {
        blocks.push(
          <p key={`p${blocks.length}`} className="my-1.5">{renderInline(line)}</p>
        )
      }
    }
  }
  flushList()
  return blocks
}

/* ── Floating-button position ────────────────────────────────────────── */
/* The button can be dragged out of the way on the current page, but it
   resets to the default bottom-right corner on every page navigation. */
const DEFAULT_POS = { right: 24, bottom: 24 }
const clampPos = ({ right, bottom }) => ({
  right:  Math.max(8, Math.min(window.innerWidth  - 80, right)),
  bottom: Math.max(8, Math.min(window.innerHeight - 60, bottom)),
})

/* ── ContextChat component ───────────────────────────────────────────── */
const ContextChat = ({
  storageKey,
  contextLabel,
  contextData,
  systemPrompt,
  suggestions = [],
}) => {
  const [open, setOpen]         = useState(false)
  const [messages, setMessages] = useState([])
  const [input, setInput]       = useState('')
  const [busy, setBusy]         = useState(false)
  const [error, setError]       = useState(null)
  const bodyRef                 = useRef(null)
  const inputRef                = useRef(null)

  /* Floating-button position — starts at default on every page mount.
     User can drag it out of the way while on this page; the next page
     will mount a fresh ContextChat and show the button at default again. */
  const [btnPos, setBtnPos] = useState(DEFAULT_POS)
  const dragRef             = useRef({ active: false, didMove: false, sx: 0, sy: 0, sright: 0, sbottom: 0 })

  /* Load persisted history once we have a storageKey */
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey)
      if (raw) setMessages(JSON.parse(raw))
      else      setMessages([])
    } catch { setMessages([]) }
  }, [storageKey])

  /* Persist on every change */
  useEffect(() => {
    if (!storageKey) return
    try {
      localStorage.setItem(storageKey, JSON.stringify(messages.slice(-50)))
    } catch { /* full or unavailable */ }
  }, [messages, storageKey])

  /* Auto-scroll on new message */
  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight
  }, [messages, busy])

  /* Focus input when panel opens */
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50)
  }, [open])

  /* Lock body scroll when open */
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [open])

  const send = async (q) => {
    const question = (q ?? input).trim()
    if (!question || busy) return
    setError(null)
    setInput('')

    const userMsg = { role: 'user', content: question }
    const next    = [...messages, userMsg]
    setMessages(next)
    setBusy(true)

    try {
      const recent = next.slice(-MAX_TURNS)
      const convo = recent.map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`).join('\n\n')

      const fullPrompt = `${systemPrompt}

DATA:
${JSON.stringify(contextData, null, 2)}

CONVERSATION:
${convo}

Respond as the assistant to the last user message. Keep it tight (max ~120 words unless the user asks for detail).`

      const model  = getGeminiModel()
      const result = await model.generateContent([{ text: fullPrompt }])
      const reply  = (result.response.text() ?? '').trim() || '(empty response)'

      setMessages(m => [...m, { role: 'assistant', content: reply }])
    } catch (err) {
      console.error('Chat error', err)
      setError(err.message ?? 'Failed to reach the AI')
      setMessages(m => [...m, { role: 'assistant', content: `_Sorry — I hit an error: ${err.message ?? 'unknown'}_` }])
    } finally {
      setBusy(false)
    }
  }

  const clearChat = () => {
    if (!confirm('Clear this conversation?')) return
    setMessages([])
    try { localStorage.removeItem(storageKey) } catch {}
  }

  const onKey = e => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  return (
    <>
      {/* Floating trigger button — draggable; click opens chat */}
      {!open && (
        <button
          onMouseDown={(e) => {
            dragRef.current = {
              active: true, didMove: false,
              sx: e.clientX, sy: e.clientY,
              sright: btnPos.right, sbottom: btnPos.bottom,
            }
            const onMove = (ev) => {
              const dx = ev.clientX - dragRef.current.sx
              const dy = ev.clientY - dragRef.current.sy
              if (!dragRef.current.didMove && Math.hypot(dx, dy) > 5) dragRef.current.didMove = true
              if (dragRef.current.didMove) {
                setBtnPos(clampPos({
                  right:  dragRef.current.sright  - dx,
                  bottom: dragRef.current.sbottom - dy,
                }))
              }
            }
            const onUp = () => {
              window.removeEventListener('mousemove', onMove)
              window.removeEventListener('mouseup', onUp)
              if (!dragRef.current.didMove) {
                /* not a drag — treat as a click */
                setOpen(true)
              }
              /* dragged positions are persisted by the useEffect */
              dragRef.current.active = false
            }
            window.addEventListener('mousemove', onMove)
            window.addEventListener('mouseup', onUp)
          }}
          style={{ right: btnPos.right, bottom: btnPos.bottom, position: 'fixed', userSelect: 'none' }}
          className="z-40 flex items-center gap-2 px-4 py-3 rounded-full bg-navy text-white shadow-lg hover:opacity-90 cursor-grab active:cursor-grabbing transition-opacity"
          title="Drag to reposition · click to open"
        >
          <TbSparkles style={{ fontSize: 18 }} />
          <span className="text-[13px] font-semibold">Ask AI</span>
        </button>
      )}

      {/* Slide-over panel */}
      <div
        className={`fixed inset-0 z-50 ${open ? 'pointer-events-auto' : 'pointer-events-none'}`}
        aria-hidden={!open}
      >
        {/* Backdrop */}
        <div
          className={`absolute inset-0 bg-black/40 transition-opacity duration-300 ${open ? 'opacity-100' : 'opacity-0'}`}
          onClick={() => setOpen(false)}
        />

        {/* Panel */}
        <aside
          className={`absolute top-0 right-0 h-full w-full max-w-[440px] bg-white shadow-2xl flex flex-col transition-transform duration-300 ${open ? 'translate-x-0' : 'translate-x-full'}`}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 shrink-0">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-md bg-blue-50 text-blue-action flex items-center justify-center">
                  <TbSparkles style={{ fontSize: 15 }} />
                </div>
                <h3 className="text-[14.5px] font-semibold text-gray-900">Ask AI</h3>
              </div>
              {contextLabel && (
                <p className="text-[11.5px] text-tertiary mt-1 truncate">about {contextLabel}</p>
              )}
            </div>
            <div className="flex items-center gap-1">
              {messages.length > 0 && (
                <button
                  onClick={clearChat}
                  className="p-1.5 rounded-lg text-secondary hover:bg-gray-100 transition-colors"
                  title="Clear conversation"
                >
                  <TbTrash style={{ fontSize: 15 }} />
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="p-1.5 rounded-lg text-secondary hover:bg-gray-100 transition-colors"
                title="Close"
              >
                <TbX style={{ fontSize: 16 }} />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div ref={bodyRef} className="flex-1 overflow-y-auto px-5 py-4 bg-gray-50/50">
            {messages.length === 0 ? (
              <EmptyState suggestions={suggestions} onPick={send} />
            ) : (
              <div className="space-y-3">
                {messages.map((m, i) => <MessageBubble key={i} msg={m} />)}
                {busy && (
                  <div className="flex items-start gap-2 text-tertiary">
                    <div className="w-7 h-7 rounded-full bg-blue-50 text-blue-action flex items-center justify-center shrink-0">
                      <TbLoader2 className="animate-spin" style={{ fontSize: 14 }} />
                    </div>
                    <div className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-[12.5px]">Thinking…</div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Input */}
          <div className="px-4 py-3 border-t border-gray-200 shrink-0 bg-white">
            {error && (
              <p className="text-[11px] text-error mb-1.5">{error}</p>
            )}
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={onKey}
                rows={1}
                placeholder="Ask anything about this data…"
                className="flex-1 text-[13px] text-gray-800 placeholder:text-tertiary border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-blue-action transition-colors resize-none max-h-28"
              />
              <button
                onClick={() => send()}
                disabled={busy || !input.trim()}
                className="shrink-0 w-9 h-9 flex items-center justify-center rounded-lg bg-navy text-white hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {busy
                  ? <TbLoader2 className="animate-spin" style={{ fontSize: 16 }} />
                  : <TbSend style={{ fontSize: 16 }} />}
              </button>
            </div>
            <p className="text-[10px] text-tertiary mt-2">
              Answers come from this session's data. AI may be wrong — verify before acting.
            </p>
          </div>
        </aside>
      </div>
    </>
  )
}

/* ── Bubble + empty state ────────────────────────────────────────────── */
const MessageBubble = ({ msg }) => {
  const isUser = msg.role === 'user'
  return (
    <div className={`flex items-start gap-2 ${isUser ? 'flex-row-reverse' : ''}`}>
      <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
        isUser ? 'bg-navy text-white' : 'bg-blue-50 text-blue-action'
      }`}>
        {isUser
          ? <TbUser style={{ fontSize: 14 }} />
          : <TbSparkles style={{ fontSize: 14 }} />}
      </div>
      <div className={`rounded-lg px-3 py-2 max-w-[85%] text-[12.5px] leading-relaxed ${
        isUser
          ? 'bg-navy text-white'
          : 'bg-white border border-gray-200 text-gray-800'
      }`}>
        {isUser
          ? <p className="whitespace-pre-wrap">{msg.content}</p>
          : <div>{renderMarkdown(msg.content)}</div>}
      </div>
    </div>
  )
}

const EmptyState = ({ suggestions, onPick }) => (
  <div className="flex flex-col items-center text-center pt-6">
    <div className="w-14 h-14 rounded-full bg-blue-50 text-blue-action flex items-center justify-center mb-3">
      <TbBubble style={{ fontSize: 26 }} />
    </div>
    <p className="text-[13.5px] font-semibold text-gray-900">Ask anything about this view</p>
    <p className="text-[12px] text-tertiary mt-1 max-w-[280px] leading-relaxed">
      Type a question below or pick a starter — answers are grounded in the data currently on screen.
    </p>

    {suggestions.length > 0 && (
      <div className="mt-5 w-full space-y-2">
        <p className="text-[10.5px] font-semibold text-tertiary uppercase tracking-widest text-left">Try asking</p>
        {suggestions.map((s, i) => (
          <button
            key={i}
            onClick={() => onPick(s)}
            className="w-full text-left px-3 py-2.5 rounded-lg border border-gray-200 bg-white text-[12.5px] text-gray-800 hover:border-blue-action hover:bg-blue-50/40 transition-colors"
          >
            {s}
          </button>
        ))}
      </div>
    )}
  </div>
)

ContextChat.propTypes = {
  storageKey:   PropTypes.string.isRequired,
  contextLabel: PropTypes.string,
  contextData:  PropTypes.any.isRequired,
  systemPrompt: PropTypes.string.isRequired,
  suggestions:  PropTypes.arrayOf(PropTypes.string),
}

export default ContextChat
