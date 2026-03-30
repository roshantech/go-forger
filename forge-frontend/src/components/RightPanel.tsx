import { useRef, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useFileTreeStore } from '@/store/fileTreeStore'
import { astApi } from '@/lib/api'
import type { FileInspection } from '@/lib/api'
import FileInspector from '@/components/inspector/FileInspector'
import { Code2, Upload, MessageSquare, X } from 'lucide-react'
import toast from 'react-hot-toast'

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

// ─── AST Inspector panel (for .go files) ─────────────────────
function ASTPanel({ fileName }: { fileName: string }) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [inspection, setInspection] = useState<FileInspection | null>(null)

  const inspectMut = useMutation({
    mutationFn: (file: File) => astApi.inspectFile(file).then(r => r.data),
    onSuccess: (data) => setInspection(data),
    onError: () => toast.error('Failed to parse file'),
  })

  function handleFile(file: File) {
    if (!file.name.endsWith('.go')) {
      toast.error('Only .go files are supported')
      return
    }
    inspectMut.mutate(file)
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{
        height: 40, display: 'flex', alignItems: 'center', padding: '0 12px', gap: 8,
        borderBottom: '1px solid var(--border-subtle)', flexShrink: 0,
      }}>
        <Code2 size={13} style={{ color: 'var(--lang-go)', flexShrink: 0 }} />
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {fileName}
        </span>
        {inspection && (
          <button
            onClick={() => setInspection(null)}
            style={{
              width: 22, height: 22, borderRadius: 4, border: 'none', cursor: 'pointer',
              background: 'transparent', color: 'var(--text-disabled)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-raised)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            <X size={12} />
          </button>
        )}
      </div>

      {/* Body */}
      {!inspection ? (
        <div
          style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24 }}
          onDrop={handleDrop}
          onDragOver={e => e.preventDefault()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".go"
            style={{ display: 'none' }}
            onChange={handleInputChange}
          />
          <div style={{
            width: 44, height: 44, borderRadius: 12, background: 'var(--lang-go-bg)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Code2 size={20} style={{ color: 'var(--lang-go)' }} />
          </div>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 6 }}>
              AST Inspector
            </p>
            <p style={{ fontSize: 11, color: 'var(--text-disabled)', lineHeight: 1.6 }}>
              Upload <strong style={{ color: 'var(--lang-go)' }}>{fileName}</strong> to inspect<br />
              its functions, types, and imports.
            </p>
          </div>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={inspectMut.isPending}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '7px 14px', borderRadius: 7,
              background: 'var(--lang-go-bg)',
              border: '1px solid var(--lang-go)',
              color: 'var(--lang-go)',
              fontSize: 12, fontWeight: 500, cursor: 'pointer',
              transition: 'all 150ms',
              opacity: inspectMut.isPending ? 0.6 : 1,
            }}
          >
            {inspectMut.isPending ? (
              <svg className="animate-spin" width="13" height="13" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.25"/>
                <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
              </svg>
            ) : (
              <Upload size={13} />
            )}
            {inspectMut.isPending ? 'Parsing…' : 'Upload .go file'}
          </button>
        </div>
      ) : (
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <FileInspector inspection={inspection} />
        </div>
      )}
    </div>
  )
}

// ─── Root export ──────────────────────────────────────────────
export function RightPanel() {
  const { selectedFileId, items } = useFileTreeStore()

  const selectedItem = selectedFileId ? items[selectedFileId] : null
  const isGoFile = selectedItem?.type === 'file' && selectedItem.language === 'go'

  return (
    <div style={{
      background: 'var(--bg-surface)',
      borderLeft: '1px solid var(--border-subtle)',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
    }}>
      {isGoFile
        ? <ASTPanel fileName={selectedItem!.name} />
        : <AIChatPanel />
      }
    </div>
  )
}
