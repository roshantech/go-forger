import { useState } from 'react'
import {
  ChevronDown, ChevronRight, FileCode, Layers, Trash2,
  Pencil, Plus, X, Copy, Check,
} from 'lucide-react'
import { useASTViewerStore, useActiveTab, type CustomNodeEntry } from '@/store/astViewerStore'
import type { TreeNode, FunctionInfo, TypeInfo, InterfaceInfo, VarInfo, ImportInfo } from '@/lib/api'
import { CATEGORY_COLORS } from './ASTNode'

type SidePane = 'node' | 'edit' | 'file'

const EMPTY_NODE_MAP = new Map<string, TreeNode>()
const EMPTY_CUSTOM_MAP = new Map<string, CustomNodeEntry>()

// All possible child node types for the "Add Child" dropdown
const CHILD_NODE_OPTIONS: { type: string; category: string; label: string }[] = [
  { type: 'FuncDecl',    category: 'function',   label: 'FuncDecl — function declaration' },
  { type: 'FuncLit',     category: 'function',   label: 'FuncLit — function literal' },
  { type: 'BlockStmt',   category: 'statement',  label: 'BlockStmt — block { }' },
  { type: 'AssignStmt',  category: 'statement',  label: 'AssignStmt — assignment :=' },
  { type: 'ReturnStmt',  category: 'statement',  label: 'ReturnStmt — return' },
  { type: 'DeferStmt',   category: 'statement',  label: 'DeferStmt — defer' },
  { type: 'GoStmt',      category: 'statement',  label: 'GoStmt — go goroutine' },
  { type: 'IfStmt',      category: 'control',    label: 'IfStmt — if / else' },
  { type: 'ForStmt',     category: 'control',    label: 'ForStmt — for loop' },
  { type: 'RangeStmt',   category: 'control',    label: 'RangeStmt — range' },
  { type: 'SwitchStmt',  category: 'control',    label: 'SwitchStmt — switch' },
  { type: 'CaseClause',  category: 'control',    label: 'CaseClause — case' },
  { type: 'BranchStmt',  category: 'control',    label: 'BranchStmt — break/continue' },
  { type: 'CallExpr',    category: 'expression', label: 'CallExpr — function call' },
  { type: 'BinaryExpr',  category: 'expression', label: 'BinaryExpr — a op b' },
  { type: 'UnaryExpr',   category: 'expression', label: 'UnaryExpr — op a' },
  { type: 'SelectorExpr',category: 'expression', label: 'SelectorExpr — x.Field' },
  { type: 'IndexExpr',   category: 'expression', label: 'IndexExpr — x[i]' },
  { type: 'StarExpr',    category: 'expression', label: 'StarExpr — *x' },
  { type: 'StructType',  category: 'type',       label: 'StructType — struct { }' },
  { type: 'InterfaceType', category: 'type',     label: 'InterfaceType — interface { }' },
  { type: 'ArrayType',   category: 'type',       label: 'ArrayType — []T' },
  { type: 'MapType',     category: 'type',       label: 'MapType — map[K]V' },
  { type: 'ChanType',    category: 'type',       label: 'ChanType — chan T' },
  { type: 'FieldList',   category: 'field',      label: 'FieldList — field list' },
  { type: 'BasicLit',    category: 'literal',    label: 'BasicLit — literal value' },
  { type: 'CompositeLit',category: 'literal',    label: 'CompositeLit — { } literal' },
  { type: 'Ident',       category: 'identifier', label: 'Ident — identifier' },
  { type: 'ImportSpec',  category: 'import',     label: 'ImportSpec — import path' },
  { type: 'GenDecl',     category: 'statement',  label: 'GenDecl — var/const/type/import' },
]

export default function ASTSidebar() {
  const activeTab = useActiveTab()
  const { selectedNodeId, removeCustomNode, hideNode, updateNode, addChildNode, removeChildNode, duplicateNode } =
    useASTViewerStore()

  const nodeMap = activeTab?.nodeMap ?? EMPTY_NODE_MAP
  const inspection = activeTab?.inspection ?? null
  const sourceCode = activeTab?.sourceCode ?? ''
  const customNodes = activeTab?.customNodes ?? EMPTY_CUSTOM_MAP

  const selectedNode = selectedNodeId ? nodeMap.get(selectedNodeId) : null
  const isCustomNode = selectedNodeId ? customNodes.has(selectedNodeId) : false

  const [pane, setPane] = useState<SidePane>('file')
  const activePane: SidePane = selectedNode ? pane : 'file'

  function deleteSelected() {
    if (!selectedNodeId) return
    if (isCustomNode) removeCustomNode(selectedNodeId)
    else hideNode(selectedNodeId)
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Tab bar */}
      <div className="flex border-b border-border shrink-0">
        <TabBtn active={activePane === 'node'} disabled={!selectedNode}
          icon={<Layers size={11} />} label="Info" onClick={() => setPane('node')} />
        <TabBtn active={activePane === 'edit'} disabled={!selectedNode}
          icon={<Pencil size={11} />} label="Edit" onClick={() => setPane('edit')} />
        <TabBtn active={activePane === 'file'}
          icon={<FileCode size={11} />} label="File" onClick={() => setPane('file')} />
        {selectedNode && (
          <button onClick={deleteSelected} title={isCustomNode ? 'Delete node' : 'Hide node (Del)'}
            className="px-2.5 border-l border-border text-muted-foreground/50 hover:text-red-400 hover:bg-red-500/10 transition-colors shrink-0">
            <Trash2 size={11} />
          </button>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto inspector-scroll">
        {/* ── INFO pane ── */}
        {activePane === 'node' && selectedNode && (
          <div className="p-3 space-y-3">
            <IdentityCard node={selectedNode} isCustomNode={isCustomNode} sourceCode={sourceCode} />
          </div>
        )}

        {/* ── EDIT pane ── */}
        {activePane === 'edit' && selectedNode && selectedNodeId && (
          <NodeEditor
            node={selectedNode}
            nodeId={selectedNodeId}
            nodeMap={nodeMap}
            isCustomNode={isCustomNode}
            onUpdate={(patch) => updateNode(selectedNodeId, patch)}
            onAddChild={(child) => addChildNode(selectedNodeId, child)}
            onRemoveChild={(childId) => removeChildNode(selectedNodeId, childId)}
            onDuplicate={() => duplicateNode(selectedNodeId)}
            onDelete={deleteSelected}
          />
        )}

        {/* ── FILE pane ── */}
        {activePane === 'file' && (
          inspection ? (
            <div className="p-2 space-y-1">
              <div className="px-2 py-2 border-b border-border/40 mb-2">
                <p className="text-xs font-semibold text-foreground truncate">{inspection.fileName}</p>
                <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                  package <span className="text-primary font-mono">{inspection.packageName}</span>
                </p>
              </div>
              <InspectSection title="Functions" count={inspection.functions.length} color="#3b82f6">
                {inspection.functions.map((fn) => <FnRow key={fn.name + fn.lineStart} fn={fn} />)}
              </InspectSection>
              <InspectSection title="Types" count={inspection.types.length} color="#14b8a6">
                {inspection.types.map((t) => <TypeRow key={t.name} type={t} />)}
              </InspectSection>
              <InspectSection title="Interfaces" count={inspection.interfaces.length} color="#22c55e">
                {inspection.interfaces.map((i) => <IfaceRow key={i.name} iface={i} />)}
              </InspectSection>
              <InspectSection title="Imports" count={inspection.imports.length} color="#06b6d4">
                {inspection.imports.map((imp) => <ImpRow key={imp.path} imp={imp} />)}
              </InspectSection>
              <InspectSection title="Variables" count={inspection.variables.length} color="#f97316">
                {inspection.variables.map((v) => <VarRow key={v.name} v={v} />)}
              </InspectSection>
              <InspectSection title="Constants" count={inspection.constants.length} color="#f43f5e">
                {inspection.constants.map((c) => <VarRow key={c.name} v={c} />)}
              </InspectSection>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center px-4 text-center">
              <p className="text-xs text-muted-foreground/40">Upload a .go file to inspect</p>
            </div>
          )
        )}
      </div>
    </div>
  )
}

// ─── Identity card (Info pane) ────────────────────────────────────────────────

function IdentityCard({ node, isCustomNode, sourceCode }: { node: TreeNode; isCustomNode: boolean; sourceCode: string }) {
  const style = CATEGORY_COLORS[node.category] ?? CATEGORY_COLORS.other
  return (
    <>
      <div className="p-3 border" style={{ background: `${style.border}11`, borderColor: `${style.border}44` }}>
        <p className="text-[10px] font-bold uppercase tracking-widest mb-0.5" style={{ color: style.border }}>
          {node.category}
          {isCustomNode && <span className="ml-1.5 text-[9px] text-muted-foreground/40 normal-case tracking-normal">palette</span>}
          {node.props?._edited && <span className="ml-1.5 text-[9px] text-amber-400/70 normal-case tracking-normal">edited</span>}
        </p>
        <p className="text-sm font-bold font-mono text-foreground">{node.type}</p>
        {(node.name || node.value) && (
          <p className="text-xs font-mono mt-0.5" style={{ color: style.border }}>{node.name || node.value}</p>
        )}
        <p className="text-[10px] font-mono text-muted-foreground/50 mt-1.5">
          line {node.line ?? '?'}–{node.endLine ?? '?'} &nbsp;·&nbsp; col {node.col ?? '?'} &nbsp;·&nbsp; {node.children?.length ?? 0} children
        </p>
      </div>

      {/* Code snippet */}
      {node.line && node.endLine && sourceCode && (
        <SideSection title={`Code · lines ${node.line}–${node.endLine}`}>
          <div className="border border-border/60 bg-[hsl(222,47%,6%)]">
            <pre className="p-2 text-[10px] font-mono leading-relaxed overflow-x-auto">
              {sourceCode.split('\n').slice(node.line - 1, node.endLine).map((l, i) => (
                <div key={i} className="flex min-w-0">
                  <span className="text-muted-foreground/25 w-7 shrink-0 text-right pr-2 select-none">{node.line! + i}</span>
                  <span className="text-foreground/75 break-all">{l || ' '}</span>
                </div>
              ))}
            </pre>
          </div>
        </SideSection>
      )}

      {/* Props */}
      {node.props && Object.entries(node.props).filter(([k]) => k !== '_edited').length > 0 && (
        <SideSection title="Properties">
          <table className="w-full text-[11px]">
            <tbody>
              {Object.entries(node.props).filter(([k]) => k !== '_edited').map(([k, v]) => (
                <tr key={k} className="border-b border-border/20 last:border-0">
                  <td className="py-1 pr-3 text-muted-foreground/60 font-mono align-top w-1/3">{k}</td>
                  <td className="py-1 text-foreground/80 font-mono break-all">{v}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </SideSection>
      )}

      {/* Children list */}
      {node.children && node.children.length > 0 && (
        <SideSection title={`Children (${node.children.length})`}>
          <div className="space-y-0.5">
            {node.children.map((c) => (
              <div key={c.id} className="flex items-center gap-1.5 px-2 py-1 hover:bg-accent/30 text-[11px] font-mono">
                <span className="w-1.5 h-1.5 shrink-0" style={{ background: CATEGORY_COLORS[c.category]?.border ?? '#6b7280' }} />
                <span className="text-foreground/70 truncate">{c.type}</span>
                {(c.name || c.value) && <span className="truncate" style={{ color: CATEGORY_COLORS[c.category]?.border ?? '#6b7280' }}>{c.name || c.value}</span>}
                {c.line && <span className="ml-auto text-muted-foreground/30 shrink-0">:{c.line}</span>}
              </div>
            ))}
          </div>
        </SideSection>
      )}
    </>
  )
}

// ─── NodeEditor (Edit pane) ───────────────────────────────────────────────────

interface NodeEditorProps {
  node: TreeNode
  nodeId: string
  nodeMap: Map<string, TreeNode>
  isCustomNode: boolean
  onUpdate: (patch: Partial<Pick<TreeNode, 'name' | 'value' | 'props' | 'type' | 'category'>>) => void
  onAddChild: (child: TreeNode) => void
  onRemoveChild: (childId: string) => void
  onDuplicate: () => void
  onDelete: () => void
}

function NodeEditor({ node, nodeId, isCustomNode, onUpdate, onAddChild, onRemoveChild, onDuplicate, onDelete }: NodeEditorProps) {
  const style = CATEGORY_COLORS[node.category] ?? CATEGORY_COLORS.other

  return (
    <div className="p-3 space-y-4">
      {/* Header badge */}
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 border"
          style={{ color: style.border, borderColor: `${style.border}44`, background: `${style.border}11` }}>
          {node.type}
        </span>
        <div className="flex items-center gap-1">
          <ActionBtn icon={<Copy size={10} />} label="Duplicate" onClick={onDuplicate} />
          <ActionBtn icon={<Trash2 size={10} />} label={isCustomNode ? 'Delete' : 'Hide'} onClick={onDelete} danger />
        </div>
      </div>

      {/* ── Generic fields ── */}
      <EditSection title="Identity">
        <EditField label="Name" value={node.name ?? ''} placeholder="identifier name"
          onChange={(v) => onUpdate({ name: v || undefined })} />
        <EditField label="Value" value={node.value ?? ''} placeholder="literal value"
          onChange={(v) => onUpdate({ value: v || undefined })} />
        {isCustomNode && (
          <div className="mt-1.5">
            <label className="text-[10px] text-muted-foreground/50 uppercase tracking-wider block mb-1">Category</label>
            <select
              value={node.category}
              onChange={(e) => onUpdate({ category: e.target.value })}
              className="w-full px-2 py-1 text-[11px] font-mono bg-background border border-border text-foreground focus:outline-none focus:border-primary/60"
            >
              {Object.keys(CATEGORY_COLORS).map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        )}
      </EditSection>

      {/* ── Category-specific panels ── */}
      {node.category === 'function' && (
        <FunctionEditor node={node} onUpdate={onUpdate} onAddChild={onAddChild} onRemoveChild={onRemoveChild} />
      )}
      {node.category === 'type' && (
        <TypeEditor node={node} nodeId={nodeId} onUpdate={onUpdate} onAddChild={onAddChild} onRemoveChild={onRemoveChild} />
      )}
      {node.category === 'literal' && (
        <LiteralEditor node={node} onUpdate={onUpdate} />
      )}
      {node.category === 'statement' && (
        <StatementEditor node={node} onUpdate={onUpdate} />
      )}
      {node.category === 'control' && (
        <ControlEditor node={node} onUpdate={onUpdate} onAddChild={onAddChild} />
      )}
      {node.category === 'import' && (
        <ImportEditor node={node} onUpdate={onUpdate} />
      )}
      {node.category === 'field' && (
        <FieldEditor node={node} onUpdate={onUpdate} />
      )}
      {node.category === 'identifier' && (
        <IdentifierEditor node={node} onUpdate={onUpdate} />
      )}

      {/* ── Editable props ── */}
      <PropsEditor
        props={node.props ?? {}}
        onChange={(props) => onUpdate({ props })}
      />

      {/* ── Children editor ── */}
      <ChildrenEditor
        node={node}
        onAddChild={onAddChild}
        onRemoveChild={onRemoveChild}
      />
    </div>
  )
}

// ── Function editor ──────────────────────────────────────────────────────────

function FunctionEditor({ node, onUpdate: _onUpdate, onAddChild, onRemoveChild }: {
  node: TreeNode
  onUpdate: (p: Partial<TreeNode>) => void
  onAddChild: (c: TreeNode) => void
  onRemoveChild: (id: string) => void
}) {
  const [showParamForm, setShowParamForm] = useState(false)
  const [paramName, setParamName] = useState('')
  const [paramType, setParamType] = useState('')
  const [showVarForm, setShowVarForm] = useState(false)
  const [varName, setVarName] = useState('')
  const [varValue, setVarValue] = useState('')
  const [varOp, setVarOp] = useState(':=')

  // Find child params — look for FieldList children
  const params = (node.children ?? []).filter(c => c.category === 'field' || c.type === 'Field' || c.type === 'FieldList')

  function addParam() {
    if (!paramName.trim()) return
    const p: TreeNode = {
      id: crypto.randomUUID(),
      type: 'Field', category: 'field',
      name: paramName.trim(),
      props: { paramType: paramType.trim() || 'interface{}' },
      children: [],
    }
    onAddChild(p)
    setParamName(''); setParamType(''); setShowParamForm(false)
  }

  function addVariable() {
    if (!varName.trim()) return
    const lhs: TreeNode = { id: crypto.randomUUID(), type: 'Ident', category: 'identifier', name: varName.trim(), children: [] }
    const rhs: TreeNode = { id: crypto.randomUUID(), type: 'BasicLit', category: 'literal', value: varValue.trim() || '0', children: [] }
    const stmt: TreeNode = {
      id: crypto.randomUUID(), type: 'AssignStmt', category: 'statement',
      props: { op: varOp },
      children: [lhs, rhs],
    }
    onAddChild(stmt)
    setVarName(''); setVarValue(''); setShowVarForm(false)
  }

  return (
    <>
      <EditSection title="Parameters">
        {params.length === 0 && <p className="text-[10px] text-muted-foreground/40 font-mono">No params</p>}
        {params.map(p => (
          <div key={p.id} className="flex items-center gap-1.5 py-0.5">
            <span className="text-[10px] font-mono text-foreground/70 flex-1">{p.name}</span>
            <span className="text-[10px] font-mono text-teal-400/60">{p.props?.paramType ?? ''}</span>
            <button onClick={() => onRemoveChild(p.id)} className="text-muted-foreground/30 hover:text-red-400 transition-colors">
              <X size={9} />
            </button>
          </div>
        ))}
        {showParamForm ? (
          <div className="mt-1.5 space-y-1">
            <div className="flex gap-1">
              <input value={paramName} onChange={e => setParamName(e.target.value)} placeholder="name"
                className="flex-1 px-2 py-1 text-[10px] font-mono bg-background border border-border text-foreground focus:outline-none focus:border-primary/60" />
              <input value={paramType} onChange={e => setParamType(e.target.value)} placeholder="type"
                className="flex-1 px-2 py-1 text-[10px] font-mono bg-background border border-border text-foreground focus:outline-none focus:border-primary/60" />
            </div>
            <div className="flex gap-1">
              <button onClick={addParam} className="flex-1 py-1 text-[10px] bg-primary/20 border border-primary/40 text-primary hover:bg-primary/30 transition-colors">Add</button>
              <button onClick={() => setShowParamForm(false)} className="px-2 py-1 text-[10px] border border-border text-muted-foreground hover:bg-accent transition-colors">Cancel</button>
            </div>
          </div>
        ) : (
          <button onClick={() => setShowParamForm(true)} className="mt-1 flex items-center gap-1 text-[10px] text-primary/60 hover:text-primary transition-colors">
            <Plus size={9} /> Add parameter
          </button>
        )}
      </EditSection>

      <EditSection title="Add Variable to Body">
        {showVarForm ? (
          <div className="space-y-1">
            <div className="flex gap-1 items-center">
              <input value={varName} onChange={e => setVarName(e.target.value)} placeholder="varName"
                className="flex-1 px-2 py-1 text-[10px] font-mono bg-background border border-border text-foreground focus:outline-none focus:border-primary/60" />
              <select value={varOp} onChange={e => setVarOp(e.target.value)}
                className="px-1 py-1 text-[10px] font-mono bg-background border border-border text-foreground focus:outline-none">
                {[':=', '=', '+=', '-=', '*=', '/='].map(o => <option key={o} value={o}>{o}</option>)}
              </select>
              <input value={varValue} onChange={e => setVarValue(e.target.value)} placeholder="value"
                className="flex-1 px-2 py-1 text-[10px] font-mono bg-background border border-border text-foreground focus:outline-none focus:border-primary/60" />
            </div>
            <div className="flex gap-1">
              <button onClick={addVariable} className="flex-1 py-1 text-[10px] bg-primary/20 border border-primary/40 text-primary hover:bg-primary/30 transition-colors">Add</button>
              <button onClick={() => setShowVarForm(false)} className="px-2 py-1 text-[10px] border border-border text-muted-foreground hover:bg-accent transition-colors">Cancel</button>
            </div>
          </div>
        ) : (
          <button onClick={() => setShowVarForm(true)} className="flex items-center gap-1 text-[10px] text-primary/60 hover:text-primary transition-colors">
            <Plus size={9} /> Add variable
          </button>
        )}
      </EditSection>
    </>
  )
}

// ── Type (struct) editor ──────────────────────────────────────────────────────

function TypeEditor({ node, onUpdate: _onUpdate, onAddChild, onRemoveChild }: {
  node: TreeNode; nodeId: string
  onUpdate: (p: Partial<TreeNode>) => void
  onAddChild: (c: TreeNode) => void
  onRemoveChild: (id: string) => void
}) {
  const [showForm, setShowForm] = useState(false)
  const [fName, setFName] = useState('')
  const [fType, setFType] = useState('')
  const [fTag, setFTag] = useState('')

  const fields = (node.children ?? []).filter(c => c.category === 'field' || c.type === 'Field')

  function addField() {
    if (!fName.trim()) return
    const f: TreeNode = {
      id: crypto.randomUUID(), type: 'Field', category: 'field',
      name: fName.trim(),
      props: { fieldType: fType.trim() || 'string', tag: fTag.trim() || undefined! },
      children: [],
    }
    onAddChild(f)
    setFName(''); setFType(''); setFTag(''); setShowForm(false)
  }

  return (
    <EditSection title="Fields">
      {fields.length === 0 && <p className="text-[10px] text-muted-foreground/40 font-mono">No fields</p>}
      {fields.map(f => (
        <div key={f.id} className="flex items-center gap-1.5 py-0.5 group">
          <span className="text-[10px] font-mono text-foreground/70 w-1/3 truncate">{f.name}</span>
          <span className="text-[10px] font-mono text-teal-400/60 flex-1 truncate">{f.props?.fieldType ?? ''}</span>
          {f.props?.tag && <span className="text-[9px] font-mono text-muted-foreground/30 truncate">`{f.props.tag}`</span>}
          <button onClick={() => onRemoveChild(f.id)} className="opacity-0 group-hover:opacity-100 text-muted-foreground/30 hover:text-red-400 transition-all">
            <X size={9} />
          </button>
        </div>
      ))}
      {showForm ? (
        <div className="mt-1.5 space-y-1">
          <div className="flex gap-1">
            <input value={fName} onChange={e => setFName(e.target.value)} placeholder="fieldName"
              className="flex-1 px-2 py-1 text-[10px] font-mono bg-background border border-border text-foreground focus:outline-none focus:border-primary/60" />
            <input value={fType} onChange={e => setFType(e.target.value)} placeholder="string"
              className="flex-1 px-2 py-1 text-[10px] font-mono bg-background border border-border text-foreground focus:outline-none focus:border-primary/60" />
          </div>
          <input value={fTag} onChange={e => setFTag(e.target.value)} placeholder='json:"field" (optional)'
            className="w-full px-2 py-1 text-[10px] font-mono bg-background border border-border text-foreground focus:outline-none focus:border-primary/60" />
          <div className="flex gap-1">
            <button onClick={addField} className="flex-1 py-1 text-[10px] bg-primary/20 border border-primary/40 text-primary hover:bg-primary/30 transition-colors">Add Field</button>
            <button onClick={() => setShowForm(false)} className="px-2 py-1 text-[10px] border border-border text-muted-foreground hover:bg-accent transition-colors">Cancel</button>
          </div>
        </div>
      ) : (
        <button onClick={() => setShowForm(true)} className="mt-1 flex items-center gap-1 text-[10px] text-primary/60 hover:text-primary transition-colors">
          <Plus size={9} /> Add field
        </button>
      )}
    </EditSection>
  )
}

// ── Literal editor ─────────────────────────────────────────────────────────────

function LiteralEditor({ node, onUpdate }: { node: TreeNode; onUpdate: (p: Partial<TreeNode>) => void }) {
  const kinds = ['STRING', 'INT', 'FLOAT', 'CHAR', 'IMAG']
  const currentKind = node.props?.kind ?? 'STRING'
  return (
    <EditSection title="Literal">
      <div className="flex gap-1 items-center">
        <select value={currentKind} onChange={e => onUpdate({ props: { ...node.props, kind: e.target.value } })}
          className="px-2 py-1 text-[10px] font-mono bg-background border border-border text-foreground focus:outline-none focus:border-primary/60 shrink-0">
          {kinds.map(k => <option key={k} value={k}>{k}</option>)}
        </select>
        <input value={node.value ?? ''} onChange={e => onUpdate({ value: e.target.value })}
          placeholder="literal value"
          className="flex-1 px-2 py-1 text-[10px] font-mono bg-background border border-border text-foreground focus:outline-none focus:border-primary/60" />
      </div>
    </EditSection>
  )
}

// ── Identifier editor ─────────────────────────────────────────────────────────

function IdentifierEditor({ node, onUpdate }: { node: TreeNode; onUpdate: (p: Partial<TreeNode>) => void }) {
  return (
    <EditSection title="Identifier">
      <input
        value={node.name ?? ''}
        onChange={e => onUpdate({ name: e.target.value || undefined })}
        onBlur={e => onUpdate({ name: e.target.value.trim() || undefined })}
        placeholder="identifier name"
        className="w-full px-2 py-1.5 text-[11px] font-mono bg-background border border-border text-foreground focus:outline-none focus:border-primary/60"
      />
    </EditSection>
  )
}

// ── Statement editor ──────────────────────────────────────────────────────────

function StatementEditor({ node, onUpdate }: { node: TreeNode; onUpdate: (p: Partial<TreeNode>) => void }) {
  const ops = [':=', '=', '+=', '-=', '*=', '/=', '%=', '&=', '|=', '^=', '<<=', '>>=']
  if (node.type !== 'AssignStmt' && node.type !== 'DeclStmt') return null
  return (
    <EditSection title="Assignment">
      <div className="flex gap-1.5 items-center">
        <input value={node.name ?? ''} onChange={e => onUpdate({ name: e.target.value || undefined })}
          placeholder="lhs name"
          className="flex-1 px-2 py-1 text-[10px] font-mono bg-background border border-border text-foreground focus:outline-none focus:border-primary/60" />
        <select value={node.props?.op ?? ':='} onChange={e => onUpdate({ props: { ...node.props, op: e.target.value } })}
          className="px-1 py-1 text-[10px] font-mono bg-background border border-border text-foreground focus:outline-none shrink-0">
          {ops.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
        <input value={node.value ?? ''} onChange={e => onUpdate({ value: e.target.value || undefined })}
          placeholder="rhs value"
          className="flex-1 px-2 py-1 text-[10px] font-mono bg-background border border-border text-foreground focus:outline-none focus:border-primary/60" />
      </div>
    </EditSection>
  )
}

// ── Control editor ────────────────────────────────────────────────────────────

function ControlEditor({ node, onUpdate, onAddChild }: {
  node: TreeNode
  onUpdate: (p: Partial<TreeNode>) => void
  onAddChild: (c: TreeNode) => void
}) {
  function addCase() {
    const c: TreeNode = {
      id: crypto.randomUUID(), type: 'CaseClause', category: 'control',
      name: 'case', props: { cond: 'expr' }, children: [],
    }
    onAddChild(c)
  }
  return (
    <EditSection title="Condition">
      <input value={node.props?.cond ?? ''} onChange={e => onUpdate({ props: { ...node.props, cond: e.target.value } })}
        placeholder="condition expression"
        className="w-full px-2 py-1 text-[10px] font-mono bg-background border border-border text-foreground focus:outline-none focus:border-primary/60" />
      {(node.type === 'SwitchStmt' || node.type === 'TypeSwitchStmt') && (
        <button onClick={addCase} className="mt-1.5 flex items-center gap-1 text-[10px] text-primary/60 hover:text-primary transition-colors">
          <Plus size={9} /> Add case clause
        </button>
      )}
    </EditSection>
  )
}

// ── Import editor ─────────────────────────────────────────────────────────────

function ImportEditor({ node, onUpdate }: { node: TreeNode; onUpdate: (p: Partial<TreeNode>) => void }) {
  return (
    <EditSection title="Import">
      <EditField label="Path" value={node.value ?? ''} placeholder='"fmt"'
        onChange={v => onUpdate({ value: v || undefined })} />
      <EditField label="Alias" value={node.props?.alias ?? ''} placeholder="alias (optional)"
        onChange={v => onUpdate({ props: { ...node.props, alias: v || undefined! } })} />
    </EditSection>
  )
}

// ── Field editor ──────────────────────────────────────────────────────────────

function FieldEditor({ node, onUpdate }: { node: TreeNode; onUpdate: (p: Partial<TreeNode>) => void }) {
  return (
    <EditSection title="Struct Field">
      <EditField label="Name" value={node.name ?? ''} placeholder="fieldName"
        onChange={v => onUpdate({ name: v || undefined })} />
      <EditField label="Type" value={node.props?.fieldType ?? ''} placeholder="string"
        onChange={v => onUpdate({ props: { ...node.props, fieldType: v } })} />
      <EditField label="Tag" value={node.props?.tag ?? ''} placeholder='json:"name"'
        onChange={v => onUpdate({ props: { ...node.props, tag: v || undefined! } })} />
    </EditSection>
  )
}

// ── Props editor ──────────────────────────────────────────────────────────────

function PropsEditor({ props, onChange }: { props: Record<string, string>; onChange: (p: Record<string, string>) => void }) {
  const [newKey, setNewKey] = useState('')
  const [newVal, setNewVal] = useState('')

  const visible = Object.entries(props).filter(([k]) => k !== '_edited')

  function addProp() {
    if (!newKey.trim()) return
    onChange({ ...props, [newKey.trim()]: newVal.trim() })
    setNewKey(''); setNewVal('')
  }

  function removeProp(key: string) {
    const next = { ...props }
    delete next[key]
    onChange(next)
  }

  function editPropValue(key: string, val: string) {
    onChange({ ...props, [key]: val })
  }

  return (
    <EditSection title="Properties">
      {visible.map(([k, v]) => (
        <div key={k} className="flex items-center gap-1 py-0.5 group">
          <span className="text-[10px] font-mono text-muted-foreground/60 w-1/3 shrink-0 truncate">{k}</span>
          <input value={v} onChange={e => editPropValue(k, e.target.value)}
            className="flex-1 min-w-0 px-1.5 py-0.5 text-[10px] font-mono bg-background border border-border/60 text-foreground/80 focus:outline-none focus:border-primary/50" />
          <button onClick={() => removeProp(k)} className="opacity-0 group-hover:opacity-100 text-muted-foreground/30 hover:text-red-400 transition-all shrink-0">
            <X size={9} />
          </button>
        </div>
      ))}
      <div className="flex gap-1 mt-1.5">
        <input value={newKey} onChange={e => setNewKey(e.target.value)} placeholder="key"
          onKeyDown={e => e.key === 'Enter' && addProp()}
          className="flex-1 px-2 py-1 text-[10px] font-mono bg-background border border-border text-foreground focus:outline-none focus:border-primary/60" />
        <input value={newVal} onChange={e => setNewVal(e.target.value)} placeholder="value"
          onKeyDown={e => e.key === 'Enter' && addProp()}
          className="flex-1 px-2 py-1 text-[10px] font-mono bg-background border border-border text-foreground focus:outline-none focus:border-primary/60" />
        <button onClick={addProp} className="px-2 py-1 text-[10px] border border-border text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">
          <Plus size={9} />
        </button>
      </div>
    </EditSection>
  )
}

// ── Generic children editor ───────────────────────────────────────────────────

function ChildrenEditor({ node, onAddChild, onRemoveChild }: {
  node: TreeNode
  onAddChild: (c: TreeNode) => void
  onRemoveChild: (id: string) => void
}) {
  const [childType, setChildType] = useState(CHILD_NODE_OPTIONS[0].type)
  const [childName, setChildName] = useState('')
  const [childValue, setChildValue] = useState('')
  const [open, setOpen] = useState(false)

  function addChild() {
    const opt = CHILD_NODE_OPTIONS.find(o => o.type === childType)!
    const c: TreeNode = {
      id: crypto.randomUUID(),
      type: childType,
      category: opt.category,
      name: childName.trim() || undefined,
      value: childValue.trim() || undefined,
      children: [],
    }
    onAddChild(c)
    setChildName(''); setChildValue('')
  }

  const children = node.children ?? []

  return (
    <EditSection title={`Children (${children.length})`}>
      {children.length > 0 && (
        <div className="space-y-0.5 mb-2">
          {children.map(c => (
            <div key={c.id} className="flex items-center gap-1.5 py-0.5 group">
              <span className="w-1.5 h-1.5 shrink-0" style={{ background: CATEGORY_COLORS[c.category]?.border ?? '#6b7280' }} />
              <span className="text-[10px] font-mono text-foreground/60 flex-1 truncate">{c.type}{(c.name || c.value) ? ` · ${c.name || c.value}` : ''}</span>
              <button onClick={() => onRemoveChild(c.id)} className="opacity-0 group-hover:opacity-100 text-muted-foreground/30 hover:text-red-400 transition-all shrink-0">
                <X size={9} />
              </button>
            </div>
          ))}
        </div>
      )}

      <button onClick={() => setOpen(v => !v)} className="flex items-center gap-1 text-[10px] text-primary/60 hover:text-primary transition-colors mb-1.5">
        <Plus size={9} /> Add child node
      </button>

      {open && (
        <div className="space-y-1 p-2 border border-border/60 bg-background/40">
          <select value={childType} onChange={e => setChildType(e.target.value)}
            className="w-full px-2 py-1 text-[10px] font-mono bg-background border border-border text-foreground focus:outline-none focus:border-primary/60">
            {CHILD_NODE_OPTIONS.map(o => (
              <option key={o.type} value={o.type}>{o.label}</option>
            ))}
          </select>
          <div className="flex gap-1">
            <input value={childName} onChange={e => setChildName(e.target.value)} placeholder="name (optional)"
              className="flex-1 px-2 py-1 text-[10px] font-mono bg-background border border-border text-foreground focus:outline-none focus:border-primary/60" />
            <input value={childValue} onChange={e => setChildValue(e.target.value)} placeholder="value (optional)"
              className="flex-1 px-2 py-1 text-[10px] font-mono bg-background border border-border text-foreground focus:outline-none focus:border-primary/60" />
          </div>
          <button onClick={addChild} className="w-full py-1 text-[10px] bg-primary/20 border border-primary/40 text-primary hover:bg-primary/30 transition-colors flex items-center justify-center gap-1">
            <Check size={9} /> Add Child
          </button>
        </div>
      )}
    </EditSection>
  )
}

// ─── Shared primitives ────────────────────────────────────────────────────────

function EditSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/40 mb-1.5">{title}</p>
      <div className="space-y-1">{children}</div>
    </div>
  )
}

function EditField({ label, value, placeholder, onChange }: {
  label: string; value: string; placeholder?: string; onChange: (v: string) => void
}) {
  return (
    <div className="flex items-center gap-2">
      <label className="text-[10px] text-muted-foreground/50 font-mono w-10 shrink-0">{label}</label>
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="flex-1 px-2 py-1 text-[10px] font-mono bg-background border border-border text-foreground focus:outline-none focus:border-primary/60"
      />
    </div>
  )
}

function ActionBtn({ icon, label, onClick, danger }: { icon: React.ReactNode; label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button onClick={onClick} title={label}
      className={`flex items-center gap-1 px-1.5 py-1 text-[10px] border transition-colors ${
        danger
          ? 'border-red-500/30 text-red-400/60 hover:bg-red-500/10 hover:text-red-400'
          : 'border-border text-muted-foreground/50 hover:bg-accent hover:text-foreground'
      }`}>
      {icon}<span>{label}</span>
    </button>
  )
}

function TabBtn({ active, disabled, icon, label, onClick }: {
  active: boolean; disabled?: boolean; icon: React.ReactNode; label: string; onClick: () => void
}) {
  return (
    <button onClick={onClick} disabled={disabled}
      className={`flex-1 flex items-center justify-center gap-1 py-2 text-[11px] font-medium transition-colors
        ${active ? 'text-primary border-b-2 border-primary bg-primary/5' : 'text-muted-foreground hover:text-foreground border-b-2 border-transparent'}
        ${disabled ? 'opacity-30 cursor-not-allowed' : ''}`}>
      {icon}{label}
    </button>
  )
}

function SideSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40 mb-1.5">{title}</p>
      {children}
    </div>
  )
}

// ─── FileInspection rows ──────────────────────────────────────────────────────

function InspectSection({ title, count, color, children }: { title: string; count: number; color: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(true)
  return (
    <div className="border border-border/60">
      <button onClick={() => setOpen(v => !v)} className="w-full flex items-center justify-between px-2.5 py-1.5 bg-card hover:bg-accent/50 transition-colors">
        <div className="flex items-center gap-1.5">
          {open ? <ChevronDown size={11} className="text-muted-foreground/50" /> : <ChevronRight size={11} className="text-muted-foreground/50" />}
          <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color }}>{title}</span>
        </div>
        <span className="text-[10px] text-muted-foreground/50 bg-muted px-1.5 py-0.5 rounded-full">{count}</span>
      </button>
      {open && count > 0 && <div className="px-1.5 pb-1.5 pt-0.5 bg-background/20 space-y-0.5">{children}</div>}
      {open && count === 0 && <p className="px-3 py-1.5 text-[10px] text-muted-foreground/30 bg-background/20">None</p>}
    </div>
  )
}

function FnRow({ fn }: { fn: FunctionInfo }) {
  const [open, setOpen] = useState(false)
  return (
    <div>
      <button onClick={() => setOpen(v => !v)} className="w-full flex items-center gap-1.5 px-2 py-1 hover:bg-accent/40 transition-colors text-left">
        {open ? <ChevronDown size={10} className="text-muted-foreground/30 shrink-0" /> : <ChevronRight size={10} className="text-muted-foreground/30 shrink-0" />}
        {fn.receiver && <span className="text-[10px] text-muted-foreground/40 font-mono shrink-0">({fn.receiver})</span>}
        <span className={`text-[11px] font-mono font-semibold truncate ${fn.isExported ? 'text-blue-300' : 'text-foreground/70'}`}>{fn.name}</span>
        <span className="ml-auto text-[10px] text-muted-foreground/30 shrink-0">:{fn.lineStart}</span>
      </button>
      {open && (
        <div className="px-3 pb-1.5 text-[10px] font-mono space-y-0.5 border-t border-border/20">
          {fn.comment && <p className="text-green-400/50 italic pt-1">{fn.comment}</p>}
          {fn.params.length > 0 && <p><span className="text-muted-foreground/40">params </span>{fn.params.join(', ')}</p>}
          {fn.returns.length > 0 && <p><span className="text-muted-foreground/40">returns </span>{fn.returns.join(', ')}</p>}
        </div>
      )}
    </div>
  )
}

function TypeRow({ type: t }: { type: TypeInfo }) {
  const [open, setOpen] = useState(false)
  return (
    <div>
      <button onClick={() => setOpen(v => !v)} className="w-full flex items-center gap-1.5 px-2 py-1 hover:bg-accent/40 transition-colors text-left">
        {open ? <ChevronDown size={10} className="text-muted-foreground/30 shrink-0" /> : <ChevronRight size={10} className="text-muted-foreground/30 shrink-0" />}
        <span className={`text-[11px] font-mono font-semibold truncate ${t.isExported ? 'text-teal-300' : 'text-foreground/70'}`}>{t.name}</span>
        <span className="text-[10px] text-muted-foreground/40 ml-1">{t.kind}</span>
      </button>
      {open && t.fields && t.fields.length > 0 && (
        <div className="px-2 pb-1.5 border-t border-border/20">
          {t.fields.map(f => (
            <div key={f.name} className="flex gap-2 py-0.5 text-[10px] font-mono">
              <span className="text-foreground/60">{f.name}</span>
              <span className="text-teal-400/50">{f.type}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function IfaceRow({ iface }: { iface: InterfaceInfo }) {
  const [open, setOpen] = useState(false)
  return (
    <div>
      <button onClick={() => setOpen(v => !v)} className="w-full flex items-center gap-1.5 px-2 py-1 hover:bg-accent/40 transition-colors text-left">
        {open ? <ChevronDown size={10} className="text-muted-foreground/30 shrink-0" /> : <ChevronRight size={10} className="text-muted-foreground/30 shrink-0" />}
        <span className={`text-[11px] font-mono font-semibold truncate ${iface.isExported ? 'text-green-300' : 'text-foreground/70'}`}>{iface.name}</span>
        <span className="ml-auto text-[10px] text-muted-foreground/30 shrink-0">{iface.methods.length}m</span>
      </button>
      {open && iface.methods.length > 0 && (
        <div className="px-2 pb-1.5 space-y-0.5 border-t border-border/20 pt-1">
          {iface.methods.map(m => (
            <p key={m.name} className="text-[10px] font-mono text-foreground/50">
              <span className="text-green-400/70">{m.name}</span>({m.params.join(', ')})
            </p>
          ))}
        </div>
      )}
    </div>
  )
}

function ImpRow({ imp }: { imp: ImportInfo }) {
  return (
    <div className="flex items-center gap-1.5 px-2 py-0.5 hover:bg-accent/30 text-[10px] font-mono">
      {imp.alias && <span className="text-orange-300/60">{imp.alias}</span>}
      <span className="text-cyan-300/70 truncate">{imp.path}</span>
    </div>
  )
}

function VarRow({ v }: { v: VarInfo }) {
  return (
    <div className="flex items-center gap-2 px-2 py-0.5 hover:bg-accent/30 text-[10px] font-mono">
      <span className={v.isExported ? 'text-orange-300' : 'text-foreground/50'}>{v.name}</span>
      {v.type && <span className="text-sky-400/50">{v.type}</span>}
      {v.value && <span className="text-muted-foreground/30">= {v.value}</span>}
    </div>
  )
}
