'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bell, BellOff, BellRing, ChevronDown } from 'lucide-react'
import { usePushNotifications } from '@/hooks/usePushNotifications'
import { useAppStore } from '@/store/useAppStore'

function isIOS() {
  if (typeof navigator === 'undefined') return false
  return /iphone|ipad|ipod/i.test(navigator.userAgent)
}

function isInStandaloneMode() {
  if (typeof window === 'undefined') return false
  return ('standalone' in window.navigator) && (window.navigator as { standalone?: boolean }).standalone === true
}

export function NotificationSetup({ primary }: { primary: string }) {
  const { status, loading, enable, disable } = usePushNotifications()
  const currentUser = useAppStore(s => s.currentUser)

  const [testState, setTestState]   = useState<'idle' | 'sending' | 'ok' | 'err'>('idle')
  const [testDetail, setTestDetail] = useState('')
  const [showIOSHelp, setShowIOSHelp] = useState(false)

  async function sendTestPush() {
    if (!currentUser) return
    setTestState('sending')
    setTestDetail('')
    console.log('[Push] Sending test push for user:', currentUser)
    try {
      const res  = await fetch('/api/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userName: currentUser,
          title: 'SeMa 💕',
          body: 'Push notifications are working! 🎉',
          tag: 'sema-test',
        }),
      })
      const data = await res.json()
      console.log('[Push] /api/push/send response:', res.status, data)
      if (data.ok && data.sent > 0) {
        setTestState('ok')
        setTestDetail(`Delivered to ${data.sent} device${data.sent !== 1 ? 's' : ''}`)
      } else {
        setTestState('err')
        setTestDetail(data.error ?? data.message ?? `sent=${data.sent ?? 0}`)
      }
    } catch (err) {
      console.error('[Push] sendTestPush fetch error:', err)
      setTestState('err')
      setTestDetail(String(err))
    }
    setTimeout(() => { setTestState('idle'); setTestDetail('') }, 6000)
  }

  if (status === 'unsupported') {
    // Likely iOS Safari not in standalone mode
    const ios  = isIOS()
    const standalone = isInStandaloneMode()
    if (ios && !standalone) {
      return (
        <div className="rounded-2xl overflow-hidden" style={{ border: '1.5px solid #e9d5ff' }}>
          <button
            onClick={() => setShowIOSHelp(v => !v)}
            className="w-full flex items-center gap-3 px-4 py-3 bg-purple-50 text-left"
          >
            <div className="w-9 h-9 rounded-xl bg-purple-100 flex items-center justify-center shrink-0 text-lg">📱</div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-800">Enable phone notifications</p>
              <p className="text-xs text-gray-500">Requires Home Screen install — tap to see how</p>
            </div>
            <motion.div animate={{ rotate: showIOSHelp ? 180 : 0 }} transition={{ duration: 0.2 }}>
              <ChevronDown size={16} className="text-gray-400" />
            </motion.div>
          </button>
          <AnimatePresence>
            {showIOSHelp && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="px-4 py-3 bg-white space-y-2">
                  {[
                    { n: '1', text: 'Open SeMa in Safari (not Chrome)' },
                    { n: '2', text: 'Tap the Share button at the bottom' },
                    { n: '3', text: 'Tap "Add to Home Screen"' },
                    { n: '4', text: 'Open SeMa from your Home Screen icon' },
                    { n: '5', text: 'Come back here and enable notifications' },
                  ].map(s => (
                    <div key={s.n} className="flex items-start gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-600 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">{s.n}</span>
                      <p className="text-xs text-gray-600">{s.text}</p>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )
    }
    return null
  }

  if (status === 'denied') {
    return (
      <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-red-50">
        <BellOff size={18} className="text-red-400 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-700">Notifications blocked</p>
          <p className="text-xs text-gray-400">Enable them in browser Settings → Notifications</p>
        </div>
      </div>
    )
  }

  if (status === 'subscribed') {
    return (
      <div className="rounded-2xl bg-emerald-50 overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-3">
          <BellRing size={18} className="text-emerald-500 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-700">Notifications on</p>
            <p className="text-xs text-gray-400">Reminders will arrive even when SeMa is closed</p>
          </div>
          <motion.button
            whileTap={{ scale: 0.93 }}
            onClick={disable}
            disabled={loading}
            className="text-[10px] font-semibold text-gray-400 underline underline-offset-2 shrink-0"
          >
            Turn off
          </motion.button>
        </div>
        <div className="mx-4 mb-3 space-y-1.5">
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={sendTestPush}
            disabled={testState === 'sending'}
            className="w-full py-2 rounded-xl text-xs font-semibold text-emerald-600 bg-white border border-emerald-200 flex items-center justify-center gap-1.5"
          >
            {testState === 'sending' && <span className="w-3 h-3 border-2 border-t-transparent rounded-full animate-spin border-emerald-400 inline-block" />}
            {testState === 'ok'      && '✓ '}
            {testState === 'err'     && '✗ '}
            {testState === 'idle'    && '🔔 '}
            {testState === 'sending' ? 'Sending…'
              : testState === 'ok'  ? 'Delivered! Background the app to see it.'
              : testState === 'err' ? 'Not delivered — see detail below'
              : 'Send test notification'}
          </motion.button>
          {testDetail !== '' && (
            <p className={`text-[10px] text-center px-1 ${testState === 'ok' ? 'text-emerald-500' : 'text-red-400'}`}>
              {testDetail}
            </p>
          )}
        </div>
      </div>
    )
  }

  // default — not yet subscribed
  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      onClick={enable}
      disabled={loading}
      className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-left"
      style={{ background: `${primary}10`, border: `1.5px solid ${primary}25` }}
    >
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: `${primary}18` }}
      >
        {loading
          ? <div className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: primary }} />
          : <Bell size={16} style={{ color: primary }} />
        }
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-800">Enable notifications</p>
        <p className="text-xs text-gray-400">Get reminders 5 min, 1 hour, and 1 day before events</p>
      </div>
      <span className="text-gray-300 shrink-0">›</span>
    </motion.button>
  )
}
