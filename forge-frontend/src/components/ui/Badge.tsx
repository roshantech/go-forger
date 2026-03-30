import { cn } from '@/lib/utils'

interface BadgeProps {
  children: React.ReactNode
  color?: string
  bg?: string
  className?: string
}

export function Badge({ children, color, bg, className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold',
        'font-mono uppercase tracking-wider leading-none',
        className
      )}
      style={{
        color: color ?? 'var(--text-secondary)',
        background: bg ?? 'var(--bg-raised)',
      }}
    >
      {children}
    </span>
  )
}
