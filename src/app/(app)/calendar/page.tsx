'use client'

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight, Plus, Clock } from 'lucide-react'
import { format, isSameMonth, isToday, parseISO } from 'date-fns'
import { useAppStore } from '@/store/useAppStore'
import { EventModal } from '@/components/calendar/EventModal'
import { type CalendarEvent } from '@/types'
import { USERS, OTHER_USER } from '@/types'
import { getCalendarDays, toDateString, formatTime, getTodayString, cn, EVENT_COLOR_CLASS, MOOD_CONFIG } from '@/lib/utils'

const DOW_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

export default function CalendarPage() {
  const currentUser = useAppStore(s => s.currentUser)!
  const events       = useAppStore(s => s.events)
  const getMood      = useAppStore(s => s.getMoodForUser)

  const [viewDate, setViewDate]           = useState(new Date())
  const [selectedDate, setSelectedDate]   = useState(getTodayString())
  const [modalOpen, setModalOpen]         = useState(false)
  const [editingEvent, setEditingEvent]   = useState<CalendarEvent | null>(null)

  const isSeval     = currentUser === 'seval'
  const partnerUser = OTHER_USER[currentUser]
  const partnerMood = getMood(partnerUser)
  const myMood      = getMood(currentUser)

  const calendarDays = useMemo(
    () => getCalendarDays(viewDate.getFullYear(), viewDate.getMonth()),
    [viewDate]
  )

  const eventsByDate = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {}
    events.forEach(e => {
      if (!map[e.date]) map[e.date] = []
      map[e.date].push(e)
    })
    return map
  }, [events])

  const selectedEvents = eventsByDate[selectedDate] ?? []

  function prevMonth() {
    setViewDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1))
  }

  function nextMonth() {
    setViewDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1))
  }

  function handleDayPress(day: Date) {
    setSelectedDate(toDateString(day))
  }

  function openNewEvent() {
    setEditingEvent(null)
    setModalOpen(true)
  }

  function openEditEvent(e: CalendarEvent) {
    setEditingEvent(e)
    setModalOpen(true)
  }

  const primaryColor  = isSeval ? '#8b5cf6' : '#14b8a6'
  const lightBg       = isSeval ? 'bg-seval-100' : 'bg-mateo-100'
  const lighterBg     = isSeval ? 'bg-seval-50'  : 'bg-mateo-50'
  const textColor     = isSeval ? 'text-seval-600' : 'text-mateo-600'

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div
        className="px-5 pt-14 pb-4"
        style={{
          background: isSeval
            ? 'linear-gradient(135deg, #f5f3ff, #fafafa)'
            : 'linear-gradient(135deg, #f0fdfa, #fafafa)',
        }}
      >
        {/* Partner mood strip */}
        {partnerMood && (
          <div className={`flex items-center gap-2 mb-3 px-3 py-2 rounded-2xl ${lighterBg}`}>
            <span className="text-lg">{MOOD_CONFIG[partnerMood.mood].emoji}</span>
            <p className="text-xs text-gray-500">
              <span className="font-semibold">{USERS[partnerUser].displayName}</span>
              {' '}is feeling {MOOD_CONFIG[partnerMood.mood].label.toLowerCase()} today
            </p>
          </div>
        )}

        {/* Month navigation */}
        <div className="flex items-center justify-between mt-1">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">
              {format(viewDate, 'MMMM')}
            </h1>
            <p className="text-sm text-gray-400">{format(viewDate, 'yyyy')}</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={prevMonth}
              className="w-9 h-9 rounded-full bg-white shadow-card flex items-center justify-center
                         active:scale-90 transition-transform"
            >
              <ChevronLeft size={18} className="text-gray-500" />
            </button>
            <button
              onClick={nextMonth}
              className="w-9 h-9 rounded-full bg-white shadow-card flex items-center justify-center
                         active:scale-90 transition-transform"
            >
              <ChevronRight size={18} className="text-gray-500" />
            </button>
          </div>
        </div>
      </div>

      <div className="px-4">
        {/* Day-of-week headers */}
        <div className="grid grid-cols-7 mb-1 mt-2">
          {DOW_LABELS.map((d, i) => (
            <div key={i} className="text-center text-[11px] font-semibold text-gray-400 py-1">
              {d}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-y-1 mb-5">
          {calendarDays.map((day, i) => {
            const dateStr   = toDateString(day)
            const isCurrentMonth = isSameMonth(day, viewDate)
            const isSelected     = dateStr === selectedDate
            const isTodayDate    = isToday(day)
            const dayEvents      = eventsByDate[dateStr] ?? []
            const hasEvents      = dayEvents.length > 0

            return (
              <motion.button
                key={i}
                whileTap={{ scale: 0.88 }}
                onClick={() => handleDayPress(day)}
                className="calendar-day flex-col relative"
              >
                {/* Selection/today ring */}
                <div
                  className={cn(
                    'absolute inset-1 rounded-full transition-all',
                    isSelected && !isTodayDate && 'opacity-15',
                    isSelected ? (isSeval ? 'bg-seval-400' : 'bg-mateo-400') : '',
                  )}
                />

                {isTodayDate && (
                  <div
                    className={cn(
                      'absolute inset-1 rounded-full',
                      isSelected ? 'opacity-100' : 'opacity-20'
                    )}
                    style={{ background: primaryColor }}
                  />
                )}

                <span
                  className={cn(
                    'relative z-10 text-sm font-medium transition-colors',
                    !isCurrentMonth && 'text-gray-300',
                    isCurrentMonth && !isSelected && !isTodayDate && 'text-gray-700',
                    isTodayDate && !isSelected && textColor,
                    isSelected && isTodayDate && 'text-white font-bold',
                    isSelected && !isTodayDate && (isSeval ? 'text-seval-700' : 'text-mateo-700'),
                  )}
                >
                  {day.getDate()}
                </span>

                {/* Event dots */}
                {hasEvents && (
                  <div className="relative z-10 flex gap-0.5 mt-0.5">
                    {dayEvents.slice(0, 3).map(ev => (
                      <div
                        key={ev.id}
                        className={cn('w-1.5 h-1.5 rounded-full', EVENT_COLOR_CLASS[ev.color])}
                      />
                    ))}
                  </div>
                )}
              </motion.button>
            )
          })}
        </div>

        {/* Selected date events */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-gray-700">
              {selectedDate === getTodayString()
                ? 'Today'
                : format(parseISO(selectedDate), 'EEEE, MMM d')}
            </h2>
            <button
              onClick={openNewEvent}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-white',
                'active:scale-95 transition-transform shadow-sm'
              )}
              style={{ background: primaryColor }}
            >
              <Plus size={14} strokeWidth={2.5} />
              Add
            </button>
          </div>

          <AnimatePresence mode="popLayout">
            {selectedEvents.length === 0 ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className={cn('rounded-2xl py-6 px-4 text-center', lighterBg)}
              >
                <p className="text-2xl mb-2">🗓️</p>
                <p className="text-sm text-gray-400">No events — tap Add to create one</p>
              </motion.div>
            ) : (
              selectedEvents.map(ev => (
                <motion.button
                  key={ev.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  onClick={() => openEditEvent(ev)}
                  className="w-full text-left bg-white rounded-2xl p-4 mb-2 shadow-card flex gap-3
                             active:scale-[0.98] transition-transform"
                >
                  <div
                    className={cn('w-1 rounded-full shrink-0 self-stretch', EVENT_COLOR_CLASS[ev.color])}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-800 text-sm">{ev.title}</p>
                    {(ev.startTime || ev.endTime) && (
                      <div className="flex items-center gap-1 mt-0.5">
                        <Clock size={11} className="text-gray-400" />
                        <p className="text-xs text-gray-400">
                          {ev.startTime && formatTime(ev.startTime)}
                          {ev.startTime && ev.endTime && ' – '}
                          {ev.endTime && formatTime(ev.endTime)}
                        </p>
                      </div>
                    )}
                    {ev.notes && (
                      <p className="text-xs text-gray-400 mt-1 truncate">{ev.notes}</p>
                    )}
                    {ev.todos && ev.todos.length > 0 && (
                      <p className="text-xs text-gray-300 mt-1">
                        {ev.todos.filter(t => t.isCompleted).length}/{ev.todos.length} done
                      </p>
                    )}
                  </div>
                  <div className="shrink-0 self-center">
                    <div
                      className="text-xs px-2 py-0.5 rounded-full font-medium"
                      style={{
                        background: ev.createdBy === 'seval' ? '#ede9fe' : '#ccfbf1',
                        color: ev.createdBy === 'seval' ? '#7c3aed' : '#0d9488',
                      }}
                    >
                      {USERS[ev.createdBy].displayName}
                    </div>
                  </div>
                </motion.button>
              ))
            )}
          </AnimatePresence>
        </div>
      </div>

      <EventModal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setEditingEvent(null) }}
        date={selectedDate}
        event={editingEvent}
      />
    </div>
  )
}
