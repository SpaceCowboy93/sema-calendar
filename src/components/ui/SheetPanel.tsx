'use client'

import { useEffect, useId, useRef } from 'react'
import { motion, type HTMLMotionProps } from 'framer-motion'
import { useModalInteraction } from '@/hooks/useModalInteraction'
import { cn } from '@/lib/utils'

/** Adapts existing animated editors to the shared viewport and modal lifecycle. */
export function SheetPanel({ onClose, children, className, style, ...props }: HTMLMotionProps<'div'> & { onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null)
  const titleId = useId()
  useModalInteraction(true, ref, onClose)
  useEffect(() => {
    const panel = ref.current
    if (!panel || props['aria-label'] || props['aria-labelledby']) return
    const title = panel.querySelector('h1, h2, h3')
    if (title) {
      if (!title.id) title.id = titleId
      panel.setAttribute('aria-labelledby', title.id)
    }
  }, [titleId, props])
  return (
    <motion.div
      {...props}
      ref={ref}
      role="dialog"
      aria-modal="true"
      tabIndex={-1}
      data-scroll-panel={!className?.includes('flex-col') ? 'true' : undefined}
      className={cn(className, 'c2-sheet-panel')}
      style={{ ...style, maxHeight: undefined }}
    >
      {children}
    </motion.div>
  )
}
