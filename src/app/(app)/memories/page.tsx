'use client'

import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { format, parseISO } from 'date-fns'
import { useAppStore } from '@/store/useAppStore'
import { USERS } from '@/types'

type FeedItem =
  | { kind: 'memory';   id: string; title: string; date: string; notes?: string; createdBy: string; photos?: string[] }
  | { kind: 'lovenote'; id: string; content: string; createdAt: string; from: string; isPinned: boolean }

export default function MemoriesPage() {
  const currentUser = useAppStore(s => s.currentUser)!
  const memories    = useAppStore(s => s.memories)
  const loveNotes   = useAppStore(s => s.loveNotes)

  const isSeval = currentUser === 'seval'
  const primary = isSeval ? '#8b5cf6' : '#14b8a6'

  const feed = useMemo<FeedItem[]>(() => {
    const items: FeedItem[] = [
      ...memories.map(m => ({
        kind: 'memory' as const,
        id: m.id, title: m.title, date: m.date,
        notes: m.notes, createdBy: m.createdBy, photos: m.photos,
      })),
      ...loveNotes.map(n => ({
        kind: 'lovenote' as const,
        id: n.id, content: n.content, createdAt: n.createdAt,
        from: n.from, isPinned: n.isPinned,
      })),
    ]
    return items.sort((a, b) => {
      const da = a.kind === 'memory' ? a.date : a.createdAt.slice(0, 10)
      const db = b.kind === 'memory' ? b.date : b.createdAt.slice(0, 10)
      return db.localeCompare(da)
    })
  }, [memories, loveNotes])

  return (
    <div className="min-h-screen pt-14 pb-32">
      <div className="px-5 mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Memories</h1>
        <p className="text-sm text-gray-400">your story, together</p>
      </div>

      {feed.length === 0 ? (
        <div className="flex flex-col items-center justify-center pt-20 text-center px-8">
          <div className="text-5xl mb-4">📸</div>
          <p className="font-semibold text-gray-600 mb-1">Nothing here yet</p>
          <p className="text-sm text-gray-400">your memories and notes will live here</p>
        </div>
      ) : (
        <div className="px-5 space-y-4">
          {feed.map((item, i) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04, duration: 0.3 }}
            >
              {item.kind === 'memory'
                ? <MemoryCard item={item} />
                : <LoveNoteCard item={item} />
              }
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}

function MemoryCard({ item }: { item: Extract<FeedItem, { kind: 'memory' }> }) {
  const user = USERS[item.createdBy as keyof typeof USERS]
  return (
    <div className="bg-white rounded-3xl shadow-card overflow-hidden">
      {item.photos && item.photos.length > 0 && (
        <div className="flex gap-1.5 overflow-x-auto p-3 pb-0 scrollbar-hide">
          {item.photos.map((src, i) => (
            <img key={i} src={src} alt="" className="w-28 h-28 object-cover rounded-2xl shrink-0" />
          ))}
        </div>
      )}
      <div className="p-4">
        <div className="flex items-center gap-1.5 mb-1.5">
          <span className="text-[10px] font-bold text-gray-400">
            {format(parseISO(item.date + 'T12:00:00'), 'MMM d, yyyy')}
          </span>
          <span className="text-gray-200">·</span>
          <span className="text-[10px] text-gray-400">{user?.emoji} {user?.displayName}</span>
        </div>
        <p className="font-semibold text-gray-800 text-sm mb-1">{item.title}</p>
        {item.notes && (
          <p className="text-xs text-gray-500 leading-relaxed line-clamp-4">{item.notes}</p>
        )}
      </div>
    </div>
  )
}

function LoveNoteCard({ item }: { item: Extract<FeedItem, { kind: 'lovenote' }> }) {
  const fromUser  = USERS[item.from as keyof typeof USERS]
  const fromColor = item.from === 'seval' ? '#8b5cf6' : '#14b8a6'
  return (
    <div
      className="rounded-3xl p-5"
      style={{ background: `${fromColor}0d`, border: `1.5px solid ${fromColor}20` }}
    >
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">💌</span>
        <div className="flex-1">
          <p className="text-xs font-bold" style={{ color: fromColor }}>
            {fromUser?.emoji} {fromUser?.displayName}
          </p>
          <p className="text-[10px] text-gray-400">
            {format(parseISO(item.createdAt), 'MMM d, yyyy')}
          </p>
        </div>
        {item.isPinned && <span className="text-xs">📌</span>}
      </div>
      <p className="text-sm text-gray-700 leading-relaxed">{item.content}</p>
    </div>
  )
}
