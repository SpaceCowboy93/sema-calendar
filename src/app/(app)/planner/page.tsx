'use client'

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { format, parseISO, differenceInCalendarDays } from 'date-fns'
import { useAppStore } from '@/store/useAppStore'
import { type Countdown, type CalendarEvent, USERS } from '@/types'
import { getTodayString } from '@/lib/utils'
import { EventModal } from '@/components/calendar/EventModal'
import { AnniversarySheet } from '@/components/ui/AnniversarySheet'
import {
  type CategoryType,
  CategoryHubSheet, ShoppingHubSheet,
} from '@/components/ui/CategoryHub'
import { AnimatedBackground } from '@/components/ui/AnimatedBackground'
import { WeeklyFocusSection } from '@/components/weekly-focus/WeeklyFocusSection'

export default function PlannerPage() {
  const currentUser     = useAppStore(s => s.currentUser)!
  const countdowns      = useAppStore(s => s.countdowns)
  const events          = useAppStore(s => s.events)
  const todos           = useAppStore(s => s.todos)
  const shoppingLists   = useAppStore(s => s.shoppingLists)
  const deleteCountdown = useAppStore(s => s.deleteCountdown)

  const primary  = USERS[currentUser].theme === 'seval' ? '#8b5cf6' : '#14b8a6'
  const todayStr = getTodayString()
  const today    = new Date(todayStr)

  // Sheet state
  const [openCategory,      setOpenCategory]      = useState<CategoryType | null>(null)
  const [selectedCountdown, setSelectedCountdown] = useState<Countdown | null>(null)
  const [editingEvent,      setEditingEvent]      = useState<CalendarEvent | null>(null)
  const [eventModalOpen,    setEventModalOpen]    = useState(false)
  const [showAllUpcoming,   setShowAllUpcoming]   = useState(false)

  /* ── Upcoming dates ──────────────────────────────────────────────────── */
  const futureCountdowns = useMemo(() =>
    countdowns.filter(c => c.date >= todayStr).sort((a, b) => a.date.localeCompare(b.date)),
    [countdowns, todayStr]
  )

  const upcomingEvents = useMemo(() => {
    const seen = new Set<string>()
    return events
      .filter(e => {
        if (e.date < todayStr || seen.has(e.id)) return false
        seen.add(e.id); return true
      })
      .sort((a, b) => a.date.localeCompare(b.date))
  }, [events, todayStr])

  const allUpcomingItems = useMemo(() => {
    type CdItem = (typeof futureCountdowns)[0] & { _kind: 'countdown' }
    type EvItem = (typeof upcomingEvents)[0]   & { _kind: 'event' }
    const cds: CdItem[] = futureCountdowns.map(c => ({ ...c, _kind: 'countdown' as const }))
    const evs: EvItem[] = upcomingEvents.map(e => ({ ...e, _kind: 'event' as const }))
    return [...cds, ...evs].sort((a, b) => a.date.localeCompare(b.date))
  }, [futureCountdowns, upcomingEvents])

  const UPCOMING_LIMIT  = 5
  const visibleUpcoming = showAllUpcoming ? allUpcomingItems : allUpcomingItems.slice(0, UPCOMING_LIMIT)
  const hasMoreUpcoming = allUpcomingItems.length > UPCOMING_LIMIT

  /* ── Needs attention ─────────────────────────────────────────────────── */
  const needsAttention = useMemo(() => {
    const items: { id: string; label: string; sub: string; accent: string; onOpen: () => void }[] = []

    todos
      .filter(t => !t.isCompleted && t.date && t.date < todayStr)
      .sort((a, b) => a.date!.localeCompare(b.date!))
      .slice(0, 3)
      .forEach(t => {
        const d = differenceInCalendarDays(new Date(todayStr), parseISO(t.date!))
        items.push({
          id: `od-${t.id}`,
          label: t.title,
          sub: `Plan overdue · ${d} day${d !== 1 ? 's' : ''}`,
          accent: '#f59e0b',
          onOpen: () => setOpenCategory('plans'),
        })
      })

    shoppingLists
      .filter(l => !l.isCompleted)
      .slice(0, 2)
      .forEach(l => {
        const left = l.items.filter(i => !i.isChecked).length
        items.push({
          id: `sh-${l.id}`,
          label: l.name,
          sub: `Shopping · ${left} item${left !== 1 ? 's' : ''} remaining`,
          accent: '#ef4444',
          onOpen: () => setOpenCategory('shopping'),
        })
      })

    return items
  }, [todos, shoppingLists, todayStr])

  /* ── Render ──────────────────────────────────────────────────────────── */
  return (
    <div className="min-h-screen pb-28 relative z-0">
      <AnimatedBackground blobs={[
        { color: '#93c5fd', size: 320, top: '-60px', left: '10%',    duration: 11, delay: 0 },
        { color: '#c4b5fd', size: 260, top: '40%',   left: '55%',    duration: 13, delay: 2 },
        { color: '#818cf8', size: 200, top: '70%',   left: '-20px',  duration: 9,  delay: 5 },
      ]} />

      {/* ── Header ── */}
      <div className="px-5 pt-12 pb-3">
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Planner</h1>
        <p className="text-sm text-gray-400 mt-1">Plan your future together.</p>
      </div>

      <WeeklyFocusSection />

      <div className="px-4 pt-4 space-y-6">

            {/* ── Upcoming Important Dates ── */}
            {allUpcomingItems.length > 0 && (
              <section>
                <h2 className="text-sm font-semibold text-gray-500 mb-3 px-1">
                  Upcoming dates
                </h2>
                <div className="space-y-2">
                  <AnimatePresence initial={false}>
                    {visibleUpcoming.map(item => {
                      const days = differenceInCalendarDays(parseISO(item.date), today)
                      if (item._kind === 'countdown') {
                        return (
                          <motion.button
                            key={`cd-${item.id}`}
                            layout
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.22 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => setSelectedCountdown(item)}
                            className="w-full bg-white rounded-2xl shadow-card px-4 py-3.5 flex items-center gap-3 text-left overflow-hidden"
                          >
                            <span className="text-2xl shrink-0">{item.emoji}</span>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-gray-800 text-sm truncate">{item.title}</p>
                              <p className="text-xs text-gray-400">{format(parseISO(item.date), 'MMM d, yyyy')}</p>
                            </div>
                            <div className="shrink-0 text-right">
                              <p className="text-lg font-bold" style={{ color: primary }}>
                                {days === 0 ? 'Today!' : days}
                              </p>
                              {days > 0 && <p className="text-[10px] text-gray-400">days left</p>}
                            </div>
                          </motion.button>
                        )
                      }
                      return (
                        <motion.button
                          key={`ev-${item.id}`}
                          layout
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.22 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => { setEditingEvent(item); setEventModalOpen(true) }}
                          className="w-full bg-white rounded-2xl shadow-card px-4 py-3 flex items-center gap-3 text-left overflow-hidden"
                        >
                          <div className="shrink-0 text-center w-10">
                            {days === 0
                              ? <span className="text-xl">🎉</span>
                              : <><p className="text-base font-bold text-gray-700">{days}</p><p className="text-[9px] text-gray-400">days</p></>
                            }
                          </div>
                          <div className="w-px h-8 bg-gray-100 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-800 truncate">{item.title}</p>
                            <p className="text-xs text-gray-400">{format(parseISO(item.date), 'EEE, MMM d')}</p>
                          </div>
                        </motion.button>
                      )
                    })}
                  </AnimatePresence>

                  {hasMoreUpcoming && (
                    <motion.button
                      whileTap={{ scale: 0.97 }}
                      onClick={() => setShowAllUpcoming(v => !v)}
                      className="w-full py-2.5 rounded-2xl text-xs font-semibold text-gray-400 bg-white shadow-card"
                    >
                      {showAllUpcoming
                        ? 'Show less'
                        : `Show ${allUpcomingItems.length - UPCOMING_LIMIT} more`}
                    </motion.button>
                  )}
                </div>
              </section>
            )}

            {/* ── Needs Attention ── */}
            {needsAttention.length > 0 && (
              <section className="pb-2">
                <h2 className="text-sm font-semibold text-gray-500 mb-3 px-1">
                  Needs attention
                </h2>
                <div className="space-y-2">
                  {needsAttention.map((item, i) => (
                    <motion.button
                      key={item.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05, duration: 0.2 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={item.onOpen}
                      className="w-full bg-white rounded-2xl shadow-card px-4 py-3 flex items-center gap-3 text-left"
                    >
                      <div
                        className="w-1.5 h-1.5 rounded-full shrink-0"
                        style={{ background: item.accent }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-800 truncate">{item.label}</p>
                        <p className="text-xs" style={{ color: item.accent }}>{item.sub}</p>
                      </div>
                    </motion.button>
                  ))}
                </div>
              </section>
            )}
      </div>

      {/* ── Category hub sheets ── */}
      <AnimatePresence>
        {openCategory && openCategory !== 'shopping' && (
          <CategoryHubSheet
            key={openCategory}
            type={openCategory as 'wishes' | 'dreams' | 'moments' | 'plans'}
            primary={primary}
            currentUser={currentUser}
            onClose={() => setOpenCategory(null)}
            onEditMoment={ev => { setEditingEvent(ev); setEventModalOpen(true) }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {openCategory === 'shopping' && (
          <ShoppingHubSheet
            primary={primary}
            currentUser={currentUser}
            onClose={() => setOpenCategory(null)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedCountdown && (
          <AnniversarySheet
            countdown={selectedCountdown}
            primary={primary}
            onClose={() => setSelectedCountdown(null)}
            onDelete={() => { deleteCountdown(selectedCountdown.id); setSelectedCountdown(null) }}
          />
        )}
      </AnimatePresence>

      <EventModal
        isOpen={eventModalOpen && !!editingEvent}
        onClose={() => { setEventModalOpen(false); setEditingEvent(null) }}
        date={editingEvent?.date ?? todayStr}
        event={editingEvent}
      />
    </div>
  )
}
