import { create } from 'zustand'
import type { Edge } from '@xyflow/react'
import type { TreeNode, FileInspection } from '@/lib/api'
import { buildNodeMap } from '@/lib/astToGraph'

export type ViewMode = 'flow' | 'code'
export type ViewDensity = 'summary' | 'full'

export interface CustomNodeEntry {
  node: TreeNode
  position: { x: number; y: number }
}

export interface TabState {
  id: string
  fileName: string
  tree: TreeNode
  nodeMap: Map<string, TreeNode>
  inspection: FileInspection
  sourceCode: string
  expandedNodeIds: Set<string>
  customNodes: Map<string, CustomNodeEntry>
  customEdges: Edge[]
  hiddenNodeIds: Set<string>
  /** Drill-down stack — last entry is the current display root */
  focusStack: string[]
  viewMode: ViewMode
  maxDepth: number
  viewDensity: ViewDensity
}

interface ASTViewerStore {
  tabs: TabState[]
  activeTabId: string | null
  selectedNodeId: string | null

  // Tab management
  openFile: (tree: TreeNode, inspection: FileInspection, source: string, fileName: string) => void
  updateActiveTab: (tree: TreeNode, inspection: FileInspection, source: string) => void
  closeTab: (id: string) => void
  switchTab: (id: string) => void

  // Per-active-tab mutations
  toggleExpand: (id: string) => void
  setViewMode: (m: ViewMode) => void
  setViewDensity: (d: ViewDensity) => void
  setMaxDepth: (d: number) => void
  addCustomNode: (node: TreeNode, position: { x: number; y: number }) => void
  removeCustomNode: (id: string) => void
  updateCustomNodePosition: (id: string, position: { x: number; y: number }) => void
  addCustomEdge: (edge: Edge) => void
  removeEdge: (id: string) => void
  hideNode: (id: string) => void

  // Drill-down navigation
  focusPush: (nodeId: string) => void
  focusPop: () => void
  focusTo: (depth: number) => void

  // Node editing
  updateNode: (nodeId: string, patch: Partial<Pick<TreeNode, 'name' | 'value' | 'props' | 'type' | 'category'>>) => void
  addChildNode: (parentId: string, child: TreeNode) => void
  removeChildNode: (parentId: string, childId: string) => void
  duplicateNode: (nodeId: string) => void

  selectNode: (id: string | null) => void
  clear: () => void
}

function makeTab(
  id: string,
  tree: TreeNode,
  inspection: FileInspection,
  source: string,
  fileName: string,
  viewMode: ViewMode = 'flow',
): TabState {
  return {
    id, fileName, tree,
    nodeMap: buildNodeMap(tree),
    inspection,
    sourceCode: source,
    expandedNodeIds: new Set(),
    customNodes: new Map(),
    customEdges: [],
    hiddenNodeIds: new Set(),
    focusStack: [],
    viewMode,
    maxDepth: 1,
    viewDensity: 'summary',
  }
}

function applyPatch(
  tabs: TabState[],
  id: string | null,
  p: Partial<TabState>,
): TabState[] {
  if (!id) return tabs
  return tabs.map(t => (t.id === id ? { ...t, ...p } : t))
}

export const useASTViewerStore = create<ASTViewerStore>((set, get) => ({
  tabs: [],
  activeTabId: null,
  selectedNodeId: null,

  openFile: (tree, inspection, source, fileName) => {
    const { tabs } = get()
    const existing = tabs.find(t => t.fileName === fileName)
    if (existing) {
      // Re-use the tab, preserve view mode
      const updated = makeTab(existing.id, tree, inspection, source, fileName, existing.viewMode)
      set({ tabs: tabs.map(t => (t.id === existing.id ? updated : t)), activeTabId: existing.id, selectedNodeId: null })
    } else {
      const id = `tab-${Date.now()}`
      set({ tabs: [...tabs, makeTab(id, tree, inspection, source, fileName)], activeTabId: id, selectedNodeId: null })
    }
  },

  updateActiveTab: (tree, inspection, source) => {
    const { tabs, activeTabId } = get()
    const tab = tabs.find(t => t.id === activeTabId)
    if (!tab) return
    const newNodeMap = buildNodeMap(tree)
    // Validate focusStack against new nodeMap — truncate at first stale id
    const validStack: string[] = []
    for (const id of tab.focusStack) {
      if (newNodeMap.has(id)) validStack.push(id)
      else break
    }
    set({ tabs: applyPatch(tabs, activeTabId, { tree, nodeMap: newNodeMap, inspection, sourceCode: source, focusStack: validStack }) })
  },

  closeTab: (id) => {
    const { tabs, activeTabId } = get()
    const remaining = tabs.filter(t => t.id !== id)
    let nextId = activeTabId
    if (activeTabId === id) {
      const idx = tabs.findIndex(t => t.id === id)
      nextId = remaining[Math.max(0, idx - 1)]?.id ?? null
    }
    set({ tabs: remaining, activeTabId: nextId, selectedNodeId: null })
  },

  switchTab: (id) => set({ activeTabId: id, selectedNodeId: null }),

  toggleExpand: (id) => {
    const { tabs, activeTabId } = get()
    const tab = tabs.find(t => t.id === activeTabId)
    if (!tab) return
    const node = tab.nodeMap.get(id)
    if (!node || !node.children?.length) return
    const next = new Set(tab.expandedNodeIds)
    if (next.has(id)) next.delete(id); else next.add(id)
    set({ tabs: applyPatch(tabs, activeTabId, { expandedNodeIds: next }) })
  },

  setViewMode: (m) => {
    const { tabs, activeTabId } = get()
    set({ tabs: applyPatch(tabs, activeTabId, { viewMode: m }) })
  },

  setViewDensity: (d) => {
    const { tabs, activeTabId } = get()
    set({ tabs: applyPatch(tabs, activeTabId, { viewDensity: d }) })
  },

  setMaxDepth: (d) => {
    const { tabs, activeTabId } = get()
    set({ tabs: applyPatch(tabs, activeTabId, { maxDepth: Math.max(0, d) }) })
  },

  addCustomNode: (node, position) => {
    const { tabs, activeTabId } = get()
    const tab = tabs.find(t => t.id === activeTabId)
    if (!tab) return
    const nextC = new Map(tab.customNodes)
    nextC.set(node.id, { node, position })
    const nextM = new Map(tab.nodeMap)
    nextM.set(node.id, node)
    set({ tabs: applyPatch(tabs, activeTabId, { customNodes: nextC, nodeMap: nextM }) })
  },

  removeCustomNode: (id) => {
    const { tabs, activeTabId, selectedNodeId } = get()
    const tab = tabs.find(t => t.id === activeTabId)
    if (!tab) return
    const nextC = new Map(tab.customNodes)
    nextC.delete(id)
    const nextE = tab.customEdges.filter(e => e.source !== id && e.target !== id)
    set({ tabs: applyPatch(tabs, activeTabId, { customNodes: nextC, customEdges: nextE }), selectedNodeId: selectedNodeId === id ? null : selectedNodeId })
  },

  updateCustomNodePosition: (id, position) => {
    const { tabs, activeTabId } = get()
    const tab = tabs.find(t => t.id === activeTabId)
    if (!tab) return
    const entry = tab.customNodes.get(id)
    if (!entry) return
    const next = new Map(tab.customNodes)
    next.set(id, { ...entry, position })
    set({ tabs: applyPatch(tabs, activeTabId, { customNodes: next }) })
  },

  addCustomEdge: (edge) => {
    const { tabs, activeTabId } = get()
    const tab = tabs.find(t => t.id === activeTabId)
    if (!tab) return
    set({ tabs: applyPatch(tabs, activeTabId, { customEdges: [...tab.customEdges, edge] }) })
  },

  removeEdge: (id) => {
    const { tabs, activeTabId } = get()
    const tab = tabs.find(t => t.id === activeTabId)
    if (!tab) return
    set({ tabs: applyPatch(tabs, activeTabId, { customEdges: tab.customEdges.filter(e => e.id !== id) }) })
  },

  hideNode: (id) => {
    const { tabs, activeTabId, selectedNodeId } = get()
    const tab = tabs.find(t => t.id === activeTabId)
    if (!tab) return
    const nextH = new Set(tab.hiddenNodeIds)
    nextH.add(id)
    const nextE = tab.customEdges.filter(e => e.source !== id && e.target !== id)
    set({ tabs: applyPatch(tabs, activeTabId, { hiddenNodeIds: nextH, customEdges: nextE }), selectedNodeId: selectedNodeId === id ? null : selectedNodeId })
  },

  focusPush: (nodeId) => {
    const { tabs, activeTabId } = get()
    const tab = tabs.find(t => t.id === activeTabId)
    if (!tab) return
    const nextStack = [...tab.focusStack, nodeId]
    set({ tabs: applyPatch(tabs, activeTabId, { focusStack: nextStack, expandedNodeIds: new Set() }), selectedNodeId: nodeId })
  },

  focusPop: () => {
    const { tabs, activeTabId } = get()
    const tab = tabs.find(t => t.id === activeTabId)
    if (!tab || tab.focusStack.length === 0) return
    const nextStack = tab.focusStack.slice(0, -1)
    set({ tabs: applyPatch(tabs, activeTabId, { focusStack: nextStack, expandedNodeIds: new Set() }), selectedNodeId: nextStack.at(-1) ?? null })
  },

  focusTo: (depth) => {
    const { tabs, activeTabId } = get()
    const tab = tabs.find(t => t.id === activeTabId)
    if (!tab) return
    const nextStack = tab.focusStack.slice(0, depth)
    set({ tabs: applyPatch(tabs, activeTabId, { focusStack: nextStack, expandedNodeIds: new Set() }), selectedNodeId: nextStack.at(-1) ?? null })
  },

  updateNode: (nodeId, patch) => {
    const { tabs, activeTabId } = get()
    const tab = tabs.find(t => t.id === activeTabId)
    if (!tab) return
    const existing = tab.nodeMap.get(nodeId)
    if (!existing) return
    const updated: TreeNode = {
      ...existing,
      ...patch,
      props: { ...existing.props, ...patch.props, _edited: 'true' },
    }
    const nextMap = new Map(tab.nodeMap)
    nextMap.set(nodeId, updated)
    // Also patch the node inside the tree structure (mutate children reference)
    const patchInTree = (n: TreeNode): TreeNode => {
      if (n.id === nodeId) return updated
      if (!n.children?.length) return n
      const newChildren = n.children.map(patchInTree)
      // Only create a new node object if something actually changed
      const changed = newChildren.some((c, i) => c !== n.children![i])
      return changed ? { ...n, children: newChildren } : n
    }
    const nextTree = patchInTree(tab.tree)
    set({ tabs: applyPatch(tabs, activeTabId, { nodeMap: nextMap, tree: nextTree }) })
  },

  addChildNode: (parentId, child) => {
    const { tabs, activeTabId } = get()
    const tab = tabs.find(t => t.id === activeTabId)
    if (!tab) return
    const parent = tab.nodeMap.get(parentId)
    if (!parent) return
    // Register child (and its subtree) in nodeMap
    const nextMap = new Map(tab.nodeMap)
    const registerAll = (n: TreeNode) => {
      nextMap.set(n.id, n)
      n.children?.forEach(registerAll)
    }
    registerAll(child)
    // Attach child to parent
    const updatedParent: TreeNode = { ...parent, children: [...(parent.children ?? []), child] }
    nextMap.set(parentId, updatedParent)
    // Patch tree
    const patchInTree = (n: TreeNode): TreeNode => {
      if (n.id === parentId) return updatedParent
      if (!n.children?.length) return n
      const newChildren = n.children.map(patchInTree)
      const changed = newChildren.some((c, i) => c !== n.children![i])
      return changed ? { ...n, children: newChildren } : n
    }
    const nextTree = patchInTree(tab.tree)
    set({ tabs: applyPatch(tabs, activeTabId, { nodeMap: nextMap, tree: nextTree }) })
  },

  removeChildNode: (parentId, childId) => {
    const { tabs, activeTabId, selectedNodeId } = get()
    const tab = tabs.find(t => t.id === activeTabId)
    if (!tab) return
    const parent = tab.nodeMap.get(parentId)
    if (!parent) return
    const nextMap = new Map(tab.nodeMap)
    // Remove child and all its descendants from nodeMap
    const removeAll = (n: TreeNode) => {
      nextMap.delete(n.id)
      n.children?.forEach(removeAll)
    }
    const childNode = tab.nodeMap.get(childId)
    if (childNode) removeAll(childNode)
    // Detach from parent
    const updatedParent: TreeNode = { ...parent, children: parent.children?.filter(c => c.id !== childId) ?? [] }
    nextMap.set(parentId, updatedParent)
    // Patch tree
    const patchInTree = (n: TreeNode): TreeNode => {
      if (n.id === parentId) return updatedParent
      if (!n.children?.length) return n
      const newChildren = n.children.map(patchInTree)
      const changed = newChildren.some((c, i) => c !== n.children![i])
      return changed ? { ...n, children: newChildren } : n
    }
    const nextTree = patchInTree(tab.tree)
    set({
      tabs: applyPatch(tabs, activeTabId, { nodeMap: nextMap, tree: nextTree }),
      selectedNodeId: selectedNodeId === childId ? null : selectedNodeId,
    })
  },

  duplicateNode: (nodeId) => {
    const { tabs, activeTabId } = get()
    const tab = tabs.find(t => t.id === activeTabId)
    if (!tab) return
    const node = tab.nodeMap.get(nodeId)
    if (!node) return
    const cloned = deepCloneWithNewIds(node)
    const nextC = new Map(tab.customNodes)
    nextC.set(cloned.id, { node: cloned, position: { x: 80 + Math.random() * 160, y: 80 + Math.random() * 160 } })
    const nextMap = new Map(tab.nodeMap)
    const registerAll = (n: TreeNode) => { nextMap.set(n.id, n); n.children?.forEach(registerAll) }
    registerAll(cloned)
    set({ tabs: applyPatch(tabs, activeTabId, { customNodes: nextC, nodeMap: nextMap }) })
  },

  selectNode: (id) => set({ selectedNodeId: id }),
  clear: () => set({ tabs: [], activeTabId: null, selectedNodeId: null }),
}))

function deepCloneWithNewIds(node: TreeNode): TreeNode {
  return {
    ...node,
    id: crypto.randomUUID(),
    children: node.children?.map(deepCloneWithNewIds),
  }
}

/** Selector hook — returns the active tab or null */
export const useActiveTab = () =>
  useASTViewerStore(s => s.tabs.find(t => t.id === s.activeTabId) ?? null)
