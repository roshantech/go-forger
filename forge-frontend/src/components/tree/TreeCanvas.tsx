import { useMemo, useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
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
import { useFileTreeStore, getVisibleIds, type FTreeItem } from '@/store/fileTreeStore'
import { useASTViewerStore } from '@/store/astViewerStore'
import { astApi } from '@/lib/api'
import { RootNode }   from './RootNode'
import { FolderNode } from './FolderNode'
import { FileNode }   from './FileNode'
import { getLanguageFromPath } from '@/lib/utils'
import toast from 'react-hot-toast'

const NODE_TYPES = {
  rootNode:   RootNode,
  folderNode: FolderNode,
  fileNode:   FileNode,
}

const ROOT_W = 200
const FOLD_W = 172
const FILE_W = 152
const NODE_H = 48

function nodeWidth(type: FTreeItem['type']) {
  if (type === 'root')   return ROOT_W
  if (type === 'folder') return FOLD_W
  return FILE_W
}

function applyLayout(nodes: Node[], edges: Edge[]): Node[] {
  const g = new dagre.graphlib.Graph()
  g.setDefaultEdgeLabel(() => ({}))
  g.setGraph({ rankdir: 'TB', nodesep: 36, ranksep: 56 })
  for (const n of nodes) {
    const item = n.data as { itemType: FTreeItem['type'] }
    g.setNode(n.id, { width: nodeWidth(item.itemType), height: NODE_H })
  }
  for (const e of edges) g.setEdge(e.source, e.target)
  dagre.layout(g)
  return nodes.map((n) => {
    const pos  = g.node(n.id)
    const item = n.data as { itemType: FTreeItem['type'] }
    const w    = nodeWidth(item.itemType)
    return { ...n, position: { x: pos.x - w / 2, y: pos.y - NODE_H / 2 }, width: w, height: NODE_H }
  })
}

function buildFlow(
  items: Record<string, FTreeItem>,
  visibleIds: string[],
  expandedIds: Set<string>,
  selectedFileId: string | null,
  loadingFileId: string | null,
  onToggle: (id: string) => void,
  onSelect: (id: string) => void,
  onOpenAST: (id: string) => void,
): { nodes: Node[]; edges: Edge[] } {
  const visSet     = new Set(visibleIds)
  const totalFiles = Object.values(items).filter(i => i.type === 'file').length

  const nodes: Node[] = visibleIds.map((id) => {
    const item = items[id]
    if (!item) return null as unknown as Node

    if (item.type === 'root') {
      return {
        id, type: 'rootNode', position: { x: 0, y: 0 },
        data: { itemType: 'root', name: item.name, language: item.language ?? 'go', fileCount: totalFiles },
      }
    }

    if (item.type === 'folder') {
      return {
        id, type: 'folderNode', position: { x: 0, y: 0 },
        data: {
          itemType: 'folder', name: item.name,
          isExpanded: expandedIds.has(id),
          childCount: item.children?.length ?? 0,
          onToggle: () => onToggle(id),
        },
      }
    }

    const lang = getLanguageFromPath(item.name)
    return {
      id, type: 'fileNode', position: { x: 0, y: 0 },
      data: {
        itemType: 'file', name: item.name, language: lang,
        isSelected: selectedFileId === id,
        isGoFile: lang === 'go',
        isLoading: loadingFileId === id,
        onSelect:  () => onSelect(id),
        onOpenAST: () => onOpenAST(id),
      },
    }
  }).filter(Boolean)

  const edges: Edge[] = []
  for (const id of visibleIds) {
    const item = items[id]
    if (!item) continue
    if ((item.type === 'root' || item.type === 'folder') && expandedIds.has(id)) {
      for (const childId of item.children ?? []) {
        if (visSet.has(childId)) {
          edges.push({
            id: `e-${id}-${childId}`, source: id, target: childId,
            type: 'smoothstep',
            style: { stroke: 'var(--border-default)', strokeWidth: 1.5 },
          })
        }
      }
    }
  }

  return { nodes: applyLayout(nodes, edges), edges }
}

export default function TreeCanvas() {
  const navigate = useNavigate()
  const { items, expandedIds, selectedFileId, toggleFolder, selectFile } = useFileTreeStore()
  const { openFile } = useASTViewerStore()
  const [loadingFileId, setLoadingFileId] = useState<string | null>(null)

  const visibleIds = useMemo(
    () => getVisibleIds(items, expandedIds),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [items, Array.from(expandedIds).join(',')]
  )

  // When a .go file is clicked: parse AST then navigate to /ast
  const handleOpenAST = useCallback(async (id: string) => {
    const item = items[id]
    if (!item || item.type !== 'file') return
    if (loadingFileId) return // prevent double-click during load

    if (item.content == null) {
      toast('No content available — re-import the project', { icon: 'ℹ️' })
      return
    }

    console.log('[TreeCanvas] opening AST for:', item.name, '| content length:', item.content.length)
    setLoadingFileId(id)
    try {
      const [treeRes, inspectRes] = await Promise.all([
        astApi.treeRaw(item.name, item.content),
        astApi.inspectRaw(item.name, item.content),
      ])
      openFile(treeRes.data, inspectRes.data, item.content, item.name)
      navigate('/ast')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      console.error('[TreeCanvas] AST parse failed:', err)
      toast.error(msg ?? 'Failed to parse ' + item.name)
    } finally {
      setLoadingFileId(null)
    }
  }, [items, loadingFileId, openFile, navigate])

  const { nodes, edges } = useMemo(
    () => buildFlow(items, visibleIds, expandedIds, selectedFileId, loadingFileId, toggleFolder, selectFile, handleOpenAST),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [visibleIds, selectedFileId, loadingFileId, Array.from(expandedIds).join(','), handleOpenAST]
  )

  const handlePaneClick = useCallback(() => selectFile(null), [selectFile])

  return (
    <div style={{ width: '100%', height: '100%', background: 'var(--bg-base)' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={NODE_TYPES}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.15}
        maxZoom={2.5}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={true}
        proOptions={{ hideAttribution: true }}
        onPaneClick={handlePaneClick}
      >
        <Background variant={BackgroundVariant.Dots} gap={24} size={1} color="var(--border-subtle)" />
        <Controls showInteractive={false} />
        <MiniMap
          nodeColor={(n) => {
            const t = (n.data as { itemType?: string }).itemType
            if (t === 'root')   return 'hsl(216,80%,50%)'
            if (t === 'folder') return 'hsl(216,34%,30%)'
            return 'hsl(216,34%,22%)'
          }}
          nodeStrokeColor={(n) => {
            const t = (n.data as { itemType?: string }).itemType
            if (t === 'root')   return 'hsl(216,80%,70%)'
            if (t === 'folder') return 'hsl(216,34%,45%)'
            return 'hsl(216,34%,35%)'
          }}
          nodeStrokeWidth={3}
          pannable
          zoomable
          maskColor="rgba(10,10,15,0.75)"
          style={{ background: 'hsl(222,47%,6%)', border: '1px solid hsl(216,34%,18%)', borderRadius: 8 }}
        />
      </ReactFlow>
    </div>
  )
}
