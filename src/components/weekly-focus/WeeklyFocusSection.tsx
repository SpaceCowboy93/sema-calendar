'use client'

import { useState, useMemo, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight, History } from 'lucide-react'
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

type FilterUser = 'both' | UserName

// ── Activity row ──────────────────────────────────────────────────────────────

function ActivityRow({
  activity,
  primary,
  onToggle,
  onEdit,
}: {
  activity: FocusActivity
  primary: string
  onToggle: (id: string) => void
  onEdit: (a: FocusActivity) => void
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: activity.isCompleted ? 0.42 : 1, y: 0 }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.22 }}
      className="flex items-center gap-3 py-2.5"
    >
      {/* Completion circle */}
      <button
        onClick={() => onToggle(activity.id)}
        className="shrink-0 w-5 h-5 rounded-full border-[1.5px] flex items-center justify-center transition-all active:scale-90"
        style={{
          borderColor: activity.isCompleted ? primary : '#d1d5db',
          background: activity.isCompleted ? primary : 'transparent',
        }}
      >
        {activity.isCompleted && (
          <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
            <path d="M1 3.5L3.5 6L8 1" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>

      {/* Title + time — tap to edit */}
      <button
        onClick={() => onEdit(activity)}
        className="flex-1 text-left"
      >
        <span
          className={cn(
            'text-sm text-gray-800 leading-snug',
            activity.isCompleted && 'line-through text-gray-400',
          )}
        >
          {activity.time && (
            <span className="text-gray-400 text-xs mr-1.5">{formatTime(activity.time)}</span>
          )}
          {activity.title}
        </span>
        {activity.checklist && activity.checklist.length > 0 && (
          <p className="text-[11px] text-gray-400 mt-0.5">
            {activity.checklist.filter(i => i.done).length}/{activity.checklist.length} tasks
          </p>
        )}
        {activity.photos && activity.photos.length > 0 && (
          <p className="text-[11px] text-gray-400 mt-0.5">
            {activity.photos.length} photo{activity.photos.length !== 1 ? 's' : ''}
          </p>
        )}
      </button>
    </motion.div>
  )
}

// ── Day section ───────────────────────────────────────────────────────────────

function DaySection({
  dayName,
  dayIndex,
  dateStr,
  isToday,
  activities,
  primary,
  suggestion,
  onToggle,
  onEdit,
  onAdd,
  onAddSuggestion,
}: {
  dayName: string
  dayIndex: number
  dateStr: string
  isToday: boolean
  activities: FocusActivity[]
  primary: string
  suggestion?: { title: string }
  onToggle: (id: string) => void
  onEdit: (a: FocusActivity) => void
  onAdd: () => void
  onAddSuggestion: (title: string) => void
}) {
  const completed = activities.filter(a => a.isCompleted).length
  const total = activities.length

  return (
    <div
      className={cn(
        'rounded-2xl px-4 py-3 transition-colors',
        isToday ? 'bg-white shadow-[0_1px_6px_rgba(0,0,0,0.06)]' : 'bg-transparent',
      )}
      style={isToday ? { borderLeft: `3px solid ${primary}`, paddingLeft: 13 } : undefined}
    >
      {/* Day header */}
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              'text-[11px] font-bold tracking-wider uppercase',
              isToday ? 'text-gray-700' : 'text-gray-400',
            )}
            style={isToday ? { color: primary } : undefined}
          >
            {dayName}
          </span>
          <span className="text-[11px] text-gray-400">
            {format(new Date(dateStr + 'T00:00:00'), 'MMM d')}
          </span>
        </div>

        {/* Add button */}
        <button
          onClick={onAdd}
          className="text-[11px] font-medium text-gray-400 active:opacity-60 transition-opacity px-1"
          style={{ color: primary }}
        >
          + Add
        </button>
      </div>

      {/* Today progress bar */}
      {isToday && total > 0 && (
        <div className="mb-3">
          <p className="text-[11px] text-gray-500 mb-1.5">
            {completed} / {total} completed
          </p>
          <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{ background: primary }}
              initial={{ width: 0 }}
              animate={{ width: total > 0 ? `${(completed / total) * 100}%` : '0%' }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            />
          </div>
        </div>
      )}

      {/* Activities */}
      <AnimatePresence initial={false}>
        {activities.length > 0 ? (
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
        ) : (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="py-2 pb-1"
          >
            {isToday ? (
              <p className="text-xs text-gray-400">
                Nothing planned today. Enjoy your free time ❤️
              </p>
            ) : (
              <p className="text-xs text-gray-300">Nothing planned.</p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pattern suggestion */}
      {suggestion && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-2 flex items-center justify-between rounded-xl px-3 py-2 bg-gray-50"
        >
          <p className="text-xs text-gray-500 leading-snug">
            You usually <span className="font-medium text-gray-700">{suggestion.title}</span> on {dayName}.
          </p>
          <button
            onClick={() => onAddSuggestion(suggestion.title)}
            className="ml-3 shrink-0 text-[11px] font-semibold px-2.5 py-1 rounded-lg"
            style={{ color: primary, background: `${primary}14` }}
          >
            Add again
          </button>
        </motion.div>
      )}
    </div>
  )
}

// ── Main section ──────────────────────────────────────────────────────────────

export function WeeklyFocusSection() {
  const currentUser        = useAppStore(s => s.currentUser)!
  const focusActivities    = useAppStore(s => s.focusActivities)
  const focusCarryOver     = useAppStore(s => s.focusCarryOver)
  const toggleFocusActivity = useAppStore(s => s.toggleFocusActivity)
  const carryOverToWeek    = useAppStore(s => s.carryOverToWeek)

  const isSeval  = currentUser === 'seval'
  const primary  = isSeval ? '#8b5cf6' : '#14b8a6'

  const [filterUser, setFilterUser]       = useState<FilterUser>('both')
  const [viewWeekKey, setViewWeekKey]     = useState(() => getWeekKey())
  const [sheetOpen, setSheetOpen]         = useState(false)
  const [editingActivity, setEditingActivity] = useState<FocusActivity | null>(null)
  const [addingDayIndex, setAddingDayIndex]   = useState<number | null>(null)
  const [suggestedTitle, setSuggestedTitle]   = useState<string | undefined>()
  const [weekBrowserOpen, setWeekBrowserOpen] = useState(false)

  // Track if we've already carried over for this weekKey to avoid repeat
  const carriedOverRef = useRef<Set<string>>(new Set())

  const today          = getTodayString()
  const currentWeekKey = getWeekKey()
  const weekStartDate  = getWeekStartDate(viewWeekKey)

  function getDateForDay(dayIndex: number): string {
    const d = new Date(weekStartDate)
    d.setDate(d.getDate() + dayIndex)
    return format(d, 'yyyy-MM-dd')
  }

  // Activities for this week, filtered by profile
  const weekActivities = useMemo(() => {
    return focusActivities.filter(a => {
      if (a.weekKey !== viewWeekKey) return false
      if (filterUser === 'both') return true
      return a.createdBy === filterUser
    })
  }, [focusActivities, viewWeekKey, filterUser])

  // Activities grouped by dayIndex
  const activitiesByDay = useMemo(() => {
    const map: Record<number, FocusActivity[]> = {}
    for (let i = 0; i < 7; i++) map[i] = []
    weekActivities.forEach(a => { map[a.dayIndex].push(a) })
    // Sort each day's activities by time (no-time last)
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

  // Pattern recognition: find activities that appear >= 3× on the same dayIndex across past weeks
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
      // Only suggest if no activity with that title already exists this week
      const alreadyIn = (activitiesByDay[dayIndex] ?? []).some(
        a => a.title.toLowerCase().trim() === rawTitle
      )
      if (!alreadyIn && !result[dayIndex]) {
        // Recover display-case title from the original
        const original = past.find(
          a => a.dayIndex === dayIndex && a.title.toLowerCase().trim() === rawTitle
        )
        result[dayIndex] = { title: original?.title ?? rawTitle }
      }
    })
    return result
  }, [focusActivities, viewWeekKey, activitiesByDay])

  function navigateWeek(dir: -1 | 1) {
    const base = getWeekStartDate(viewWeekKey)
    const next = dir === 1 ? addWeeks(base, 1) : subWeeks(base, 1)
    const nextKey = getWeekKey(next)

    // Auto carry-over when stepping into the current week from a past week
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

  const isCurrentWeek = viewWeekKey === currentWeekKey

  return (
    <div className="px-4 pb-2">
      {/* ── Section header ── */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-bold text-gray-800">Weekly Focus</h2>
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
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => navigateWeek(-1)}
          className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 active:bg-gray-200 transition-colors"
        >
          <ChevronLeft size={16} className="text-gray-500" />
        </button>

        <div className="text-center">
          <p className="text-xs font-semibold text-gray-700">{getWeekLabel(viewWeekKey)}</p>
          {isCurrentWeek && (
            <p className="text-[10px] text-gray-400 mt-0.5">This week</p>
          )}
          {!isCurrentWeek && (
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
      <div className="space-y-2">
        {DAYS.map((dayName, dayIndex) => {
          const dateStr   = getDateForDay(dayIndex)
          const isToday   = dateStr === today
          const dayActs   = activitiesByDay[dayIndex] ?? []
          const suggestion = patternSuggestions[dayIndex]

          return (
            <DaySection
              key={dayIndex}
              dayName={dayName}
              dayIndex={dayIndex}
              dateStr={dateStr}
              isToday={isToday}
              activities={dayActs}
              primary={primary}
              suggestion={suggestion}
              onToggle={toggleFocusActivity}
              onEdit={openEdit}
              onAdd={() => openAdd(dayIndex)}
              onAddSuggestion={(title) => openAdd(dayIndex, title)}
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
        onSelectWeek={(key) => { setViewWeekKey(key); setWeekBrowserOpen(false) }}
        currentWeekKey={viewWeekKey}
      />
    </div>
  )
}
