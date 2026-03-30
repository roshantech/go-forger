import { useQuery } from '@tanstack/react-query'
import { authApi } from '@/lib/api'
import { clearToken } from '@/lib/auth'
import { Settings, Download, LogOut } from 'lucide-react'
import { Tooltip } from '@/components/ui/Tooltip'
import toast from 'react-hot-toast'

const USAGE = { aiCalls: 3, limit: 10 }

const SEP = (
  <div style={{ width: 1, height: 16, background: 'var(--border-default)', flexShrink: 0 }} />
)

function NavBtn({
  icon,
  tooltip,
  onClick,
  testid,
  danger,
}: {
  icon: React.ReactNode
  tooltip: string
  onClick?: () => void
  testid: string
  danger?: boolean
}) {
  return (
    <Tooltip content={tooltip}>
      <button
        data-testid={testid}
        onClick={onClick}
        style={{
          width: 28, height: 28, borderRadius: 6,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'transparent',
          color: 'var(--text-secondary)',
          border: 'none', cursor: 'pointer',
          transition: 'background 150ms, color 150ms',
          flexShrink: 0,
        }}
        onMouseEnter={e => {
          e.currentTarget.style.background = 'var(--bg-raised)'
          e.currentTarget.style.color = danger ? 'var(--color-error)' : 'var(--text-primary)'
        }}
        onMouseLeave={e => {
          e.currentTarget.style.background = 'transparent'
          e.currentTarget.style.color = 'var(--text-secondary)'
        }}
      >
        {icon}
      </button>
    </Tooltip>
  )
}

interface NavbarProps {
  style?: React.CSSProperties
}

export function Navbar({ style }: NavbarProps) {
  const { data: user } = useQuery({
    queryKey: ['me'],
    queryFn: () => authApi.me().then(r => r.data),
    retry: false,
  })

  function handleLogout() {
    clearToken()
    toast.success('Logged out')
    window.location.href = '/login'
  }

  const usagePct = Math.min((USAGE.aiCalls / USAGE.limit) * 100, 100)
  const atLimit = USAGE.aiCalls >= USAGE.limit
  const projectName = user?.email ? user.email.split('@')[0] : 'my-project'

  return (
    <header
      style={{
        gridColumn: '1 / -1',
        height: 40,
        display: 'flex',
        alignItems: 'center',
        padding: '0 12px',
        gap: 8,
        background: 'var(--bg-surface)',
        borderBottom: '1px solid var(--border-subtle)',
        flexShrink: 0,
        ...style,
      }}
    >
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexShrink: 0 }}>
        <div style={{
          width: 22, height: 22, borderRadius: 5,
          background: 'var(--accent)',
          boxShadow: '0 0 8px var(--accent-glow)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
            <path d="M7 1 L13 7 L7 13 L1 7 Z" fill="white" opacity="0.9"/>
            <path d="M7 3.5 L10.5 7 L7 10.5 L3.5 7 Z" fill="var(--accent)"/>
          </svg>
        </div>
        <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
          FORGE
        </span>
      </div>

      {SEP}

      {/* Project name */}
      <span style={{ fontSize: 12, color: 'var(--text-secondary)', flexShrink: 0, fontFamily: 'var(--font-mono)' }}>
        {projectName}
      </span>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Usage meter */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexShrink: 0 }}>
        <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
          {USAGE.aiCalls}/{USAGE.limit}
        </span>
        <div style={{
          width: 56, height: 4, borderRadius: 9999,
          background: 'var(--bg-raised)',
          overflow: 'hidden',
          flexShrink: 0,
        }}>
          <div style={{
            height: '100%',
            width: `${usagePct}%`,
            borderRadius: 9999,
            background: atLimit ? 'var(--color-error)' : 'var(--accent)',
            transition: 'width 500ms ease',
          }} />
        </div>
      </div>

      {SEP}

      {/* Action buttons */}
      <NavBtn icon={<Download size={14} />} tooltip="Download project" testid="navbar-download" />
      <NavBtn icon={<Settings size={14} />} tooltip="Settings"         testid="navbar-settings" />
      <NavBtn icon={<LogOut   size={14} />} tooltip="Log out"          testid="navbar-logout"   onClick={handleLogout} danger />

      {SEP}

      {/* Avatar */}
      {user && (
        <Tooltip content={user.email} side="bottom">
          <div
            data-testid="navbar-avatar"
            style={{
              width: 24, height: 24, borderRadius: 9999,
              background: 'var(--accent-muted)',
              border: '1px solid var(--accent)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 10, fontWeight: 700, color: 'var(--accent)',
              cursor: 'default', flexShrink: 0,
            }}
          >
            {user.email[0].toUpperCase()}
          </div>
        </Tooltip>
      )}
    </header>
  )
}
