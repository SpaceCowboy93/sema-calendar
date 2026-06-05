'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  type UserName, type CalendarEvent, type SharedTodo, type MoodEntry,
  type LoveNote, type WishlistItem, type Countdown, type Memory,
  type MoodType, type WishlistCategory, type EventTodo,
} from '@/types'
import { generateId, getTodayString } from '@/lib/utils'

// Default passwords — users can change these from the profile page
const DEFAULT_PASSWORDS: Record<UserName, string> = {
  seval: 'seval',
  mateo: 'mateo',
}

interface AppState {
  // Auth
  currentUser: UserName | null
  passwords: Record<UserName, string>
  signIn: (user: UserName, password: string) => boolean
  signOut: () => void
  changePassword: (user: UserName, newPassword: string) => void

  // Events
  events: CalendarEvent[]
  addEvent: (data: Omit<CalendarEvent, 'id' | 'createdAt' | 'updatedAt'>) => void
  updateEvent: (id: string, updates: Partial<CalendarEvent>) => void
  deleteEvent: (id: string) => void

  // Todos
  todos: SharedTodo[]
  addTodo: (title: string) => void
  toggleTodo: (id: string) => void
  deleteTodo: (id: string) => void

  // Moods
  moods: MoodEntry[]
  setMood: (mood: MoodType, note?: string) => void
  getMoodForUser: (userId: UserName, date?: string) => MoodEntry | undefined

  // Love Notes
  loveNotes: LoveNote[]
  addLoveNote: (content: string) => void
  deleteLoveNote: (id: string) => void
  togglePinNote: (id: string) => void

  // Wishlist
  wishlistItems: WishlistItem[]
  addWishlistItem: (title: string, category: WishlistCategory, notes?: string) => void
  toggleWishlistItem: (id: string) => void
  deleteWishlistItem: (id: string) => void

  // Countdowns
  countdowns: Countdown[]
  addCountdown: (title: string, date: string, emoji: string) => void
  deleteCountdown: (id: string) => void

  // Memories
  memories: Memory[]
  addMemory: (title: string, date: string, notes?: string, photos?: string[]) => void
  updateMemory: (id: string, updates: Partial<Memory>) => void
  deleteMemory: (id: string) => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // ── Auth ────────────────────────────────────────────────────────────────
      currentUser: null,
      passwords: DEFAULT_PASSWORDS,

      signIn: (user, password) => {
        if (get().passwords[user] === password) {
          set({ currentUser: user })
          return true
        }
        return false
      },

      signOut: () => set({ currentUser: null }),

      changePassword: (user, newPassword) =>
        set(s => ({ passwords: { ...s.passwords, [user]: newPassword } })),

      // ── Events ──────────────────────────────────────────────────────────────
      events: [],

      addEvent: data => {
        const now = new Date().toISOString()
        set(s => ({
          events: [...s.events, { ...data, id: generateId(), createdAt: now, updatedAt: now }],
        }))
      },

      updateEvent: (id, updates) =>
        set(s => ({
          events: s.events.map(e =>
            e.id === id ? { ...e, ...updates, updatedAt: new Date().toISOString() } : e
          ),
        })),

      deleteEvent: id =>
        set(s => ({ events: s.events.filter(e => e.id !== id) })),

      // ── Todos ───────────────────────────────────────────────────────────────
      todos: [],

      addTodo: title => {
        const { currentUser } = get()
        if (!currentUser) return
        set(s => ({
          todos: [
            ...s.todos,
            {
              id: generateId(),
              title,
              isCompleted: false,
              createdBy: currentUser,
              createdAt: new Date().toISOString(),
            },
          ],
        }))
      },

      toggleTodo: id => {
        const { currentUser } = get()
        set(s => ({
          todos: s.todos.map(t =>
            t.id === id
              ? {
                  ...t,
                  isCompleted: !t.isCompleted,
                  completedBy: !t.isCompleted ? currentUser ?? undefined : undefined,
                }
              : t
          ),
        }))
      },

      deleteTodo: id =>
        set(s => ({ todos: s.todos.filter(t => t.id !== id) })),

      // ── Moods ───────────────────────────────────────────────────────────────
      moods: [],

      setMood: (mood, note) => {
        const { currentUser } = get()
        if (!currentUser) return
        const today = getTodayString()
        const entry: MoodEntry = { userId: currentUser, date: today, mood, note }
        set(s => ({
          moods: [
            ...s.moods.filter(m => !(m.userId === currentUser && m.date === today)),
            entry,
          ],
        }))
      },

      getMoodForUser: (userId, date) => {
        const target = date ?? getTodayString()
        return get().moods.find(m => m.userId === userId && m.date === target)
      },

      // ── Love Notes ──────────────────────────────────────────────────────────
      loveNotes: [],

      addLoveNote: content => {
        const { currentUser } = get()
        if (!currentUser) return
        set(s => ({
          loveNotes: [
            {
              id: generateId(),
              from: currentUser,
              content,
              createdAt: new Date().toISOString(),
              isPinned: false,
            },
            ...s.loveNotes,
          ],
        }))
      },

      deleteLoveNote: id =>
        set(s => ({ loveNotes: s.loveNotes.filter(n => n.id !== id) })),

      togglePinNote: id =>
        set(s => ({
          loveNotes: s.loveNotes.map(n => (n.id === id ? { ...n, isPinned: !n.isPinned } : n)),
        })),

      // ── Wishlist ─────────────────────────────────────────────────────────────
      wishlistItems: [],

      addWishlistItem: (title, category, notes) => {
        const { currentUser } = get()
        if (!currentUser) return
        set(s => ({
          wishlistItems: [
            ...s.wishlistItems,
            {
              id: generateId(),
              title,
              category,
              notes,
              isCompleted: false,
              createdBy: currentUser,
              createdAt: new Date().toISOString(),
            },
          ],
        }))
      },

      toggleWishlistItem: id =>
        set(s => ({
          wishlistItems: s.wishlistItems.map(i =>
            i.id === id ? { ...i, isCompleted: !i.isCompleted } : i
          ),
        })),

      deleteWishlistItem: id =>
        set(s => ({ wishlistItems: s.wishlistItems.filter(i => i.id !== id) })),

      // ── Countdowns ───────────────────────────────────────────────────────────
      countdowns: [],

      addCountdown: (title, date, emoji) => {
        const { currentUser } = get()
        if (!currentUser) return
        set(s => ({
          countdowns: [
            ...s.countdowns,
            { id: generateId(), title, date, emoji, createdBy: currentUser },
          ],
        }))
      },

      deleteCountdown: id =>
        set(s => ({ countdowns: s.countdowns.filter(c => c.id !== id) })),

      // ── Memories ─────────────────────────────────────────────────────────────
      memories: [],

      addMemory: (title, date, notes, photos) => {
        const { currentUser } = get()
        if (!currentUser) return
        set(s => ({
          memories: [
            ...s.memories,
            {
              id: generateId(),
              title,
              date,
              notes,
              photos,
              createdBy: currentUser,
              createdAt: new Date().toISOString(),
            },
          ],
        }))
      },

      updateMemory: (id, updates) =>
        set(s => ({
          memories: s.memories.map(m => (m.id === id ? { ...m, ...updates } : m)),
        })),

      deleteMemory: id =>
        set(s => ({ memories: s.memories.filter(m => m.id !== id) })),
    }),
    { name: 'semacalendar-v1' }
  )
)
