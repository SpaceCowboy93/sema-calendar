'use client'

import { useState, useMemo, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight, History, Check, Plus } from 'lucide-react'
import { format, addWeeks, subWeeks } from 'date-fns'
import { useAppStore } from '@/store/useAppStore'
import { USERS, type UserName, type FocusActivity } from '@/types'
import {
  cn, formatTime, getTodayString,
  getWeekKey, getWeekStartDate, getWeekLabel,
} from '@/lib/utils'
import { FocusActivitySheet } from './FocusActivitySheet'
import { WeekBrowserSheet } from './WeekBrowserSheet'

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const PREVIEW_COUNT = 2
type FilterUser = 'both' | UserName

// ── Shared activity row ────────────────────────────────────────────────────────

function ActivityRow({
  activity,
  primary,
  compact,
  onToggle,
  onEdit,
}: {
  activity: FocusActivity
  primary: string
  compact?: boolean
  onToggle: (id: string) => void
  onEdit: (a: FocusActivity) => void
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: activity.isCompleted ? 0.36 : 1, y: 0 }}
      transition={{ duration: 0.18 }}
      className={cn('flex items-center gap-3', compact ? 'py-1' : 'py-2')}
    >
      {/* Check circle */}
      <motion.button
        whileTap={{ scale: 0.8 }}
        onClick={() => onToggle(activity.id)}
        className="shrink-0 w-5 h-5 rounded-full border-[1.5px] flex items-center justify-center transition-colors"
        style={{
          borderColor: activity.isCompleted ? primary : '#d1d5db',
          background:  activity.isCompleted ? primary : 'transparent',
        }}
      >
        <AnimatePresence>
          {activity.isCompleted && (
            <motion.div
              key="chk"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ duration: 0.13 }}
            >
              <Check size={9} strokeWidth={2.8} className="text-white" />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>

      {/* Title (left) + time (right) — whole area taps to edit */}
      <button
        onClick={() => onEdit(activity)}
        className="flex-1 flex items-center justify-between gap-3 text-left min-w-0"
      >
        <div className="min-w-0">
          <span className={cn(
            'text-sm leading-snug block truncate',
            activity.isCompleted ? 'line-through text-gray-400' : 'text-gray-800',
          )}>
            {activity.title}
          </span>
          {/* Subtle indicators — only when not completed */}
          {!activity.isCompleted && (
            <span className="flex gap-2">
              {(activity.checklist?.length ?? 0) > 0 && (
                <span className="text-[10px] text-gray-300">
                  {activity.checklist!.filter(i => i.done).length}/{activity.checklist!.length}
                </span>
              )}
              {(activity.photos?.length ?? 0) > 0 && (
                <span className="text-[10px] text-gray-300">
                  {activity.photos!.length} photo{activity.photos!.length !== 1 ? 's' : ''}
                </span>
              )}
            </span>
          )}
        </div>
        {/* Time — right-aligned, secondary */}
        {activity.time && (
          <span className="text-xs text-gray-400 shrink-0">{formatTime(activity.time)}</span>
        )}
      </button>
    </motion.div>
  )
}

// ── Today section (always fully expanded) ─────────────────────────────────────

function TodaySection({
  dayName,
  dateStr,
  activities,
  primary,
  suggestion,
  dismissed,
  onDismiss,
  onToggle,
  onEdit,
  onAdd,
  onAddSuggestion,
}: {
  dayName: string
  dateStr: string
  activities: FocusActivity[]
  primary: string
  suggestion?: { title: string }
  dismissed: Set<string>
  onDismiss: (key: string) => void
  onToggle: (id: string) => void
  onEdit: (a: FocusActivity) => void
  onAdd: () => void
  onAddSuggestion: (title: string) => void
}) {
  const completed = activities.filter(a => a.isCompleted).length
  const total     = activities.length
  const allDone   = total > 0 && completed === total

  const suggKey      = suggestion ? `today::${suggestion.title.toLowerCase().trim()}` : ''
  const showSuggestion = !!suggestion && !dismissed.has(suggKey)

  return (
    <div className="rounded-2xl bg-white shadow-[0_1px_10px_rgba(0,0,0,0.07)] px-4 py-4 mb-1">

      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-baseline gap-2">
          <span className="text-[11px] font-bold tracking-widest uppercase text-gray-700">
            {dayName}
          </span>
          <span className="text-[11px] text-gray-400">
            {format(new Date(dateStr + 'T00:00:00'), 'MMM d')}
          </span>
        </div>
        <span
          className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full text-white"
          style={{ background: primary }}
        >
          Today
        </span>
      </div>

      {/* Progress bar — only when there are activities */}
      {total > 0 && (
        <div className="mb-4">
          <p className="text-[11px] text-gray-400 mb-1.5">
            {completed} of {total} done
          </p>
          <div className="h-[3px] bg-gray-100 rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{ background: primary }}
              initial={{ width: 0 }}
              animate={{ width: `${(completed / total) * 100}%` }}
              transition={{ duration: 0.45, ease: 'easeOut' }}
            />
          </div>
        </div>
      )}

      {/* All activities — always visible */}
      <AnimatePresence initial={false}>
        {activities.length > 0 && (
          <div className="divide-y divide-gray-50">
            {activities.map(a => (
              <ActivityRow
                key={a.id}
                activity={a}
                primary={primary}
                onToggle={onToggle}
                onEdit={onEdit}
              />
            ))}
          </div>
        )}
      </AnimatePresence>

      {/* All-done message */}
      <AnimatePresence>
        {allDone && (
          <motion.p
            key="done"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="text-xs text-gray-400 text-center pt-3"
          >
            Everything for today is done ❤️
          </motion.p>
        )}
      </AnimatePresence>

      {/* Empty state */}
      {total === 0 && (
        <p className="text-xs text-gray-400 pb-1">Nothing planned today.</p>
      )}

      {/* Add activity */}
      <button
        onClick={onAdd}
        className="w-full flex items-center gap-2.5 py-2 mt-2 border-t border-gray-50 active:opacity-60 transition-opacity"
      >
        <Plus size={15} strokeWidth={2} style={{ color: primary }} className="shrink-0" />
        <span className="text-sm" style={{ color: primary }}>Add activity</span>
      </button>

      {/* Pattern suggestion */}
      {showSuggestion && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-2 flex items-start gap-2 rounded-xl px-3 py-2.5 bg-gray-50"
        >
          <p className="text-[11px] text-gray-500 leading-snug flex-1">
            You usually{' '}
            <span className="font-semibold text-gray-700">{suggestion!.title}</span>{' '}
            on {dayName}. Add it this week?
          </p>
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => onAddSuggestion(suggestion!.title)}
              className="text-[11px] font-semibold px-2.5 py-1 rounded-lg"
              style={{ color: primary, background: `${primary}15` }}
            >
              Add
            </button>
            <button
              onClick={() => onDismiss(suggKey)}
              className="text-[11px] text-gray-300 w-5 h-5 flex items-center justify-center active:text-gray-500"
            >
              ✕
            </button>
          </div>
        </motion.div>
      )}
    </div>
  )
}

// ── Other day section (compact, collapsible) ───────────────────────────────────

function OtherDaySection({
  dayName,
  dayIndex,
  dateStr,
  activities,
  primary,
  suggestion,
  dismissed,
  onDismiss,
  expanded,
  onToggleExpand,
  onToggle,
  onEdit,
  onAdd,
  onAddSuggestion,
}: {
  dayName: string
  dayIndex: number
  dateStr: string
  activities: FocusActivity[]
  primary: string
  suggestion?: { title: string }
  dismissed: Set<string>
  onDismiss: (key: string) => void
  expanded: boolean
  onToggleExpand: () => void
  onToggle: (id: string) => void
  onEdit: (a: FocusActivity) => void
  onAdd: () => void
  onAddSuggestion: (title: string) => void
}) {
  const visibleActivities = expanded ? activities : activities.slice(0, PREVIEW_COUNT)
  const hiddenCount       = activities.length - PREVIEW_COUNT

  const suggKey      = `${dayIndex}::${suggestion?.title.toLowerCase().trim() ?? ''}`
  const showSuggestion = !!suggestion && !dismissed.has(suggKey)

  return (
    <div className="border-t border-gray-100 py-3">

      {/* Header row */}
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-baseline gap-2">
          <span className="text-[11px] font-bold tracking-widest uppercase text-gray-400">
            {dayName}
          </span>
          <span className="text-[11px] text-gray-300">
            {format(new Date(dateStr + 'T00:00:00'), 'MMM d')}
          </span>
        </div>
        <button
          onClick={onAdd}
          className="w-6 h-6 flex items-center justify-center text-xl font-light active:opacity-50 transition-opacity"
          style={{ color: `${primary}99` }}
          aria-label={`Add activity to ${dayName}`}
        >
          +
        </button>
      </div>

      {/* Empty state */}
      {activities.length === 0 ? (
        <p className="text-[11px] text-gray-300">No plans</p>
      ) : (
        <>
          <div className="divide-y divide-gray-50">
            {visibleActivities.map(a => (
              <ActivityRow
                key={a.id}
                activity={a}
                primary={primary}
                compact
                onToggle={onToggle}
                onEdit={onEdit}
              />
            ))}
          </div>

          {/* Expand / collapse */}
          {!expanded && hiddenCount > 0 && (
            <button
              onClick={onToggleExpand}
              className="mt-1.5 text-[11px] text-gray-400 active:text-gray-600 transition-colors"
            >
              Show {hiddenCount} more
            </button>
          )}
          {expanded && activities.length > PREVIEW_COUNT && (
            <button
              onClick={onToggleExpand}
              className="mt-1.5 text-[11px] text-gray-400 active:text-gray-600 transition-colors"
            >
              Show less
            </button>
          )}
        </>
      )}

      {/* Pattern suggestion */}
      {showSuggestion && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-2 flex items-start gap-2 rounded-xl px-3 py-2 bg-gray-50"
        >
          <p className="text-[11px] text-gray-500 leading-snug flex-1">
            Usually:{' '}
            <span className="font-semibold text-gray-600">{suggestion!.title}</span>
          </p>
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => onAddSuggestion(suggestion!.title)}
              className="text-[11px] font-semibold px-2 py-0.5 rounded-lg"
              style={{ color: primary, background: `${primary}15` }}
            >
              Add
            </button>
            <button
              onClick={() => onDismiss(suggKey)}
              className="text-[11px] text-gray-300 w-5 h-5 flex items-center justify-center active:text-gray-500"
            >
              ✕
            </button>
          </div>
        </motion.div>
      )}
    </div>
  )
}

// ── Main export ───────────────────────────────────────────────────────────────

export function WeeklyFocusSection() {
  const currentUser         = useAppStore(s => s.currentUser)!
  const focusActivities     = useAppStore(s => s.focusActivities)
  const focusCarryOver      = useAppStore(s => s.focusCarryOver)
  const toggleFocusActivity = useAppStore(s => s.toggleFocusActivity)
  const carryOverToWeek     = useAppStore(s => s.carryOverToWeek)

  const isSeval = currentUser === 'seval'
  const primary = isSeval ? '#8b5cf6' : '#14b8a6'

  const [filterUser, setFilterUser]           = useState<FilterUser>('both')
  const [viewWeekKey, setViewWeekKey]         = useState(() => getWeekKey())
  const [expandedDays, setExpandedDays]       = useState<Set<number>>(new Set())
  const [dismissed, setDismissed]             = useState<Set<string>>(new Set())
  const [sheetOpen, setSheetOpen]             = useState(false)
  const [editingActivity, setEditingActivity] = useState<FocusActivity | null>(null)
  const [addingDayIndex, setAddingDayIndex]   = useState<number | null>(null)
  const [suggestedTitle, setSuggestedTitle]   = useState<string | undefined>()
  const [weekBrowserOpen, setWeekBrowserOpen] = useState(false)

  const carriedOverRef = useRef<Set<string>>(new Set())

  const today          = getTodayString()
  const currentWeekKey = getWeekKey()
  const weekStartDate  = getWeekStartDate(viewWeekKey)

  function getDateForDay(dayIndex: number): string {
    const d = new Date(weekStartDate)
    d.setDate(d.getDate() + dayIndex)
    return format(d, 'yyyy-MM-dd')
  }

  const weekActivities = useMemo(() => {
    return focusActivities.filter(a => {
      if (a.weekKey !== viewWeekKey) return false
      if (filterUser === 'both') return true
      return a.createdBy === filterUser
    })
  }, [focusActivities, viewWeekKey, filterUser])

  const activitiesByDay = useMemo(() => {
    const map: Record<number, FocusActivity[]> = {}
    for (let i = 0; i < 7; i++) map[i] = []
    weekActivities.forEach(a => { map[a.dayIndex].push(a) })
    for (let i = 0; i < 7; i++) {
      map[i].sort((a, b) => {
        if (a.time && b.time) return a.time.localeCompare(b.time)
        if (a.time) return -1
        if (b.time) return 1
        return a.createdAt.localeCompare(b.createdAt)
      })
    }
    return map
  }, [weekActivities])

  // Pattern recognition: same title on same weekday >= 3 times in past weeks
  const patternSuggestions = useMemo(() => {
    const past = focusActivities.filter(a => a.weekKey !== viewWeekKey)
    const counts: Record<string, number> = {}
    past.forEach(a => {
      const key = `${a.dayIndex}::${a.title.toLowerCase().trim()}`
      counts[key] = (counts[key] ?? 0) + 1
    })

    const result: Record<number, { title: string }> = {}
    Object.entries(counts).forEach(([key, count]) => {
      if (count < 3) return
      const [dayStr, rawTitle] = key.split('::')
      const dayIndex = parseInt(dayStr, 10)
      const alreadyIn = (activitiesByDay[dayIndex] ?? []).some(
        a => a.title.toLowerCase().trim() === rawTitle,
      )
      if (!alreadyIn && !result[dayIndex]) {
        const original = past.find(
          a => a.dayIndex === dayIndex && a.title.toLowerCase().trim() === rawTitle,
        )
        result[dayIndex] = { title: original?.title ?? rawTitle }
      }
    })
    return result
  }, [focusActivities, viewWeekKey, activitiesByDay])

  function navigateWeek(dir: -1 | 1) {
    const base    = getWeekStartDate(viewWeekKey)
    const next    = dir === 1 ? addWeeks(base, 1) : subWeeks(base, 1)
    const nextKey = getWeekKey(next)

    if (
      dir === 1 &&
      nextKey === currentWeekKey &&
      focusCarryOver &&
      !carriedOverRef.current.has(viewWeekKey)
    ) {
      carriedOverRef.current.add(viewWeekKey)
      carryOverToWeek(viewWeekKey, nextKey)
    }

    setViewWeekKey(nextKey)
    setExpandedDays(new Set())
  }

  function openAdd(dayIndex: number, prefilledTitle?: string) {
    setEditingActivity(null)
    setAddingDayIndex(dayIndex)
    setSuggestedTitle(prefilledTitle)
    setSheetOpen(true)
  }

  function openEdit(activity: FocusActivity) {
    setEditingActivity(activity)
    setAddingDayIndex(null)
    setSuggestedTitle(undefined)
    setSheetOpen(true)
  }

  function closeSheet() {
    setSheetOpen(false)
    setEditingActivity(null)
    setAddingDayIndex(null)
    setSuggestedTitle(undefined)
  }

  function toggleExpanded(dayIndex: number) {
    setExpandedDays(prev => {
      const next = new Set(prev)
      if (next.has(dayIndex)) next.delete(dayIndex)
      else next.add(dayIndex)
      return next
    })
  }

  const isCurrentWeek = viewWeekKey === currentWeekKey

  return (
    <div className="px-4 pb-6">

      {/* ── Section header ── */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-bold text-gray-800">This Week</h2>
        <button
          onClick={() => setWeekBrowserOpen(true)}
          className="flex items-center gap-1 text-xs text-gray-400 active:opacity-60"
        >
          <History size={13} />
          History
        </button>
      </div>

      {/* ── Profile filter ── */}
      <div className="flex gap-1 mb-4 bg-gray-100 rounded-xl p-1">
        {(['both', 'mateo', 'seval'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilterUser(f)}
            className={cn(
              'flex-1 py-1.5 rounded-lg text-xs font-medium transition-all',
              filterUser === f
                ? 'bg-white shadow-sm text-gray-800'
                : 'text-gray-400',
            )}
          >
            {f === 'both' ? 'Both' : USERS[f as UserName].displayName}
          </button>
        ))}
      </div>

      {/* ── Week navigation ── */}
      <div className="flex items-center justify-between mb-5">
        <button
          onClick={() => navigateWeek(-1)}
          className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 active:bg-gray-200 transition-colors"
        >
          <ChevronLeft size={16} className="text-gray-500" />
        </button>

        <div className="text-center">
          <p className="text-xs font-semibold text-gray-700">{getWeekLabel(viewWeekKey)}</p>
          {isCurrentWeek ? (
            <p className="text-[10px] text-gray-400 mt-0.5">This week</p>
          ) : (
            <button
              onClick={() => setViewWeekKey(currentWeekKey)}
              className="text-[10px] mt-0.5"
              style={{ color: primary }}
            >
              Back to now
            </button>
          )}
        </div>

        <button
          onClick={() => navigateWeek(1)}
          className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 active:bg-gray-200 transition-colors"
        >
          <ChevronRight size={16} className="text-gray-500" />
        </button>
      </div>

      {/* ── Days ── */}
      <div>
        {DAYS.map((dayName, dayIndex) => {
          const dateStr   = getDateForDay(dayIndex)
          const isToday   = dateStr === today
          const dayActs   = activitiesByDay[dayIndex] ?? []
          const suggestion = patternSuggestions[dayIndex]

          if (isToday) {
            return (
              <TodaySection
                key={dayIndex}
                dayName={dayName}
                dateStr={dateStr}
                activities={dayActs}
                primary={primary}
                suggestion={suggestion}
                dismissed={dismissed}
                onDismiss={key => setDismissed(prev => { const s = new Set(prev); s.add(key); return s })}
                onToggle={toggleFocusActivity}
                onEdit={openEdit}
                onAdd={() => openAdd(dayIndex)}
                onAddSuggestion={title => openAdd(dayIndex, title)}
              />
            )
          }

          return (
            <OtherDaySection
              key={dayIndex}
              dayName={dayName}
              dayIndex={dayIndex}
              dateStr={dateStr}
              activities={dayActs}
              primary={primary}
              suggestion={suggestion}
              dismissed={dismissed}
              onDismiss={key => setDismissed(prev => { const s = new Set(prev); s.add(key); return s })}
              expanded={expandedDays.has(dayIndex)}
              onToggleExpand={() => toggleExpanded(dayIndex)}
              onToggle={toggleFocusActivity}
              onEdit={openEdit}
              onAdd={() => openAdd(dayIndex)}
              onAddSuggestion={title => openAdd(dayIndex, title)}
            />
          )
        })}
      </div>

      {/* ── Sheets ── */}
      <FocusActivitySheet
        open={sheetOpen}
        onClose={closeSheet}
        weekKey={viewWeekKey}
        dayIndex={editingActivity?.dayIndex ?? addingDayIndex ?? 0}
        activity={editingActivity ?? undefined}
        suggestedTitle={suggestedTitle}
        primary={primary}
      />

      <WeekBrowserSheet
        open={weekBrowserOpen}
        onClose={() => setWeekBrowserOpen(false)}
        onSelectWeek={key => { setViewWeekKey(key); setWeekBrowserOpen(false) }}
        currentWeekKey={viewWeekKey}
      />
    </div>
  )
}
