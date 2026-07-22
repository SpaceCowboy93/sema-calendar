'use client'

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { format, parseISO, differenceInCalendarDays } from 'date-fns'
import { useAppStore } from '@/store/useAppStore'
import { type Countdown, type CalendarEvent, USERS } from '@/types'
import { getTodayString, cn } from '@/lib/utils'
import { EventModal } from '@/components/calendar/EventModal'
import { AnniversarySheet } from '@/components/ui/AnniversarySheet'
import {
  CATEGORY_DEFS, type CategoryType,
  CategoryHubSheet, ShoppingHubSheet,
} from '@/components/ui/CategoryHub'
import { AnimatedBackground } from '@/components/ui/AnimatedBackground'

export default function PlannerPage() {
  const currentUser  = useAppStore(s => s.currentUser)!
  const countdowns   = useAppStore(s => s.countdowns)
  const events       = useAppStore(s => s.events)
  const deleteCountdown = useAppStore(s => s.deleteCountdown)

  const primary = USERS[currentUser].theme === 'seval' ? '#8b5cf6' : '#14b8a6'

  const todayStr = getTodayString()
  const today    = new Date(todayStr)

  // Open category sheet
  const [openCategory, setOpenCategory] = useState<CategoryType | null>(null)

  // AnniversarySheet for tapped countdowns
  const [selectedCountdown, setSelectedCountdown] = useState<Countdown | null>(null)

  // EventModal for moments editing
  const [editingEvent,   setEditingEvent]   = useState<CalendarEvent | null>(null)
  const [eventModalOpen, setEventModalOpen] = useState(false)

  // Upcoming dates show-more
  const [showAllUpcoming, setShowAllUpcoming] = useState(false)

  /* ── Upcoming dates computation ────────────────────────────────────────── */
  const futureCountdowns = countdowns
    .filter(c => c.date >= todayStr)
    .sort((a, b) => a.date.localeCompare(b.date))

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

  return (
    <div className="min-h-screen bg-gray-50 pb-28">
      <AnimatedBackground blobs={[
        { color: '#93c5fd', size: 300, top: '-60px', left: '10%',    duration: 20, delay: 0   },
        { color: '#c4b5fd', size: 240, top: '40%',   left: '55%',    duration: 24, delay: 5   },
        { color: '#a5b4fc', size: 180, top: '70%',   left: '-20px',  duration: 17, delay: 9   },
      ]} />
      {/* Header */}
      <div className="sticky top-0 z-30 bg-gray-50/90 backdrop-blur-sm px-5 pt-12 pb-4">
        <h1 className="text-2xl font-bold text-gray-800">Planner</h1>
        <p className="text-sm text-gray-400 mt-0.5">Plans, dreams & what&apos;s coming up</p>
      </div>

      <div className="px-4 space-y-8">

        {/* ── Category hub grid ─────────────────────────────────────────── */}
        <section>
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 px-1">Categories</h2>
          <div className="grid grid-cols-2 gap-3">
            {CATEGORY_DEFS.map(cat => (
              <motion.button
                key={cat.id}
                whileTap={{ scale: 0.96 }}
                onClick={() => setOpenCategory(cat.id)}
                className="bg-white rounded-3xl shadow-card px-5 py-5 flex flex-col items-start gap-2 active:opacity-90 text-left"
              >
                <span className="text-3xl">{cat.emoji}</span>
                <p className="text-sm font-bold text-gray-800">{cat.label}</p>
              </motion.button>
            ))}
          </div>
        </section>

        {/* ── Upcoming Important Dates ───────────────────────────────────── */}
        {allUpcomingItems.length > 0 && (
          <section>
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 px-1">
              Upcoming Important Dates
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
                      className="w-full bg-white rounded-2xl shadow-card px-4 py-3 flex items-center gap-3 text-left overflow-hidden active:bg-gray-50"
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
                  className="w-full py-2.5 rounded-2xl text-xs font-semibold text-gray-400 bg-white shadow-card active:bg-gray-50"
                >
                  {showAllUpcoming
                    ? 'Show less'
                    : `Show ${allUpcomingItems.length - UPCOMING_LIMIT} more`}
                </motion.button>
              )}
            </div>
          </section>
        )}
      </div>

      {/* ── Category hub sheets ──────────────────────────────────────────── */}
      <AnimatePresence>
        {openCategory && openCategory !== 'shopping' && (
          <CategoryHubSheet
            key={openCategory}
            type={openCategory as 'wishes' | 'dreams' | 'moments' | 'plans'}
            primary={primary}
            currentUser={currentUser}
            onClose={() => setOpenCategory(null)}
            onEditMoment={ev => {
              setEditingEvent(ev)
              setEventModalOpen(true)
            }}
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

      {/* ── AnniversarySheet for upcoming countdown taps ─────────────────── */}
      <AnimatePresence>
        {selectedCountdown && (
          <AnniversarySheet
            countdown={selectedCountdown}
            primary={primary}
            onClose={() => setSelectedCountdown(null)}
            onDelete={() => {
              deleteCountdown(selectedCountdown.id)
              setSelectedCountdown(null)
            }}
          />
        )}
      </AnimatePresence>

      {/* ── EventModal for moments ────────────────────────────────────────── */}
      <EventModal
        isOpen={eventModalOpen && !!editingEvent}
        onClose={() => { setEventModalOpen(false); setEditingEvent(null) }}
        date={editingEvent?.date ?? todayStr}
        event={editingEvent}
      />
    </div>
  )
}
