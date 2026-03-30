import { Handle, Position, type NodeProps } from '@xyflow/react'
import { Layers } from 'lucide-react'

export interface RootNodeData extends Record<string, unknown> {
  name: string
  fileCount: number
  language: string
}

export function RootNode({ data, selected }: NodeProps) {
  const d = data as RootNodeData
  return (
    <>
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0, pointerEvents: 'none' }} />
      <div
        data-testid="tree-root-node"
        style={{
          width: 200,
          padding: '12px 14px',
          borderRadius: 12,
          border: `1px solid ${selected ? 'var(--accent)' : 'var(--border-default)'}`,
          background: selected
            ? 'linear-gradient(135deg, var(--bg-raised), var(--accent-muted))'
            : 'var(--bg-surface)',
          boxShadow: selected ? 'var(--shadow-accent)' : 'var(--shadow-sm)',
          cursor: 'default',
          transition: 'all 200ms',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 8,
            background: 'var(--accent-muted)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <Layers size={14} style={{ color: 'var(--accent)' }} />
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.2 }}>
              {d.name}
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-disabled)', marginTop: 2 }}>
              project root
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{
            fontSize: 9, fontFamily: 'var(--font-mono)', fontWeight: 700,
            textTransform: 'uppercase', letterSpacing: '0.06em',
            color: 'var(--lang-go)', background: 'var(--lang-go-bg)',
            padding: '2px 6px', borderRadius: 4,
          }}>
            {d.language}
          </span>
          <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-disabled)' }}>
            {d.fileCount} files
          </span>
        </div>
      </div>
    </>
  )
}
