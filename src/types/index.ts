export type UserName = 'seval' | 'mateo'

export interface UserConfig {
  name: UserName
  displayName: string
  emoji: string
  theme: 'seval' | 'mateo'
}

export const USERS: Record<UserName, UserConfig> = {
  seval: { name: 'seval', displayName: 'Seval', emoji: '🌸', theme: 'seval' },
  mateo: { name: 'mateo', displayName: 'Mateo', emoji: '🌊', theme: 'mateo' },
}

export const OTHER_USER: Record<UserName, UserName> = {
  seval: 'mateo',
  mateo: 'seval',
}

export type EventColor = 'seval' | 'mateo' | 'pink' | 'yellow' | 'green'

export interface CalendarEvent {
  id: string
  title: string
  date: string // YYYY-MM-DD
  startTime?: string // HH:MM
  endTime?: string // HH:MM
  notes?: string
  emoji?: string
  color: EventColor
  todos?: EventTodo[]
  photos?: string[] // Supabase Storage public URLs
  createdBy: UserName
  createdAt: string
  updatedAt: string
  linkedTodoId?: string
  linkedGoalId?: string
}

export interface EventTodo {
  id: string
  title: string
  isCompleted: boolean
}

export interface SharedTodo {
  id: string
  title: string
  items?: string[]       // sub-items / checklist entries
  notes?: string         // free-form notes (not synced to calendar)
  isCompleted: boolean
  completedBy?: UserName
  createdBy: UserName
  createdAt: string
  date?: string          // YYYY-MM-DD (optional, syncs to calendar)
  startTime?: string     // HH:MM (optional)
  color?: EventColor
  linkedEventId?: string // ID of the linked CalendarEvent (if any)
}

export type MoodType = 'happy' | 'relaxed' | 'tired' | 'sad' | 'stressed'

export interface MoodEntry {
  userId: UserName
  date: string // YYYY-MM-DD
  mood: MoodType
  note?: string
}

export interface LoveNote {
  id: string
  from: UserName
  content: string
  createdAt: string
  isPinned: boolean
}

export type WishlistCategory = 'date' | 'restaurant' | 'movie' | 'travel' | 'plan'

export interface WishlistItem {
  id: string
  title: string
  category: WishlistCategory
  notes?: string
  date?: string          // YYYY-MM-DD (optional target/desired date)
  startTime?: string     // HH:MM (optional)
  isCompleted: boolean
  createdBy: UserName
  createdAt: string
}

export interface Countdown {
  id: string
  title: string
  date: string // YYYY-MM-DD
  emoji: string
  createdBy: UserName
}

export type GoalCategory =
  | 'travel'
  | 'money'
  | 'fitness'
  | 'life'
  | 'learning'
  | 'hobbies'
  | 'challenges'

export interface Goal {
  id: string
  categoryId: GoalCategory
  title: string
  notes?: string
  targetDate?: string        // YYYY-MM-DD
  startTime?: string         // HH:MM (optional, for day-of reminder)
  progressCurrent: number    // how many steps done
  progressTarget: number     // 0 = simple done/not-done; >0 = counter goal
  isCompleted: boolean
  createdBy: UserName
  createdAt: string
  linkedEventId?: string     // ID of the linked CalendarEvent (if targetDate is set)
}

export interface PartnerNote {
  id: string
  from: UserName
  to: UserName
  content: string
  createdAt: string
  isRead: boolean
}

export interface Memory {
  id: string
  date: string // YYYY-MM-DD
  title: string
  notes?: string
  photos?: string[] // base64 data URLs
  createdBy: UserName
  createdAt: string
}
