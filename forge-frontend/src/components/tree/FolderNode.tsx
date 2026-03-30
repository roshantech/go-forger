import { Handle, Position, type NodeProps } from '@xyflow/react'
import { Folder, FolderOpen, ChevronRight } from 'lucide-react'

export interface FolderNodeData extends Record<string, unknown> {
  name: string
  isExpanded: boolean
  childCount: number
  onToggle: () => void
}

export function FolderNode({ data, selected }: NodeProps) {
  const d = data as FolderNodeData
  return (
    <>
      <Handle type="target" position={Position.Top}    style={{ opacity: 0, pointerEvents: 'none' }} />
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0, pointerEvents: 'none' }} />
      <div
        data-testid={`tree-folder-${d.name}`}
        onClick={(e) => { e.stopPropagation(); d.onToggle() }}
        style={{
          width: 172,
          display: 'flex',
          alignItems: 'center',
          gap: 7,
          padding: '7px 10px',
          borderRadius: 8,
          border: `1px solid ${selected ? 'var(--accent)' : 'var(--border-default)'}`,
          background: selected ? 'var(--accent-muted)' : 'var(--bg-surface)',
          boxShadow: selected ? 'var(--shadow-accent)' : 'var(--shadow-sm)',
          cursor: 'pointer',
          transition: 'all 150ms',
          userSelect: 'none',
        }}
        onMouseEnter={e => {
          if (!selected) e.currentTarget.style.background = 'var(--bg-raised)'
        }}
        onMouseLeave={e => {
          if (!selected) e.currentTarget.style.background = 'var(--bg-surface)'
        }}
      >
        {d.isExpanded
          ? <FolderOpen size={13} style={{ color: 'var(--accent)', flexShrink: 0 }} />
          : <Folder     size={13} style={{ color: 'var(--accent)', flexShrink: 0 }} />
        }
        <span style={{ flex: 1, fontSize: 12, fontWeight: 500, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {d.name}
        </span>
        {!d.isExpanded && (
          <span style={{
            fontSize: 9, fontFamily: 'var(--font-mono)',
            color: 'var(--text-disabled)', background: 'var(--bg-raised)',
            padding: '1px 4px', borderRadius: 3,
          }}>
            {d.childCount}
          </span>
        )}
        <ChevronRight
          size={11}
          style={{
            color: 'var(--text-disabled)',
            flexShrink: 0,
            transform: d.isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
            transition: 'transform 200ms ease',
          }}
        />
      </div>
    </>
  )
}
