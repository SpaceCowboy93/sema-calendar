'use client'

/**
 * TimePicker — SeMa-styled inline two-step time picker (24-hour).
 *
 * Step 1: pick an hour  (0-23, 6 × 4 grid)
 * Step 2: pick a minute (5-minute steps, 6 × 2 grid)
 *
 * Renders inline — no absolute/fixed positioning, safe inside bottom sheets.
 *
 * Usage:
 *   <TimePicker value={time} onChange={setTime} />
 *   <TimePicker value={time} onChange={setTime} accentColor="#9EC9B3" allowClear={false} />
 */

import { useState } from 'react'
import { cn } from '@/lib/utils'

const HOURS   = Array.from({ length: 24 }, (_, i) => i)
const MINUTES = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55]

interface Props {
  value: string             // "HH:MM" or ''
  onChange: (v: string) => void
  placeholder?: string
  accentColor?: string
  className?: string
  triggerClassName?: string
  allowClear?: boolean
}

function pad(n: number) { return String(n).padStart(2, '0') }

function parseTime(value: string): { hour: number | null; minute: number | null } {
  if (!value) return { hour: null, minute: null }
  const parts = value.split(':').map(Number)
  const hour   = parts[0] !== undefined && !isNaN(parts[0]) ? parts[0] : null
  const minute = parts[1] !== undefined && !isNaN(parts[1]) ? parts[1] : null
  return { hour, minute }
}

export function TimePicker({
  value,
  onChange,
  placeholder = 'Select time',
  accentColor = '#9EC9B3',
  className,
  triggerClassName,
  allowClear = true,
}: Props) {
  const [open, setOpen]           = useState(false)
  const [step, setStep]           = useState<'hour' | 'minute'>('hour')
  const [pendingHour, setPendingHour] = useState<number | null>(null)

  const { hour: curHour, minute: curMin } = parseTime(value)

  function handleOpen() {
    setStep('hour')
    setPendingHour(null)
    setOpen(v => !v)
  }

  function pickHour(h: number) {
    setPendingHour(h)
    setStep('minute')
  }

  function pickMinute(m: number) {
    const h = pendingHour ?? curHour ?? 0
    onChange(`${pad(h)}:${pad(m)}`)
    setOpen(false)
    setStep('hour')
    setPendingHour(null)
  }

  function clear() {
    onChange('')
    setOpen(false)
    setStep('hour')
    setPendingHour(null)
  }

  /* The hour highlighted when showing the minute step */
  const activeHour = pendingHour ?? curHour

  return (
    <div className={cn('w-full', className)}>
      {/* Trigger */}
      <button
        type="button"
        onClick={handleOpen}
        className={cn(
          'w-full text-left text-sm rounded-2xl px-4 py-3 outline-none transition-colors',
          'bg-gray-50 active:bg-gray-100',
          triggerClassName,
        )}
        style={{ color: value ? '#374151' : '#9CA3AF' }}
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        {value ? `${pad(curHour ?? 0)}:${pad(curMin ?? 0)}` : placeholder}
      </button>

      {/* Inline panel */}
      {open && (
        <div
          role="dialog"
          aria-label="Time picker"
          className="mt-2 bg-white rounded-2xl shadow-sm border border-gray-100 p-4 select-none"
        >
          {step === 'hour' ? (
            <>
              {/* Header */}
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold text-gray-800">
                  {activeHour !== null ? `${pad(activeHour)}:__` : 'Hour'}
                </span>
                <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">
                  24-hour
                </span>
              </div>

              {/* 6 × 4 hour grid */}
              <div className="grid grid-cols-6 gap-1">
                {HOURS.map(h => {
                  const isSel = h === curHour
                  return (
                    <button
                      key={h}
                      type="button"
                      onClick={() => pickHour(h)}
                      aria-label={`${h} hours`}
                      aria-pressed={isSel}
                      className={cn(
                        'h-9 rounded-xl text-xs font-semibold transition-all',
                        !isSel && 'text-gray-600 active:bg-gray-100',
                      )}
                      style={isSel ? { background: accentColor, color: 'white' } : undefined}
                    >
                      {pad(h)}
                    </button>
                  )
                })}
              </div>
            </>
          ) : (
            <>
              {/* Header with back button */}
              <div className="flex items-center gap-2 mb-3">
                <button
                  type="button"
                  onClick={() => { setStep('hour'); setPendingHour(null) }}
                  className="text-xs font-semibold text-gray-400 active:text-gray-600 transition-colors"
                  aria-label="Back to hour selection"
                >
                  ← {pad(activeHour ?? 0)}:
                </button>
                <span className="text-sm font-semibold text-gray-800">Minute</span>
              </div>

              {/* 6 × 2 minute grid (5-min steps) */}
              <div className="grid grid-cols-6 gap-1">
                {MINUTES.map(m => {
                  const isSel = m === curMin && activeHour === curHour
                  return (
                    <button
                      key={m}
                      type="button"
                      onClick={() => pickMinute(m)}
                      aria-label={`${m} minutes`}
                      aria-pressed={isSel}
                      className={cn(
                        'h-9 rounded-xl text-xs font-semibold transition-all',
                        !isSel && 'text-gray-600 active:bg-gray-100',
                      )}
                      style={isSel ? { background: accentColor, color: 'white' } : undefined}
                    >
                      :{pad(m)}
                    </button>
                  )
                })}
              </div>
            </>
          )}

          {/* Clear */}
          {allowClear && value && (
            <button
              type="button"
              onClick={clear}
              className="w-full mt-3 text-xs text-gray-400 py-1.5 rounded-xl bg-gray-50 active:bg-gray-100 transition-colors"
            >
              Clear time
            </button>
          )}
        </div>
      )}
    </div>
  )
}
