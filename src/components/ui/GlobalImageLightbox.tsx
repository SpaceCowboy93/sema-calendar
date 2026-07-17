'use client'

import { useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from 'lucide-react'
import { useLightboxStore } from '@/store/useLightboxStore'

export function GlobalImageLightbox() {
  const { isOpen, images, index, close, next, prev } = useLightboxStore()

  // Zoom/pan refs (direct DOM manipulation for perf)
  const scaleRef     = useRef(1)
  const panRef       = useRef({ x: 0, y: 0 })
  const imgWrapRef   = useRef<HTMLDivElement>(null)

  // Swipe detection
  const swipeStartRef = useRef<{ x: number; y: number } | null>(null)

  // Pinch zoom
  const lastPinchRef = useRef<number | null>(null)

  const applyTransform = useCallback(() => {
    if (!imgWrapRef.current) return
    imgWrapRef.current.style.transform =
      `translate(${panRef.current.x}px, ${panRef.current.y}px) scale(${scaleRef.current})`
  }, [])

  const resetTransform = useCallback(() => {
    scaleRef.current = 1
    panRef.current   = { x: 0, y: 0 }
    applyTransform()
  }, [applyTransform])

  // Reset zoom when image changes
  useEffect(() => { resetTransform() }, [index, resetTransform])

  // Lock scroll on main element while open
  useEffect(() => {
    if (!isOpen) return
    const main = document.querySelector('main') as HTMLElement | null
    if (!main) return
    const saved = main.scrollTop
    main.style.overflowY = 'hidden'
    return () => {
      main.style.overflowY = ''
      main.scrollTop = saved
    }
  }, [isOpen])

  // ESC / arrow keys
  useEffect(() => {
    if (!isOpen) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape')     close()
      if (e.key === 'ArrowRight') next()
      if (e.key === 'ArrowLeft')  prev()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isOpen, close, next, prev])

  // Touch: swipe + pinch
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX
      const dy = e.touches[0].clientY - e.touches[1].clientY
      lastPinchRef.current = Math.hypot(dx, dy)
      swipeStartRef.current = null
    } else {
      lastPinchRef.current  = null
      swipeStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
    }
  }, [])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2 && lastPinchRef.current !== null) {
      const dx   = e.touches[0].clientX - e.touches[1].clientX
      const dy   = e.touches[0].clientY - e.touches[1].clientY
      const dist = Math.hypot(dx, dy)
      scaleRef.current = Math.min(5, Math.max(1, scaleRef.current * (dist / lastPinchRef.current)))
      lastPinchRef.current = dist
      applyTransform()
    }
  }, [applyTransform])

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (e.changedTouches.length === 0 || !swipeStartRef.current) return
    if (scaleRef.current > 1.05) return // don't swipe if zoomed
    const dx = e.changedTouches[0].clientX - swipeStartRef.current.x
    const dy = Math.abs(e.changedTouches[0].clientY - swipeStartRef.current.y)
    if (Math.abs(dx) > 50 && dy < 70) {
      dx < 0 ? next() : prev()
    }
    swipeStartRef.current = null
  }, [next, prev])

  const handleZoomOut = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    scaleRef.current = Math.max(1, scaleRef.current - 0.5)
    if (scaleRef.current <= 1) panRef.current = { x: 0, y: 0 }
    applyTransform()
  }, [applyTransform])

  const handleZoomIn = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    scaleRef.current = Math.min(5, scaleRef.current + 0.5)
    applyTransform()
  }, [applyTransform])

  const handleReset = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    resetTransform()
  }, [resetTransform])

  const handlePrev = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    prev()
  }, [prev])

  const handleNext = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    next()
  }, [next])

  return (
    <AnimatePresence>
      {isOpen && images.length > 0 && (
        <motion.div
          key="global-lightbox"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-[300] bg-black/96 flex items-center justify-center"
          onClick={close}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* Image */}
          <div
            ref={imgWrapRef}
            className="w-full h-full flex items-center justify-center"
            style={{ touchAction: 'none' }}
            onClick={e => e.stopPropagation()}
          >
            <img
              src={images[index]}
              alt=""
              className="max-w-[95vw] max-h-[85vh] object-contain select-none pointer-events-none"
              draggable={false}
            />
          </div>

          {/* Close */}
          <button
            onClick={e => { e.stopPropagation(); close() }}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/15 backdrop-blur-sm flex items-center justify-center text-white z-10"
          >
            <X size={18} />
          </button>

          {/* Counter */}
          {images.length > 1 && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-black/40 backdrop-blur-sm text-white/80 text-sm font-medium z-10">
              {index + 1} / {images.length}
            </div>
          )}

          {/* Prev */}
          {index > 0 && (
            <button
              onClick={handlePrev}
              className="absolute left-3 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/15 backdrop-blur-sm flex items-center justify-center text-white z-10"
            >
              <ChevronLeft size={22} />
            </button>
          )}

          {/* Next */}
          {index < images.length - 1 && (
            <button
              onClick={handleNext}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/15 backdrop-blur-sm flex items-center justify-center text-white z-10"
            >
              <ChevronRight size={22} />
            </button>
          )}

          {/* Zoom controls */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3 z-10">
            <button
              onClick={handleZoomOut}
              className="w-9 h-9 rounded-full bg-white/15 backdrop-blur-sm flex items-center justify-center text-white"
            >
              <ZoomOut size={16} />
            </button>
            <button
              onClick={handleReset}
              className="px-3 py-1.5 rounded-full bg-white/15 backdrop-blur-sm text-white/80 text-xs font-medium"
            >
              Reset
            </button>
            <button
              onClick={handleZoomIn}
              className="w-9 h-9 rounded-full bg-white/15 backdrop-blur-sm flex items-center justify-center text-white"
            >
              <ZoomIn size={16} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
