'use client'

import { useState, useEffect } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { format } from 'date-fns'
import { useAppStore } from '@/store/useAppStore'
import { USERS } from '@/types'
import { getDailyGreeting, msToNextPeriodBoundary } from '@/lib/greeting'
import { getTodayString } from '@/lib/utils'

export interface PageHeaderProps {
  /** Page name shown below the greeting, e.g. "Planner". Omit on the home page. */
  pageLabel?: string
  /** Optional right-side content (e.g. Sign out button on Us). */
  action?: React.ReactNode
}

/**
 * Self-contained premium page header.
 *
 * Automatically computes the user's daily greeting (with emoji prefix, in
 * Playfair Display) and shows it as the primary heading on every page.
 * When pageLabel is supplied it appears below as "Planner · Thursday, July 23".
 * On the home page (no pageLabel) just the date is shown as context.
 *
 * Transparent — sits naturally on animated page backgrounds.
 * Animates once on mount; respects prefers-reduced-motion.
 */
export function PageHeader({ pageLabel, action }: PageHeaderProps) {
  const currentUser  = useAppStore(s => s.currentUser)!
  const shouldReduce = useReducedMotion()

  const [greeting, setGreeting] = useState<string | null>(null)
  const [date,     setDate]     = useState('')

  useEffect(() => {
    function update() {
      const now  = new Date()
      const name = USERS[currentUser].displayName
      setGreeting(getDailyGreeting(name, getTodayString(), now))
      setDate(format(now, 'EEEE, MMMM d'))
      return msToNextPeriodBoundary(now)
    }
    const ms = update()
    const timer = setTimeout(update, ms)
    return () => clearTimeout(timer)
  }, [currentUser])

  const contextLine = date
    ? pageLabel ? `${pageLabel} · ${date}` : date
    : pageLabel ?? ''

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
        {contextLine && (
          <motion.p
            initial={shouldReduce ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.36, delay: 0.14, ease: 'easeOut' }}
            className="text-sm text-gray-400 mt-1"
          >
            {contextLine}
          </motion.p>
        )}
      </div>

      {action && (
        <div className="ml-3 mt-1 shrink-0">
          {action}
        </div>
      )}
    </div>
  )
}
