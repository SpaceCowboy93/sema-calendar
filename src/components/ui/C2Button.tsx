import { forwardRef } from 'react'
import { cn } from '@/lib/utils'

export type C2ButtonVariant = 'primary' | 'cancel' | 'ghost' | 'chip'

export interface C2ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: C2ButtonVariant
  /**
   * Background color for the 'primary' variant only.
   * Pass the profile's primary hex string (e.g. '#14b8a6').
   */
  color?: string
  fullWidth?: boolean
}

/**
 * C2Button — unified button primitive for all C2 sheets and pages.
 *
 * variant='primary'  → full-width pill, colored bg, white text
 * variant='cancel'   → full-width pill, gray bg, muted text
 * variant='ghost'    → inline, transparent, colored text
 * variant='chip'     → small rounded-full chip (e.g. "Add" buttons)
 */
export const C2Button = forwardRef<HTMLButtonElement, C2ButtonProps>(
  function C2Button(
    { variant = 'primary', color, fullWidth = false, className, style, children, ...rest },
    ref,
  ) {
    const base = 'inline-flex items-center justify-center font-semibold transition-transform active:scale-[0.97] disabled:opacity-40 disabled:pointer-events-none select-none'

    const variants: Record<C2ButtonVariant, string> = {
      primary: cn('rounded-2xl py-3.5 text-sm text-white', fullWidth && 'w-full'),
      cancel:  cn('rounded-2xl py-3 text-sm text-gray-600 bg-gray-100', fullWidth && 'w-full'),
      ghost:   'rounded-xl px-3 py-1.5 text-xs text-gray-500 bg-transparent hover:bg-gray-100 active:bg-gray-200',
      chip:    'rounded-full px-3 py-1.5 text-xs gap-1',
    }

    return (
      <button
        ref={ref}
        className={cn(base, variants[variant], className)}
        style={variant === 'primary' && color ? { background: color, ...style } : style}
        {...rest}
      >
        {children}
      </button>
    )
  },
)
