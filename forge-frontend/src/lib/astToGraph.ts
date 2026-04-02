import type { Node, Edge } from '@xyflow/react'
import type { TreeNode } from '@/lib/api'
import type { CustomNodeEntry } from '@/store/astViewerStore'

export interface ASTFlowNodeData extends Record<string, unknown> {
  node: TreeNode
  isExpanded: boolean
  hasChildren: boolean
  childCount: number
  isRoot: boolean
  compact: boolean
  depth: number
}

/** Build a flat id→node lookup from the recursive tree */
export function buildNodeMap(tree: TreeNode): Map<string, TreeNode> {
  const map = new Map<string, TreeNode>()
  const dfs = (n: TreeNode) => {
    map.set(n.id, n)
    n.children?.forEach(dfs)
  }
  dfs(tree)
  return map
}

/**
 * Convert tree to React Flow nodes/edges using expand-on-click model.
 * - Root's direct children are always visible.
 * - Deeper nodes visible only when their parent is in expandedNodeIds.
 * - maxDepth: 0 = unlimited, 1+ = max depth to auto-show (expand overrides)
 * - Nodes at depth > 2 get compact=true unless selected
 * - Custom nodes from palette are appended at their stored positions
 * - hiddenCategories: nodes in these categories are skipped (and their subtrees)
 */
export function treeToGraph(
  nodeMap: Map<string, TreeNode>,
  rootId: string,
  expandedNodeIds: Set<string>,
  maxDepth: number = 0,
  customNodes: Map<string, CustomNodeEntry> = new Map(),
  hiddenCategories: Set<string> = new Set()
): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = []
  const edges: Edge[] = []
  let edgeIdx = 0

  function add(id: string, parentId: string | null, depth: number) {
    const n = nodeMap.get(id)
    if (!n) return

    // Skip nodes in hidden categories (except the root itself)
    if (id !== rootId && hiddenCategories.has(n.category)) return

    const children = n.children ?? []
    const isRoot = id === rootId
    const isExpanded = expandedNodeIds.has(id)

    // Determine if children should be rendered:
    // - Root always shows children
    // - Nodes within maxDepth show children (0 = unlimited)
    // - Explicitly expanded nodes show children regardless of maxDepth
    const withinDepth = maxDepth === 0 || depth < maxDepth
    const showChildren = isRoot || isExpanded || withinDepth

    // Compact mode for deep nodes not at the top levels
    const compact = depth > 2

    nodes.push({
      id: n.id,
      type: 'astNode',
      position: { x: 0, y: 0 },
      data: {
        node: n,
        isExpanded: showChildren,
        hasChildren: children.length > 0,
        childCount: children.length,
        isRoot,
        compact,
        depth,
      } satisfies ASTFlowNodeData,
    })

    if (parentId) {
      edges.push({
        id: `e${++edgeIdx}`,
        source: parentId,
        target: id,
        type: 'smoothstep',
        animated: depth === 1,
        style: {
          stroke: depth <= 1 ? 'hsl(216,34%,35%)' : 'hsl(216,34%,22%)',
          strokeWidth: depth <= 1 ? 1.5 : 1,
        },
      })
    }

    if (showChildren) {
      children.forEach((child) => add(child.id, id, depth + 1))
    }
  }

  add(rootId, null, 0)

  // Append custom palette nodes at their stored positions (no edges)
  for (const [id, entry] of customNodes) {
    nodes.push({
      id,
      type: 'astNode',
      position: entry.position,
      data: {
        node: entry.node,
        isExpanded: false,
        hasChildren: (entry.node.children?.length ?? 0) > 0,
        childCount: entry.node.children?.length ?? 0,
        isRoot: false,
        compact: false,
        depth: 0,
      } satisfies ASTFlowNodeData,
    })
  }

  return { nodes, edges }
}
