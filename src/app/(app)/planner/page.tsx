'use client'

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { format, parseISO, differenceInCalendarDays } from 'date-fns'
import { CalendarClock, Leaf, AlertCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useAppStore } from '@/store/useAppStore'
import { type Countdown, type CalendarEvent, USERS } from '@/types'
import { getTodayString } from '@/lib/utils'
import { getLivingMoment } from '@/lib/livingMoment'
import { EventModal } from '@/components/calendar/EventModal'
import { AnniversarySheet } from '@/components/ui/AnniversarySheet'
import { type CategoryType, CategoryHubSheet } from '@/components/ui/CategoryHub'
import { C2PageBackground } from '@/components/ui/C2PageBackground'
import { WeeklyFocusSection } from '@/components/weekly-focus/WeeklyFocusSection'
import { PageHeader } from '@/components/ui/PageHeader'

/* ── Botanical leaf ──────────────────────────────────────────────────────── */
function BotanicalLeaf({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 120 130" fill="none"
      xmlns="http://www.w3.org/2000/svg" className={className}>
      <path d="M68 118 Q72 72 102 16" stroke="#8FA68D" strokeWidth="1.4" strokeLinecap="round" />
      <ellipse cx="90" cy="44" rx="15" ry="8.5" transform="rotate(-42 90 44)" fill="#8FA68D" />
      <ellipse cx="103" cy="23" rx="12" ry="7" transform="rotate(-58 103 23)" fill="#8FA68D" />
      <ellipse cx="79" cy="68" rx="13.5" ry="7.5" transform="rotate(-28 79 68)" fill="#8FA68D" />
      <ellipse cx="70" cy="92" rx="10.5" ry="6" transform="rotate(-16 70 92)" fill="#8FA68D" />
    </svg>
  )
}

/* ── Page ────────────────────────────────────────────────────────────────── */
export default function PlannerPage() {
  const router          = useRouter()
  const currentUser     = useAppStore(s => s.currentUser)!
  const countdowns      = useAppStore(s => s.countdowns)
  const events          = useAppStore(s => s.events)
  const todos           = useAppStore(s => s.todos)
  const shoppingLists   = useAppStore(s => s.shoppingLists)
  const partnerNotes    = useAppStore(s => s.partnerNotes)
  const deleteCountdown = useAppStore(s => s.deleteCountdown)

  const primary  = USERS[currentUser].theme === 'seval' ? '#8b5cf6' : '#14b8a6'
  const todayStr = getTodayString()
  const today    = new Date(todayStr)

  const living = useMemo(() => getLivingMoment({
    events, countdowns, shoppingLists, todos, partnerNotes, currentUser, today: todayStr,
  }), [events, countdowns, shoppingLists, todos, partnerNotes, currentUser, todayStr])

  const [openCategory,      setOpenCategory]      = useState<CategoryType | null>(null)
  const [selectedCountdown, setSelectedCountdown] = useState<Countdown | null>(null)
  const [editingEvent,      setEditingEvent]      = useState<CalendarEvent | null>(null)
  const [eventModalOpen,    setEventModalOpen]    = useState(false)
  const [showAllUpcoming,   setShowAllUpcoming]   = useState(false)

  /* ── Upcoming dates ───────────────────────────────────────────────────── */
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

  /* ── Needs attention ──────────────────────────────────────────────────── */
  const needsAttention = useMemo(() => {
    const items: { id: string; label: string; sub: string; onOpen: () => void }[] = []

    todos
      .filter(t => !t.isCompleted && t.date && t.date < todayStr)
      .sort((a, b) => a.date!.localeCompare(b.date!))
      .slice(0, 3)
      .forEach(t => {
        const d = differenceInCalendarDays(new Date(todayStr), parseISO(t.date!))
        items.push({
          id:    `od-${t.id}`,
          label: t.title,
          sub:   `Overdue · ${d} day${d !== 1 ? 's' : ''}`,
          onOpen: () => setOpenCategory('plans'),
        })
      })

    shoppingLists
      .filter(l => !l.isCompleted)
      .slice(0, 2)
      .forEach(l => {
        const left = l.items.filter(i => !i.isChecked).length
        items.push({
          id:    `sh-${l.id}`,
          label: l.name,
          sub:   `Shopping · ${left} item${left !== 1 ? 's' : ''} remaining`,
          onOpen: () => router.push('/shopping'),
        })
      })

    return items
  }, [todos, shoppingLists, todayStr, router])

  /* ── Subtitle ─────────────────────────────────────────────────────────── */
  const plannerSubtitle = living.homeSubtitle || 'Plan your future together.'

  /* ── Render ───────────────────────────────────────────────────────────── */
  return (
    <div className="min-h-screen pb-28">

      <C2PageBackground />

      {/* Header with botanical accent */}
      <div className="relative overflow-hidden">
        <BotanicalLeaf className="absolute right-[-8px] top-2 w-36 h-36 opacity-[0.08] pointer-events-none" />
        <PageHeader
          title="Planner"
          subtitle={plannerSubtitle}
        />
      </div>

      <WeeklyFocusSection />

      <div className="px-4 pt-4 pb-10 space-y-6">

        {/* ── Upcoming dates ── */}
        {allUpcomingItems.length > 0 && (
          <section>
            <p className="text-[10px] font-semibold tracking-widest uppercase mb-3 px-1" style={{ color: '#a8b0a0' }}>
              Upcoming dates
            </p>
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
                        className="w-full rounded-2xl px-4 py-3.5 flex items-center gap-3 text-left overflow-hidden"
                        style={{
                          background: 'rgba(255,255,255,0.82)',
                          boxShadow: '0 1px 8px rgba(45,41,38,0.05)',
                        }}
                      >
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-xl"
                          style={{ background: 'rgba(63,107,79,0.07)' }}
                        >
                          {item.emoji}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm truncate" style={{ color: '#1a1f18' }}>{item.title}</p>
                          <p className="text-xs mt-0.5" style={{ color: '#a8b0a0' }}>
                            {format(parseISO(item.date), 'MMM d, yyyy')}
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-lg font-bold tabular-nums" style={{ color: '#4a7c5e' }}>
                            {days === 0 ? 'Today' : days}
                          </p>
                          {days > 0 && <p className="text-[10px]" style={{ color: '#a8b0a0' }}>days left</p>}
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
                      className="w-full rounded-2xl px-4 py-3 flex items-center gap-3 text-left overflow-hidden"
                      style={{
                        background: 'rgba(255,255,255,0.82)',
                        boxShadow: '0 1px 8px rgba(45,41,38,0.05)',
                      }}
                    >
                      <div className="shrink-0 text-center w-10">
                        {days === 0
                          ? <CalendarClock size={20} style={{ color: '#4a7c5e', margin: '0 auto' }} />
                          : <><p className="text-base font-bold tabular-nums" style={{ color: '#1a1f18' }}>{days}</p>
                             <p className="text-[9px]" style={{ color: '#a8b0a0' }}>days</p></>
                        }
                      </div>
                      <div className="w-px h-8 shrink-0" style={{ background: 'rgba(45,41,38,0.06)' }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate" style={{ color: '#1a1f18' }}>{item.title}</p>
                        <p className="text-xs mt-0.5" style={{ color: '#a8b0a0' }}>
                          {format(parseISO(item.date), 'EEE, MMM d')}
                        </p>
                      </div>
                    </motion.button>
                  )
                })}
              </AnimatePresence>

              {hasMoreUpcoming && (
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setShowAllUpcoming(v => !v)}
                  className="w-full py-2.5 rounded-2xl text-xs font-semibold"
                  style={{
                    background: 'rgba(255,255,255,0.7)',
                    color: '#a8b0a0',
                    boxShadow: '0 1px 4px rgba(45,41,38,0.04)',
                  }}
                >
                  {showAllUpcoming
                    ? 'Show less'
                    : `Show ${allUpcomingItems.length - UPCOMING_LIMIT} more`}
                </motion.button>
              )}
            </div>
          </section>
        )}

        {/* ── Needs attention ── */}
        {needsAttention.length > 0 && (
          <section>
            <p className="text-[10px] font-semibold tracking-widest uppercase mb-3 px-1" style={{ color: '#a8b0a0' }}>
              Needs attention
            </p>
            <div className="space-y-2">
              {needsAttention.map((item, i) => (
                <motion.button
                  key={item.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05, duration: 0.2 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={item.onOpen}
                  className="w-full rounded-2xl px-4 py-3.5 flex items-center gap-3 text-left"
                  style={{
                    background: 'rgba(255,255,255,0.75)',
                    boxShadow: '0 1px 4px rgba(45,41,38,0.04)',
                  }}
                >
                  <AlertCircle size={15} style={{ color: '#c8cfbf', flexShrink: 0 }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: '#1a1f18' }}>{item.label}</p>
                    <p className="text-xs mt-0.5" style={{ color: '#7a8570' }}>{item.sub}</p>
                  </div>
                </motion.button>
              ))}
            </div>
          </section>
        )}

        {/* Closing copy */}
        <div className="flex items-center justify-center gap-2 mt-4" style={{ color: '#c8cfbf' }}>
          <Leaf size={12} />
          <p className="text-xs italic">Your plans, your story.</p>
          <Leaf size={12} />
        </div>

      </div>

      {/* ── Sheets ── */}
      <AnimatePresence>
        {openCategory && (
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
