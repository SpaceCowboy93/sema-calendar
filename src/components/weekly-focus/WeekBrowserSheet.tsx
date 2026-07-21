'use client'

import { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { getWeekKey, getWeekLabel } from '@/lib/utils'

interface Props {
  open: boolean
  onClose: () => void
  onSelectWeek: (weekKey: string) => void
  currentWeekKey: string
}

export function WeekBrowserSheet({ open, onClose, onSelectWeek, currentWeekKey }: Props) {
  const focusActivities = useAppStore(s => s.focusActivities)
  const thisWeekKey     = getWeekKey()

  // Collect all unique week keys that have activities, sorted newest-first
  const weekKeys = useMemo(() => {
    const keys = new Set<string>()
    focusActivities.forEach(a => keys.add(a.weekKey))
    // Always include current calendar week
    keys.add(thisWeekKey)
    return Array.from(keys).sort((a, b) => b.localeCompare(a))
  }, [focusActivities, thisWeekKey])

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm"
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 32, stiffness: 380 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-[2rem] shadow-[0_-4px_24px_rgba(0,0,0,0.10)] max-w-lg mx-auto"
          >
            <div className="px-5 pt-4 pb-10 max-h-[70dvh] flex flex-col">
              {/* Handle */}
              <div className="w-10 h-1 rounded-full bg-gray-200 mx-auto mb-5 shrink-0" />

              {/* Header */}
              <div className="flex items-center justify-between mb-4 shrink-0">
                <div>
                  <h3 className="text-base font-bold text-gray-800">Week History</h3>
                  <p className="text-xs text-gray-400 mt-0.5">Browse previous weeks</p>
                </div>
                <button
                  onClick={onClose}
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-500"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Week list */}
              <div className="overflow-y-auto flex-1 space-y-1 pr-0.5">
                {weekKeys.map(key => {
                  const isActive   = key === currentWeekKey
                  const isCurrent  = key === thisWeekKey
                  const actCount   = focusActivities.filter(a => a.weekKey === key).length

                  return (
                    <button
                      key={key}
                      onClick={() => onSelectWeek(key)}
                      className="w-full flex items-center justify-between px-4 py-3 rounded-2xl transition-colors active:bg-gray-50"
                      style={isActive ? { background: '#f9f9f9' } : undefined}
                    >
                      <div className="text-left">
                        <p className="text-sm font-medium text-gray-800">
                          {getWeekLabel(key)}
                          {isCurrent && (
                            <span className="ml-2 text-[10px] font-semibold text-gray-400 uppercase tracking-wide">
                              Current
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {actCount === 0
                            ? 'No activities'
                            : `${actCount} activit${actCount !== 1 ? 'ies' : 'y'}`}
                        </p>
                      </div>
                      {isActive && (
                        <div className="w-1.5 h-1.5 rounded-full bg-gray-400 shrink-0" />
                      )}
                    </button>
                  )
                })}

                {weekKeys.length === 0 && (
                  <div className="py-10 text-center text-sm text-gray-400">
                    No weeks yet.
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
