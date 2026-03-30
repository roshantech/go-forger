import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getLanguageFromPath(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase() ?? ''
  const map: Record<string, string> = {
    go: 'go', ts: 'typescript', tsx: 'typescript',
    js: 'javascript', jsx: 'javascript', py: 'python',
    sql: 'sql', yaml: 'yaml', yml: 'yaml',
    json: 'json', md: 'markdown', sh: 'shell',
    toml: 'toml', env: 'shell',
  }
  if (path.toLowerCase() === 'dockerfile') return 'dockerfile'
  return map[ext] ?? 'plaintext'
}

export function getLanguageColor(lang: string): string {
  const map: Record<string, string> = {
    go:         'var(--lang-go)',
    typescript: 'var(--lang-ts)',
    javascript: 'var(--lang-ts)',
    python:     'var(--lang-py)',
    sql:        'var(--lang-sql)',
    yaml:       'var(--lang-yaml)',
    markdown:   'var(--lang-md)',
    dockerfile: 'var(--lang-docker)',
  }
  return map[lang] ?? 'var(--text-disabled)'
}

export function getLanguageBg(lang: string): string {
  const map: Record<string, string> = {
    go:         'var(--lang-go-bg)',
    typescript: 'var(--lang-ts-bg)',
    javascript: 'var(--lang-ts-bg)',
    python:     'var(--lang-py-bg)',
    sql:        'var(--lang-sql-bg)',
    yaml:       'var(--lang-yaml-bg)',
    markdown:   'var(--lang-md-bg)',
    dockerfile: 'var(--lang-docker-bg)',
  }
  return map[lang] ?? 'var(--bg-raised)'
}

export function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str
  return str.slice(0, maxLen) + '…'
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}
