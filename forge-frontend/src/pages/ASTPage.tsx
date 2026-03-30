import { useRef, useCallback, useEffect, useState, type DragEvent } from 'react'
import { ReactFlowProvider } from '@xyflow/react'
import { useMutation } from '@tanstack/react-query'
import { astApi } from '@/lib/api'
import { useASTViewerStore, useActiveTab } from '@/store/astViewerStore'
import ASTFlowCanvas from '@/components/ast/ASTFlowCanvas'
import ASTSidebar from '@/components/ast/ASTSidebar'
import NodePalette from '@/components/ast/NodePalette'
import { CATEGORY_COLORS } from '@/components/ast/ASTNode'
import {
  Upload, Code2, GitBranch, X, RefreshCw,
  ChevronDown, ChevronUp, Layers, ChevronRight,
  ArrowLeft, Home,
} from 'lucide-react'
import toast from 'react-hot-toast'

const SIDEBAR_MIN = 200
const SIDEBAR_MAX = 640
const SIDEBAR_DEFAULT = 300
const PALETTE_WIDTH = 220

export default function ASTPage() {
  const activeTab = useActiveTab()
  const {
    tabs, activeTabId,
    openFile, updateActiveTab, closeTab, switchTab,
    setViewMode, setViewDensity, setMaxDepth,
    focusPop, focusTo,
  } = useASTViewerStore()

  const fileRef = useRef<HTMLInputElement>(null)
  const viewMode = activeTab?.viewMode ?? 'flow'
  const viewDensity = activeTab?.viewDensity ?? 'summary'
  const maxDepth = activeTab?.maxDepth ?? 2

  // ── Resizable right sidebar ────────────────────────────────────────────────
  const [sidebarW, setSidebarW] = useState(SIDEBAR_DEFAULT)
  const resizing = useRef(false)
  const resizeX = useRef(0)
  const resizeW = useRef(0)

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!resizing.current) return
      setSidebarW(Math.max(SIDEBAR_MIN, Math.min(SIDEBAR_MAX, resizeW.current + resizeX.current - e.clientX)))
    }
    const onUp = () => { resizing.current = false; document.body.style.cursor = '' }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
  }, [])

  // ── Live code editing ──────────────────────────────────────────────────────
  const [editSource, setEditSource] = useState(activeTab?.sourceCode ?? '')
  const [isParsing, setIsParsing] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => { setEditSource(activeTab?.sourceCode ?? '') }, [activeTabId, activeTab?.sourceCode])

  const { mutate: reparse } = useMutation({
    mutationFn: (src: string) => {
      const name = activeTab?.fileName ?? 'edit.go'
      return Promise.all([astApi.treeRaw(name, src), astApi.inspectRaw(name, src)])
    },
    onMutate: () => setIsParsing(true),
    onSuccess: ([treeRes, inspectRes]) => {
      updateActiveTab(treeRes.data, inspectRes.data, editSource)
      setIsParsing(false)
    },
    onError: () => setIsParsing(false),
  })

  function handleCodeChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const val = e.target.value
    setEditSource(val)
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => reparse(val), 700)
  }

  // ── File upload ────────────────────────────────────────────────────────────
  const { mutate: upload, isPending: uploading } = useMutation({
    mutationFn: async ({ file, content, name }: { file?: File; content?: string; name: string }) => {
      if (file) {
        const [treeRes, inspRes] = await Promise.all([astApi.treeFile(file), astApi.inspectFile(file)])
        return { tree: treeRes.data, inspection: inspRes.data, source: content ?? '', name }
      }
      const [treeRes, inspRes] = await Promise.all([astApi.treeRaw(name, content!), astApi.inspectRaw(name, content!)])
      return { tree: treeRes.data, inspection: inspRes.data, source: content!, name }
    },
    onSuccess: ({ tree, inspection, source, name }) => {
      openFile(tree, inspection, source, name)
      toast.success(`Parsed ${name}`)
    },
    onError: (err: unknown) => {
      toast.error((err as { response?: { data?: { error?: string } } }).response?.data?.error ?? 'Parse failed')
    },
  })

  const handleFile = useCallback((file: File) => {
    if (!file.name.endsWith('.go')) { toast.error('Only .go files supported'); return }
    const reader = new FileReader()
    reader.onload = e => upload({ file, content: e.target?.result as string, name: file.name })
    reader.readAsText(file)
  }, [upload])

  const onFileDrop = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }, [handleFile])

  // ── Breadcrumb data ────────────────────────────────────────────────────────
  const breadcrumb = activeTab
    ? [activeTab.tree.id, ...activeTab.focusStack].map(id => activeTab.nodeMap.get(id)).filter(Boolean)
    : []
  // The last breadcrumb item is the current focus root
  const focusedNode = breadcrumb.at(-1) ?? null

  const hasFocus = (activeTab?.focusStack.length ?? 0) > 0

  return (
    <div className="flex flex-col h-full">
      {/* ── Tabs bar ─────────────────────────────────────────────────────── */}
      <div className="flex items-center border-b border-border bg-card shrink-0 min-w-0 overflow-x-auto">
        <div className="flex items-center flex-1 min-w-0">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => switchTab(tab.id)}
              className={`group flex items-center gap-1.5 px-3 py-2 text-xs font-medium shrink-0 border-r border-border transition-colors ${
                tab.id === activeTabId
                  ? 'bg-background text-foreground border-b-2 border-b-primary'
                  : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
              }`}
            >
              <GitBranch size={11} className={tab.id === activeTabId ? 'text-primary' : 'text-muted-foreground/50'} />
              <span className="max-w-[120px] truncate">{tab.fileName}</span>
              <span
                onClick={e => { e.stopPropagation(); closeTab(tab.id) }}
                className="w-3.5 h-3.5 flex items-center justify-center opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground transition-opacity ml-0.5"
              >
                <X size={10} />
              </span>
            </button>
          ))}

          {/* + open new file */}
          <button
            onClick={() => fileRef.current?.click()}
            className="px-3 py-2 text-xs text-muted-foreground/50 hover:text-foreground hover:bg-accent/50 transition-colors shrink-0"
            title="Open new .go file"
          >
            + Open
          </button>
        </div>

        {/* Right-side controls (only when a file is open) */}
        {activeTab && (
          <div className="flex items-center gap-2 px-3 shrink-0">
            {isParsing && (
              <span className="flex items-center gap-1 text-[10px] text-primary/70">
                <RefreshCw size={9} className="animate-spin" /> reparsing
              </span>
            )}

            {/* Depth control (flow mode only) */}
            {viewMode === 'flow' && (
              <div className="flex items-center gap-1">
                <Layers size={10} className="text-muted-foreground/40" />
                <span className="text-[10px] text-muted-foreground/40 font-mono">depth</span>
                <button onClick={() => setMaxDepth(maxDepth > 1 ? maxDepth - 1 : 0)}
                  className="w-4 h-4 flex items-center justify-center border border-border text-muted-foreground hover:bg-accent transition-colors">
                  <ChevronDown size={9} />
                </button>
                <span className="text-[10px] font-mono text-foreground/80 w-4 text-center">
                  {maxDepth === 0 ? '∞' : maxDepth}
                </span>
                <button onClick={() => setMaxDepth(maxDepth === 0 ? 1 : maxDepth + 1)}
                  className="w-4 h-4 flex items-center justify-center border border-border text-muted-foreground hover:bg-accent transition-colors">
                  <ChevronUp size={9} />
                </button>
                <button onClick={() => setMaxDepth(0)}
                  className={`px-1 h-4 text-[9px] font-bold uppercase tracking-wider border transition-colors ${
                    maxDepth === 0 ? 'border-primary/60 text-primary bg-primary/10' : 'border-border text-muted-foreground/40 hover:border-primary/40'
                  }`}>∞</button>
              </div>
            )}

            <div className="w-px h-3 bg-border" />

            {/* Density toggle (flow mode only) */}
            {viewMode === 'flow' && (
              <div className="flex border border-border text-[10px]">
                <button
                  onClick={() => setViewDensity('summary')}
                  title="Summary: hide expression/literal detail nodes — major blocks only"
                  className={`px-2 py-1 transition-colors ${viewDensity === 'summary' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent'}`}
                >
                  Summary
                </button>
                <button
                  onClick={() => setViewDensity('full')}
                  title="Full: show all AST nodes"
                  className={`px-2 py-1 transition-colors ${viewDensity === 'full' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent'}`}
                >
                  Full
                </button>
              </div>
            )}

            <div className="w-px h-3 bg-border" />

            {/* View toggle */}
            <div className="flex border border-border text-[10px]">
              <button onClick={() => setViewMode('flow')}
                className={`flex items-center gap-1 px-2 py-1 transition-colors ${viewMode === 'flow' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent'}`}>
                <GitBranch size={10} /> Flow
              </button>
              <button onClick={() => setViewMode('code')}
                className={`flex items-center gap-1 px-2 py-1 transition-colors ${viewMode === 'code' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent'}`}>
                <Code2 size={10} /> Code
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Focus / breadcrumb bar (visible when drilled in) ─────────────── */}
      {activeTab && hasFocus && (
        <div className="flex items-center gap-0 border-b border-border bg-[hsl(222,47%,7%)] shrink-0 min-w-0">
          {/* Back + Home */}
          <button
            onClick={focusPop}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] text-muted-foreground hover:text-foreground hover:bg-accent/50 border-r border-border transition-colors shrink-0"
          >
            <ArrowLeft size={11} /> Back
          </button>
          <button
            onClick={() => focusTo(0)}
            className="flex items-center justify-center w-8 py-1.5 text-muted-foreground/50 hover:text-foreground hover:bg-accent/50 border-r border-border transition-colors shrink-0"
            title="Go to file root"
          >
            <Home size={11} />
          </button>

          {/* Breadcrumb path */}
          <div className="flex items-center min-w-0 flex-1 overflow-x-auto px-2 gap-0.5">
            {breadcrumb.map((node, i) => {
              const isLast = i === breadcrumb.length - 1
              const style = CATEGORY_COLORS[node!.category] ?? CATEGORY_COLORS.other
              const label = node!.name || node!.value || node!.type
              return (
                <span key={node!.id} className="flex items-center gap-0.5 shrink-0">
                  {i > 0 && <ChevronRight size={9} className="text-muted-foreground/30 shrink-0" />}
                  <button
                    onClick={() => !isLast && focusTo(i)}
                    className={`flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-mono transition-colors ${
                      isLast
                        ? 'text-foreground font-semibold cursor-default'
                        : 'text-muted-foreground/60 hover:text-foreground cursor-pointer'
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 shrink-0`} style={{ background: style.border }} />
                    <span className="truncate max-w-[80px]">{label}</span>
                  </button>
                </span>
              )
            })}
          </div>

          {/* Current focused node info (right side) */}
          {focusedNode && (
            <div className="flex items-center gap-2 px-3 py-1.5 border-l border-border shrink-0">
              <span
                className="text-[10px] font-bold uppercase tracking-wider"
                style={{ color: CATEGORY_COLORS[focusedNode.category]?.border ?? '#6b7280' }}
              >
                {focusedNode.category}
              </span>
              <span className="text-[10px] font-mono text-foreground/70">{focusedNode.type}</span>
              {(focusedNode.line != null) && (
                <span className="text-[10px] font-mono text-muted-foreground/40">
                  line {focusedNode.line}–{focusedNode.endLine ?? '?'}
                </span>
              )}
              <span className="text-[10px] text-muted-foreground/30">
                {focusedNode.children?.length ?? 0} children
              </span>
            </div>
          )}
        </div>
      )}

      {/* ── Body ─────────────────────────────────────────────────────────── */}
      {tabs.length === 0 ? (
        /* No files open — full-page upload zone */
        <div className="flex-1 min-h-0 overflow-hidden">
          <UploadZone
            onPaste={(name, content) => upload({ content, name })}
            isPending={uploading}
            onDrop={onFileDrop}
            fileRef={fileRef}
          />
        </div>
      ) : (
        <div className="flex flex-1 min-h-0 overflow-hidden">
          {/* Left palette (flow mode only) */}
          {viewMode === 'flow' && (
            <aside className="shrink-0 overflow-hidden" style={{ width: PALETTE_WIDTH }}>
              <NodePalette />
            </aside>
          )}

          {/* Canvas / Code editor */}
          <div className="flex-1 min-w-0 relative overflow-hidden">
            {viewMode === 'flow' ? (
              <ReactFlowProvider>
                <ASTFlowCanvas />
              </ReactFlowProvider>
            ) : (
              <div className="h-full flex flex-col">
                <div className="flex items-center gap-2 px-3 py-1.5 border-b border-border bg-card/50 shrink-0">
                  <Code2 size={11} className="text-muted-foreground" />
                  <span className="text-[11px] text-muted-foreground font-mono">{activeTab?.fileName}</span>
                  <span className="ml-auto text-[10px] text-muted-foreground/40">edit · AST auto-updates</span>
                </div>
                <textarea
                  value={editSource}
                  onChange={handleCodeChange}
                  spellCheck={false}
                  className="flex-1 w-full p-4 font-mono text-xs text-foreground/85 bg-background resize-none focus:outline-none leading-relaxed"
                  style={{ tabSize: 2 }}
                />
              </div>
            )}
          </div>

          {/* Resize handle */}
          <div
            onMouseDown={e => {
              resizing.current = true
              resizeX.current = e.clientX
              resizeW.current = sidebarW
              document.body.style.cursor = 'col-resize'
              e.preventDefault()
            }}
            className="w-1 shrink-0 cursor-col-resize bg-border hover:bg-primary/50 transition-colors active:bg-primary"
          />

          {/* Right sidebar */}
          <aside className="shrink-0 border-l border-border bg-card overflow-hidden" style={{ width: sidebarW }}>
            <ASTSidebar />
          </aside>
        </div>
      )}

      <input ref={fileRef} type="file" accept=".go" className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = '' }} />
    </div>
  )
}

// ─── Upload zone ──────────────────────────────────────────────────────────────

function UploadZone({
  onPaste, isPending, onDrop, fileRef,
}: {
  onPaste: (name: string, content: string) => void
  isPending: boolean
  onDrop: (e: DragEvent<HTMLDivElement>) => void
  fileRef: React.RefObject<HTMLInputElement>
}) {
  return (
    <div className="h-full flex items-center justify-center p-8">
      <div
        onDrop={onDrop}
        onDragOver={e => e.preventDefault()}
        onClick={() => fileRef.current?.click()}
        className="w-full max-w-md flex flex-col items-center gap-5 border-2 border-dashed border-border hover:border-primary/60 hover:bg-accent/10 transition-colors cursor-pointer py-12 px-8 text-center"
      >
        {isPending
          ? <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          : <div className="w-14 h-14 bg-muted flex items-center justify-center">
              <Upload size={24} className="text-muted-foreground" />
            </div>
        }
        <div>
          <p className="text-base font-semibold text-foreground">{isPending ? 'Parsing…' : 'Drop a .go file'}</p>
          <p className="text-sm text-muted-foreground mt-1">or click to browse</p>
        </div>
        {!isPending && (
          <div className="w-full" onClick={e => e.stopPropagation()}>
            <p className="text-xs text-muted-foreground/50 mb-2">or paste source:</p>
            <QuickPasteForm onSubmit={onPaste} />
          </div>
        )}
      </div>
    </div>
  )
}

function QuickPasteForm({ onSubmit }: { onSubmit: (name: string, content: string) => void }) {
  const nameRef = useRef<HTMLInputElement>(null)
  const contentRef = useRef<HTMLTextAreaElement>(null)
  return (
    <form
      onSubmit={e => {
        e.preventDefault()
        const name = nameRef.current?.value.trim() || 'input.go'
        const content = contentRef.current?.value.trim() || ''
        if (content) onSubmit(name, content)
      }}
      className="space-y-2 text-left"
    >
      <input ref={nameRef} defaultValue="main.go"
        className="w-full px-2.5 py-1.5 bg-muted border border-border text-foreground text-xs font-mono focus:outline-none focus:ring-2 focus:ring-primary/40" />
      <textarea ref={contentRef} rows={4} placeholder={'package main\n\nfunc main() {\n}'}
        className="w-full px-2.5 py-2 bg-muted border border-border text-foreground text-xs font-mono focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none" />
      <button type="submit"
        className="w-full py-1.5 bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors">
        Parse
      </button>
    </form>
  )
}
