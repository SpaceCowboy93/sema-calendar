'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { Trash2 } from '@/design/iconSystem'

interface Props {
  open: boolean
  title: string
  message: string
  onCancel: () => void
  onConfirm: () => void
  confirmLabel?: string
}

export default function DeleteConfirmSheet({
  open,
  title,
  message,
  onCancel,
  onConfirm,
  confirmLabel = 'Delete',
}: Props) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[90] flex items-center justify-center p-6"
        >
          <div className="absolute inset-0 bg-black/40" onClick={onCancel} />
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="relative c2-sheet-bg rounded-3xl p-6 w-full max-w-xs text-center shadow-modal"
          >
            <div className="w-12 h-12 rounded-2xl c2-sheet-danger-soft flex items-center justify-center mx-auto mb-3">
              <Trash2 size={20} />
            </div>
            <h3 className="font-bold mb-1" style={{ color: '#2D2926' }}>{title}</h3>
            <p className="text-sm mb-5" style={{ color: '#9B9590' }}>{message}</p>
            <div className="flex gap-3">
              <button
                onClick={onCancel}
                className="flex-1 py-3 rounded-2xl c2-sheet-cancel font-medium text-sm"
              >
                Cancel
              </button>
              <button
                onClick={onConfirm}
                className="flex-1 py-3 rounded-2xl c2-sheet-danger font-medium text-sm"
              >
                {confirmLabel}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
