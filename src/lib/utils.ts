import { clsx, type ClassValue } from 'clsx'
import { format, differenceInDays, parseISO } from 'date-fns'
import type { UserName, MoodType, WishlistCategory } from '@/types'

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs)
}

export function formatDate(date: string | Date, fmt = 'MMM d, yyyy'): string {
  const d = typeof date === 'string' ? parseISO(date) : date
  return format(d, fmt)
}

export function formatTime(time: string): string {
  const [h, m] = time.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const displayH = h % 12 || 12
  return `${displayH}:${m.toString().padStart(2, '0')} ${ampm}`
}

export function getTodayString(): string {
  return format(new Date(), 'yyyy-MM-dd')
}

export function getDaysUntil(dateStr: string): number {
  const target = parseISO(dateStr)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return differenceInDays(target, today)
}

export function generateId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

export const MOOD_CONFIG: Record<MoodType, { emoji: string; label: string }> = {
  happy:   { emoji: '😊', label: 'Happy' },
  relaxed: { emoji: '😌', label: 'Relaxed' },
  tired:   { emoji: '😴', label: 'Tired' },
  sad:     { emoji: '😔', label: 'Sad' },
  stressed:{ emoji: '😤', label: 'Stressed' },
}

export const WISHLIST_CATEGORY_CONFIG: Record<WishlistCategory, { emoji: string; label: string }> = {
  date:       { emoji: '💕', label: 'Date Ideas' },
  restaurant: { emoji: '🍽️', label: 'Restaurants' },
  movie:      { emoji: '🎬', label: 'Movies' },
  travel:     { emoji: '✈️', label: 'Travel' },
  plan:       { emoji: '🌟', label: 'Future Plans' },
}

// Tailwind class maps per user theme
export const THEME = {
  seval: {
    bg:        'bg-seval-500',
    bgLight:   'bg-seval-100',
    bgLighter: 'bg-seval-50',
    text:      'text-seval-600',
    textLight: 'text-seval-500',
    border:    'border-seval-200',
    ring:      'ring-seval-400',
    gradient:  'from-seval-400 to-seval-500',
  },
  mateo: {
    bg:        'bg-mateo-500',
    bgLight:   'bg-mateo-100',
    bgLighter: 'bg-mateo-50',
    text:      'text-mateo-600',
    textLight: 'text-mateo-500',
    border:    'border-mateo-200',
    ring:      'ring-mateo-400',
    gradient:  'from-mateo-400 to-mateo-500',
  },
}

export function getTheme(user: UserName) {
  return THEME[user]
}

// Event color to tailwind bg class
export const EVENT_COLOR_CLASS: Record<string, string> = {
  seval:  'bg-seval-400',   // Purple
  blue:   'bg-blue-400',    // Blue
  yellow: 'bg-yellow-400',  // Yellow
  green:  'bg-emerald-400', // Green
  // Legacy keys — old saved data maps to nearest new color
  mateo:  'bg-blue-400',    // was Teal → Blue
  pink:   'bg-seval-400',   // was Pink → Purple
}

// Calendar grid helper
export function getCalendarDays(year: number, month: number): Date[] {
  const firstDay = new Date(year, month, 1)
  const lastDay  = new Date(year, month + 1, 0)
  const startDow = firstDay.getDay() // 0=Sun

  const days: Date[] = []

  // Leading days from prev month
  for (let i = startDow - 1; i >= 0; i--) {
    const d = new Date(year, month, 0)
    d.setDate(d.getDate() - i)
    days.push(new Date(d))
  }

  // Current month
  for (let d = 1; d <= lastDay.getDate(); d++) {
    days.push(new Date(year, month, d))
  }

  // Trailing days to complete grid
  const trailing = 7 - (days.length % 7)
  if (trailing < 7) {
    for (let d = 1; d <= trailing; d++) {
      days.push(new Date(year, month + 1, d))
    }
  }

  return days
}

export function toDateString(d: Date): string {
  return format(d, 'yyyy-MM-dd')
}
