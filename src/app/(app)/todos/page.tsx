'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Trash2, Check } from 'lucide-react'
import { formatDistanceToNow, parseISO } from 'date-fns'
import { useAppStore } from '@/store/useAppStore'
import { USERS } from '@/types'
import { cn } from '@/lib/utils'

export default function TodosPage() {
  const currentUser = useAppStore(s => s.currentUser)!
  const todos       = useAppStore(s => s.todos)
  const addTodo     = useAppStore(s => s.addTodo)
  const toggleTodo  = useAppStore(s => s.toggleTodo)
  const deleteTodo  = useAppStore(s => s.deleteTodo)

  const [newTitle, setNewTitle] = useState('')

  const isSeval      = currentUser === 'seval'
  const primaryColor = isSeval ? '#8b5cf6' : '#14b8a6'
  const lightBg      = isSeval ? 'bg-seval-50' : 'bg-mateo-50'

  const pending   = todos.filter(t => !t.isCompleted)
  const completed = todos.filter(t => t.isCompleted)

  function handleAdd() {
    if (!newTitle.trim()) return
    addTodo(newTitle.trim())
    setNewTitle('')
  }

  return (
    <div className="min-h-screen px-4 pt-14">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Together List</h1>
        <p className="text-sm text-gray-400 mt-0.5">
          {pending.length} left to do
        </p>
      </div>

      {/* Add input */}
      <div className={cn('flex gap-3 items-center rounded-2xl p-3 mb-6', lightBg)}>
        <button
          onClick={handleAdd}
          disabled={!newTitle.trim()}
          className="w-8 h-8 rounded-full flex items-center justify-center text-white
                     disabled:opacity-30 transition-opacity shrink-0"
          style={{ background: primaryColor }}
        >
          <Plus size={16} strokeWidth={2.5} />
        </button>
        <input
          type="text"
          value={newTitle}
          onChange={e => setNewTitle(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAdd()}
          placeholder="Add something to do..."
          className="flex-1 text-sm text-gray-700 placeholder:text-gray-400 bg-transparent outline-none"
        />
      </div>

      {/* Pending todos */}
      {todos.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center pt-16 text-center"
        >
          <div className="text-5xl mb-4">✅</div>
          <p className="font-semibold text-gray-600 mb-1">All clear!</p>
          <p className="text-sm text-gray-400">Add something you want to do together</p>
        </motion.div>
      ) : (
        <>
          <AnimatePresence mode="popLayout">
            {pending.map(todo => (
              <TodoItem
                key={todo.id}
                todo={todo}
                onToggle={() => toggleTodo(todo.id)}
                onDelete={() => deleteTodo(todo.id)}
                primaryColor={primaryColor}
                currentUser={currentUser}
              />
            ))}
          </AnimatePresence>

          {completed.length > 0 && (
            <div className="mt-6">
              <p className="text-xs font-semibold text-gray-300 uppercase tracking-wider mb-3">
                Completed ({completed.length})
              </p>
              <AnimatePresence mode="popLayout">
                {completed.map(todo => (
                  <TodoItem
                    key={todo.id}
                    todo={todo}
                    onToggle={() => toggleTodo(todo.id)}
                    onDelete={() => deleteTodo(todo.id)}
                    primaryColor={primaryColor}
                    currentUser={currentUser}
                    isDone
                  />
                ))}
              </AnimatePresence>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function TodoItem({
  todo, onToggle, onDelete, primaryColor, currentUser, isDone,
}: {
  todo: ReturnType<typeof useAppStore.getState>['todos'][number]
  onToggle: () => void
  onDelete: () => void
  primaryColor: string
  currentUser: string
  isDone?: boolean
}) {
  const creator   = USERS[todo.createdBy]
  const completer = todo.completedBy ? USERS[todo.completedBy] : null

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="flex items-center gap-3 bg-white rounded-2xl p-4 mb-2 shadow-card group"
    >
      <button
        onClick={onToggle}
        className="w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0
                   transition-all active:scale-90"
        style={{
          borderColor: isDone ? primaryColor : '#d1d5db',
          background:  isDone ? primaryColor : 'transparent',
        }}
      >
        {isDone && <Check size={13} color="white" strokeWidth={3} />}
      </button>

      <div className="flex-1 min-w-0">
        <p
          className={cn(
            'text-sm font-medium',
            isDone ? 'line-through text-gray-300' : 'text-gray-700'
          )}
        >
          {todo.title}
        </p>
        <p className="text-[11px] text-gray-300 mt-0.5">
          by {creator.displayName}
          {completer && ` · done by ${completer.displayName}`}
        </p>
      </div>

      <button
        onClick={onDelete}
        className="opacity-0 group-hover:opacity-100 text-gray-300 active:text-red-400
                   transition-all shrink-0"
      >
        <Trash2 size={15} />
      </button>
    </motion.div>
  )
}
