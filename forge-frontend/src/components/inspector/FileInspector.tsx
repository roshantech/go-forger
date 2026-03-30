import { useState, useMemo } from 'react'
import { ChevronDown, ChevronRight, Search } from 'lucide-react'
import type { FileInspection, FunctionInfo, TypeInfo, InterfaceInfo, VarInfo, ImportInfo } from '@/lib/api'
import { FileTypeIcon } from '@/components/ui/FileTypeIcon'

interface Props {
  inspection: FileInspection
}

// ─── Section wrapper ──────────────────────────────────────────
function Section({
  title, count, children,
}: {
  title: string; count: number; children: React.ReactNode
}) {
  const [open, setOpen] = useState(true)
  return (
    <div style={{ borderBottom: '1px solid var(--border-subtle)' }}>
      <button
        data-testid={`section-${title.toLowerCase()}`}
        onClick={() => setOpen(v => !v)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '7px 12px', background: 'transparent', border: 'none', cursor: 'pointer',
          transition: 'background 100ms',
        }}
        onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-raised)'}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {open
            ? <ChevronDown  size={11} style={{ color: 'var(--text-disabled)' }} />
            : <ChevronRight size={11} style={{ color: 'var(--text-disabled)' }} />
          }
          <span style={{
            fontSize: 10, fontWeight: 600, letterSpacing: '0.08em',
            textTransform: 'uppercase', color: 'var(--accent)',
          }}>
            {title}
          </span>
        </div>
        <span style={{
          fontSize: 10, fontFamily: 'var(--font-mono)',
          color: 'var(--text-disabled)',
          background: 'var(--bg-raised)',
          padding: '1px 5px', borderRadius: 4,
        }}>
          {count}
        </span>
      </button>
      {open && count > 0 && (
        <div style={{ padding: '0 8px 8px' }}>{children}</div>
      )}
      {open && count === 0 && (
        <p style={{ fontSize: 11, color: 'var(--text-disabled)', padding: '4px 12px 8px', fontStyle: 'italic' }}>
          None
        </p>
      )}
    </div>
  )
}

// ─── Function row ─────────────────────────────────────────────
function FunctionRow({ fn, onGoto }: { fn: FunctionInfo; onGoto?: (line: number) => void }) {
  const [exp, setExp] = useState(false)
  return (
    <div
      data-testid={`fn-${fn.name}`}
      style={{
        borderRadius: 6, overflow: 'hidden',
        border: '1px solid var(--border-subtle)', marginBottom: 3,
      }}
    >
      <button
        onClick={() => setExp(v => !v)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 0,
          background: 'var(--bg-raised)', border: 'none', cursor: 'pointer',
          padding: 0, transition: 'background 100ms',
        }}
        onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-overlay)'}
        onMouseLeave={e => e.currentTarget.style.background = 'var(--bg-raised)'}
      >
        {/* 2px accent bar */}
        <div style={{
          width: 2, alignSelf: 'stretch', flexShrink: 0,
          background: fn.isExported ? 'var(--accent)' : 'var(--border-strong)',
        }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 8px', flex: 1, minWidth: 0 }}>
          {exp
            ? <ChevronDown  size={10} style={{ color: 'var(--text-disabled)', flexShrink: 0 }} />
            : <ChevronRight size={10} style={{ color: 'var(--text-disabled)', flexShrink: 0 }} />
          }
          {fn.receiver && (
            <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-disabled)', flexShrink: 0 }}>
              ({fn.receiver})
            </span>
          )}
          <span style={{
            fontSize: 11, fontFamily: 'var(--font-mono)', fontWeight: 500,
            color: fn.isExported ? 'var(--text-primary)' : 'var(--text-secondary)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1,
          }}>
            {fn.name}
          </span>
        </div>

        {/* Line number pill */}
        <button
          onClick={e => { e.stopPropagation(); onGoto?.(fn.lineStart) }}
          style={{
            flexShrink: 0, marginRight: 8,
            fontSize: 9, fontFamily: 'var(--font-mono)', fontWeight: 600,
            color: 'var(--accent)', background: 'var(--accent-muted)',
            padding: '2px 5px', borderRadius: 4, border: 'none', cursor: 'pointer',
            transition: 'background 100ms',
          }}
          onMouseEnter={e => { e.stopPropagation(); e.currentTarget.style.background = 'rgba(99,102,241,0.22)' }}
          onMouseLeave={e => e.currentTarget.style.background = 'var(--accent-muted)'}
          title="Go to line"
        >
          L{fn.lineStart}
        </button>
      </button>

      {exp && (
        <div style={{
          padding: '6px 10px 8px 18px',
          borderTop: '1px solid var(--border-subtle)',
          background: 'var(--bg-base)',
          fontSize: 10, fontFamily: 'var(--font-mono)',
          display: 'flex', flexDirection: 'column', gap: 3,
        }}>
          {fn.comment && (
            <span style={{ color: '#10B981', fontStyle: 'italic' }}>{fn.comment}</span>
          )}
          {fn.params.length > 0 && (
            <div>
              <span style={{ color: 'var(--text-disabled)' }}>params </span>
              {fn.params.map((p, i) => (
                <span key={i}>
                  <span style={{ color: 'var(--lang-ts)', background: 'var(--lang-ts-bg)', padding: '1px 4px', borderRadius: 3, marginRight: 3 }}>{p}</span>
                </span>
              ))}
            </div>
          )}
          {fn.returns.length > 0 && (
            <div>
              <span style={{ color: 'var(--text-disabled)' }}>returns </span>
              {fn.returns.map((r, i) => (
                <span key={i} style={{ color: 'var(--lang-go)', background: 'var(--lang-go-bg)', padding: '1px 4px', borderRadius: 3, marginRight: 3 }}>{r}</span>
              ))}
            </div>
          )}
          <span style={{ color: 'var(--text-disabled)' }}>lines {fn.lineStart}–{fn.lineEnd}</span>
        </div>
      )}
    </div>
  )
}

// ─── Type row ─────────────────────────────────────────────────
function TypeRow({ type: t }: { type: TypeInfo }) {
  const [exp, setExp] = useState(false)
  return (
    <div style={{ borderRadius: 6, overflow: 'hidden', border: '1px solid var(--border-subtle)', marginBottom: 3 }}>
      <button
        onClick={() => setExp(v => !v)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 0,
          background: 'var(--bg-raised)', border: 'none', cursor: 'pointer', padding: 0,
        }}
        onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-overlay)'}
        onMouseLeave={e => e.currentTarget.style.background = 'var(--bg-raised)'}
      >
        <div style={{ width: 2, alignSelf: 'stretch', flexShrink: 0, background: t.isExported ? 'var(--lang-ts)' : 'var(--border-strong)' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 8px', flex: 1, minWidth: 0 }}>
          {exp ? <ChevronDown size={10} style={{ color: 'var(--text-disabled)' }} /> : <ChevronRight size={10} style={{ color: 'var(--text-disabled)' }} />}
          <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', fontWeight: 500, color: t.isExported ? 'var(--text-primary)' : 'var(--text-secondary)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.name}</span>
          <span style={{ fontSize: 9, color: 'var(--text-disabled)', marginRight: 4 }}>{t.kind}</span>
        </div>
        {t.fields && <span style={{ fontSize: 9, fontFamily: 'var(--font-mono)', color: 'var(--text-disabled)', marginRight: 8 }}>{t.fields.length}f</span>}
      </button>
      {exp && t.fields && t.fields.length > 0 && (
        <div style={{ padding: '4px 10px 6px 12px', borderTop: '1px solid var(--border-subtle)', background: 'var(--bg-base)' }}>
          {t.fields.map(f => (
            <div key={f.name} style={{ display: 'flex', gap: 8, padding: '2px 0', fontSize: 10, fontFamily: 'var(--font-mono)' }}>
              <span style={{ color: 'var(--text-secondary)', minWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis' }}>{f.name}</span>
              <span style={{ color: 'var(--lang-ts)' }}>{f.type}</span>
              {f.tag && <span style={{ color: 'var(--text-disabled)', fontSize: 9 }}>{f.tag}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Interface row ────────────────────────────────────────────
function InterfaceRow({ iface }: { iface: InterfaceInfo }) {
  const [exp, setExp] = useState(false)
  return (
    <div style={{ borderRadius: 6, overflow: 'hidden', border: '1px solid var(--border-subtle)', marginBottom: 3 }}>
      <button
        onClick={() => setExp(v => !v)}
        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 0, background: 'var(--bg-raised)', border: 'none', cursor: 'pointer', padding: 0 }}
        onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-overlay)'}
        onMouseLeave={e => e.currentTarget.style.background = 'var(--bg-raised)'}
      >
        <div style={{ width: 2, alignSelf: 'stretch', flexShrink: 0, background: 'var(--color-success)' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 8px', flex: 1 }}>
          {exp ? <ChevronDown size={10} style={{ color: 'var(--text-disabled)' }} /> : <ChevronRight size={10} style={{ color: 'var(--text-disabled)' }} />}
          <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', fontWeight: 500, color: 'var(--text-primary)' }}>{iface.name}</span>
        </div>
        <span style={{ fontSize: 9, fontFamily: 'var(--font-mono)', color: 'var(--text-disabled)', marginRight: 8 }}>{iface.methods.length}m</span>
      </button>
      {exp && iface.methods.length > 0 && (
        <div style={{ padding: '4px 10px 6px 12px', borderTop: '1px solid var(--border-subtle)', background: 'var(--bg-base)' }}>
          {iface.methods.map(m => (
            <div key={m.name} style={{ fontSize: 10, fontFamily: 'var(--font-mono)', padding: '2px 0', color: 'var(--text-secondary)' }}>
              <span style={{ color: 'var(--color-success)' }}>{m.name}</span>
              ({m.params.join(', ')})
              {m.returns.length > 0 && <span style={{ color: 'var(--text-disabled)' }}> → {m.returns.join(', ')}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Imports (grouped) ────────────────────────────────────────
function ImportsPanel({ imports }: { imports: ImportInfo[] }) {
  const stdlibCorrect     = imports.filter(i => !i.path.includes('.') && !i.path.startsWith('/'))
  const internalCorrect   = imports.filter(i => i.path.includes('forge') || i.path.startsWith('./') || i.path.startsWith('../'))
  const thirdPartyCorrect = imports.filter(i => !stdlibCorrect.includes(i) && !internalCorrect.includes(i))

  const groups = [
    { label: 'Standard Library', items: stdlibCorrect,     color: 'var(--lang-go)' },
    { label: 'Third-party',       items: thirdPartyCorrect, color: 'var(--accent)'  },
    { label: 'Internal',          items: internalCorrect,   color: 'var(--lang-py)' },
  ].filter(g => g.items.length > 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {groups.map(group => (
        <div key={group.label}>
          <div style={{
            fontSize: 9, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase',
            color: group.color, marginBottom: 4, padding: '0 2px',
          }}>
            {group.label}
          </div>
          {group.items.map(imp => (
            <div key={imp.path} style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '3px 6px', borderRadius: 4, marginBottom: 1,
              fontSize: 11, fontFamily: 'var(--font-mono)',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-raised)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              {imp.alias && <span style={{ color: 'var(--lang-py)', flexShrink: 0 }}>{imp.alias}</span>}
              <span style={{ color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{imp.path}</span>
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

// ─── Var row ──────────────────────────────────────────────────
function VarRow({ v, isConst }: { v: VarInfo; isConst?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '3px 6px', borderRadius: 4, fontSize: 11, fontFamily: 'var(--font-mono)' }}
      onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-raised)'}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
    >
      <span style={{ color: v.isExported ? (isConst ? 'var(--color-error)' : 'var(--color-warning)') : 'var(--text-secondary)' }}>{v.name}</span>
      {v.type  && <span style={{ color: 'var(--lang-ts)', fontSize: 10 }}>{v.type}</span>}
      {v.value && <span style={{ color: 'var(--text-disabled)', fontSize: 10 }}>= {v.value}</span>}
    </div>
  )
}

// ─── Main export ──────────────────────────────────────────────
export default function FileInspector({ inspection }: Props) {
  const [query, setQuery]       = useState('')
  const [exportedOnly, setExportedOnly] = useState(false)

  const q = query.toLowerCase()

  const fns  = useMemo(() => inspection.functions.filter(f =>
    f.name.toLowerCase().includes(q) && (!exportedOnly || f.isExported)
  ), [inspection.functions, q, exportedOnly])

  const types = useMemo(() => inspection.types.filter(t =>
    t.name.toLowerCase().includes(q) && (!exportedOnly || t.isExported)
  ), [inspection.types, q, exportedOnly])

  const ifaces = useMemo(() => inspection.interfaces.filter(i =>
    i.name.toLowerCase().includes(q) && (!exportedOnly || i.isExported)
  ), [inspection.interfaces, q, exportedOnly])

  const imports = useMemo(() => inspection.imports.filter(i =>
    i.path.toLowerCase().includes(q)
  ), [inspection.imports, q])

  const vars = useMemo(() => inspection.variables.filter(v =>
    v.name.toLowerCase().includes(q) && (!exportedOnly || v.isExported)
  ), [inspection.variables, q, exportedOnly])

  const consts = useMemo(() => inspection.constants.filter(c =>
    c.name.toLowerCase().includes(q) && (!exportedOnly || c.isExported)
  ), [inspection.constants, q, exportedOnly])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

      {/* ── File header ── */}
      <div style={{
        padding: '8px 12px', borderBottom: '1px solid var(--border-subtle)', flexShrink: 0,
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <FileTypeIcon language="go" size="sm" />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {inspection.fileName}
          </div>
          <div style={{ fontSize: 10, color: 'var(--text-disabled)', fontFamily: 'var(--font-mono)' }}>
            package <span style={{ color: 'var(--lang-go)' }}>{inspection.packageName}</span>
          </div>
        </div>
      </div>

      {/* ── Search + toggle ── */}
      <div style={{ padding: '8px 10px', borderBottom: '1px solid var(--border-subtle)', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
        {/* Search bar */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          background: 'var(--bg-raised)', border: '1px solid var(--border-default)',
          borderRadius: 6, padding: '5px 8px',
          transition: 'border-color 150ms',
        }}
        onFocusCapture={e => (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--accent)'}
        onBlurCapture={e => (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border-default)'}
        >
          <Search size={11} style={{ color: 'var(--text-disabled)', flexShrink: 0 }} />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search functions, types…"
            style={{
              flex: 1, background: 'transparent', border: 'none', outline: 'none',
              fontSize: 11, color: 'var(--text-primary)', caretColor: 'var(--accent)',
            }}
          />
        </div>

        {/* Exported toggle */}
        <label style={{ display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer', userSelect: 'none' }}>
          <div
            onClick={() => setExportedOnly(v => !v)}
            style={{
              width: 28, height: 15, borderRadius: 9999, position: 'relative', flexShrink: 0,
              background: exportedOnly ? 'var(--accent)' : 'var(--border-default)',
              transition: 'background 150ms', cursor: 'pointer',
            }}
          >
            <div style={{
              position: 'absolute', top: 2, left: exportedOnly ? 15 : 2,
              width: 11, height: 11, borderRadius: 9999,
              background: '#fff', transition: 'left 150ms',
            }} />
          </div>
          <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Exported only</span>
        </label>
      </div>

      {/* ── Parse errors ── */}
      {inspection.parseErrors && inspection.parseErrors.length > 0 && (
        <div style={{ margin: '8px 10px', padding: '8px 10px', borderRadius: 6, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)' }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-error)', marginBottom: 4 }}>Parse errors</p>
          {inspection.parseErrors.map((e, i) => (
            <p key={i} style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--color-error)', opacity: 0.8 }}>{e}</p>
          ))}
        </div>
      )}

      {/* ── Sections ── */}
      <div style={{ flex: 1, overflowY: 'auto' }} className="inspector-scroll">
        <Section title="Functions"  count={fns.length}>
          {fns.map(fn => <FunctionRow key={fn.name + fn.lineStart} fn={fn} />)}
        </Section>
        <Section title="Types"      count={types.length}>
          {types.map(t => <TypeRow key={t.name} type={t} />)}
        </Section>
        <Section title="Interfaces" count={ifaces.length}>
          {ifaces.map(i => <InterfaceRow key={i.name} iface={i} />)}
        </Section>
        <Section title="Imports"    count={imports.length}>
          <ImportsPanel imports={imports} />
        </Section>
        <Section title="Variables"  count={vars.length}>
          {vars.map(v => <VarRow key={v.name} v={v} />)}
        </Section>
        <Section title="Constants"  count={consts.length}>
          {consts.map(c => <VarRow key={c.name} v={c} isConst />)}
        </Section>
      </div>
    </div>
  )
}
