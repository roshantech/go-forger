import { create } from 'zustand'
import type { ProjectWithFiles, ProjectFile } from '@/lib/api'

export interface FTreeItem {
  id: string
  name: string
  type: 'root' | 'folder' | 'file'
  language?: string
  path?: string          // full path for files (used for AST navigation)
  content?: string       // file content if loaded
  parentId?: string
  children?: string[]
}

// ─── Build a flat item map from a ProjectWithFiles ────────────
export function buildItemMap(project: ProjectWithFiles): Record<string, FTreeItem> {
  const items: Record<string, FTreeItem> = {}

  // Root node
  items['root'] = {
    id: 'root',
    name: project.name,
    type: 'root',
    language: project.language,
    children: [],
  }

  // Build folder/file structure from flat file paths
  for (const pf of project.files) {
    addFileToTree(items, pf)
  }

  return items
}

function getExt(name: string): string {
  const ext = name.split('.').pop()?.toLowerCase() ?? ''
  const map: Record<string, string> = {
    go: 'go', ts: 'typescript', tsx: 'typescript',
    js: 'javascript', jsx: 'javascript', py: 'python',
    sql: 'sql', yaml: 'yaml', yml: 'yaml',
    json: 'json', md: 'markdown', sh: 'shell',
    toml: 'toml',
  }
  return map[ext] ?? 'plaintext'
}

function addFileToTree(items: Record<string, FTreeItem>, pf: ProjectFile) {
  const parts = pf.path.replace(/^\//, '').split('/')
  let parentId = 'root'

  // Ensure all intermediate folders exist
  for (let i = 0; i < parts.length - 1; i++) {
    const folderName = parts[i]
    const folderId   = parts.slice(0, i + 1).join('/')

    if (!items[folderId]) {
      items[folderId] = {
        id: folderId,
        name: folderName,
        type: 'folder',
        parentId,
        children: [],
      }
      const parent = items[parentId]
      if (parent.children && !parent.children.includes(folderId)) {
        parent.children.push(folderId)
      }
    }
    parentId = folderId
  }

  // File node
  const fileName = parts[parts.length - 1]
  const fileId   = pf.path.replace(/^\//, '')

  items[fileId] = {
    id: fileId,
    name: fileName,
    type: 'file',
    language: getExt(fileName),
    path: pf.path,
    content: pf.content,
    parentId,
  }

  const parent = items[parentId]
  if (parent.children && !parent.children.includes(fileId)) {
    parent.children.push(fileId)
  }
}

// ─── Store ────────────────────────────────────────────────────

interface FileTreeStore {
  items: Record<string, FTreeItem>
  expandedIds: Set<string>
  selectedFileId: string | null
  projectId: string | null

  setProject: (project: ProjectWithFiles) => void
  toggleFolder: (id: string) => void
  selectFile: (id: string | null) => void
  clear: () => void
}

export const useFileTreeStore = create<FileTreeStore>((set) => ({
  items: getDefaultItems(),
  expandedIds: new Set(['root']),
  selectedFileId: null,
  projectId: null,

  setProject: (project) =>
    set({
      items: buildItemMap(project),
      expandedIds: new Set(['root']),
      selectedFileId: null,
      projectId: project.id,
    }),

  toggleFolder: (id) =>
    set((s) => {
      const next = new Set(s.expandedIds)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return { expandedIds: next }
    }),

  selectFile: (id) => set({ selectedFileId: id }),

  clear: () =>
    set({
      items: getDefaultItems(),
      expandedIds: new Set(['root']),
      selectedFileId: null,
      projectId: null,
    }),
}))

/** Default placeholder shown before any project is loaded */
function getDefaultItems(): Record<string, FTreeItem> {
  return {
    root: {
      id: 'root',
      name: 'No project loaded',
      type: 'root',
      language: 'go',
      children: [],
    },
  }
}

/** Returns which node ids are visible given current expanded set */
export function getVisibleIds(
  items: Record<string, FTreeItem>,
  expandedIds: Set<string>
): string[] {
  const visible: string[] = []
  function walk(id: string) {
    if (!items[id]) return
    visible.push(id)
    const item = items[id]
    if ((item.type === 'root' || item.type === 'folder') && expandedIds.has(id)) {
      for (const childId of item.children ?? []) walk(childId)
    }
  }
  walk('root')
  return visible
}
