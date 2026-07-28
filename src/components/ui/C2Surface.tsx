import { forwardRef } from 'react'
import { cn } from '@/lib/utils'

export type C2SurfaceVariant = 'default' | 'muted' | 'dim' | 'tint'

export interface C2SurfaceProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * default → rgba(255,255,255,0.82) — standard white card
   * muted   → rgba(255,255,255,0.72) — slightly less opaque
   * dim     → rgba(255,255,255,0.50) — for empty states / dashed outlines
   * tint    → rgba(45,41,38,0.04)    — dark tint, for inset fields
   */
  variant?: C2SurfaceVariant
  /**
   * lg → rounded-3xl (24px)
   * md → rounded-2xl (16px, default)
   * sm → rounded-xl  (12px)
   */
  radius?: 'sm' | 'md' | 'lg'
  /** Suppress the default box-shadow. */
  noShadow?: boolean
  as?: 'div' | 'section' | 'article'
}

/**
 * C2Surface — unified card/surface primitive.
 *
 * Replaces the pattern:
 *   style={{ background: 'rgba(255,255,255,0.82)', boxShadow: '0 1px 6px rgba(45,41,38,0.05)' }}
 */
export const C2Surface = forwardRef<HTMLDivElement, C2SurfaceProps>(
  function C2Surface(
    { variant = 'default', radius = 'md', noShadow = false, as: Tag = 'div', className, style, children, ...rest },
    ref,
  ) {
    const backgrounds: Record<C2SurfaceVariant, string> = {
      default: 'var(--c2-surface)',
      muted:   'var(--c2-surface-muted)',
      dim:     'var(--c2-surface-dim)',
      tint:    'var(--c2-tint)',
    }

    const radii: Record<string, string> = {
      sm: 'rounded-xl',
      md: 'rounded-2xl',
      lg: 'rounded-3xl',
    }

    return (
      <Tag
        ref={ref}
        className={cn(radii[radius], !noShadow && variant !== 'tint' && 'shadow-card', className)}
        style={{ background: backgrounds[variant], ...style }}
        {...rest}
      >
        {children}
      </Tag>
    )
  },
)
