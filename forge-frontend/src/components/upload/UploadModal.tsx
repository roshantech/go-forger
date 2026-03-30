import { useState, useRef, useCallback } from 'react'
import { Upload, Github, X, AlertCircle, Loader2 } from 'lucide-react'
import api, { type Project } from '@/lib/api'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useFileTreeStore } from '@/store/fileTreeStore'

interface UploadModalProps {
  isOpen: boolean
  onClose: () => void
}

const MAX_ZIP_MB = 100

function isValidGitURL(url: string) {
  return /^(https?:\/\/)?(github\.com|gitlab\.com)\/[\w.-]+\/[\w.-]+/.test(url)
}

export function UploadModal({ isOpen, onClose }: UploadModalProps) {
  const navigate     = useNavigate()
  const queryClient  = useQueryClient()
  const { setProject } = useFileTreeStore()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [dragOver, setDragOver]       = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [githubURL, setGithubURL]     = useState('')
  const [isLoading, setIsLoading]     = useState(false)
  const [loadingType, setLoadingType] = useState<'zip' | 'url' | null>(null)
  const [error, setError]             = useState<string | null>(null)

  const handleFile = useCallback((file: File) => {
    setError(null)
    if (!file.name.endsWith('.zip')) {
      setError('Only .zip files are accepted')
      return
    }
    if (file.size > MAX_ZIP_MB * 1024 * 1024) {
      setError(`File is ${(file.size / 1024 / 1024).toFixed(1)} MB — maximum is ${MAX_ZIP_MB} MB`)
      return
    }
    setSelectedFile(file)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragOver(false)
      const file = e.dataTransfer.files[0]
      if (file) handleFile(file)
    },
    [handleFile],
  )

  async function handleUploadZip() {
    if (!selectedFile) return
    setIsLoading(true)
    setLoadingType('zip')
    setError(null)
    try {
      const formData = new FormData()
      formData.append('file', selectedFile)
      const { data } = await api.post<{ project: Project }>('/projects/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      await finishImport(data.project)
    } catch (err: any) {
      setError(err.response?.data?.error ?? 'Upload failed. Please try again.')
    } finally {
      setIsLoading(false)
      setLoadingType(null)
    }
  }

  async function handleImportURL() {
    if (!isValidGitURL(githubURL)) return
    setIsLoading(true)
    setLoadingType('url')
    setError(null)
    try {
      const { data } = await api.post<{ project: Project }>('/projects/import', { url: githubURL })
      await finishImport(data.project)
    } catch (err: any) {
      setError(err.response?.data?.error ?? 'Import failed. Please try again.')
    } finally {
      setIsLoading(false)
      setLoadingType(null)
    }
  }

  async function finishImport(proj: Project) {
    // Fetch the full project with files so the tree store is populated
    const full = await api.get(`/projects/${proj.id}`)
    setProject(full.data)
    queryClient.invalidateQueries({ queryKey: ['projects'] })
    onClose()
    navigate('/project')
  }

  if (!isOpen) return null

  const SKIPPED = ['node_modules', 'vendor', '.git', 'dist', 'build', '__pycache__', '.next', 'target']

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 300,
        background: 'rgba(0,0,0,0.6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        style={{
          width: 480, background: 'var(--bg-surface)',
          border: '1px solid var(--border-default)',
          borderRadius: 16, padding: 24,
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 20 }}>
          <span style={{ flex: 1, fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>
            Import your project
          </span>
          <button
            data-testid="upload-modal-close"
            onClick={onClose}
            disabled={isLoading}
            style={{ background: 'none', border: 'none', cursor: isLoading ? 'not-allowed' : 'pointer',
              color: 'var(--text-secondary)', padding: 4 }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Error banner */}
        {error && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px',
            background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
            borderRadius: 8, marginBottom: 16,
          }}>
            <AlertCircle size={14} style={{ color: '#ef4444', flexShrink: 0 }} />
            <span style={{ fontSize: 12, color: '#ef4444' }}>{error}</span>
          </div>
        )}

        {/* Drop zone */}
        <div
          data-testid="upload-dropzone"
          onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => !isLoading && fileInputRef.current?.click()}
          style={{
            border: `1.5px dashed ${dragOver ? 'var(--accent)' : selectedFile ? '#10b981' : 'var(--border-default)'}`,
            borderRadius: 10, padding: '28px 20px',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
            cursor: isLoading ? 'not-allowed' : 'pointer', transition: 'border-color 150ms',
            background: dragOver ? 'var(--accent-muted)' : 'var(--bg-raised)',
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".zip"
            style={{ display: 'none' }}
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
          />
          <Upload size={24} style={{ color: selectedFile ? '#10b981' : 'var(--text-secondary)' }} />
          {selectedFile ? (
            <>
              <span style={{ fontSize: 13, fontWeight: 500, color: '#10b981' }}>
                {selectedFile.name}
              </span>
              <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                {(selectedFile.size / 1024 / 1024).toFixed(1)} MB — click to change
              </span>
            </>
          ) : (
            <>
              <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>
                Drop your ZIP here or click to browse
              </span>
              <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                Max {MAX_ZIP_MB} MB · .zip only
              </span>
            </>
          )}
        </div>

        <button
          data-testid="upload-submit"
          disabled={!selectedFile || isLoading}
          onClick={handleUploadZip}
          style={{
            width: '100%', height: 38, marginTop: 10, borderRadius: 8, border: 'none',
            background: selectedFile && !isLoading ? 'var(--accent)' : 'var(--border-default)',
            color: '#fff', fontSize: 13, fontWeight: 500,
            cursor: selectedFile && !isLoading ? 'pointer' : 'not-allowed',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}
        >
          {loadingType === 'zip' && <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />}
          {loadingType === 'zip' ? 'Uploading…' : 'Upload Project'}
        </button>

        {/* Divider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '20px 0' }}>
          <div style={{ flex: 1, height: 1, background: 'var(--border-subtle)' }} />
          <span style={{ fontSize: 11, color: 'var(--text-disabled)' }}>or import from URL</span>
          <div style={{ flex: 1, height: 1, background: 'var(--border-subtle)' }} />
        </div>

        {/* GitHub URL input */}
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{
            flex: 1, display: 'flex', alignItems: 'center', gap: 8,
            height: 38, padding: '0 12px', borderRadius: 8,
            background: 'var(--bg-raised)', border: '1px solid var(--border-default)',
          }}>
            <Github size={14} style={{ color: 'var(--text-secondary)', flexShrink: 0 }} />
            <input
              data-testid="upload-url-input"
              placeholder="https://github.com/user/repo"
              value={githubURL}
              disabled={isLoading}
              onChange={(e) => { setGithubURL(e.target.value); setError(null) }}
              style={{
                flex: 1, background: 'none', border: 'none', outline: 'none',
                fontSize: 12, color: 'var(--text-primary)', caretColor: 'var(--accent)',
              }}
              onKeyDown={(e) => { if (e.key === 'Enter' && isValidGitURL(githubURL)) handleImportURL() }}
            />
          </div>
          <button
            data-testid="upload-url-submit"
            disabled={!isValidGitURL(githubURL) || isLoading}
            onClick={handleImportURL}
            style={{
              height: 38, padding: '0 16px', borderRadius: 8,
              border: '1px solid var(--border-default)',
              background: 'var(--bg-raised)', color: 'var(--text-primary)',
              fontSize: 12, fontWeight: 500,
              cursor: isValidGitURL(githubURL) && !isLoading ? 'pointer' : 'not-allowed',
              display: 'flex', alignItems: 'center', gap: 6,
              opacity: !isValidGitURL(githubURL) || isLoading ? 0.5 : 1,
            }}
          >
            {loadingType === 'url' && <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} />}
            {loadingType === 'url' ? 'Cloning…' : 'Import'}
          </button>
        </div>

        {/* Skipped dirs notice */}
        <div style={{
          marginTop: 16, padding: '10px 12px', borderRadius: 8,
          background: 'var(--bg-raised)', border: '1px solid var(--border-subtle)',
        }}>
          <div style={{
            fontSize: 10, color: 'var(--text-disabled)',
            textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6,
          }}>
            Auto-excluded directories
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {SKIPPED.map((dir) => (
              <span key={dir} style={{
                fontSize: 10, fontFamily: 'monospace',
                padding: '1px 6px', borderRadius: 4,
                background: 'var(--bg-base)', color: 'var(--text-secondary)',
              }}>
                {dir}/
              </span>
            ))}
            <span style={{ fontSize: 10, color: 'var(--text-disabled)', padding: '1px 4px' }}>
              + more
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
