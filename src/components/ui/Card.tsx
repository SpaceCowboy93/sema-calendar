'use client'

import { forwardRef } from 'react'
import { cn } from '@/lib/utils'

// ── Card ──────────────────────────────────────────────────────────────────────

export type CardVariant = 'default' | 'muted' | 'tint'
export type CardRadius  = 'sm' | 'md' | 'lg'

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant
  radius?: CardRadius
  noShadow?: boolean
  as?: 'div' | 'section' | 'article' | 'button'
}

const CARD_BG: Record<CardVariant, string> = {
  default: 'rgba(255,255,255,0.82)',
  muted:   'rgba(255,255,255,0.72)',
  tint:    'rgba(45,41,38,0.04)',
}

const CARD_RADIUS: Record<CardRadius, string> = {
  sm: 'rounded-xl',
  md: 'rounded-2xl',
  lg: 'rounded-3xl',
}

/**
 * Card — white surface card used for Finance, Shopping, Goals, Memories, etc.
 *
 * Uses the same visual tokens as `.c2-card` but as a composable React component.
 */
export const Card = forwardRef<HTMLDivElement, CardProps>(
  function Card({ variant = 'default', radius = 'md', noShadow = false, as: Tag = 'div', className, style, children, ...rest }, ref) {
    const El = Tag as any
    return (
      <El
        ref={ref}
        className={cn(
          CARD_RADIUS[radius],
          !noShadow && variant !== 'tint' && 'shadow-card',
          className,
        )}
        style={{ background: CARD_BG[variant], ...style }}
        {...rest}
      >
        {children}
      </El>
    )
  },
)

// ── CardSection ───────────────────────────────────────────────────────────────
// Inner group block used inside sheets (.c2-sheet-section)

export interface CardSectionProps extends React.HTMLAttributes<HTMLDivElement> {}

export const CardSection = forwardRef<HTMLDivElement, CardSectionProps>(
  function CardSection({ className, children, ...rest }, ref) {
    return (
      <div
        ref={ref}
        className={cn('c2-sheet-section', className)}
        {...rest}
      >
        {children}
      </div>
    )
  },
)
