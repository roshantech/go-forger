import { create } from 'zustand'
import type { Node, Edge } from '@xyflow/react'

export interface WorkflowNodeData extends Record<string, unknown> {
  kind: 'trigger' | 'input' | 'processor' | 'condition' | 'action' | 'output'
  label: string
  subtitle: string
  description: string
  accent: string
  status: 'draft' | 'ready' | 'live'
  notes: string
  config: Record<string, string>
}

export type WorkflowNode = Node<WorkflowNodeData>
export type WorkflowEdge = Edge

interface HistoryEntry {
  nodes: WorkflowNode[]
  edges: WorkflowEdge[]
}

interface ProjectStore {
  nodes: WorkflowNode[]
  edges: WorkflowEdge[]
  selectedNodeId: string | null
  past: HistoryEntry[]
  future: HistoryEntry[]

  setNodes: (nodes: WorkflowNode[]) => void
  setEdges: (edges: WorkflowEdge[]) => void
  setSelectedNodeId: (id: string | null) => void
  updateNodeData: (id: string, data: Partial<WorkflowNodeData>) => void
  addNode: (node: WorkflowNode) => void
  removeNode: (id: string) => void
  snapshot: () => void
  undo: () => void
  redo: () => void
  reset: (nodes: WorkflowNode[], edges: WorkflowEdge[]) => void
}

export const useProjectStore = create<ProjectStore>((set) => ({
  nodes: [],
  edges: [],
  selectedNodeId: null,
  past: [],
  future: [],

  setNodes: (nodes) => set({ nodes }),
  setEdges: (edges) => set({ edges }),
  setSelectedNodeId: (id) => set({ selectedNodeId: id }),

  updateNodeData: (id, data) =>
    set((s) => ({
      nodes: s.nodes.map((n) =>
        n.id === id ? { ...n, data: { ...n.data, ...data } } : n
      ),
    })),

  addNode: (node) =>
    set((s) => ({ nodes: [...s.nodes, node] })),

  removeNode: (id) =>
    set((s) => ({
      nodes: s.nodes.filter((n) => n.id !== id),
      edges: s.edges.filter((e) => e.source !== id && e.target !== id),
      selectedNodeId: s.selectedNodeId === id ? null : s.selectedNodeId,
    })),

  snapshot: () =>
    set((s) => ({
      past: [...s.past.slice(-29), { nodes: s.nodes, edges: s.edges }],
      future: [],
    })),

  undo: () =>
    set((s) => {
      if (s.past.length === 0) return s
      const prev = s.past[s.past.length - 1]
      return {
        past: s.past.slice(0, -1),
        future: [{ nodes: s.nodes, edges: s.edges }, ...s.future],
        nodes: prev.nodes,
        edges: prev.edges,
      }
    }),

  redo: () =>
    set((s) => {
      if (s.future.length === 0) return s
      const next = s.future[0]
      return {
        future: s.future.slice(1),
        past: [...s.past, { nodes: s.nodes, edges: s.edges }],
        nodes: next.nodes,
        edges: next.edges,
      }
    }),

  reset: (nodes, edges) =>
    set({ nodes, edges, selectedNodeId: null, past: [], future: [] }),
}))
