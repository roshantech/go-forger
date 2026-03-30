import { Undo2, Redo2, Download } from 'lucide-react'
import { useProjectStore } from '@/store/projectStore'

interface Props {
  onSave: () => void
  onExport: () => void
  isSaving: boolean
  lastSaved: Date | null
}

export default function Toolbar({ onSave, onExport, isSaving, lastSaved }: Props) {
  const { undo, redo, past, future } = useProjectStore()

  return (
    <div
      data-testid="toolbar"
      className="flex items-center gap-2 px-4 py-2 border-b border-border bg-card shrink-0"
    >
      <span className="text-sm font-semibold text-foreground mr-2">Workflow</span>

      <div className="flex items-center gap-1">
        <IconBtn onClick={undo} disabled={past.length === 0} title="Undo (Ctrl+Z)">
          <Undo2 size={15} />
        </IconBtn>
        <IconBtn onClick={redo} disabled={future.length === 0} title="Redo (Ctrl+Y)">
          <Redo2 size={15} />
        </IconBtn>
      </div>

      <div className="flex-1" />

      {lastSaved && (
        <span className="text-xs text-muted-foreground">
          Saved {lastSaved.toLocaleTimeString()}
        </span>
      )}

      <button
        onClick={onSave}
        disabled={isSaving}
        data-testid="save-button"
        className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
      >
        {isSaving ? 'Saving…' : 'Save'}
      </button>

      <button
        onClick={onExport}
        title="Export JSON"
        data-testid="export-button"
        className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
      >
        <Download size={15} />
      </button>
    </div>
  )
}

function IconBtn({
  children,
  onClick,
  disabled,
  title,
}: {
  children: React.ReactNode
  onClick: () => void
  disabled?: boolean
  title?: string
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className="w-7 h-7 flex items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
    >
      {children}
    </button>
  )
}
