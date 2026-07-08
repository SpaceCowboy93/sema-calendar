'use client'

import { motion, AnimatePresence } from 'framer-motion'
import type { PageBackgrounds } from '@/types'

export type PhotoUseChoice = keyof PageBackgrounds | 'card' | 'attach'

const PAGE_OPTIONS: { id: keyof PageBackgrounds; emoji: string; label: string }[] = [
  { id: 'together', emoji: '🏠', label: 'Together page background' },
  { id: 'plans',    emoji: '🗓️', label: 'Plans page background'   },
  { id: 'us',       emoji: '💕', label: 'Us page background'       },
]

export function PhotoBackgroundSheet({
  open, onChoose, showCard = false,
}: {
  open: boolean
  onChoose: (choice: PhotoUseChoice) => void
  showCard?: boolean
}) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80] bg-black/40 backdrop-blur-sm"
            onClick={() => onChoose('attach')}
          />
          <motion.div
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 380 }}
            className="fixed bottom-0 left-0 right-0 z-[80] bg-white rounded-t-[2rem] shadow-modal max-w-lg mx-auto"
          >
            <div className="px-5 pt-4 pb-10">
              <div className="drag-handle mb-4" />
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 text-center">
                Use this photo as a background?
              </p>
              <div className="space-y-2">
                {PAGE_OPTIONS.map(opt => (
                  <button
                    key={opt.id}
                    onClick={() => onChoose(opt.id)}
                    className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-gray-50 active:bg-gray-100 transition-colors text-left"
                  >
                    <span className="text-xl">{opt.emoji}</span>
                    <span className="text-sm font-semibold text-gray-700">{opt.label}</span>
                  </button>
                ))}
                {showCard && (
                  <button
                    onClick={() => onChoose('card')}
                    className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-gray-50 active:bg-gray-100 transition-colors text-left"
                  >
                    <span className="text-xl">🖼️</span>
                    <span className="text-sm font-semibold text-gray-700">Set as card background</span>
                  </button>
                )}
                <button
                  onClick={() => onChoose('attach')}
                  className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl active:bg-gray-50 transition-colors text-left"
                >
                  <span className="text-xl">📎</span>
                  <span className="text-sm font-medium text-gray-400">Just attach the photo</span>
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
