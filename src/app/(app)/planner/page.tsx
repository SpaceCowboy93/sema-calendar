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

/* ── Eucalyptus botanical — calm, airy, alternating round leaves ─────────── */
function PlannerBotanical() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 340 320"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{
        position: 'absolute', top: -20, right: -72,
        width: 340, height: 320,
        pointerEvents: 'none',
      }}
    >
      <defs>
        <filter id="pb-soft"><feGaussianBlur stdDeviation="1.0" /></filter>
        <linearGradient id="pb-fade" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="white" stopOpacity="0" />
          <stop offset="28%" stopColor="white" stopOpacity="0.4" />
          <stop offset="48%" stopColor="white" stopOpacity="1" />
          <stop offset="100%" stopColor="white" stopOpacity="1" />
        </linearGradient>
        <mask id="pb-mask">
          <rect width="340" height="320" fill="url(#pb-fade)" />
        </mask>
      </defs>
      <g mask="url(#pb-mask)" filter="url(#pb-soft)">
        {/* Main eucalyptus stem — long curving arc */}
        <path d="M330 15 Q295 60 275 110 Q252 168 238 240" stroke="#7A9680" strokeWidth="1.6" strokeLinecap="round" fill="none" opacity="0.32" />
        {/* Secondary stem */}
        <path d="M310 8 Q268 55 248 120 Q228 190 218 270" stroke="#8FA68D" strokeWidth="1.1" strokeLinecap="round" fill="none" opacity="0.22" />

        {/* Eucalyptus leaves — round/oval, alternating left-right along stem */}
        {/* Pair 1 — near top */}
        <g transform="translate(318,38) rotate(30)">
          <ellipse cx="0" cy="-18" rx="13" ry="20" fill="#8FA68D" opacity="0.72" />
          <path d="M0 0 L0 -36" stroke="#6A8870" strokeWidth="0.6" opacity="0.22" />
        </g>
        <g transform="translate(300,55) rotate(-22)">
          <ellipse cx="0" cy="-16" rx="11" ry="18" fill="#7A9680" opacity="0.66" />
        </g>
        {/* Pair 2 */}
        <g transform="translate(298,82) rotate(25)">
          <ellipse cx="0" cy="-15" rx="12" ry="19" fill="#93AE90" opacity="0.62" />
          <path d="M0 0 L0 -30" stroke="#6A8870" strokeWidth="0.6" opacity="0.20" />
        </g>
        <g transform="translate(278,96) rotate(-28)">
          <ellipse cx="0" cy="-14" rx="10" ry="17" fill="#8FA68D" opacity="0.58" />
        </g>
        {/* Pair 3 */}
        <g transform="translate(280,125) rotate(22)">
          <ellipse cx="0" cy="-13" rx="11" ry="17" fill="#7A9680" opacity="0.58" />
        </g>
        <g transform="translate(260,138) rotate(-25)">
          <ellipse cx="0" cy="-12" rx="9" ry="16" fill="#93AE90" opacity="0.52" />
        </g>
        {/* Pair 4 */}
        <g transform="translate(264,168) rotate(20)">
          <ellipse cx="0" cy="-12" rx="10" ry="16" fill="#8FA68D" opacity="0.50" />
        </g>
        <g transform="translate(245,180) rotate(-22)">
          <ellipse cx="0" cy="-11" rx="9" ry="15" fill="#7A9680" opacity="0.46" />
        </g>
        {/* Pair 5 — lower, fading */}
        <g transform="translate(248,210) rotate(18)">
          <ellipse cx="0" cy="-10" rx="9" ry="14" fill="#93AE90" opacity="0.42" />
        </g>
        <g transform="translate(232,220) rotate(-20)">
          <ellipse cx="0" cy="-9" rx="8" ry="13" fill="#8FA68D" opacity="0.38" />
        </g>
        {/* Pair 6 — very faint, lowest */}
        <g transform="translate(232,250) rotate(16)">
          <ellipse cx="0" cy="-8" rx="7" ry="12" fill="#7A9680" opacity="0.32" />
        </g>
        <g transform="translate(220,258) rotate(-18)">
          <ellipse cx="0" cy="-7" rx="6" ry="11" fill="#8FA68D" opacity="0.28" />
        </g>

        {/* Side branch — small departure from main stem */}
        <path d="M295 72 Q318 58 335 42" stroke="#8FA68D" strokeWidth="0.9" strokeLinecap="round" fill="none" opacity="0.18" />
        <g transform="translate(335,42) rotate(50)">
          <ellipse cx="0" cy="-10" rx="8" ry="13" fill="#93AE90" opacity="0.42" />
        </g>
        <g transform="translate(320,52) rotate(35)">
          <ellipse cx="0" cy="-8" rx="6" ry="11" fill="#8FA68D" opacity="0.36" />
        </g>
      </g>
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

      {/* Header with eucalyptus botanical */}
      <div className="relative overflow-hidden">
        {/* Botanical shadow layer */}
        <div aria-hidden="true" style={{
          position: 'absolute', top: 0, right: -60, width: 300, height: 240,
          background: 'radial-gradient(ellipse at 70% 15%, rgba(80,110,88,0.05) 0%, transparent 65%)',
          filter: 'blur(24px)',
          pointerEvents: 'none',
        }} />
        <PlannerBotanical />
        <PageHeader
          eyebrow="Weekly view"
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
