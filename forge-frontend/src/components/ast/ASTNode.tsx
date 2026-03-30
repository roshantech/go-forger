import { memo } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { ChevronDown, ChevronRight, Minus } from 'lucide-react'
import type { ASTFlowNodeData } from '@/lib/astToGraph'
import { useASTViewerStore } from '@/store/astViewerStore'

export const CATEGORY_COLORS: Record<string, { border: string; label: string; dot: string; bg: string }> = {
  file:       { border: '#6366f1', label: 'text-indigo-300',  dot: 'bg-indigo-400',  bg: '#1e1b4b22' },
  function:   { border: '#3b82f6', label: 'text-blue-300',    dot: 'bg-blue-400',    bg: '#1e3a5f22' },
  control:    { border: '#f97316', label: 'text-orange-300',  dot: 'bg-orange-400',  bg: '#43140722' },
  statement:  { border: '#eab308', label: 'text-yellow-300',  dot: 'bg-yellow-400',  bg: '#3b1f0022' },
  expression: { border: '#22c55e', label: 'text-green-300',   dot: 'bg-green-400',   bg: '#05231622' },
  identifier: { border: '#a855f7', label: 'text-purple-300',  dot: 'bg-purple-400',  bg: '#2e106522' },
  literal:    { border: '#f43f5e', label: 'text-rose-300',    dot: 'bg-rose-400',    bg: '#4c051922' },
  type:       { border: '#14b8a6', label: 'text-teal-300',    dot: 'bg-teal-400',    bg: '#042f2e22' },
  import:     { border: '#06b6d4', label: 'text-cyan-300',    dot: 'bg-cyan-400',    bg: '#08334422' },
  field:      { border: '#78716c', label: 'text-stone-300',   dot: 'bg-stone-400',   bg: '#1c191722' },
  other:      { border: '#6b7280', label: 'text-gray-400',    dot: 'bg-gray-500',    bg: '#1f212622' },
}

function ASTNodeComponent({ id, data, selected }: NodeProps) {
  const toggleExpand = useASTViewerStore(s => s.toggleExpand)
  const d = data as ASTFlowNodeData
  const { node, isExpanded, hasChildren, childCount, isRoot, compact } = d
  const style = CATEGORY_COLORS[node.category] ?? CATEGORY_COLORS.other

  // Compact mode: single-line strip for deep/non-selected nodes
  if (compact && !selected) {
    return (
      <div
        className="overflow-hidden select-none cursor-pointer transition-all duration-150"
        style={{
          width: 180,
          background: 'hsl(222,47%,9%)',
          border: `1px solid hsl(216,34%,18%)`,
          borderLeft: `3px solid ${style.border}`,
        }}
      >
        <div className="flex items-center gap-1.5 px-2 py-1.5">
          <span className={`w-1.5 h-1.5 shrink-0 ${style.dot}`} />
          <span className="text-[10px] font-mono truncate" style={{ color: style.border }}>
            {node.name || node.value || node.type}
          </span>
          {hasChildren && (
            <span className="ml-auto text-[9px] text-muted-foreground/30 shrink-0">{childCount}</span>
          )}
        </div>
        <Handle type="target" position={Position.Top}
          className="!w-1 !h-1 !bg-transparent !border-0 !min-w-0" />
        <Handle type="source" position={Position.Bottom}
          className="!w-1 !h-1 !bg-transparent !border-0 !min-w-0" />
      </div>
    )
  }

  const isEdited = node.props?._edited === 'true'

  return (
    <div
      className="relative overflow-hidden shadow-lg transition-all duration-150 select-none cursor-pointer"
      style={{
        width: 200,
        background: selected ? style.bg : 'hsl(222,47%,9%)',
        border: `1.5px solid ${selected ? style.border : 'hsl(216,34%,20%)'}`,
        borderLeft: `3px solid ${style.border}`,
        boxShadow: selected
          ? `0 0 0 2px ${style.border}55, 0 8px 24px rgba(0,0,0,0.5)`
          : '0 2px 8px rgba(0,0,0,0.3)',
      }}
    >
      {/* Top color bar */}
      <div className="h-0.5 w-full" style={{ background: style.border }} />
      {/* Edited indicator */}
      {isEdited && (
        <div className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-amber-400 shadow-[0_0_4px_rgba(251,191,36,0.8)]" title="Node has been edited" />
      )}

      <div className="px-3 py-2.5">
        {/* Category row */}
        <div className="flex items-center gap-1.5 mb-1">
          <span className={`w-1.5 h-1.5 shrink-0 ${style.dot}`} />
          <span className={`text-[10px] font-bold uppercase tracking-widest leading-none ${style.label}`}>
            {node.category}
          </span>
          {node.line != null && node.line > 0 && (
            <span className="ml-auto text-[10px] text-muted-foreground/40 font-mono">
              :{node.line}
            </span>
          )}
        </div>

        {/* Primary label */}
        <p className="text-xs font-semibold font-mono truncate leading-tight" style={{ color: style.border }}>
          {node.name || node.value || node.type}
        </p>

        {/* Secondary — AST type */}
        {(node.name || node.value) && (
          <p className="text-[10px] text-muted-foreground/50 font-mono truncate mt-0.5">
            {node.type}
          </p>
        )}

        {/* Expand indicator — click to toggle inline children */}
        {hasChildren && !isRoot && (
          <div
            onClick={(e) => { e.stopPropagation(); toggleExpand(id) }}
            className="flex items-center gap-1 mt-1.5 text-[10px] font-medium cursor-pointer hover:opacity-80"
            style={{ color: isExpanded ? style.border : 'hsl(215,20%,50%)' }}
          >
            {isExpanded
              ? <><ChevronDown size={10} /><span>{childCount} children</span></>
              : <><ChevronRight size={10} /><span>{childCount} — expand</span></>
            }
          </div>
        )}

        {isRoot && (
          <div className="flex items-center gap-1 mt-1.5 text-[10px] text-muted-foreground/40">
            <Minus size={10} />
            <span>file root</span>
          </div>
        )}
      </div>

      <Handle type="target" position={Position.Top}
        className="!w-1.5 !h-1.5 !bg-transparent !border-0 !min-w-0" />
      <Handle type="source" position={Position.Bottom}
        className="!w-1.5 !h-1.5 !bg-transparent !border-0 !min-w-0" />
    </div>
  )
}

export const astNodeTypes = { astNode: memo(ASTNodeComponent) }
