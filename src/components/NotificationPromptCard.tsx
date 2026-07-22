'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bell, BellOff, ChevronDown } from 'lucide-react'
import { usePushNotifications } from '@/hooks/usePushNotifications'
import { useAppStore } from '@/store/useAppStore'
import { USERS } from '@/types'

function isIOS() {
  if (typeof navigator === 'undefined') return false
  return /iphone|ipad|ipod/i.test(navigator.userAgent)
}

function isStandalone() {
  if (typeof window === 'undefined') return false
  return (
    'standalone' in window.navigator &&
    (window.navigator as { standalone?: boolean }).standalone === true
  )
}

// ── Spinner ───────────────────────────────────────────────────────────────────
function Spinner({ color = 'white' }: { color?: string }) {
  return (
    <span
      className="w-3.5 h-3.5 border-2 border-t-transparent rounded-full animate-spin inline-block shrink-0"
      style={{ borderColor: `${color}60`, borderTopColor: 'transparent' }}
    />
  )
}

// ── NotificationPromptCard ────────────────────────────────────────────────────
// Shows a compact inline card when this device is not yet subscribed to push
// notifications. Returns null once subscribed — no permanent section is shown.

export function NotificationPromptCard({ primary }: { primary: string }) {
  const { status, loading, enable, swError } = usePushNotifications()
  const currentUser = useAppStore(s => s.currentUser)
  const displayName = currentUser ? USERS[currentUser].displayName : ''
  const [showSteps, setShowSteps] = useState(false)

  // Nothing to show once subscribed or on non-iOS unsupported browsers
  if (status === 'subscribed') return null
  if (status === 'unsupported' && !(isIOS() && !isStandalone())) return null

  // ── iOS not installed as PWA ────────────────────────────────────────────────
  if (status === 'unsupported') {
    return (
      <motion.div
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="mb-3 rounded-2xl overflow-hidden"
        style={{ border: `1px solid ${primary}22` }}
      >
        <button
          onClick={() => setShowSteps(v => !v)}
          className="w-full flex items-center gap-3 px-4 py-3 text-left"
          style={{ background: `${primary}08` }}
        >
          <span className="text-lg shrink-0">📱</span>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-gray-800">Add to Home Screen for notifications</p>
            <p className="text-[10px] text-gray-500 mt-0.5">
              Share → Add to Home Screen, then open SeMa
            </p>
          </div>
          <motion.div
            animate={{ rotate: showSteps ? 180 : 0 }}
            transition={{ duration: 0.2 }}
            className="shrink-0"
          >
            <ChevronDown size={14} className="text-gray-300" />
          </motion.div>
        </button>

        <AnimatePresence>
          {showSteps && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden bg-white"
            >
              <div className="px-4 py-3 space-y-2.5">
                {[
                  'Open SeMa in Safari (not Chrome or Firefox)',
                  'Tap the Share button at the bottom of the screen',
                  'Tap "Add to Home Screen"',
                  'Open SeMa from your Home Screen icon and return here',
                ].map((text, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <span
                      className="w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5 text-white"
                      style={{ background: primary }}
                    >
                      {i + 1}
                    </span>
                    <p className="text-[11px] text-gray-600 leading-relaxed">{text}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    )
  }

  // ── Permission denied ───────────────────────────────────────────────────────
  if (status === 'denied') {
    return (
      <motion.div
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="mb-3 rounded-2xl px-4 py-3 flex items-center gap-3 bg-gray-50"
        style={{ border: '1px solid #e5e7eb' }}
      >
        <BellOff size={16} className="text-gray-400 shrink-0" />
        <div className="min-w-0">
          <p className="text-xs font-semibold text-gray-700">Notifications are blocked</p>
          <p className="text-[10px] text-gray-400 mt-0.5 leading-relaxed">
            Enable in your phone or browser Settings → Notifications.
          </p>
        </div>
      </motion.div>
    )
  }

  // ── Default or granted ──────────────────────────────────────────────────────
  const isGranted = status === 'granted'

  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="mb-3 rounded-2xl px-4 py-3 flex items-center gap-3"
      style={{
        background: `${primary}0c`,
        border:     `1px solid ${primary}22`,
      }}
    >
      <div
        className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: `${primary}18` }}
      >
        <Bell size={15} style={{ color: primary }} />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-gray-800 leading-tight">
          {isGranted ? 'Connect this device' : 'Never miss what matters'}
        </p>
        <p className="text-[10px] text-gray-500 mt-0.5 leading-relaxed">
          {isGranted
            ? `Notifications are on but ${displayName}'s phone isn't connected.`
            : 'Enable reminders for events, activities and special dates.'}
        </p>
        {swError && (
          <p className="text-[10px] text-red-400 mt-1 leading-relaxed">{swError}</p>
        )}
      </div>

      <motion.button
        whileTap={{ scale: 0.93 }}
        onClick={enable}
        disabled={loading}
        className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-bold text-white disabled:opacity-50"
        style={{ background: primary, boxShadow: `0 2px 10px ${primary}30` }}
      >
        {loading ? <Spinner /> : null}
        {loading ? '' : isGranted ? 'Connect' : 'Enable'}
      </motion.button>
    </motion.div>
  )
}
