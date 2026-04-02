import { useMemo } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  BackgroundVariant,
  type Node,
  type Edge,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import dagre from 'dagre'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { FileCode, Hash, X } from 'lucide-react'
import { useUsageStore } from '@/store/usageStore'
import type { UsageGraphNode } from '@/lib/api'

// ─── Node dimensions ──────────────────────────────────────────
const SYMBOL_W = 200
const SYMBOL_H = 64
const FILE_W   = 180
const FILE_H   = 52

// ─── Symbol node ──────────────────────────────────────────────
function SymbolNode({ data }: NodeProps) {
  const d = data as { label: string; usageCount: number }
  return (
    <>
      <Handle type="target" position={Position.Top} style={{ opacity: 0, pointerEvents: 'none' }} />
      <div style={{
        width: SYMBOL_W,
        background: 'rgba(45,212,191,0.08)',
        border: '2px solid rgba(45,212,191,0.7)',
        borderRadius: 8,
        padding: '10px 14px',
        boxShadow: '0 0 16px rgba(45,212,191,0.15)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
          <Hash size={11} style={{ color: 'rgba(45,212,191,0.8)', flexShrink: 0 }} />
          <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(45,212,191,0.7)' }}>
            Symbol
          </span>
        </div>
        <p style={{ fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-mono)', color: 'rgba(45,212,191,1)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {d.label}
        </p>
        <p style={{ fontSize: 10, color: 'rgba(45,212,191,0.5)', margin: '4px 0 0', fontFamily: 'var(--font-mono)' }}>
          {d.usageCount} reference{d.usageCount !== 1 ? 's' : ''}
        </p>
      </div>
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0, pointerEvents: 'none' }} />
    </>
  )
}

// ─── File node ────────────────────────────────────────────────
function FileUsageNode({ data }: NodeProps) {
  const d = data as { label: string; lines: number[] }
  return (
    <>
      <Handle type="target" position={Position.Top} style={{ opacity: 0, pointerEvents: 'none' }} />
      <div style={{
        width: FILE_W,
        background: 'hsl(222,47%,10%)',
        border: '1px solid hsl(216,34%,22%)',
        borderLeft: '3px solid rgba(45,212,191,0.5)',
        borderRadius: 6,
        padding: '8px 10px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3 }}>
          <FileCode size={10} style={{ color: 'rgba(45,212,191,0.6)', flexShrink: 0 }} />
          <span style={{
            fontSize: 11, fontFamily: 'var(--font-mono)', fontWeight: 500,
            color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {d.label}
          </span>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
          {d.lines.map(ln => (
            <span key={ln} style={{
              fontSize: 9, fontFamily: 'var(--font-mono)', fontWeight: 600,
              color: 'rgba(45,212,191,0.8)', background: 'rgba(45,212,191,0.08)',
              padding: '1px 4px', borderRadius: 3,
            }}>
              L{ln}
            </span>
          ))}
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0, pointerEvents: 'none' }} />
    </>
  )
}

const NODE_TYPES = { symbolNode: SymbolNode, fileNode: FileUsageNode }

// ─── Dagre layout ─────────────────────────────────────────────
function applyLayout(nodes: Node[], edges: Edge[]): Node[] {
  const g = new dagre.graphlib.Graph()
  g.setDefaultEdgeLabel(() => ({}))
  g.setGraph({ rankdir: 'TB', nodesep: 50, ranksep: 80, marginx: 30, marginy: 30 })

  for (const n of nodes) {
    const w = n.type === 'symbolNode' ? SYMBOL_W : FILE_W
    const h = n.type === 'symbolNode' ? SYMBOL_H : FILE_H
    g.setNode(n.id, { width: w, height: h })
  }
  for (const e of edges) g.setEdge(e.source, e.target)
  dagre.layout(g)

  return nodes.map(n => {
    const pos = g.node(n.id)
    const w = n.type === 'symbolNode' ? SYMBOL_W : FILE_W
    const h = n.type === 'symbolNode' ? SYMBOL_H : FILE_H
    return { ...n, position: { x: pos.x - w / 2, y: pos.y - h / 2 }, width: w, height: h }
  })
}

// ─── Main component ───────────────────────────────────────────
export default function UsageFlowCanvas() {
  const { data, symbol, usages, clear } = useUsageStore(s => ({
    data: s.data,
    symbol: s.symbol,
    usages: s.data?.usages ?? [],
    clear: s.clear,
  }))

  // Build lines-per-file lookup from raw usages
  const linesByFile = useMemo(() => {
    const map: Record<string, number[]> = {}
    for (const u of usages) {
      if (!map[u.file]) map[u.file] = []
      map[u.file].push(u.line)
    }
    return map
  }, [usages])

  const { nodes: layoutNodes, edges: layoutEdges } = useMemo(() => {
    if (!data) return { nodes: [], edges: [] }

    const rawNodes: Node[] = data.nodes.map((n: UsageGraphNode) => ({
      id: n.id,
      type: n.type === 'symbol' ? 'symbolNode' : 'fileNode',
      position: { x: 0, y: 0 },
      data: n.type === 'symbol'
        ? { label: n.label, usageCount: data.usages.length }
        : { label: n.label, lines: linesByFile['file-' + n.id.replace(/^file-/, '')] ?? linesByFile[n.id.replace(/^file-/, '')] ?? [] },
    }))

    const rawEdges: Edge[] = data.edges.map(e => ({
      id: e.id,
      source: e.source,
      target: e.target,
      type: 'smoothstep',
      style: { stroke: 'rgba(45,212,191,0.4)', strokeWidth: 1.5 },
    }))

    return { nodes: applyLayout(rawNodes, rawEdges), edges: rawEdges }
  }, [data, linesByFile])

  if (!data) return null

  // Empty state — no usages found
  if (data.usages.length === 0) {
    return (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
          background: 'rgba(45,212,191,0.04)', border: '1px solid rgba(45,212,191,0.15)',
          borderRadius: 10, padding: '28px 40px',
        }}>
          <Hash size={28} style={{ color: 'rgba(45,212,191,0.3)' }} />
          <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
            No usages found
          </p>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', margin: 0, fontFamily: 'var(--font-mono)' }}>
            <strong style={{ color: 'rgba(45,212,191,0.7)' }}>{symbol}</strong> is not referenced in any project file
          </p>
          <button
            onClick={clear}
            style={{
              marginTop: 8, display: 'flex', alignItems: 'center', gap: 6,
              padding: '5px 14px', borderRadius: 6, border: '1px solid rgba(45,212,191,0.25)',
              background: 'rgba(45,212,191,0.06)', color: 'rgba(45,212,191,0.8)',
              fontSize: 11, cursor: 'pointer', fontFamily: 'var(--font-mono)',
            }}
          >
            <X size={11} /> Back to AST
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      {/* Usage mode banner */}
      <div style={{
        position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)',
        zIndex: 10, display: 'flex', alignItems: 'center', gap: 8,
        background: 'rgba(45,212,191,0.08)', border: '1px solid rgba(45,212,191,0.3)',
        borderRadius: 20, padding: '4px 14px',
        fontSize: 11, color: 'rgba(45,212,191,0.9)', fontFamily: 'var(--font-mono)',
        pointerEvents: 'none',
      }}>
        <Hash size={10} />
        <span>usages of <strong>{symbol}</strong> — {data.usages.length} reference{data.usages.length !== 1 ? 's' : ''} in {Object.keys(linesByFile).length} file{Object.keys(linesByFile).length !== 1 ? 's' : ''}</span>
      </div>

      <ReactFlow
        nodes={layoutNodes}
        edges={layoutEdges}
        nodeTypes={NODE_TYPES}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        proOptions={{ hideAttribution: true }}
        minZoom={0.1}
        maxZoom={2}
      >
        <Background variant={BackgroundVariant.Dots} gap={24} size={1} color="hsl(216,34%,13%)" />
        <Controls />
        <MiniMap
          nodeColor={n => n.type === 'symbolNode' ? 'rgba(45,212,191,0.8)' : 'hsl(216,34%,30%)'}
          nodeStrokeColor={n => n.type === 'symbolNode' ? 'rgba(45,212,191,1)' : 'hsl(216,34%,40%)'}
          nodeStrokeWidth={3}
          pannable
          zoomable
          maskColor="rgba(10,15,28,0.6)"
          style={{ background: 'hsl(222,47%,6%)', border: '1px solid hsl(216,34%,18%)', borderRadius: 6 }}
        />
      </ReactFlow>
    </div>
  )
}
