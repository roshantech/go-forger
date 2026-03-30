import { getLanguageColor, getLanguageBg } from '@/lib/utils'

interface FileTypeIconProps {
  language: string
  size?: 'sm' | 'md'
}

const LANG_LABELS: Record<string, string> = {
  go: 'GO', typescript: 'TS', javascript: 'JS',
  python: 'PY', sql: 'SQL', yaml: 'YML',
  json: 'JSON', markdown: 'MD', dockerfile: 'DOCK',
  shell: 'SH', toml: 'TOML', plaintext: 'TXT',
}

export function FileTypeIcon({ language, size = 'md' }: FileTypeIconProps) {
  const label = LANG_LABELS[language] ?? language.slice(0, 3).toUpperCase()
  const color = getLanguageColor(language)
  const bg = getLanguageBg(language)

  return (
    <span
      className="inline-flex items-center justify-center rounded font-mono font-bold uppercase leading-none tracking-wider flex-shrink-0"
      style={{
        color,
        background: bg,
        fontSize: size === 'sm' ? '8px' : '9px',
        width:  size === 'sm' ? '24px' : '32px',
        height: size === 'sm' ? '16px' : '20px',
      }}
    >
      {label}
    </span>
  )
}
