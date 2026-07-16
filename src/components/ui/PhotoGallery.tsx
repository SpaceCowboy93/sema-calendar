'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Camera, X, ChevronLeft, ChevronRight } from 'lucide-react'

interface Props {
  photos: string[]
  onRemove?: (idx: number) => void
  onAddClick?: () => void
  uploading?: boolean
  size?: 'sm' | 'md'
  /** Label on the first photo when size='md' (default "Cover") */
  coverLabel?: string
}

export function PhotoGallery({
  photos,
  onRemove,
  onAddClick,
  uploading = false,
  size = 'md',
  coverLabel = 'Cover',
}: Props) {
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null)

  const thumbW = size === 'sm' ? 'w-16 h-16' : 'w-28 h-24'
  const addW   = size === 'sm' ? 'w-16 h-16' : 'w-28 h-24'

  const validPhotos = photos.filter(p => p)

  return (
    <>
      {/* Thumbnail strip */}
      {validPhotos.length > 0 || onAddClick ? (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {validPhotos.map((url, idx) => (
            <div key={idx} className={`relative shrink-0 ${thumbW} rounded-2xl overflow-hidden`}>
              <button
                onClick={() => setLightboxIdx(idx)}
                className="w-full h-full block"
              >
                <img src={url} alt="" className="w-full h-full object-cover" />
              </button>

              {/* Cover label (size=md, first photo) */}
              {size === 'md' && idx === 0 && (
                <span className="absolute bottom-1.5 left-1.5 text-[8px] px-1.5 py-0.5 rounded bg-black/50 text-white font-bold pointer-events-none">
                  {coverLabel}
                </span>
              )}

              {/* Remove button */}
              {onRemove && (
                <button
                  onClick={e => { e.stopPropagation(); onRemove(idx) }}
                  className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center"
                >
                  <X size={10} />
                </button>
              )}
            </div>
          ))}

          {/* Add button */}
          {onAddClick && (
            <button
              onClick={onAddClick}
              disabled={uploading}
              className={`shrink-0 ${addW} rounded-2xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center gap-1 bg-gray-50 active:bg-gray-100 disabled:opacity-60`}
            >
              {uploading ? (
                <div className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin border-gray-300" />
              ) : (
                <>
                  <Camera size={size === 'sm' ? 14 : 16} className="text-gray-400" />
                  <span className="text-[9px] text-gray-400">{size === 'sm' ? 'Add' : 'Add photo'}</span>
                </>
              )}
            </button>
          )}
        </div>
      ) : onAddClick === undefined ? null : (
        /* Empty state — full-width add button */
        <button
          onClick={onAddClick}
          disabled={uploading}
          className="w-full h-20 rounded-2xl border-2 border-dashed border-gray-200 flex items-center justify-center gap-2 text-gray-400 bg-gray-50 disabled:opacity-60"
        >
          {uploading ? (
            <div className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin border-gray-300" />
          ) : (
            <><Camera size={16} /><span className="text-sm">Add photos</span></>
          )}
        </button>
      )}

      {/* Lightbox */}
      <AnimatePresence>
        {lightboxIdx !== null && validPhotos.length > 0 && (
          <motion.div
            key="lightbox"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center"
            onClick={() => setLightboxIdx(null)}
          >
            <button
              onClick={() => setLightboxIdx(null)}
              className="absolute top-5 right-5 w-10 h-10 flex items-center justify-center rounded-full bg-white/10 text-white"
            >
              <X size={20} />
            </button>
            {lightboxIdx > 0 && (
              <button
                onClick={e => { e.stopPropagation(); setLightboxIdx(i => (i ?? 1) - 1) }}
                className="absolute left-4 w-10 h-10 flex items-center justify-center rounded-full bg-white/10 text-white"
              >
                <ChevronLeft size={20} />
              </button>
            )}
            {lightboxIdx < validPhotos.length - 1 && (
              <button
                onClick={e => { e.stopPropagation(); setLightboxIdx(i => (i ?? 0) + 1) }}
                className="absolute right-4 w-10 h-10 flex items-center justify-center rounded-full bg-white/10 text-white"
              >
                <ChevronRight size={20} />
              </button>
            )}
            <img
              src={validPhotos[lightboxIdx]}
              alt=""
              className="max-w-[95vw] max-h-[85vh] object-contain rounded-xl"
              onClick={e => e.stopPropagation()}
            />
            {validPhotos.length > 1 && (
              <p className="absolute bottom-5 text-white/70 text-sm">
                {lightboxIdx + 1} / {validPhotos.length}
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
