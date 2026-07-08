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
  const [uploading, setUploading]   = useState(false)

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
      setPhotos(event.photos ?? [])
    } else {
      setTitle('')
      setDate(date)
      setStartTime('')
      setEndTime('')
      setNotes('')
      setColor(initialColor ?? (currentUser === 'mateo' ? 'mateo' : 'seval'))
      setTodos([])
      setPhotos([])
    }
    setShowDelete(false)
    setColorPopup(false)
    setNewTodo('')
    setUploading(false)
  }, [event, date, currentUser, isOpen, initialColor])

  function handleSave() {
    if (!title.trim() || !currentUser) return
    const data = {
      title: title.trim(),
      date: selectedDate,
      startTime: startTime || undefined,
      notes: notes.trim() || undefined,
      color,
      todos: todos.length ? todos : undefined,
      photos: photos.length ? photos : undefined,
      createdBy: currentUser,
    }
    if (isEdit && event) updateEvent(event.id, data)
    else addEvent(data)
    onClose()
  }

  async function handlePhotoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !event) return
    setUploading(true)
    await uploadEventPhoto(event.id, file)
    const updated = useAppStore.getState().events.find(ev => ev.id === event.id)
    if (updated?.photos) setPhotos(updated.photos)
    setUploading(false)
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
              {isEdit && (
                <div className="mb-6">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                    Photos
                  </p>
                  {photos.length > 0 && (
                    <div className="flex gap-2 flex-wrap mb-3">
                      {photos.map((url, i) => (
                        <img
                          key={i}
                          src={url}
                          alt=""
                          className="w-20 h-20 rounded-2xl object-cover"
                        />
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
                    <Camera size={15} className="text-gray-400" />
                    {uploading ? 'Uploading...' : 'Add photo'}
                  </button>
                </div>
              )}

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
        </>
      )}
    </AnimatePresence>
  )
}
