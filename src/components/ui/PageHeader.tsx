'use client'

import { motion, useReducedMotion } from 'framer-motion'
import { type LucideIcon } from 'lucide-react'

export interface PageHeaderProps {
  icon: LucideIcon
  /** Icon stroke color, e.g. '#f59e0b' */
  iconColor: string
  /** Badge background — should be a translucent color, e.g. 'rgba(251,191,36,0.15)' */
  iconBg: string
  title: string
  subtitle: string
  /** Enables the one-time warm-glow bloom behind the badge (Home only). */
  isHome?: boolean
  /** Optional right-side content (e.g. Sign out button on Us). */
  action?: React.ReactNode
}

/**
 * Shared premium page header used across Home, Planner, Finances, and Us.
 *
 * Transparent — sits naturally on animated page backgrounds.
 * Animates once on mount; respects prefers-reduced-motion.
 */
export function PageHeader({
  icon: Icon,
  iconColor,
  iconBg,
  title,
  subtitle,
  isHome = false,
  action,
}: PageHeaderProps) {
  const shouldReduce = useReducedMotion()

  return (
    <div className="px-5 pt-14 pb-3 flex items-start justify-between relative z-10">
      <div className="flex items-start gap-3.5 flex-1 min-w-0">

        {/* ── Icon badge ── */}
        <motion.div
          initial={shouldReduce ? false : { opacity: 0, scale: 0.88 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.36, ease: [0.34, 1.2, 0.64, 1] }}
          className="relative mt-0.5 shrink-0"
        >
          {/* One-time warm glow — Home sun only */}
          {isHome && !shouldReduce && (
            <motion.div
              className="absolute rounded-full pointer-events-none"
              style={{
                width: '100px',
                height: '100px',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                background: 'radial-gradient(circle, rgba(251,191,36,0.40) 0%, rgba(251,191,36,0) 70%)',
              }}
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: [0, 1, 0], scale: [0.5, 1.6, 1.6] }}
              transition={{ duration: 1.3, delay: 0.3, ease: 'easeOut', times: [0, 0.45, 1] }}
            />
          )}

          <div
            className="w-11 h-11 rounded-2xl flex items-center justify-center"
            style={{ background: iconBg }}
          >
            <Icon size={21} color={iconColor} strokeWidth={1.8} />
          </div>
        </motion.div>

        {/* ── Text block ── */}
        <div className="min-w-0">
          <motion.h1
            initial={shouldReduce ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.40, delay: 0.08, ease: 'easeOut' }}
            className="text-2xl leading-tight text-gray-900 truncate"
            style={{ fontFamily: 'var(--font-playfair)', fontWeight: 600 }}
          >
            {title}
          </motion.h1>
          <motion.p
            initial={shouldReduce ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.36, delay: 0.16, ease: 'easeOut' }}
            className="text-sm text-gray-400 mt-0.5"
          >
            {subtitle}
          </motion.p>
        </div>
      </div>

      {action && (
        <div className="ml-3 mt-1 shrink-0">
          {action}
        </div>
      )}
    </div>
  )
}
