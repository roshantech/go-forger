import { useRef, useState, useEffect } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { isAuthenticated } from '@/lib/auth'
import { Navbar } from '@/components/Navbar'
import { Sidebar } from '@/components/Sidebar'
import { RightPanel } from '@/components/RightPanel'
import { PanelRightClose, PanelRightOpen } from 'lucide-react'

const SIDEBAR_MIN = 160
const SIDEBAR_MAX = 400
const SIDEBAR_DEF = 220

const PANEL_MIN = 260
const PANEL_MAX = 600
const PANEL_DEF = 380

export default function AppLayout() {
  const location = useLocation()

  // ── Left sidebar resize ─────────────────────────────────────
  const [sidebarW, setSidebarW] = useState(SIDEBAR_DEF)
  const sbDragging  = useRef(false)
  const sbStartX    = useRef(0)
  const sbStartW    = useRef(SIDEBAR_DEF)

  // ── Right panel resize + visibility ────────────────────────
  const [panelW, setPanelW]   = useState(PANEL_DEF)
  const [visible, setVisible] = useState(true)
  const prevPanelW            = useRef(PANEL_DEF)
  const rpDragging  = useRef(false)
  const rpStartX    = useRef(0)
  const rpStartW    = useRef(PANEL_DEF)

  useEffect(() => {
    function onMove(e: MouseEvent) {
      // Left sidebar — drag right to widen, left to narrow
      if (sbDragging.current) {
        const delta = e.clientX - sbStartX.current
        setSidebarW(Math.min(SIDEBAR_MAX, Math.max(SIDEBAR_MIN, sbStartW.current + delta)))
      }
      // Right panel — drag left to widen, right to narrow
      if (rpDragging.current) {
        const delta = rpStartX.current - e.clientX
        setPanelW(Math.min(PANEL_MAX, Math.max(PANEL_MIN, rpStartW.current + delta)))
      }
    }
    function onUp() {
      if (sbDragging.current || rpDragging.current) {
        sbDragging.current            = false
        rpDragging.current            = false
        document.body.style.cursor    = ''
        document.body.style.userSelect = ''
      }
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup',   onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup',   onUp)
    }
  }, [])

  // Auth guard — after all hooks
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  function startSidebarDrag(e: React.MouseEvent) {
    e.preventDefault()
    sbDragging.current            = true
    sbStartX.current              = e.clientX
    sbStartW.current              = sidebarW
    document.body.style.cursor    = 'col-resize'
    document.body.style.userSelect = 'none'
  }

  function startPanelDrag(e: React.MouseEvent) {
    e.preventDefault()
    rpDragging.current            = true
    rpStartX.current              = e.clientX
    rpStartW.current              = panelW
    document.body.style.cursor    = 'col-resize'
    document.body.style.userSelect = 'none'
  }

  function togglePanel() {
    if (visible) {
      prevPanelW.current = panelW
      setVisible(false)
    } else {
      setVisible(true)
      setPanelW(prevPanelW.current)
    }
  }

  const dragHandle = (onDown: (e: React.MouseEvent) => void) => (
    <div
      onMouseDown={onDown}
      style={{
        width: 4, flexShrink: 0, cursor: 'col-resize',
        background: 'transparent',
        transition: 'background 150ms',
        zIndex: 10,
      }}
      onMouseEnter={e => e.currentTarget.style.background = 'var(--accent)'}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
    />
  )

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      height: '100vh', width: '100vw',
      overflow: 'hidden', background: 'var(--bg-base)',
    }}>
      <Navbar />

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', minHeight: 0 }}>

        {/* Left sidebar — resizable */}
        <div style={{ width: sidebarW, flexShrink: 0, overflow: 'hidden' }}>
          <Sidebar />
        </div>

        {/* Left drag handle */}
        {dragHandle(startSidebarDrag)}

        {/* Center canvas */}
        <main style={{ flex: 1, overflow: 'hidden', minWidth: 0, position: 'relative' }}>
          <Outlet />

          {/* Toggle right panel button */}
          <button
            data-testid="toggle-right-panel"
            onClick={togglePanel}
            title={visible ? 'Hide panel' : 'Show panel'}
            style={{
              position: 'absolute', top: 10, right: 10, zIndex: 20,
              width: 28, height: 28, borderRadius: 6,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-default)',
              color: visible ? 'var(--accent)' : 'var(--text-secondary)',
              cursor: 'pointer',
              boxShadow: 'var(--shadow-md)',
              transition: 'color 150ms, background 150ms',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'var(--bg-raised)'
              e.currentTarget.style.color      = 'var(--accent)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'var(--bg-surface)'
              e.currentTarget.style.color      = visible ? 'var(--accent)' : 'var(--text-secondary)'
            }}
          >
            {visible ? <PanelRightClose size={14} /> : <PanelRightOpen size={14} />}
          </button>
        </main>

        {/* Right drag handle */}
        {visible && dragHandle(startPanelDrag)}

        {/* Right panel */}
        <div style={{
          width: visible ? panelW : 0,
          flexShrink: 0,
          overflow: 'hidden',
          transition: visible ? 'none' : 'width 200ms ease',
        }}>
          {visible && <RightPanel />}
        </div>

      </div>
    </div>
  )
}
