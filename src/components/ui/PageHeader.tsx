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
  /** Subtitle shown below the title in static mode. */
  subtitle?: string
  /** Icon element for the badge in static mode. Pass a Lucide icon at size 18. */
  icon?: React.ReactNode
  /** Optional right-side content (e.g. Sign out button on Us). */
  action?: React.ReactNode
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
export function PageHeader({ title, subtitle, icon, action }: PageHeaderProps) {
  const currentUser  = useAppStore(s => s.currentUser)!
  const shouldReduce = useReducedMotion()
  const primary      = currentUser === 'seval' ? '#8b5cf6' : '#14b8a6'
  const isGreeting   = !title

  // Botanical badge accent — softer, profile-appropriate alternative to the primary accent.
  // Used only on the static-mode icon badge; does not affect buttons or controls.
  const badgeBg    = currentUser === 'seval' ? 'rgba(196,186,212,0.18)' : 'rgba(107,138,107,0.14)'
  const badgeColor = currentUser === 'seval' ? '#9B8CAE'                 : '#527052'

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
      <div className="px-5 pt-14 pb-3 flex items-start justify-between relative z-10">
        <div className="flex-1 min-w-0">
          {greeting && (
            <motion.h1
              initial={shouldReduce ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.42, ease: 'easeOut' }}
              className="text-2xl leading-snug text-gray-900"
              style={{ fontFamily: 'var(--font-playfair)', fontWeight: 600 }}
            >
              {greeting}
            </motion.h1>
          )}
          {date && (
            <motion.p
              initial={shouldReduce ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.36, delay: 0.14, ease: 'easeOut' }}
              className="text-sm text-gray-400 mt-1"
            >
              {date}
            </motion.p>
          )}
        </div>
        {action && <div className="ml-3 mt-1 shrink-0">{action}</div>}
      </div>
    )
  }

  // ── Static page identity mode — Planner / Finances / Us ─────────────────
  return (
    <div className="px-5 pt-14 pb-3 flex items-start justify-between relative z-10">
      <div className="flex-1 min-w-0">
        {icon && (
          <motion.div
            initial={shouldReduce ? false : { opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.28, ease: 'easeOut' }}
            className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
            style={{ background: badgeBg, color: badgeColor }}
          >
            {icon}
          </motion.div>
        )}

        <motion.h1
          initial={shouldReduce ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.32, delay: icon ? 0.06 : 0, ease: 'easeOut' }}
          className="text-2xl leading-snug text-gray-900"
          style={{ fontFamily: 'var(--font-playfair)', fontWeight: 600 }}
        >
          {title}
        </motion.h1>

        {subtitle && (
          <motion.p
            initial={shouldReduce ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.28, delay: icon ? 0.12 : 0.06, ease: 'easeOut' }}
            className="text-sm text-gray-500 mt-0.5"
          >
            {subtitle}
          </motion.p>
        )}

        {date && (
          <motion.p
            initial={shouldReduce ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.25, delay: 0.18, ease: 'easeOut' }}
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
