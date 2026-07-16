'use client'

import { motion } from 'framer-motion'
import { Bell, BellOff, BellRing } from 'lucide-react'
import { usePushNotifications } from '@/hooks/usePushNotifications'

export function NotificationSetup({ primary }: { primary: string }) {
  const { status, loading, enable, disable } = usePushNotifications()

  if (status === 'unsupported') return null

  if (status === 'subscribed') {
    return (
      <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-emerald-50">
        <BellRing size={18} className="text-emerald-500 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-700">Notifications on</p>
          <p className="text-xs text-gray-400">You'll be reminded before events</p>
        </div>
        <motion.button
          whileTap={{ scale: 0.93 }}
          onClick={disable}
          disabled={loading}
          className="text-[10px] font-semibold text-gray-400 underline underline-offset-2"
        >
          Turn off
        </motion.button>
      </div>
    )
  }

  if (status === 'denied') {
    return (
      <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-red-50">
        <BellOff size={18} className="text-red-400 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-700">Notifications blocked</p>
          <p className="text-xs text-gray-400">Enable them in your browser settings</p>
        </div>
      </div>
    )
  }

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
        <p className="text-xs text-gray-400">Get reminders before events on this device</p>
      </div>
      <span className="text-gray-300 shrink-0">›</span>
    </motion.button>
  )
}
