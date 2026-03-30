import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { LayoutDashboard, GitBranch, Plus, X, Loader2 } from 'lucide-react'
import { projectApi, type Project } from '@/lib/api'
import { useFileTreeStore } from '@/store/fileTreeStore'
import { UploadModal } from '@/components/upload/UploadModal'
import toast from 'react-hot-toast'

const NAV_ITEMS = [
  { to: '/project', icon: LayoutDashboard, label: 'Workflow' },
  { to: '/ast',     icon: GitBranch,       label: 'AST Visualizer' },
]

const LANG_COLOR: Record<string, string> = {
  go: 'var(--lang-go)', ts: 'var(--lang-ts)',
  py: 'var(--lang-py)', sql: 'var(--lang-sql)',
  typescript: 'var(--lang-ts)', javascript: 'var(--lang-ts)',
  python: 'var(--lang-py)',
}

// ─── New Project Modal ────────────────────────────────────────
function NewProjectModal({ onClose }: { onClose: () => void }) {
  const [name, setName]     = useState('')
  const [desc, setDesc]     = useState('')
  const [lang, setLang]     = useState('go')
  const queryClient         = useQueryClient()
  const { setProject }      = useFileTreeStore()
  const navigate            = useNavigate()

  const createMut = useMutation({
    mutationFn: () => projectApi.create(name.trim(), desc.trim(), lang),
    onSuccess: async (res) => {
      const project = res.data
      // Fetch full project (with files = []) to set in tree store
      const full = await projectApi.get(project.id)
      setProject(full.data)
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      toast.success(`Project "${project.name}" created`)
      navigate('/project')
      onClose()
    },
    onError: () => toast.error('Failed to create project'),
  })

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 300,
      background: 'rgba(0,0,0,0.6)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}
    onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{
        width: 360, borderRadius: 12,
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-default)',
        boxShadow: 'var(--shadow-lg)',
        padding: 20,
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
          <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
            New Project
          </span>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-disabled)', padding: 2 }}>
            <X size={14} />
          </button>
        </div>

        {/* Fields */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div>
            <label style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
              Project name *
            </label>
            <input
              autoFocus
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="my-awesome-api"
              className="field-input"
              onKeyDown={e => e.key === 'Enter' && name.trim() && createMut.mutate()}
            />
          </div>
          <div>
            <label style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
              Description
            </label>
            <input
              value={desc}
              onChange={e => setDesc(e.target.value)}
              placeholder="Optional description"
              className="field-input"
            />
          </div>
          <div>
            <label style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
              Language
            </label>
            <select
              value={lang}
              onChange={e => setLang(e.target.value)}
              className="field-input"
            >
              <option value="go">Go</option>
              <option value="typescript">TypeScript</option>
              <option value="python">Python</option>
              <option value="sql">SQL</option>
            </select>
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
          <button onClick={onClose} style={{
            height: 32, padding: '0 12px', borderRadius: 6, border: '1px solid var(--border-default)',
            background: 'var(--bg-raised)', color: 'var(--text-secondary)', fontSize: 12, cursor: 'pointer',
          }}>
            Cancel
          </button>
          <button
            disabled={!name.trim() || createMut.isPending}
            onClick={() => createMut.mutate()}
            style={{
              height: 32, padding: '0 14px', borderRadius: 6, border: 'none',
              background: name.trim() ? 'var(--accent)' : 'var(--border-default)',
              color: '#fff', fontSize: 12, fontWeight: 500,
              cursor: name.trim() ? 'pointer' : 'not-allowed',
              display: 'flex', alignItems: 'center', gap: 6,
              opacity: createMut.isPending ? 0.7 : 1,
            }}
          >
            {createMut.isPending && <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} />}
            Create
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Sidebar ──────────────────────────────────────────────────
export function Sidebar() {
  const navigate    = useNavigate()
  const location    = useLocation()
  const [modal, setModal] = useState(false)
  const [uploadModal, setUploadModal] = useState(false)
  const { setProject, projectId } = useFileTreeStore()

  const { data, isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: () => projectApi.list().then(r => r.data.projects),
    retry: false,
  })

  const projects: Project[] = data ?? []

  async function handleSelectProject(p: Project) {
    try {
      const full = await projectApi.get(p.id)
      setProject(full.data)
      navigate('/project')
    } catch {
      toast.error('Failed to load project')
    }
  }

  return (
    <>
      {modal && <NewProjectModal onClose={() => setModal(false)} />}
      <UploadModal isOpen={uploadModal} onClose={() => setUploadModal(false)} />

      <aside style={{
        display: 'flex', flexDirection: 'column', height: '100%',
        background: 'var(--bg-surface)',
        borderRight: '1px solid var(--border-subtle)',
        overflow: 'hidden',
      }}>

        {/* ── Nav items ── */}
        <div style={{ padding: '6px 8px', borderBottom: '1px solid var(--border-subtle)' }}>
          {NAV_ITEMS.map(({ to, icon: Icon, label }) => {
            const active = location.pathname === to || location.pathname.startsWith(to + '/')
            return (
              <button
                key={to}
                data-testid={`nav-${label.toLowerCase().replace(/\s+/g, '-')}`}
                onClick={() => navigate(to)}
                style={{
                  width: '100%', height: 30,
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '0 8px', borderRadius: 5,
                  fontSize: 12, fontWeight: active ? 500 : 400,
                  border: 'none', cursor: 'pointer',
                  transition: 'background 120ms, color 120ms',
                  background: active ? 'var(--accent-muted)' : 'transparent',
                  color: active ? 'var(--accent)' : 'var(--text-secondary)',
                  borderLeft: `2px solid ${active ? 'var(--accent)' : 'transparent'}`,
                  marginBottom: 1,
                }}
                onMouseEnter={e => { if (!active) { e.currentTarget.style.background = 'var(--bg-raised)'; e.currentTarget.style.color = 'var(--text-primary)' } }}
                onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)' } }}
              >
                <Icon size={14} style={{ flexShrink: 0 }} />
                <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</span>
              </button>
            )
          })}
        </div>

        {/* ── Project list ── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '8px 8px 6px', overflow: 'hidden' }}>

          {/* New project button */}
          <button
            data-testid="new-project-btn"
            onClick={() => setUploadModal(true)}
            style={{
              width: '100%', height: 28,
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '0 8px', borderRadius: 5,
              fontSize: 11, fontWeight: 400,
              border: '1px dashed var(--border-default)',
              cursor: 'pointer', transition: 'all 150ms',
              background: 'transparent', color: 'var(--text-disabled)',
              marginBottom: 8,
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.background = 'var(--accent-muted)'; e.currentTarget.style.color = 'var(--text-secondary)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-default)'; e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-disabled)' }}
          >
            <Plus size={11} style={{ flexShrink: 0 }} />
            New Project
          </button>

          {/* Section label */}
          <div style={{
            fontSize: 9, fontWeight: 600, letterSpacing: '0.10em',
            textTransform: 'uppercase', color: 'var(--text-disabled)',
            padding: '0 8px', marginBottom: 3,
          }}>
            Projects
          </div>

          {/* Items */}
          {isLoading ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 8px', color: 'var(--text-disabled)', fontSize: 11 }}>
              <Loader2 size={11} style={{ animation: 'spin 1s linear infinite' }} />
              Loading…
            </div>
          ) : projects.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, gap: 8, padding: '16px 8px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 8px)', gap: 4, opacity: 0.2 }}>
                {Array(9).fill(0).map((_, i) => <div key={i} style={{ width: 8, height: 8, borderRadius: 2, background: 'var(--accent)' }} />)}
              </div>
              <p style={{ fontSize: 11, textAlign: 'center', color: 'var(--text-disabled)', lineHeight: 1.5 }}>
                No projects yet.<br />Create your first one.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 1, overflowY: 'auto' }} className="inspector-scroll">
              {projects.map(p => {
                const active = p.id === projectId
                return (
                  <div
                    key={p.id}
                    data-testid={`project-item-${p.id}`}
                    onClick={() => handleSelectProject(p)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 7,
                      height: 28, padding: '0 8px', borderRadius: 5,
                      cursor: 'pointer', transition: 'background 100ms, color 100ms',
                      fontSize: 11, fontWeight: active ? 500 : 400,
                      background: active ? 'rgba(99,102,241,0.12)' : 'transparent',
                      color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
                      borderLeft: `2px solid ${active ? 'var(--accent)' : 'transparent'}`,
                    }}
                    onMouseEnter={e => { if (!active) { e.currentTarget.style.background = 'var(--bg-raised)'; e.currentTarget.style.color = 'var(--text-primary)' } }}
                    onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)' } }}
                  >
                    <div style={{ width: 5, height: 5, borderRadius: 9999, flexShrink: 0, background: active ? 'var(--accent)' : 'var(--border-strong)' }} />
                    <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
                    <span style={{ fontSize: 9, fontFamily: 'var(--font-mono)', fontWeight: 600, textTransform: 'uppercase', flexShrink: 0, color: LANG_COLOR[p.language] ?? 'var(--text-disabled)' }}>
                      {p.language.slice(0, 2)}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </aside>
    </>
  )
}
