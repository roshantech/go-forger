import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { CheckCircle2, AlertCircle } from 'lucide-react'
import { useProcessingStore } from '@/store/processingStore'

export function ProcessingPage() {
  const navigate  = useNavigate()
  const state     = (useLocation().state ?? {}) as {
    projectName?: string
    fileCount?: number
    language?: string
    skippedDirs?: string[]
    warnings?: string[]
  }

  const { reset } = useProcessingStore()

  useEffect(() => {
    return () => reset()
  }, [reset])

  const fileCount   = state.fileCount   ?? 0
  const language    = state.language    ?? ''
  const skippedDirs = state.skippedDirs ?? []
  const warnings    = state.warnings    ?? []

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--bg-base)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{ width: 480, display: 'flex', flexDirection: 'column', gap: 24 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
            Project imported
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            {state.projectName}
          </div>
        </div>

        <div style={{ padding: '16px', borderRadius: 10,
          background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)' }}>
          <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
            <div style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ fontSize: 22, fontWeight: 600, color: 'var(--text-primary)' }}>
                {fileCount}
              </div>
              <div style={{ fontSize: 10, color: 'var(--text-secondary)',
                textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                files
              </div>
            </div>
            <div style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ fontSize: 22, fontWeight: 600, color: 'var(--text-primary)',
                textTransform: 'uppercase' }}>
                {language}
              </div>
              <div style={{ fontSize: 10, color: 'var(--text-secondary)',
                textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                language
              </div>
            </div>
            {skippedDirs.length > 0 && (
              <div style={{ flex: 1, textAlign: 'center' }}>
                <div style={{ fontSize: 22, fontWeight: 600, color: 'var(--text-primary)' }}>
                  {skippedDirs.length}
                </div>
                <div style={{ fontSize: 10, color: 'var(--text-secondary)',
                  textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                  dirs skipped
                </div>
              </div>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12,
            fontSize: 13, color: 'var(--text-primary)' }}>
            <CheckCircle2 size={16} style={{ color: '#10b981', flexShrink: 0 }} />
            All files processed successfully
          </div>
          <button
            data-testid="processing-view-btn"
            onClick={() => navigate('/project')}
            style={{
              width: '100%', height: 38, borderRadius: 8, border: 'none',
              background: 'var(--accent)', color: '#fff',
              fontSize: 13, fontWeight: 500, cursor: 'pointer',
            }}
          >
            View Project Tree
          </button>
        </div>

        {warnings.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {warnings.map((w, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, fontSize: 11,
                color: '#f59e0b' }}>
                <AlertCircle size={12} style={{ flexShrink: 0, marginTop: 1 }} />
                {w}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
