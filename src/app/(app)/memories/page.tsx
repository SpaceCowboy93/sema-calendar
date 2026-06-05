'use client'

import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Trash2, Camera, X, ChevronDown } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { useAppStore } from '@/store/useAppStore'
import { USERS } from '@/types'
import { formatDate, getTodayString, cn } from '@/lib/utils'

export default function MemoriesPage() {
  const currentUser  = useAppStore(s => s.currentUser)!
  const memories     = useAppStore(s => s.memories)
  const addMemory    = useAppStore(s => s.addMemory)
  const deleteMemory = useAppStore(s => s.deleteMemory)

  const [showForm, setShowForm]     = useState(false)
  const [title, setTitle]           = useState('')
  const [date, setDate]             = useState(getTodayString())
  const [notes, setNotes]           = useState('')
  const [photos, setPhotos]         = useState<string[]>([])
  const [viewingMemory, setViewing] = useState<string | null>(null)

  const fileRef = useRef<HTMLInputElement>(null)

  const isSeval      = currentUser === 'seval'
  const primaryColor = isSeval ? '#8b5cf6' : '#14b8a6'
  const lightBg      = isSeval ? 'bg-seval-50' : 'bg-mateo-50'

  const sorted = [...memories].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  )

  function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    files.forEach(file => {
      const reader = new FileReader()
      reader.onload = ev => {
        if (ev.target?.result) {
          setPhotos(prev => [...prev, ev.target!.result as string])
        }
      }
      reader.readAsDataURL(file)
    })
    // Reset input
    if (fileRef.current) fileRef.current.value = ''
  }

  function handleSave() {
    if (!title.trim()) return
    addMemory(title.trim(), date, notes.trim() || undefined, photos.length ? photos : undefined)
    setTitle('')
    setDate(getTodayString())
    setNotes('')
    setPhotos([])
    setShowForm(false)
  }

  const viewedMemory = memories.find(m => m.id === viewingMemory)

  // Group by year-month
  const grouped: Record<string, typeof sorted> = {}
  sorted.forEach(m => {
    const key = format(parseISO(m.date), 'MMMM yyyy')
    if (!grouped[key]) grouped[key] = []
    grouped[key].push(m)
  })

  return (
    <div className="min-h-screen px-4 pt-14">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Memories</h1>
          <p className="text-sm text-gray-400 mt-0.5">your story together</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="w-10 h-10 rounded-full flex items-center justify-center text-white shadow-soft
                     active:scale-90 transition-transform"
          style={{ background: primaryColor }}
        >
          <Plus size={20} strokeWidth={2.5} />
        </button>
      </div>

      {/* Add form */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0, marginBottom: 0 }}
            animate={{ opacity: 1, height: 'auto', marginBottom: 20 }}
            exit={{ opacity: 0, height: 0, marginBottom: 0 }}
            className="overflow-hidden"
          >
            <div className={cn('rounded-3xl p-4', lightBg)}>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Memory title..."
                autoFocus
                className="w-full text-base font-semibold text-gray-700 placeholder:text-gray-300
                           bg-transparent outline-none border-b border-gray-200 pb-2 mb-3"
              />
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full text-sm text-gray-600 bg-white rounded-xl px-3 py-2 mb-3
                           outline-none shadow-card"
              />
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Write something about this memory..."
                rows={3}
                className="w-full text-sm text-gray-600 placeholder:text-gray-300 bg-transparent
                           outline-none resize-none mb-3"
              />

              {/* Photos */}
              <div className="flex gap-2 flex-wrap mb-3">
                {photos.map((p, i) => (
                  <div key={i} className="relative">
                    <img
                      src={p}
                      alt=""
                      className="w-20 h-20 object-cover rounded-2xl"
                    />
                    <button
                      onClick={() => setPhotos(prev => prev.filter((_, j) => j !== i))}
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-gray-700 rounded-full
                                 flex items-center justify-center"
                    >
                      <X size={11} color="white" />
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => fileRef.current?.click()}
                  className="w-20 h-20 rounded-2xl bg-white shadow-card flex flex-col items-center
                             justify-center gap-1 text-gray-400 active:scale-95 transition-transform"
                >
                  <Camera size={18} />
                  <span className="text-[10px]">Add photo</span>
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handlePhoto}
                  className="hidden"
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setShowForm(false)
                    setTitle('')
                    setNotes('')
                    setPhotos([])
                  }}
                  className="flex-1 py-2.5 rounded-2xl bg-white text-gray-500 text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={!title.trim()}
                  className="flex-1 py-2.5 rounded-2xl text-white text-sm font-semibold disabled:opacity-40"
                  style={{ background: primaryColor }}
                >
                  Save Memory
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Memories list */}
      {memories.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center pt-16 text-center"
        >
          <div className="text-5xl mb-4">📸</div>
          <p className="font-semibold text-gray-600 mb-1">No memories yet</p>
          <p className="text-sm text-gray-400">Start capturing your moments together</p>
        </motion.div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([month, items]) => (
            <div key={month}>
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
                {month}
              </h3>
              <div className="space-y-3">
                {items.map(memory => (
                  <motion.div
                    key={memory.id}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    onClick={() => setViewing(memory.id)}
                    className="bg-white rounded-3xl shadow-card overflow-hidden cursor-pointer
                               active:scale-[0.98] transition-transform group"
                  >
                    {memory.photos && memory.photos.length > 0 && (
                      <div className="flex gap-1 h-40">
                        {memory.photos.slice(0, 3).map((p, i) => (
                          <img
                            key={i}
                            src={p}
                            alt=""
                            className="flex-1 object-cover"
                            style={{
                              borderRadius: i === 0 && memory.photos!.length === 1 ? '0' : '0',
                            }}
                          />
                        ))}
                        {memory.photos.length > 3 && (
                          <div className="flex-1 bg-gray-100 flex items-center justify-center">
                            <span className="text-gray-500 font-semibold text-sm">
                              +{memory.photos.length - 3}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-semibold text-gray-800 text-sm">{memory.title}</p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {formatDate(memory.date, 'MMM d, yyyy')} ·{' '}
                            {USERS[memory.createdBy].displayName}
                          </p>
                        </div>
                        <button
                          onClick={e => { e.stopPropagation(); deleteMemory(memory.id) }}
                          className="opacity-0 group-hover:opacity-100 text-gray-300
                                     active:text-red-400 transition-all"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                      {memory.notes && (
                        <p className="text-xs text-gray-500 mt-2 leading-relaxed line-clamp-2">
                          {memory.notes}
                        </p>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Memory viewer */}
      <AnimatePresence>
        {viewedMemory && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setViewing(null)}
              className="fixed inset-0 z-50 bg-black/60"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 400 }}
              className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-[2rem]
                         max-h-[90vh] overflow-y-auto max-w-lg mx-auto"
            >
              <div className="px-5 pt-4 pb-10">
                <div className="drag-handle" />
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h2 className="text-xl font-bold text-gray-800">{viewedMemory.title}</h2>
                    <p className="text-sm text-gray-400 mt-1">
                      {formatDate(viewedMemory.date, 'EEEE, MMMM d, yyyy')}
                    </p>
                  </div>
                  <button
                    onClick={() => setViewing(null)}
                    className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100"
                  >
                    <X size={16} className="text-gray-500" />
                  </button>
                </div>
                {viewedMemory.photos && viewedMemory.photos.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {viewedMemory.photos.map((p, i) => (
                      <img
                        key={i}
                        src={p}
                        alt=""
                        className="w-full rounded-2xl object-cover max-h-64"
                      />
                    ))}
                  </div>
                )}
                {viewedMemory.notes && (
                  <p className="text-sm text-gray-600 leading-relaxed">{viewedMemory.notes}</p>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
