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

export interface CalendarEvent {
  id: string
  title: string
  date: string // YYYY-MM-DD
  startTime?: string // HH:MM
  endTime?: string // HH:MM
  notes?: string
  emoji?: string
  color: 'seval' | 'mateo' | 'pink' | 'yellow' | 'green'
  todos?: EventTodo[]
  createdBy: UserName
  createdAt: string
  updatedAt: string
}

export interface EventTodo {
  id: string
  title: string
  isCompleted: boolean
}

export interface SharedTodo {
  id: string
  title: string
  isCompleted: boolean
  completedBy?: UserName
  createdBy: UserName
  createdAt: string
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

export interface Memory {
  id: string
  date: string // YYYY-MM-DD
  title: string
  notes?: string
  photos?: string[] // base64 data URLs
  createdBy: UserName
  createdAt: string
}
