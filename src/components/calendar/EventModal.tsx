'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Clock, FileText, Plus, Check, Palette, Camera, ChevronDown } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { type CalendarEvent, type EventTodo } from '@/types'
import { generateId, formatDate, cn } from '@/lib/utils'

export const COLOR_OPTIONS = [
  { value: 'seval',  hex: '#a78bfa', label: 'Purple' },
  { value: 'mateo',  hex: '#2dd4bf', label: 'Teal'   },
  { value: 'pink',   hex: '#f472b6', label: 'Pink'   },
  { value: 'yellow', hex: '#fbbf24', label: 'Yellow' },
  { value: 'green',  hex: '#34d399', label: 'Green'  },
] as const

interface EventModalProps {
  isOpen: boolean
  onClose: () => void
  date: string
  event?: CalendarEvent | null
  initialColor?: CalendarEvent['color']
}

export function EventModal({ isOpen, onClose, date, event, initialColor }: EventModalProps) {
  const currentUser       = useAppStore(s => s.currentUser)
  const addEvent          = useAppStore(s => s.addEvent)
  const updateEvent       = useAppStore(s => s.updateEvent)
  const deleteEvent       = useAppStore(s => s.deleteEvent)
  const uploadEventPhoto  = useAppStore(s => s.uploadEventPhoto)

  const [title, setTitle]           = useState('')
  const [selectedDate, setDate]     = useState(date)
  const [startTime, setStartTime]   = useState('')
  const [endTime, setEndTime]       = useState('')
  const [notes, setNotes]           = useState('')
  const [color, setColor]           = useState<CalendarEvent['color']>('seval')
  const [todos, setTodos]           = useState<EventTodo[]>([])
  const [newTodo, setNewTodo]       = useState('')
  const [showDelete, setShowDelete] = useState(false)
  const [colorPopup, setColorPopup] = useState(false)
  const [photos, setPhotos]         = useState<string[]>([])
  const [pendingFiles, setPendingFiles] = useState<File[]>([])
  const [uploading, setUploading]   = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [bgPhotoIdx, setBgPhotoIdx]   = useState<number | null>(null)
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null)

  const colorBtnRef  = useRef<HTMLButtonElement>(null)
  const photoInputRef = useRef<HTMLInputElement>(null)
  const isEdit = !!event

  useEffect(() => {
    if (event) {
      setTitle(event.title)
      setDate(event.date)
      setStartTime(event.startTime ?? '')
      setEndTime(event.endTime ?? '')
      setNotes(event.notes ?? '')
      setColor(event.color)
      setTodos(event.todos ?? [])
      const p = event.photos ?? []
      setPhotos(p)
      const bpIdx = event.backgroundPhoto ? p.indexOf(event.backgroundPhoto) : -1
      setBgPhotoIdx(bpIdx >= 0 ? bpIdx : null)
    } else {
      setTitle('')
      setDate(date)
      setStartTime('')
      setEndTime('')
      setNotes('')
      setColor(initialColor ?? (currentUser === 'mateo' ? 'mateo' : 'seval'))
      setTodos([])
      setPhotos([])
      setPendingFiles([])
      setBgPhotoIdx(null)
    }
    setLightboxIdx(null)
    setShowDelete(false)
    setColorPopup(false)
    setNewTodo('')
    setUploading(false)
    setUploadError(null)
  }, [event, date, currentUser, isOpen, initialColor])

  async function handleSave() {
    if (!title.trim() || !currentUser) return
    const data = {
      title: title.trim(),
      date: selectedDate,
      startTime: startTime || undefined,
      notes: notes.trim() || undefined,
      color,
      todos: todos.length ? todos : undefined,
      photos: photos.length ? photos : undefined,
      // For edit: photos[] are real URLs; for new: resolved after upload below
      backgroundPhoto: (isEdit && bgPhotoIdx !== null) ? photos[bgPhotoIdx] : undefined,
      createdBy: currentUser,
    }
    if (isEdit && event) {
      updateEvent(event.id, data)
    } else {
      const nPending = pendingFiles.length
      const newId = addEvent(data)
      if (nPending > 0) {
        for (const file of pendingFiles) {
          await uploadEventPhoto(newId, file)
        }
        // Resolve real URL: blob previews occupy indices 0..nPending-1,
        // real uploads are appended at nPending, nPending+1, ...
        if (bgPhotoIdx !== null) {
          const stored = useAppStore.getState().events.find(e => e.id === newId)
          const bpUrl  = stored?.photos?.[nPending + bgPhotoIdx]
          if (bpUrl) updateEvent(newId, { backgroundPhoto: bpUrl })
        }
      }
    }
    onClose()
  }

  async function handlePhotoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (event) {
      // Edit mode: upload immediately
      setUploading(true)
      setUploadError(null)
      await uploadEventPhoto(event.id, file)
      const updated = useAppStore.getState().events.find(ev => ev.id === event.id)
      if (updated?.photos) setPhotos(updated.photos)
      setUploading(false)
    } else {
      // New event: queue file and show local preview
      const previewUrl = URL.createObjectURL(file)
      setPhotos(prev => [...prev, previewUrl])
      setPendingFiles(prev => [...prev, file])
    }
    if (e.target) e.target.value = ''
  }

  function handleDelete() {
    if (event) deleteEvent(event.id)
    onClose()
  }

  function addTodoItem() {
    if (!newTodo.trim()) return
    setTodos(prev => [...prev, { id: generateId(), title: newTodo.trim(), isCompleted: false }])
    setNewTodo('')
  }

  function toggleTodo(id: string) {
    setTodos(prev => prev.map(t => t.id === id ? { ...t, isCompleted: !t.isCompleted } : t))
  }

  function removeTodo(id: string) {
    setTodos(prev => prev.filter(t => t.id !== id))
  }

  const activeColor = COLOR_OPTIONS.find(c => c.value === color)

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm"
          />

          {/* Sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 400 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-[2rem] shadow-modal
                       max-w-lg mx-auto max-h-[92vh] overflow-y-auto"
          >
            <div className="px-5 pt-4 pb-10">
              <div className="drag-handle" />

              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-gray-800">
                  {isEdit ? 'Edit Event' : `New Event · ${formatDate(date, 'MMM d')}`}
                </h2>
                <button
                  onClick={onClose}
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-500"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Title */}
              <div className="mb-4">
                <input
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="Event title..."
                  className="w-full text-xl font-semibold text-gray-800 placeholder:text-gray-300
                             border-b-2 border-gray-100 focus:border-gray-200 pb-3 outline-none
                             transition-colors bg-transparent"
                  autoFocus={!isEdit}
                />
              </div>

              {/* Color dropdown */}
              <div className="relative mb-5">
                <button
                  ref={colorBtnRef}
                  onClick={() => setColorPopup(v => !v)}
                  className="w-full flex items-center gap-2 px-4 py-3 rounded-2xl bg-gray-50
                             active:bg-gray-100 transition-colors"
                >
                  <div className="w-5 h-5 rounded-full shrink-0" style={{ background: activeColor?.hex }} />
                  <span className="text-sm font-medium text-gray-700 flex-1 text-left">{activeColor?.label}</span>
                  <Palette size={14} className="text-gray-400" />
                  <ChevronDown
                    size={14}
                    className={cn('text-gray-400 transition-transform', colorPopup && 'rotate-180')}
                  />
                </button>

                <AnimatePresence>
                  {colorPopup && (
                    <>
                      <div className="fixed inset-0 z-[55]" onClick={() => setColorPopup(false)} />
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: -4 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -4 }}
                        transition={{ duration: 0.12 }}
                        className="absolute left-0 right-0 top-full mt-1.5 z-[56] bg-white
                                   rounded-2xl shadow-modal border border-gray-100 p-2.5"
                      >
                        <div className="grid grid-cols-2 gap-1.5">
                          {COLOR_OPTIONS.map(opt => (
                            <button
                              key={opt.value}
                              onClick={() => { setColor(opt.value as CalendarEvent['color']); setColorPopup(false) }}
                              className={cn(
                                'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all',
                                color === opt.value ? 'bg-gray-100' : 'hover:bg-gray-50'
                              )}
                            >
                              <div className="w-6 h-6 rounded-full shrink-0" style={{ background: opt.hex }} />
                              <span className="text-sm font-medium text-gray-700 flex-1 text-left">{opt.label}</span>
                              {color === opt.value && <Check size={13} className="text-gray-400 shrink-0" strokeWidth={2.5} />}
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>

              {/* Date & Time */}
              <div className="bg-gray-50 rounded-2xl p-4 mb-4 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-white shadow-card flex items-center justify-center">
                    <Clock size={14} className="text-gray-400" />
                  </div>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={e => setDate(e.target.value)}
                    className="flex-1 text-sm text-gray-700 bg-transparent outline-none"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8" />
                  <input
                    type="time"
                    value={startTime}
                    onChange={e => setStartTime(e.target.value)}
                    className="flex-1 text-sm text-gray-700 bg-white rounded-xl px-3 py-1.5
                               outline-none shadow-card"
                  />
                  <span className="text-xs text-gray-400">start time (optional)</span>
                </div>
              </div>

              {/* Notes */}
              <div className="bg-gray-50 rounded-2xl p-4 mb-4 flex gap-3">
                <div className="w-8 h-8 rounded-xl bg-white shadow-card flex items-center justify-center shrink-0">
                  <FileText size={14} className="text-gray-400" />
                </div>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Add notes..."
                  rows={3}
                  className="flex-1 text-sm text-gray-700 bg-transparent outline-none resize-none
                             placeholder:text-gray-300"
                />
              </div>

              {/* Checklist */}
              <div className="mb-6">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                  Checklist
                </p>
                <div className="space-y-2">
                  {todos.map(todo => (
                    <div key={todo.id} className="flex items-center gap-3 group">
                      <button
                        onClick={() => toggleTodo(todo.id)}
                        className={cn(
                          'w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all',
                          todo.isCompleted ? 'border-emerald-400 bg-emerald-400' : 'border-gray-300'
                        )}
                      >
                        {todo.isCompleted && <Check size={11} color="white" strokeWidth={3} />}
                      </button>
                      <span className={cn(
                        'flex-1 text-sm',
                        todo.isCompleted ? 'line-through text-gray-400' : 'text-gray-700'
                      )}>
                        {todo.title}
                      </span>
                      <button
                        onClick={() => removeTodo(todo.id)}
                        className="opacity-0 group-hover:opacity-100 text-gray-300 active:text-red-400
                                   transition-all"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}

                  <div className="flex items-center gap-3 mt-2">
                    <div className="w-5 h-5 rounded-full border-2 border-dashed border-gray-200 shrink-0" />
                    <input
                      type="text"
                      value={newTodo}
                      onChange={e => setNewTodo(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && addTodoItem()}
                      placeholder="Add item..."
                      className="flex-1 text-sm text-gray-600 placeholder:text-gray-300 outline-none
                                 bg-transparent"
                    />
                    {newTodo && (
                      <button onClick={addTodoItem} className="text-gray-400 active:text-gray-600">
                        <Plus size={16} />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Photos */}
              <div className="mb-6">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                  Photos
                </p>
                {photos.length > 0 && (
                  <div className="flex gap-2 flex-wrap mb-3">
                    {photos.map((url, i) => (
                      <div key={i} className="relative w-20 h-20">
                        {/* Tap to open lightbox */}
                        <button className="w-full h-full" onClick={() => setLightboxIdx(i)}>
                          <img src={url} alt="" className="w-full h-full rounded-2xl object-cover" />
                        </button>
                        {/* Remove */}
                        <button
                          onClick={() => {
                            const next = photos.filter((_, idx) => idx !== i)
                            setPhotos(next)
                            if (event) updateEvent(event.id, { photos: next.length ? next : undefined })
                            else setPendingFiles(prev => prev.filter((_, idx) => idx !== i))
                            if (bgPhotoIdx === i) setBgPhotoIdx(null)
                            else if (bgPhotoIdx !== null && bgPhotoIdx > i) setBgPhotoIdx(bgPhotoIdx - 1)
                          }}
                          className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white
                                     flex items-center justify-center text-xs"
                        >×</button>
                        {/* Set as card background */}
                        <button
                          onClick={() => setBgPhotoIdx(bgPhotoIdx === i ? null : i)}
                          className={cn(
                            'absolute bottom-1 left-1 text-[9px] px-1.5 py-0.5 rounded-lg font-bold transition-all',
                            bgPhotoIdx === i
                              ? 'bg-yellow-400 text-white'
                              : 'bg-black/40 text-white/80'
                          )}
                        >
                          {bgPhotoIdx === i ? '★ BG' : '☆'}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handlePhotoSelect}
                />
                <button
                  onClick={() => photoInputRef.current?.click()}
                  disabled={uploading}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-gray-50
                             text-sm text-gray-500 font-medium active:bg-gray-100 disabled:opacity-50"
                >
                  {uploading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Camera size={15} className="text-gray-400" />
                      {photos.length > 0 ? 'Add another photo' : 'Add photo'}
                    </>
                  )}
                </button>
                <p className="text-[10px] text-gray-300 mt-1">
                  Max 5MB · JPG, PNG, WebP · ☆ = set as card background
                </p>
              </div>

              {/* Save */}
              <button
                onClick={handleSave}
                disabled={!title.trim()}
                className="btn-primary mb-3 disabled:opacity-40"
                style={{ background: `linear-gradient(135deg, ${activeColor?.hex}, ${activeColor?.hex}cc)` }}
              >
                {isEdit ? 'Save Changes' : 'Add Event'}
              </button>

              {isEdit && (
                <button
                  onClick={() => setShowDelete(true)}
                  className="w-full py-3 rounded-2xl text-sm font-medium text-red-400
                             active:bg-red-50 transition-colors"
                >
                  Delete Event
                </button>
              )}
            </div>
          </motion.div>

          {/* Delete confirm */}
          <AnimatePresence>
            {showDelete && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[60] flex items-end justify-center p-4"
              >
                <div className="absolute inset-0 bg-black/40" onClick={() => setShowDelete(false)} />
                <motion.div
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.95, opacity: 0 }}
                  className="relative bg-white rounded-3xl p-6 w-full max-w-xs text-center shadow-modal"
                >
                  <div className="text-4xl mb-3">🗑️</div>
                  <h3 className="font-bold text-gray-800 mb-1">Delete Event?</h3>
                  <p className="text-sm text-gray-400 mb-5">This can&apos;t be undone.</p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowDelete(false)}
                      className="flex-1 py-3 rounded-2xl bg-gray-100 text-gray-600 font-medium text-sm"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleDelete}
                      className="flex-1 py-3 rounded-2xl bg-red-500 text-white font-medium text-sm"
                    >
                      Delete
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        {/* Lightbox */}
        <AnimatePresence>
          {lightboxIdx !== null && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setLightboxIdx(null)}
              className="fixed inset-0 z-[70] flex items-center justify-center bg-black/85 backdrop-blur-md"
            >
              <motion.div
                initial={{ scale: 0.85, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.85, opacity: 0 }}
                transition={{ type: 'spring', damping: 28, stiffness: 340 }}
                onClick={e => e.stopPropagation()}
                className="relative max-w-[90vw] max-h-[85vh]"
              >
                <img
                  src={photos[lightboxIdx]}
                  alt=""
                  className="max-w-full max-h-[85vh] rounded-2xl object-contain shadow-2xl"
                />
                {/* Close */}
                <button
                  onClick={() => setLightboxIdx(null)}
                  className="absolute top-2 right-2 w-9 h-9 rounded-full bg-black/50 backdrop-blur-sm
                             text-white flex items-center justify-center"
                >
                  <X size={16} />
                </button>
                {/* Prev / Next */}
                {photos.length > 1 && (
                  <>
                    <button
                      onClick={e => { e.stopPropagation(); setLightboxIdx(l => l !== null ? Math.max(0, l - 1) : 0) }}
                      disabled={lightboxIdx === 0}
                      className="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/50
                                 backdrop-blur-sm text-white flex items-center justify-center text-xl
                                 font-light disabled:opacity-30"
                    >‹</button>
                    <button
                      onClick={e => { e.stopPropagation(); setLightboxIdx(l => l !== null ? Math.min(photos.length - 1, l + 1) : 0) }}
                      disabled={lightboxIdx === photos.length - 1}
                      className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/50
                                 backdrop-blur-sm text-white flex items-center justify-center text-xl
                                 font-light disabled:opacity-30"
                    >›</button>
                  </>
                )}
                <p className="absolute bottom-3 left-0 right-0 text-center text-xs text-white/50">
                  {lightboxIdx + 1} / {photos.length}
                </p>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
        </>
      )}
    </AnimatePresence>
  )
}
