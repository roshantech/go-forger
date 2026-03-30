import { Handle, Position, type NodeProps } from '@xyflow/react'
import { FileTypeIcon } from '@/components/ui/FileTypeIcon'
import { GitBranch } from 'lucide-react'

export interface FileNodeData extends Record<string, unknown> {
  name: string
  language: string
  isSelected: boolean
  isGoFile: boolean
  onSelect: () => void
  onOpenAST: () => void   // called when clicking a .go file to open AST view
}

export function FileNode({ data }: NodeProps) {
  const d = data as FileNodeData

  function handleClick(e: React.MouseEvent) {
    e.stopPropagation()
    d.onSelect()
    if (d.isGoFile) d.onOpenAST()
  }

  return (
    <>
      <Handle type="target" position={Position.Top} style={{ opacity: 0, pointerEvents: 'none' }} />
      <div
        data-testid={`tree-file-${d.name}`}
        onClick={handleClick}
        title={d.isGoFile ? 'Click to open AST Visualizer' : d.name}
        style={{
          width: 152,
          display: 'flex',
          alignItems: 'center',
          gap: 7,
          padding: '6px 9px',
          borderRadius: 7,
          border: `1px solid ${d.isSelected ? 'var(--accent)' : 'var(--border-default)'}`,
          background: d.isSelected ? 'var(--accent-muted)' : 'var(--bg-surface)',
          boxShadow: d.isSelected ? 'var(--shadow-accent)' : 'var(--shadow-sm)',
          cursor: 'pointer',
          transition: 'all 150ms',
          userSelect: 'none',
          position: 'relative',
        }}
        onMouseEnter={e => { if (!d.isSelected) e.currentTarget.style.background = 'var(--bg-raised)' }}
        onMouseLeave={e => { if (!d.isSelected) e.currentTarget.style.background = 'var(--bg-surface)' }}
      >
        <FileTypeIcon language={d.language} size="sm" />
        <span style={{
          flex: 1, fontSize: 11, fontFamily: 'var(--font-mono)',
          color: 'var(--text-primary)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {d.name}
        </span>
        {/* AST indicator for .go files */}
        {d.isGoFile && (
          <GitBranch size={9} style={{ color: 'var(--lang-go)', flexShrink: 0, opacity: 0.7 }} />
        )}
      </div>
    </>
  )
}
