import { useEffect, useMemo, useCallback, useRef } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  BackgroundVariant,
  ConnectionLineType,
  useReactFlow,
  MarkerType,
  type NodeMouseHandler,
  type Connection,
  type NodeChange,
  type EdgeChange,
  type Node,
  type Edge,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { astNodeTypes, CATEGORY_COLORS } from './ASTNode'
import { useASTViewerStore, useActiveTab } from '@/store/astViewerStore'
import { treeToGraph } from '@/lib/astToGraph'
import { applyDagreLayout } from '@/lib/dagreLayout'
import type { ASTFlowNodeData } from '@/lib/astToGraph'

const SUMMARY_HIDDEN = new Set(['expression', 'identifier', 'literal', 'other'])
const FULL_HIDDEN = new Set<string>()

export default function ASTFlowCanvas() {
  const activeTab = useActiveTab()
  const {
    selectedNodeId,
    selectNode,
    focusPush,
    addCustomNode,
    removeCustomNode,
    updateCustomNodePosition,
    addCustomEdge,
    removeEdge,
    hideNode,
  } = useASTViewerStore()
  const { fitView, screenToFlowPosition } = useReactFlow()

  // Current display root: last item in focus stack, or the file root
  const focusRootId = activeTab
    ? (activeTab.focusStack.at(-1) ?? activeTab.tree.id)
    : null

  // Re-fit only when the display root actually changes (tab switch or drill-down)
  const lastFocusKey = useRef('')
  useEffect(() => {
    const key = `${activeTab?.id}-${focusRootId}`
    if (key === lastFocusKey.current) return
    lastFocusKey.current = key
    const t = setTimeout(() => fitView({ padding: 0.15, duration: 350 }), 80)
    return () => clearTimeout(t)
  }, [activeTab?.id, focusRootId, fitView])

  const { nodes: layoutNodes, treeEdges } = useMemo(() => {
    if (!activeTab || !focusRootId) return { nodes: [], treeEdges: [] }

    const hiddenCategories = activeTab.viewDensity === 'full' ? FULL_HIDDEN : SUMMARY_HIDDEN

    const raw = treeToGraph(
      activeTab.nodeMap,
      focusRootId,
      activeTab.expandedNodeIds,
      activeTab.maxDepth,
      activeTab.customNodes,
      hiddenCategories,
    )

    const customIds = new Set(activeTab.customNodes.keys())
    const visible = raw.nodes.filter(n => !activeTab.hiddenNodeIds.has(n.id))
    const visEdges = raw.edges.filter(
      e => !activeTab.hiddenNodeIds.has(e.source) && !activeTab.hiddenNodeIds.has(e.target),
    )

    const treeNodes = visible.filter(n => !customIds.has(n.id))
    const customList = visible.filter(n => customIds.has(n.id))
    const laid = applyDagreLayout(treeNodes, visEdges, 'TB')

    return { nodes: [...laid, ...customList], treeEdges: visEdges }
  }, [activeTab, focusRootId])

  // Single click: select node (shows sidebar details)
  const onNodeClick: NodeMouseHandler = useCallback(
    (_, node) => { selectNode(node.id) },
    [selectNode],
  )

  // Double click: drill into node if it has children
  const onNodeDoubleClick: NodeMouseHandler = useCallback(
    (_, node) => {
      const d = node.data as ASTFlowNodeData
      if (d.hasChildren && node.id !== focusRootId) focusPush(node.id)
    },
    [focusPush, focusRootId],
  )

  const onPaneClick = useCallback(() => selectNode(null), [selectNode])

  // Palette → canvas drop
  const onDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      const raw = e.dataTransfer.getData('application/ast-node')
      if (!raw) return
      try {
        const node = JSON.parse(raw)
        const position = screenToFlowPosition({ x: e.clientX, y: e.clientY })
        addCustomNode(node, position)
      } catch { /* ignore */ }
    },
    [screenToFlowPosition, addCustomNode],
  )

  const onDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
  }, [])

  // Persist drag positions for custom nodes only
  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      if (!activeTab) return
      for (const c of changes) {
        if (c.type === 'position' && !c.dragging && c.position && activeTab.customNodes.has(c.id)) {
          updateCustomNodePosition(c.id, c.position)
        }
      }
    },
    [activeTab, updateCustomNodePosition],
  )

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      for (const c of changes) {
        if (c.type === 'remove') removeEdge(c.id)
      }
    },
    [removeEdge],
  )

  const onConnect = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target) return
      const edge: Edge = {
        id: `ue-${Date.now()}`,
        source: connection.source,
        sourceHandle: connection.sourceHandle ?? undefined,
        target: connection.target,
        targetHandle: connection.targetHandle ?? undefined,
        type: 'smoothstep',
        style: { stroke: '#6366f1', strokeWidth: 1.5, strokeDasharray: '5 3' },
        markerEnd: { type: MarkerType.ArrowClosed, color: '#6366f1', width: 12, height: 12 },
      }
      addCustomEdge(edge)
    },
    [addCustomEdge],
  )

  const onNodesDelete = useCallback(
    (deleted: Node[]) => {
      if (!activeTab) return
      for (const n of deleted) {
        if (activeTab.customNodes.has(n.id)) removeCustomNode(n.id)
        else hideNode(n.id)
      }
    },
    [activeTab, removeCustomNode, hideNode],
  )

  const onEdgesDelete = useCallback(
    (deleted: Edge[]) => { for (const e of deleted) removeEdge(e.id) },
    [removeEdge],
  )

  const allEdges = useMemo(
    () => [...treeEdges, ...(activeTab?.customEdges ?? [])],
    [treeEdges, activeTab?.customEdges],
  )

  const styledNodes = useMemo(
    () => layoutNodes.map(n => ({ ...n, selected: n.id === selectedNodeId })),
    [layoutNodes, selectedNodeId],
  )

  if (!activeTab) return null

  return (
    <ReactFlow
      nodes={styledNodes}
      edges={allEdges}
      nodeTypes={astNodeTypes}
      onNodeClick={onNodeClick}
      onNodeDoubleClick={onNodeDoubleClick}
      onPaneClick={onPaneClick}
      onDrop={onDrop}
      onDragOver={onDragOver}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
      onNodesDelete={onNodesDelete}
      onEdgesDelete={onEdgesDelete}
      deleteKeyCode={['Delete', 'Backspace']}
      minZoom={0.05}
      maxZoom={2.5}
      fitView
      nodesDraggable
      nodesConnectable
      elementsSelectable
      connectionLineStyle={{ stroke: '#6366f1', strokeWidth: 1.5, strokeDasharray: '5 3' }}
      connectionLineType={ConnectionLineType.SmoothStep}
    >
      <Background variant={BackgroundVariant.Dots} gap={24} size={1} color="hsl(216,34%,13%)" />
      <Controls />
      <MiniMap
        nodeColor={n => {
          const cat = (n.data as ASTFlowNodeData)?.node?.category ?? 'other'
          return CATEGORY_COLORS[cat]?.border ?? '#6b7280'
        }}
        maskColor="rgba(10,15,28,0.75)"
        style={{ background: 'hsl(222,47%,8%)', border: '1px solid hsl(216,34%,15%)' }}
      />
    </ReactFlow>
  )
}
