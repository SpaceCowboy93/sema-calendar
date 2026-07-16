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

export type EventColor = 'seval' | 'blue' | 'yellow' | 'green'

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
  backgroundPhoto?: string // URL of the photo used as card background
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
  photos?: string[]
  backgroundPhoto?: string
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
  photos?: string[]      // Supabase Storage public URLs
  backgroundPhoto?: string
  checklist?: string[]
}

export interface PageBackgrounds {
  together?: string  // Supabase Storage public URL
  plans?: string
  us?: string
}

export interface Countdown {
  id: string
  title: string
  date: string // YYYY-MM-DD
  emoji: string
  createdBy: UserName
  time?: string            // HH:MM
  notes?: string
  checklist?: string[]
  photos?: string[]
  romanticMessage?: string
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
  photos?: string[]          // Supabase Storage public URLs
  backgroundPhoto?: string
  checklist?: string[]
}

export interface PartnerNote {
  id: string
  from: UserName
  to: UserName
  content: string
  createdAt: string
  isRead: boolean
}

export interface ShoppingItem {
  id: string
  name: string
  quantity: number
  isChecked: boolean
  checkedBy?: UserName
  createdAt: string
  notes?: string
  price?: number
  link?: string
}

export interface FinanceCategoryItem {
  id: string
  name: string
  quantity: number
  unitPrice: number
  note?: string
  isPaid?: boolean
  createdAt: string
  updatedAt: string
}

export interface BudgetItem {
  id: string
  category: string
  emoji: string
  planned: number
  actual: number
  note?: string
  // Extended (all optional — backward-compat)
  photos?: string[]
  items?: FinanceCategoryItem[]
  actualSpendingMode?: 'items' | 'manual'
  manualActualSpending?: number
}

export interface SavingsGoal {
  id: string
  title: string
  emoji: string
  targetAmount: number
  savedAmount: number
  deadline?: string   // YYYY-MM-DD
  notes?: string
  createdBy: UserName
  createdAt: string
}

export interface ShoppingList {
  id: string
  name: string
  items: ShoppingItem[]
  createdBy: UserName
  createdAt: string
  updatedAt: string
  // Enhanced fields
  storeName?: string
  date?: string        // YYYY-MM-DD
  time?: string        // HH:MM
  notes?: string
  coverPhoto?: string  // base64 data URL (legacy single photo — kept for compat)
  photos?: string[]    // multiple base64 data URLs; photos[0] is the cover
  isCompleted?: boolean
  completedAt?: string
}

export type ShoppingListInput = {
  name: string
  storeName?: string
  date?: string
  time?: string
  notes?: string
  coverPhoto?: string  // kept for compat
  photos?: string[]    // preferred for new lists
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

export interface FinanceMonth {
  key: string              // 'YYYY-MM'
  income: number
  budgetItems: BudgetItem[]
  isFinalized: boolean
  report?: FinanceMonthReport
  createdAt: string
  updatedAt: string
}

export interface FinanceMonthReport {
  generatedAt: string
  totalIncome: number
  totalExpenses: number
  totalSaved: number
  remaining: number
  savingsRate: number      // percentage
  topCategory?: string
  overBudgetCategories: string[]
}

export interface SavingsTransaction {
  id: string
  monthKey: string         // 'YYYY-MM'
  amount: number           // positive = contribution, negative = withdrawal
  note?: string
  createdAt: string
  createdBy: UserName
}
