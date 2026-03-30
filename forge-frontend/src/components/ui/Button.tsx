import { cn } from '@/lib/utils'
import { type ButtonHTMLAttributes, forwardRef } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg' | 'icon'
  loading?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'secondary', size = 'md', loading, children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          'inline-flex items-center justify-center gap-2 font-medium rounded-md',
          'transition-all duration-150 cursor-pointer select-none',
          'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2',
          'disabled:opacity-40 disabled:cursor-not-allowed',
          size === 'sm'   && 'h-7 px-2.5 text-[11px]',
          size === 'md'   && 'h-8 px-3 text-[12px]',
          size === 'lg'   && 'h-10 px-4 text-[13px]',
          size === 'icon' && 'h-8 w-8 text-[12px]',
          variant === 'primary' && 'active:scale-[0.98]',
          className
        )}
        style={{
          ...(variant === 'primary' ? {
            background: 'var(--accent)',
            color: '#fff',
          } : variant === 'secondary' ? {
            background: 'var(--bg-raised)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border-default)',
          } : variant === 'ghost' ? {
            background: 'transparent',
            color: 'var(--text-secondary)',
          } : variant === 'danger' ? {
            background: 'rgba(239,68,68,0.10)',
            color: 'var(--color-error)',
            border: '1px solid rgba(239,68,68,0.20)',
          } : {}),
          ...props.style,
        }}
        onMouseEnter={(e) => {
          if (variant === 'primary')   e.currentTarget.style.background = 'var(--accent-hover)'
          if (variant === 'secondary') { e.currentTarget.style.background = 'var(--bg-overlay)'; e.currentTarget.style.borderColor = 'var(--border-strong)' }
          if (variant === 'ghost')     { e.currentTarget.style.background = 'var(--bg-raised)'; e.currentTarget.style.color = 'var(--text-primary)' }
          if (variant === 'danger')    e.currentTarget.style.background = 'rgba(239,68,68,0.20)'
          props.onMouseEnter?.(e)
        }}
        onMouseLeave={(e) => {
          if (variant === 'primary')   e.currentTarget.style.background = 'var(--accent)'
          if (variant === 'secondary') { e.currentTarget.style.background = 'var(--bg-raised)'; e.currentTarget.style.borderColor = 'var(--border-default)' }
          if (variant === 'ghost')     { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)' }
          if (variant === 'danger')    e.currentTarget.style.background = 'rgba(239,68,68,0.10)'
          props.onMouseLeave?.(e)
        }}
        {...props}
      >
        {loading && (
          <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.25"/>
            <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
          </svg>
        )}
        {children}
      </button>
    )
  }
)
Button.displayName = 'Button'
