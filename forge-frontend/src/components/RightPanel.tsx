import { MessageSquare } from 'lucide-react'

// ─── AI Chat placeholder ──────────────────────────────────────
function AIChatPanel() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{
        height: 40, display: 'flex', alignItems: 'center', padding: '0 14px', gap: 8,
        borderBottom: '1px solid var(--border-subtle)', flexShrink: 0,
      }}>
        <MessageSquare size={14} style={{ color: 'var(--accent)' }} />
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>AI Chat</span>
      </div>

      {/* Body */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', gap: 12, padding: 24,
      }}>
        <div style={{
          width: 40, height: 40, borderRadius: 10, background: 'var(--accent-muted)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <MessageSquare size={18} style={{ color: 'var(--accent)' }} />
        </div>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 4 }}>
            AI Chat
          </p>
          <p style={{ fontSize: 11, color: 'var(--text-disabled)', lineHeight: 1.6 }}>
            Select a file in the tree to inspect it,<br />
            or ask AI to generate code.
          </p>
        </div>
      </div>

      {/* Input */}
      <div style={{ padding: '10px 12px', borderTop: '1px solid var(--border-subtle)', flexShrink: 0 }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: 'var(--bg-raised)', border: '1px solid var(--border-default)',
          borderRadius: 8, padding: '6px 10px',
        }}>
          <input
            placeholder="Ask AI to generate code…"
            style={{
              flex: 1, background: 'transparent', border: 'none', outline: 'none',
              fontSize: 12, color: 'var(--text-primary)', caretColor: 'var(--accent)',
            }}
          />
        </div>
      </div>
    </div>
  )
}

// ─── Root export ──────────────────────────────────────────────
export function RightPanel() {
  return (
    <div style={{
      background: 'var(--bg-surface)',
      borderLeft: '1px solid var(--border-subtle)',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
    }}>
      <AIChatPanel />
    </div>
  )
}
