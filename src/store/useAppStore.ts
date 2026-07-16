'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  type UserName, type CalendarEvent, type SharedTodo, type MoodEntry,
  type LoveNote, type WishlistItem, type Countdown, type Memory,
  type MoodType, type WishlistCategory, type EventColor,
  type Goal, type GoalCategory, type PartnerNote,
  type ShoppingList, type ShoppingItem, type ShoppingListInput, type PageBackgrounds,
  type BudgetItem, type SavingsGoal,
  OTHER_USER,
} from '@/types'

const DEFAULT_BUDGET_ITEMS: BudgetItem[] = [
  { id: 'b1',  category: 'Housing / Rent',  emoji: '🏠', planned: 1200, actual: 0 },
  { id: 'b2',  category: 'Groceries',       emoji: '🛒', planned: 400,  actual: 0 },
  { id: 'b3',  category: 'Transport',       emoji: '🚗', planned: 200,  actual: 0 },
  { id: 'b4',  category: 'Utilities',       emoji: '⚡', planned: 150,  actual: 0 },
  { id: 'b5',  category: 'Subscriptions',   emoji: '📱', planned: 50,   actual: 0 },
  { id: 'b6',  category: 'Gifts',           emoji: '🎁', planned: 100,  actual: 0 },
  { id: 'b7',  category: 'Date Nights',     emoji: '🍽️', planned: 200,  actual: 0 },
  { id: 'b8',  category: 'Travel',          emoji: '✈️', planned: 300,  actual: 0 },
  { id: 'b9',  category: 'Pets',            emoji: '🐱', planned: 100,  actual: 0 },
  { id: 'b10', category: 'Shopping',        emoji: '🛍️', planned: 200,  actual: 0 },
  { id: 'b11', category: 'Other',           emoji: '❤️', planned: 100,  actual: 0 },
]
import { generateId, getTodayString } from '@/lib/utils'
import { supabase } from '@/lib/supabase'

interface AppState {
  // Session
  currentUser: UserName | null
  setCurrentUser: (user: UserName | null) => void

  // Events
  events: CalendarEvent[]
  addEvent: (data: Omit<CalendarEvent, 'id' | 'createdAt' | 'updatedAt' | 'linkedTodoId'>) => string
  updateEvent: (id: string, updates: Partial<CalendarEvent>) => void
  deleteEvent: (id: string) => void
  uploadEventPhoto: (eventId: string, file: File) => Promise<void>

  // Todos
  todos: SharedTodo[]
  addTodo: (title: string, items?: string[], date?: string, color?: EventColor, notes?: string, startTime?: string) => string
  uploadTodoPhoto: (todoId: string, file: File) => Promise<void>
  updateTodo: (id: string, updates: Partial<SharedTodo>) => void
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
  addWishlistItem: (title: string, category: WishlistCategory, notes?: string) => string
  toggleWishlistItem: (id: string) => void
  updateWishlistItem: (id: string, updates: Partial<import('@/types').WishlistItem>) => void
  deleteWishlistItem: (id: string) => void

  // Countdowns
  countdowns: Countdown[]
  addCountdown: (title: string, date: string, emoji: string) => void
  updateCountdown: (id: string, updates: Partial<Countdown>) => void
  deleteCountdown: (id: string) => void

  // Memories
  memories: Memory[]
  addMemory: (title: string, date: string, notes?: string, photos?: string[]) => void
  updateMemory: (id: string, updates: Partial<Memory>) => void
  deleteMemory: (id: string) => void

  // Goals
  goals: Goal[]
  addGoal: (categoryId: GoalCategory, title: string, notes?: string, targetDate?: string, progressTarget?: number, startTime?: string) => string
  updateGoal: (id: string, updates: Partial<Goal>) => void
  deleteGoal: (id: string) => void
  incrementGoalProgress: (id: string) => void

  // Partner Notes
  partnerNotes: PartnerNote[]
  sendPartnerNote: (content: string) => void
  markPartnerNoteRead: (id: string) => void

  // Shopping
  shoppingLists: ShoppingList[]
  createShoppingList: (data: ShoppingListInput) => string
  updateShoppingList: (id: string, updates: Partial<ShoppingList>) => void
  deleteShoppingList: (id: string) => void
  addShoppingItem: (listId: string, name: string, quantity?: number, notes?: string, price?: number) => void
  updateShoppingItem: (listId: string, itemId: string, updates: Partial<ShoppingItem>) => void
  toggleShoppingItem: (listId: string, itemId: string) => void
  deleteShoppingItem: (listId: string, itemId: string) => void

  // Finance
  monthlyIncome: number
  budgetItems: BudgetItem[]
  savingsGoals: SavingsGoal[]
  setMonthlyIncome: (amount: number) => void
  updateBudgetItem: (id: string, updates: Partial<Omit<BudgetItem, 'id'>>) => void
  addBudgetItem: (item: Omit<BudgetItem, 'id'>) => void
  deleteBudgetItem: (id: string) => void
  addSavingsGoal: (data: Omit<SavingsGoal, 'id' | 'createdAt' | 'createdBy'>) => void
  updateSavingsGoal: (id: string, updates: Partial<SavingsGoal>) => void
  deleteSavingsGoal: (id: string) => void
  addToSavings: (id: string, amount: number) => void

  // Page backgrounds
  pageBackgrounds: PageBackgrounds
  setPageBackground: (page: keyof PageBackgrounds, url: string | null) => void
  uploadPageBackground: (page: keyof PageBackgrounds, file: File) => Promise<void>

  // Generic photo upload (returns public URL or null)
  uploadPhoto: (folder: string, file: File) => Promise<string | null>
  uploadGoalPhoto: (goalId: string, file: File) => Promise<void>
  uploadWishlistPhoto: (itemId: string, file: File) => Promise<void>
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // ── Session ─────────────────────────────────────────────────────────────
      currentUser: null,
      setCurrentUser: (user) => set({ currentUser: user }),

      // ── Events ──────────────────────────────────────────────────────────────
      events: [],

      addEvent: data => {
        const now = new Date().toISOString()
        const eventId = generateId()

        const newEvent: CalendarEvent = {
          ...data,
          id: eventId,
          createdAt: now,
          updatedAt: now,
        }

        set(s => ({ events: [...s.events, newEvent] }))
        return eventId
      },

      updateEvent: (id, updates) =>
        set(s => {
          const event = s.events.find(e => e.id === id)
          return {
            events: s.events.map(e =>
              e.id === id ? { ...e, ...updates, updatedAt: new Date().toISOString() } : e
            ),
            todos: event?.linkedTodoId
              ? s.todos.map(t =>
                  t.id === event.linkedTodoId
                    ? {
                        ...t,
                        ...(updates.title !== undefined  ? { title: updates.title }  : {}),
                        ...(updates.date  !== undefined  ? { date:  updates.date  }  : {}),
                        ...(updates.color !== undefined  ? { color: updates.color }  : {}),
                      }
                    : t
                )
              : s.todos,
            goals: event?.linkedGoalId
              ? s.goals.map(g =>
                  g.id === event.linkedGoalId
                    ? {
                        ...g,
                        ...(updates.title !== undefined ? { title:      updates.title } : {}),
                        ...(updates.date  !== undefined ? { targetDate: updates.date  } : {}),
                      }
                    : g
                )
              : s.goals,
          }
        }),

      deleteEvent: id =>
        set(s => {
          const event = s.events.find(e => e.id === id)
          return {
            events: s.events.filter(e => e.id !== id),
            todos:  event?.linkedTodoId
              ? s.todos.filter(t => t.id !== event.linkedTodoId)
              : s.todos,
            // Unlink goal but keep it — user may still want the goal without a date
            goals: event?.linkedGoalId
              ? s.goals.map(g =>
                  g.id === event.linkedGoalId
                    ? { ...g, linkedEventId: undefined }
                    : g
                )
              : s.goals,
          }
        }),

      uploadEventPhoto: async (eventId, file) => {
        if (!file) return
        const url = await get().uploadPhoto(`events/${eventId}`, file)
        if (!url) { alert('Upload failed'); return }
        set(s => ({
          events: s.events.map(e =>
            e.id === eventId
              ? { ...e, photos: [...(e.photos ?? []), url], updatedAt: new Date().toISOString() }
              : e
          ),
        }))
      },

      // ── Todos ───────────────────────────────────────────────────────────────
      todos: [],

      addTodo: (title, items, date, color, notes, startTime) => {
        const { currentUser } = get()
        if (!currentUser) return ''
        const now    = new Date().toISOString()
        const todoId = generateId()
        const validItems = items?.filter(i => i.trim())

        const newTodo: SharedTodo = {
          id: todoId,
          title,
          items: validItems?.length ? validItems : undefined,
          notes: notes?.trim() || undefined,
          isCompleted: false,
          createdBy: currentUser,
          createdAt: now,
          date,
          startTime: startTime || undefined,
          color,
        }

        if (date) {
          const eventId = generateId()
          newTodo.linkedEventId = eventId

          const newEvent: CalendarEvent = {
            id: eventId,
            title,
            date,
            color: color ?? (currentUser === 'mateo' ? 'blue' : 'seval'),
            createdBy: currentUser,
            createdAt: now,
            updatedAt: now,
            linkedTodoId: todoId,
          }

          set(s => ({
            todos:  [...s.todos,  newTodo],
            events: [...s.events, newEvent],
          }))
        } else {
          set(s => ({ todos: [...s.todos, newTodo] }))
        }
        return todoId
      },

      uploadTodoPhoto: async (todoId, file) => {
        const url = await get().uploadPhoto(`todos/${todoId}`, file)
        if (!url) return
        set(s => ({
          todos: s.todos.map(t =>
            t.id === todoId ? { ...t, photos: [...(t.photos ?? []), url] } : t
          ),
        }))
      },

      updateTodo: (id, updates) =>
        set(s => {
          const todo = s.todos.find(t => t.id === id)
          if (!todo) return {}
          const updatedTodo = { ...todo, ...updates }

          // If a date is now set but there was no linked event, we can't auto-create here
          // (no currentUser access in set). We just update the todo fields.
          // If there's a linked event, sync title/date/color to it.
          return {
            todos: s.todos.map(t => t.id === id ? updatedTodo : t),
            events: todo.linkedEventId
              ? s.events.map(e =>
                  e.id === todo.linkedEventId
                    ? {
                        ...e,
                        ...(updates.title !== undefined ? { title: updates.title } : {}),
                        ...(updates.date  !== undefined ? { date:  updates.date  } : {}),
                        ...(updates.color !== undefined ? { color: updates.color } : {}),
                        updatedAt: new Date().toISOString(),
                      }
                    : e
                )
              : s.events,
          }
        }),

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
        set(s => {
          const todo = s.todos.find(t => t.id === id)
          return {
            todos:  s.todos.filter(t => t.id !== id),
            events: todo?.linkedEventId
              ? s.events.filter(e => e.id !== todo.linkedEventId)
              : s.events,
          }
        }),

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
        if (!currentUser) return ''
        const id = generateId()
        set(s => ({
          wishlistItems: [
            ...s.wishlistItems,
            {
              id,
              title,
              category,
              notes,
              isCompleted: false,
              createdBy: currentUser,
              createdAt: new Date().toISOString(),
            },
          ],
        }))
        return id
      },

      toggleWishlistItem: id =>
        set(s => ({
          wishlistItems: s.wishlistItems.map(i =>
            i.id === id ? { ...i, isCompleted: !i.isCompleted } : i
          ),
        })),

      updateWishlistItem: (id, updates) =>
        set(s => ({
          wishlistItems: s.wishlistItems.map(i => i.id === id ? { ...i, ...updates } : i),
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

      updateCountdown: (id, updates) =>
        set(s => ({ countdowns: s.countdowns.map(c => c.id === id ? { ...c, ...updates } : c) })),

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

      // ── Goals ─────────────────────────────────────────────────────────────────
      goals: [],

      addGoal: (categoryId, title, notes, targetDate, progressTarget = 0, startTime) => {
        const { currentUser } = get()
        if (!currentUser) return ''
        const now    = new Date().toISOString()
        const goalId = generateId()

        const newGoal: Goal = {
          id: goalId,
          categoryId,
          title,
          notes,
          targetDate,
          startTime: startTime || undefined,
          progressCurrent: 0,
          progressTarget,
          isCompleted: false,
          createdBy: currentUser,
          createdAt: now,
        }

        if (targetDate) {
          const eventId = generateId()
          newGoal.linkedEventId = eventId
          const newEvent: CalendarEvent = {
            id: eventId,
            title,
            date: targetDate,
            color: currentUser === 'mateo' ? 'blue' : 'seval',
            createdBy: currentUser,
            createdAt: now,
            updatedAt: now,
            linkedGoalId: goalId,
          }
          set(s => ({
            goals:  [...s.goals,  newGoal],
            events: [...s.events, newEvent],
          }))
        } else {
          set(s => ({ goals: [...s.goals, newGoal] }))
        }
        return goalId
      },

      updateGoal: (id, updates) => {
        const { currentUser } = get()
        set(s => {
          const goal = s.goals.find(g => g.id === id)
          if (!goal) return {}

          let events        = s.events
          let linkedEventId = goal.linkedEventId

          if ('targetDate' in updates) {
            const newDate = updates.targetDate

            if (goal.linkedEventId) {
              if (!newDate) {
                // Date removed → delete the linked event
                events = events.filter(e => e.id !== goal.linkedEventId)
                linkedEventId = undefined
              } else {
                // Date changed → update the linked event
                events = events.map(e =>
                  e.id === goal.linkedEventId
                    ? {
                        ...e,
                        date: newDate,
                        ...(updates.title !== undefined ? { title: updates.title } : {}),
                        updatedAt: new Date().toISOString(),
                      }
                    : e
                )
              }
            } else if (newDate) {
              // No linked event yet — check if one already exists with linkedGoalId
              // (can happen when sync clears linkedEventId via race condition)
              const orphaned = events.find(e => e.linkedGoalId === id)
              if (orphaned) {
                linkedEventId = orphaned.id
                events = events.map(e =>
                  e.id === orphaned.id
                    ? {
                        ...e,
                        date: newDate,
                        ...(updates.title !== undefined ? { title: updates.title } : {}),
                        updatedAt: new Date().toISOString(),
                      }
                    : e
                )
              } else {
                // Date added → create one
                const eventId = generateId()
                linkedEventId = eventId
                const newEvent: CalendarEvent = {
                  id: eventId,
                  title: updates.title ?? goal.title,
                  date: newDate,
                  color: (currentUser ?? goal.createdBy) === 'mateo' ? 'blue' : 'seval',
                  createdBy: currentUser ?? goal.createdBy,
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                  linkedGoalId: id,
                }
                events = [...events, newEvent]
              }
            }
          } else if (updates.title !== undefined && goal.linkedEventId) {
            // Title-only change → keep event title in sync
            events = events.map(e =>
              e.id === goal.linkedEventId
                ? { ...e, title: updates.title!, updatedAt: new Date().toISOString() }
                : e
            )
          }

          return {
            goals:  s.goals.map(g => g.id === id ? { ...goal, ...updates, linkedEventId } : g),
            events,
          }
        })
      },

      deleteGoal: id =>
        set(s => {
          const goal = s.goals.find(g => g.id === id)
          return {
            goals:  s.goals.filter(g => g.id !== id),
            events: goal?.linkedEventId
              ? s.events.filter(e => e.id !== goal.linkedEventId)
              : s.events,
          }
        }),

      incrementGoalProgress: id =>
        set(s => ({
          goals: s.goals.map(g => {
            if (g.id !== id) return g
            const next = g.progressCurrent + 1
            return {
              ...g,
              progressCurrent: next,
              isCompleted: g.progressTarget > 0 ? next >= g.progressTarget : g.isCompleted,
            }
          }),
        })),

      // ── Partner Notes ─────────────────────────────────────────────────────────
      partnerNotes: [],

      sendPartnerNote: content => {
        const { currentUser } = get()
        if (!currentUser) return
        const note: PartnerNote = {
          id: generateId(),
          from: currentUser,
          to: OTHER_USER[currentUser],
          content: content.trim(),
          createdAt: new Date().toISOString(),
          isRead: false,
        }
        set(s => ({ partnerNotes: [...s.partnerNotes, note] }))
      },

      markPartnerNoteRead: id =>
        set(s => ({
          partnerNotes: s.partnerNotes.map(n =>
            n.id === id ? { ...n, isRead: true } : n
          ),
        })),

      // ── Shopping ─────────────────────────────────────────────────────────────
      shoppingLists: [],

      createShoppingList: (data) => {
        const { currentUser } = get()
        if (!currentUser) return ''
        const now  = new Date().toISOString()
        const id   = generateId()
        set(s => ({
          shoppingLists: [
            ...s.shoppingLists,
            {
              id, name: data.name.trim(), items: [],
              createdBy: currentUser, createdAt: now, updatedAt: now,
              storeName:  data.storeName?.trim() || undefined,
              date:       data.date || undefined,
              time:       data.time || undefined,
              notes:      data.notes?.trim() || undefined,
              coverPhoto: data.coverPhoto || undefined,
              photos:     data.photos?.length ? data.photos : undefined,
              isCompleted: false,
            },
          ],
        }))
        return id
      },

      updateShoppingList: (id, updates) =>
        set(s => ({
          shoppingLists: s.shoppingLists.map(l =>
            l.id === id ? { ...l, ...updates, updatedAt: new Date().toISOString() } : l
          ),
        })),

      deleteShoppingList: id =>
        set(s => ({ shoppingLists: s.shoppingLists.filter(l => l.id !== id) })),

      updateShoppingItem: (listId, itemId, updates) =>
        set(s => ({
          shoppingLists: s.shoppingLists.map(l =>
            l.id === listId
              ? {
                  ...l,
                  items: l.items.map(i => i.id === itemId ? { ...i, ...updates } : i),
                  updatedAt: new Date().toISOString(),
                }
              : l
          ),
        })),

      addShoppingItem: (listId, name, quantity = 1, notes, price) => {
        const { currentUser } = get()
        if (!currentUser) return
        const newItem: ShoppingItem = {
          id: generateId(), name: name.trim(), quantity, isChecked: false,
          createdAt: new Date().toISOString(),
          notes: notes?.trim() || undefined,
          price: price ?? undefined,
        }
        set(s => ({
          shoppingLists: s.shoppingLists.map(l =>
            l.id === listId
              ? { ...l, items: [...l.items, newItem], updatedAt: new Date().toISOString() }
              : l
          ),
        }))
      },

      toggleShoppingItem: (listId, itemId) => {
        const { currentUser } = get()
        if (!currentUser) return
        set(s => ({
          shoppingLists: s.shoppingLists.map(l => {
            if (l.id !== listId) return l
            const updatedItems = l.items.map(i =>
              i.id === itemId
                ? { ...i, isChecked: !i.isChecked, checkedBy: !i.isChecked ? currentUser : undefined }
                : i
            )
            const allChecked = updatedItems.length > 0 && updatedItems.every(i => i.isChecked)
            return {
              ...l,
              updatedAt:   new Date().toISOString(),
              items:       updatedItems,
              isCompleted: allChecked,
              completedAt: allChecked
                ? (l.isCompleted && l.completedAt ? l.completedAt : new Date().toISOString())
                : undefined,
            }
          }),
        }))
      },

      deleteShoppingItem: (listId, itemId) =>
        set(s => ({
          shoppingLists: s.shoppingLists.map(l =>
            l.id === listId
              ? {
                  ...l,
                  items: l.items.filter(i => i.id !== itemId),
                  updatedAt: new Date().toISOString(),
                  // Un-complete if an item is deleted while completed
                  isCompleted: false,
                  completedAt: undefined,
                }
              : l
          ),
        })),

      // ── Finance ──────────────────────────────────────────────────────────────
      monthlyIncome: 0,
      budgetItems: DEFAULT_BUDGET_ITEMS,
      savingsGoals: [],

      setMonthlyIncome: (amount) => set({ monthlyIncome: amount }),

      updateBudgetItem: (id, updates) =>
        set(s => ({
          budgetItems: s.budgetItems.map(b => b.id === id ? { ...b, ...updates } : b),
        })),

      addBudgetItem: (item) =>
        set(s => ({
          budgetItems: [...s.budgetItems, { ...item, id: generateId() }],
        })),

      deleteBudgetItem: (id) =>
        set(s => ({ budgetItems: s.budgetItems.filter(b => b.id !== id) })),

      addSavingsGoal: (data) => {
        const { currentUser } = get()
        if (!currentUser) return
        const goal: SavingsGoal = {
          ...data,
          id: generateId(),
          savedAmount: data.savedAmount ?? 0,
          createdBy: currentUser,
          createdAt: new Date().toISOString(),
        }
        set(s => ({ savingsGoals: [...s.savingsGoals, goal] }))
      },

      updateSavingsGoal: (id, updates) =>
        set(s => ({
          savingsGoals: s.savingsGoals.map(g => g.id === id ? { ...g, ...updates } : g),
        })),

      deleteSavingsGoal: (id) =>
        set(s => ({ savingsGoals: s.savingsGoals.filter(g => g.id !== id) })),

      addToSavings: (id, amount) =>
        set(s => ({
          savingsGoals: s.savingsGoals.map(g =>
            g.id === id ? { ...g, savedAmount: Math.max(0, g.savedAmount + amount) } : g
          ),
        })),

      // ── Page backgrounds ─────────────────────────────────────────────────────
      pageBackgrounds: {},

      setPageBackground: (page, url) =>
        set(s => ({
          pageBackgrounds: { ...s.pageBackgrounds, [page]: url ?? undefined },
        })),

      uploadPageBackground: async (page, file) => {
        const url = await get().uploadPhoto('page-backgrounds', file)
        if (url) get().setPageBackground(page, url)
      },

      // ── Generic upload helper ─────────────────────────────────────────────────
      uploadPhoto: async (folder, file) => {
        const form = new FormData()
        form.append('file', file)
        form.append('folder', folder)
        const res = await fetch('/api/upload-photo', { method: 'POST', body: form })
        if (!res.ok) {
          const { error } = await res.json().catch(() => ({ error: 'Upload failed' }))
          console.error('[Photo] Upload error:', error)
          return null
        }
        const { url } = await res.json()
        return url as string
      },

      uploadGoalPhoto: async (goalId, file) => {
        const url = await get().uploadPhoto(`goals/${goalId}`, file)
        if (!url) return
        set(s => ({
          goals: s.goals.map(g =>
            g.id === goalId ? { ...g, photos: [...(g.photos ?? []), url] } : g
          ),
        }))
      },

      uploadWishlistPhoto: async (itemId, file) => {
        const url = await get().uploadPhoto(`wishes/${itemId}`, file)
        if (!url) return
        set(s => ({
          wishlistItems: s.wishlistItems.map(w =>
            w.id === itemId ? { ...w, photos: [...(w.photos ?? []), url] } : w
          ),
        }))
      },
    }),
    { name: 'semacalendar-v1', partialize: (s) => { const { currentUser, ...rest } = s; return rest } }
  )
)
