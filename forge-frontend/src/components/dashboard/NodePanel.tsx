const NODES = [
  { kind: 'trigger',   label: 'Trigger',   color: '#f59e0b', desc: 'Start condition' },
  { kind: 'input',     label: 'Input',     color: '#38bdf8', desc: 'Receive data' },
  { kind: 'processor', label: 'Processor', color: '#34d399', desc: 'Transform data' },
  { kind: 'condition', label: 'Condition', color: '#fb7185', desc: 'Branch logic' },
  { kind: 'action',    label: 'Action',    color: '#818cf8', desc: 'Execute task' },
  { kind: 'output',    label: 'Output',    color: '#a78bfa', desc: 'Emit result' },
] as const

export default function NodePanel() {
  function onDragStart(e: React.DragEvent, kind: string) {
    e.dataTransfer.setData('application/x-forge-node', kind)
    e.dataTransfer.effectAllowed = 'copy'
  }

  return (
    <div className="space-y-1.5">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1 mb-2">
        Components
      </p>
      {NODES.map(({ kind, label, color, desc }) => (
        <div
          key={kind}
          draggable
          onDragStart={(e) => onDragStart(e, kind)}
          data-testid={`node-${kind}`}
          className="flex items-center gap-3 px-3 py-2 rounded-lg border border-border bg-card cursor-grab active:cursor-grabbing hover:border-primary/40 hover:bg-accent transition-colors select-none"
        >
          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: color }} />
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground leading-none">{label}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
          </div>
        </div>
      ))}
    </div>
  )
}
