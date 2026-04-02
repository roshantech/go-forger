import { useState, useRef, useEffect } from 'react'
import { Send, Bot, Sparkles } from 'lucide-react'
import { useActiveTab } from '@/store/astViewerStore'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
}

export default function AIChatSidebar() {
  const activeTab = useActiveTab()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function handleSend() {
    const text = input.trim()
    if (!text || loading) return

    const userMsg: Message = { id: crypto.randomUUID(), role: 'user', content: text }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)

    try {
      // TODO: connect to AI backend endpoint
      await new Promise(r => setTimeout(r, 800))
      const assistantMsg: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: 'AI chat backend not yet connected. This is the UI placeholder.',
      }
      setMessages(prev => [...prev, assistantMsg])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border shrink-0">
        <Sparkles size={13} className="text-primary" />
        <span className="text-xs font-semibold text-foreground">AI Assistant</span>
        {activeTab && (
          <span className="ml-auto text-[10px] text-muted-foreground/50 font-mono truncate max-w-[100px]">
            {activeTab.fileName}
          </span>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 min-h-0">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
            <Bot size={28} className="text-muted-foreground/30" />
            <p className="text-xs text-muted-foreground/50 leading-relaxed">
              Ask anything about the open file or AST structure.
            </p>
          </div>
        )}
        {messages.map(msg => (
          <div key={msg.id} className={`flex flex-col gap-1 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
            <div
              className={`max-w-[90%] px-2.5 py-1.5 text-xs leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-primary text-primary-foreground rounded'
                  : 'bg-muted text-foreground border border-border rounded'
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex items-start">
            <div className="bg-muted border border-border px-3 py-2 text-xs text-muted-foreground rounded">
              <span className="inline-flex gap-0.5 items-end">
                <span className="animate-bounce h-1 w-1 rounded-full bg-muted-foreground/50" style={{ animationDelay: '0ms' }} />
                <span className="animate-bounce h-1 w-1 rounded-full bg-muted-foreground/50" style={{ animationDelay: '150ms' }} />
                <span className="animate-bounce h-1 w-1 rounded-full bg-muted-foreground/50" style={{ animationDelay: '300ms' }} />
              </span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="shrink-0 border-t border-border p-2">
        <form
          onSubmit={e => { e.preventDefault(); handleSend() }}
          className="flex gap-1.5"
        >
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Ask about this file…"
            disabled={loading}
            className="flex-1 min-w-0 px-2.5 py-1.5 bg-muted border border-border text-xs text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-primary/40 disabled:opacity-50 rounded"
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="px-2.5 py-1.5 bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0 rounded"
          >
            <Send size={11} />
          </button>
        </form>
      </div>
    </div>
  )
}
