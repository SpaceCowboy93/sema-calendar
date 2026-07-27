'use client'

import { useState, useEffect } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { format } from 'date-fns'
import { useAppStore } from '@/store/useAppStore'
import { USERS } from '@/types'
import { getDailyGreeting, msToNextPeriodBoundary } from '@/lib/greeting'
import { getTodayString } from '@/lib/utils'

export interface PageHeaderProps {
  /**
   * Static page title — e.g. "Planner", "Our Finances", "Us".
   * When omitted the component switches to greeting mode (Home only).
   */
  title?: string
  /**
   * Optional editorial eyebrow shown above the title in static mode.
   * Small caps, muted, 11px. E.g. "Our kitchen", "Weekly view".
   */
  eyebrow?: string
  /** Subtitle shown below the title in static mode. */
  subtitle?: string
  /** Optional right-side content (e.g. Sign out button on Us). */
  action?: React.ReactNode
  /**
   * Greeting mode only. When provided, replaces the plain date line with a
   * Living Moment contextual subtitle (e.g. "✈️ Adventure starts tomorrow.").
   * Falls back to the date when empty or omitted.
   */
  contextSubtitle?: string
}

/**
 * Two-mode premium page header.
 *
 * Greeting mode  (no `title` prop) — Home only.
 *   Shows the personal daily greeting in Playfair Display with date below.
 *   Greeting is deterministic per profile + date + time-period; auto-updates
 *   at period boundaries (morning → afternoon → evening).
 *
 * Static mode  (`title` provided) — Planner / Finances / Us.
 *   Shows icon badge + Playfair title + sans-serif subtitle + date.
 *   No personal greeting. No auto-update timer.
 *
 * Both modes respect prefers-reduced-motion and animate once on mount.
 */
export function PageHeader({ title, eyebrow, subtitle, action, contextSubtitle }: PageHeaderProps) {
  const currentUser  = useAppStore(s => s.currentUser)!
  const shouldReduce = useReducedMotion()
  const isGreeting   = !title

  const [greeting, setGreeting] = useState<string | null>(null)
  const [date,     setDate]     = useState('')

  useEffect(() => {
    function update() {
      const now = new Date()
      setDate(format(now, 'EEEE, MMMM d'))

      if (isGreeting) {
        const name = USERS[currentUser].displayName
        setGreeting(getDailyGreeting(name, getTodayString(), now))
        // Return ms until the next time-period boundary so the greeting updates naturally
        return msToNextPeriodBoundary(now)
      }

      // Static mode: refresh at midnight so the date line stays current
      const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
      return tomorrow.getTime() - now.getTime()
    }

    const ms    = update()
    const timer = setTimeout(update, ms)
    return () => clearTimeout(timer)
  }, [currentUser, isGreeting])

  // ── Greeting mode — Home only ────────────────────────────────────────────
  if (isGreeting) {
    return (
      <div className="px-5 pt-16 pb-8 flex items-start justify-between relative z-10">
        <div className="flex-1 min-w-0">
          {greeting && (
            <motion.h1
              initial={shouldReduce ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.42, ease: 'easeOut' }}
              className="text-3xl leading-snug text-gray-900"
              style={{ fontFamily: 'var(--font-playfair)', fontWeight: 600 }}
            >
              {greeting}
            </motion.h1>
          )}
          {(contextSubtitle || date) && (
            <motion.p
              key={contextSubtitle || 'date'}
              initial={shouldReduce ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.36, delay: 0.14, ease: 'easeOut' }}
              className={contextSubtitle ? 'text-sm text-gray-500 mt-2' : 'text-sm text-gray-400 mt-2'}
            >
              {contextSubtitle || date}
            </motion.p>
          )}
        </div>
        {action && <div className="ml-3 mt-1 shrink-0">{action}</div>}
      </div>
    )
  }

  // ── Static page identity mode — Planner / Finances / Us ─────────────────
  return (
    <div className="px-5 pt-16 pb-8 flex items-start justify-between relative z-10">
      <div className="flex-1 min-w-0">
        {eyebrow && (
          <motion.p
            initial={shouldReduce ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.28, ease: 'easeOut' }}
            className="text-[11px] font-medium text-gray-400 tracking-widest uppercase mb-1.5"
          >
            {eyebrow}
          </motion.p>
        )}

        <motion.h1
          initial={shouldReduce ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.32, delay: eyebrow ? 0.06 : 0, ease: 'easeOut' }}
          className="text-3xl leading-snug text-gray-900"
          style={{ fontFamily: 'var(--font-playfair)', fontWeight: 600 }}
        >
          {title}
        </motion.h1>

        {subtitle && (
          <motion.p
            initial={shouldReduce ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.28, delay: 0.08, ease: 'easeOut' }}
            className="text-sm text-gray-500 mt-1.5"
          >
            {subtitle}
          </motion.p>
        )}

        {date && (
          <motion.p
            initial={shouldReduce ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.25, delay: 0.16, ease: 'easeOut' }}
            className="text-xs text-gray-400 mt-1"
          >
            {date}
          </motion.p>
        )}
      </div>

      {action && <div className="ml-3 mt-1 shrink-0">{action}</div>}
    </div>
  )
}
