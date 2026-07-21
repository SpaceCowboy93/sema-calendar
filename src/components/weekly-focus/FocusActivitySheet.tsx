'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Plus, Trash2 } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { type FocusActivity, type FocusChecklistItem, type FocusReminder } from '@/types'
import { cn, generateId } from '@/lib/utils'
import { PhotoGallery } from '@/components/ui/PhotoGallery'
import DeleteConfirmSheet from '@/components/ui/DeleteConfirmSheet'

interface Props {
  open: boolean
  onClose: () => void
  weekKey: string
  dayIndex: number
  activity?: FocusActivity
  suggestedTitle?: string
  primary: string
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

const REMINDER_OPTIONS: { value: FocusReminder; label: string }[] = [
  { value: 'none',    label: 'None'          },
  { value: 'at_time', label: 'At time'       },
  { value: '10min',   label: '10 min before' },
  { value: '30min',   label: '30 min before' },
  { value: '1h',      label: '1 hr before'   },
]

export function FocusActivitySheet({
  open,
  onClose,
  weekKey,
  dayIndex,
  activity,
  suggestedTitle,
  primary,
}: Props) {
  const addFocusActivity         = useAppStore(s => s.addFocusActivity)
  const updateFocusActivity      = useAppStore(s => s.updateFocusActivity)
  const deleteFocusActivity      = useAppStore(s => s.deleteFocusActivity)
  const uploadFocusActivityPhoto = useAppStore(s => s.uploadFocusActivityPhoto)

  const isEdit = !!activity

  // ── Form state ──
  const [title,         setTitle]         = useState('')
  const [time,          setTime]          = useState('')
  const [reminder,      setReminder]      = useState<FocusReminder>('none')
  const [notes,         setNotes]         = useState('')
  const [checklist,     setChecklist]     = useState<FocusChecklistItem[]>([])
  const [newItem,       setNewItem]       = useState('')
  const [photos,        setPhotos]        = useState<string[]>([])
  const [uploading,     setUploading]     = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [saving,        setSaving]        = useState(false)

  const titleRef    = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Sync form when sheet opens
  useEffect(() => {
    if (!open) return
    if (activity) {
      setTitle(activity.title)
      setTime(activity.time ?? '')
      setReminder(activity.reminder ?? 'none')
      setNotes(activity.notes ?? '')
      setChecklist(activity.checklist ? [...activity.checklist] : [])
      setPhotos(activity.photos ? [...activity.photos] : [])
    } else {
      setTitle(suggestedTitle ?? '')
      setTime('')
      setReminder('none')
      setNotes('')
      setChecklist([])
      setPhotos([])
    }
    setNewItem('')
    setSaving(false)
    setConfirmDelete(false)
    setTimeout(() => titleRef.current?.focus(), 340)
  }, [open, activity, suggestedTitle])

  // ── Checklist helpers ──
  function addChecklistItem() {
    const text = newItem.trim()
    if (!text) return
    setChecklist(prev => [...prev, { id: generateId(), text, done: false }])
    setNewItem('')
  }

  function toggleChecklistItem(id: string) {
    setChecklist(prev => prev.map(i => i.id === id ? { ...i, done: !i.done } : i))
  }

  function removeChecklistItem(id: string) {
    setChecklist(prev => prev.filter(i => i.id !== id))
  }

  // ── Photo upload ──
  async function handlePhotoFiles(files: FileList | null) {
    if (!files || files.length === 0) return
    setUploading(true)

    if (isEdit && activity) {
      for (const file of Array.from(files)) {
        await uploadFocusActivityPhoto(activity.id, file)
      }
    } else {
      const previews = Array.from(files).map(f => URL.createObjectURL(f))
      setPhotos(prev => [...prev, ...previews])
    }
    setUploading(false)
  }

  function removePhoto(idx: number) {
    setPhotos(prev => prev.filter((_, i) => i !== idx))
    if (isEdit && activity) {
      updateFocusActivity(activity.id, { photos: (activity.photos ?? []).filter((_, i) => i !== idx) })
    }
  }

  // ── Save ──
  async function handleSave() {
    const titleTrimmed = title.trim()
    if (!titleTrimmed) { titleRef.current?.focus(); return }

    setSaving(true)
    const checklistData = checklist.length > 0 ? checklist : undefined
    const timeTrimmed   = time.trim() || undefined
    const reminderVal   = timeTrimmed && reminder !== 'none' ? reminder : undefined

    if (isEdit && activity) {
      updateFocusActivity(activity.id, {
        title:     titleTrimmed,
        time:      timeTrimmed,
        reminder:  reminderVal,
        notes:     notes.trim() || undefined,
        checklist: checklistData,
      })
    } else {
      const newId = addFocusActivity({
        weekKey,
        dayIndex,
        title:     titleTrimmed,
        time:      timeTrimmed,
        reminder:  reminderVal,
        notes:     notes.trim() || undefined,
        checklist: checklistData,
      })

      if (photos.length > 0 && newId) {
        for (const preview of photos) {
          if (preview.startsWith('blob:')) {
            try {
              const res  = await fetch(preview)
              const blob = await res.blob()
              const file = new File([blob], 'photo.jpg', { type: blob.type })
              await uploadFocusActivityPhoto(newId, file)
              URL.revokeObjectURL(preview)
            } catch {
              // skip silently
            }
          }
        }
      }
    }

    setSaving(false)
    onClose()
  }

  function handleDelete() {
    if (!activity) return
    deleteFocusActivity(activity.id)
    setConfirmDelete(false)
    onClose()
  }

  const canSave   = title.trim().length > 0
  const hasTime   = !!time.trim()

  return (
    <>
      <AnimatePresence>
        {open && (
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
              transition={{ type: 'spring', damping: 32, stiffness: 380 }}
              className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-[2rem] shadow-[0_-4px_24px_rgba(0,0,0,0.10)] max-w-lg mx-auto"
            >
              <div className="px-5 pt-4 pb-10 max-h-[92dvh] overflow-y-auto overscroll-contain">

                {/* Drag handle */}
                <div className="w-10 h-1 rounded-full bg-gray-200 mx-auto mb-5" />

                {/* Header */}
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h3 className="text-base font-bold text-gray-800">
                      {isEdit ? 'Edit Activity' : 'New Activity'}
                    </h3>
                    <p className="text-xs text-gray-400 mt-0.5">{DAYS[dayIndex]}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {isEdit && (
                      <button
                        onClick={() => setConfirmDelete(true)}
                        className="w-8 h-8 flex items-center justify-center rounded-full bg-red-50 text-red-400 active:bg-red-100"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                    <button
                      onClick={onClose}
                      className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-500"
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>

                {/* Title */}
                <div className="mb-4">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">
                    Activity
                  </label>
                  <input
                    ref={titleRef}
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    placeholder="What are you planning?"
                    className="w-full text-sm text-gray-800 placeholder:text-gray-300 border-0 border-b border-gray-100 pb-2 outline-none bg-transparent"
                    onKeyDown={e => { if (e.key === 'Enter') handleSave() }}
                  />
                </div>

                {/* Time */}
                <div className="mb-4">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">
                    Time{' '}
                    <span className="font-normal normal-case text-gray-300">(optional)</span>
                  </label>
                  <input
                    type="time"
                    value={time}
                    onChange={e => {
                      setTime(e.target.value)
                      // Clear reminder if time is removed
                      if (!e.target.value) setReminder('none')
                    }}
                    className="text-sm text-gray-700 border-0 border-b border-gray-100 pb-2 outline-none bg-transparent w-full"
                  />
                </div>

                {/* Reminder */}
                <div className="mb-4">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-2">
                    Reminder{' '}
                    <span className="font-normal normal-case text-gray-300">(optional)</span>
                  </label>

                  {!hasTime ? (
                    <p className="text-xs text-gray-300">Set a time above to enable reminders</p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {REMINDER_OPTIONS.map(opt => (
                        <button
                          key={opt.value}
                          onClick={() => setReminder(opt.value)}
                          className={cn(
                            'text-xs px-3 py-1.5 rounded-xl font-medium transition-all',
                            reminder === opt.value
                              ? 'text-white'
                              : 'bg-gray-100 text-gray-500 active:bg-gray-200',
                          )}
                          style={reminder === opt.value ? { background: primary } : undefined}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Notes */}
                <div className="mb-4">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">
                    Notes{' '}
                    <span className="font-normal normal-case text-gray-300">(optional)</span>
                  </label>
                  <textarea
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder="Any notes..."
                    rows={2}
                    className="w-full text-sm text-gray-700 placeholder:text-gray-300 border-0 border-b border-gray-100 pb-2 outline-none bg-transparent resize-none leading-relaxed"
                  />
                </div>

                {/* Checklist */}
                <div className="mb-4">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-2">
                    Checklist{' '}
                    <span className="font-normal normal-case text-gray-300">(optional)</span>
                  </label>

                  {checklist.length > 0 && (
                    <div className="mb-2 space-y-1">
                      {checklist.map(item => (
                        <div key={item.id} className="flex items-center gap-2">
                          <button
                            onClick={() => toggleChecklistItem(item.id)}
                            className="shrink-0 w-4 h-4 rounded border flex items-center justify-center transition-all"
                            style={{
                              borderColor: item.done ? primary : '#d1d5db',
                              background:  item.done ? primary : 'transparent',
                            }}
                          >
                            {item.done && (
                              <svg width="8" height="6" viewBox="0 0 8 6" fill="none">
                                <path d="M1 3L3 5L7 1" stroke="white" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            )}
                          </button>
                          <span className={`flex-1 text-sm ${item.done ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                            {item.text}
                          </span>
                          <button
                            onClick={() => removeChecklistItem(item.id)}
                            className="text-gray-300 active:text-gray-500"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <input
                      value={newItem}
                      onChange={e => setNewItem(e.target.value)}
                      placeholder="Add item..."
                      className="flex-1 text-sm text-gray-700 placeholder:text-gray-300 outline-none bg-transparent border-b border-gray-100 pb-1"
                      onKeyDown={e => {
                        if (e.key === 'Enter') { e.preventDefault(); addChecklistItem() }
                      }}
                    />
                    <button
                      onClick={addChecklistItem}
                      className="shrink-0 w-6 h-6 flex items-center justify-center rounded-full"
                      style={{ background: `${primary}20`, color: primary }}
                    >
                      <Plus size={13} />
                    </button>
                  </div>
                </div>

                {/* Photos */}
                <div className="mb-6">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-2">
                    Photos{' '}
                    <span className="font-normal normal-case text-gray-300">(optional)</span>
                  </label>
                  <PhotoGallery
                    photos={isEdit ? (activity?.photos ?? []) : photos}
                    onRemove={removePhoto}
                    onAddClick={() => fileInputRef.current?.click()}
                    uploading={uploading}
                    size="sm"
                  />
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={e => handlePhotoFiles(e.target.files)}
                  />
                </div>

                {/* Save */}
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={handleSave}
                  disabled={!canSave || saving}
                  className="w-full py-4 rounded-2xl text-white text-sm font-semibold disabled:opacity-40 transition-opacity"
                  style={{ background: primary }}
                >
                  {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Activity'}
                </motion.button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <DeleteConfirmSheet
        open={confirmDelete}
        title="Delete Activity"
        message="This activity will be permanently removed."
        onCancel={() => setConfirmDelete(false)}
        onConfirm={handleDelete}
      />
    </>
  )
}
