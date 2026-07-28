/**
 * SeMa C2 Icon System
 *
 * Single source of truth for all icons in the application.
 * Every component imports from here — never directly from 'lucide-react'.
 *
 * Icon family : Lucide React
 * Style       : Outline (neutral) · slightly heavier stroke (active/selected)
 * Stroke      : 1.75–2 px
 * Sizes       : Nav 24px · FAB 22px · Actions 20px · Inputs 18px · Small 16px
 *
 * Reference   : SeMa C2 Icon Guide (botanical · calm · meaningful · consistent)
 */

// ── Type ──────────────────────────────────────────────────────────────────────
export type { LucideIcon } from 'lucide-react'

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 1 — NAVIGATION  (bottom bar & room headers)
// ─────────────────────────────────────────────────────────────────────────────
export { Home        as IconNavHome     } from 'lucide-react' // Together / Home room
export { CalendarDays as IconNavPlanner } from 'lucide-react' // Planner room
export { Wallet      as IconNavFinances } from 'lucide-react' // Finances room
export { Handshake   as IconNavUs       } from 'lucide-react' // Us / relationship room

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 2 — ACTIONS
// ─────────────────────────────────────────────────────────────────────────────
export { Plus          as IconAdd     } from 'lucide-react'
export { Check         as IconSave    } from 'lucide-react'
export { Pencil        as IconEdit    } from 'lucide-react'
export { Trash2        as IconDelete  } from 'lucide-react'
export { X             as IconClose   } from 'lucide-react'
export { Send          as IconSend    } from 'lucide-react'
export { Search        as IconSearch  } from 'lucide-react'
export { LogOut        as IconLogout  } from 'lucide-react'
export { RefreshCw     as IconRefresh } from 'lucide-react'

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 3 — INPUTS & FIELDS
// ─────────────────────────────────────────────────────────────────────────────
export { CalendarDays  as IconCalendar      } from 'lucide-react'
export { CalendarClock as IconCalendarClock } from 'lucide-react'
export { Clock         as IconTime          } from 'lucide-react'
export { Camera        as IconCamera        } from 'lucide-react'
export { FileText      as IconNotes         } from 'lucide-react'
export { CheckSquare   as IconChecklist     } from 'lucide-react'
export { ScanLine      as IconScan          } from 'lucide-react'
export { Pin           as IconPin           } from 'lucide-react'
export { Image         as IconPhoto         } from 'lucide-react'

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 4 — DIRECTIONAL / CHEVRONS
// ─────────────────────────────────────────────────────────────────────────────
export { ChevronLeft  as IconLeft  } from 'lucide-react'
export { ChevronRight as IconRight } from 'lucide-react'
export { ChevronUp    as IconUp    } from 'lucide-react'
export { ChevronDown  as IconDown  } from 'lucide-react'

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 5 — RELATIONSHIP & MEMORIES
// ─────────────────────────────────────────────────────────────────────────────
export { Heart    as IconHeart    } from 'lucide-react'
export { Sparkles as IconDream    } from 'lucide-react'
export { Flag     as IconMilestone} from 'lucide-react'

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 6 — FINANCE
// ─────────────────────────────────────────────────────────────────────────────
export { TrendingUp   as IconTrendingUp   } from 'lucide-react'
export { TrendingDown as IconTrendingDown } from 'lucide-react'
export { Wallet       as IconWallet       } from 'lucide-react'

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 7 — STATE & FEEDBACK
// ─────────────────────────────────────────────────────────────────────────────
export { Loader2       as IconLoading } from 'lucide-react'
export { AlertTriangle as IconWarning } from 'lucide-react'
export { AlertCircle   as IconInfo    } from 'lucide-react'
export { CheckCircle2  as IconSuccess } from 'lucide-react'

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 8 — NOTIFICATIONS & COMMUNICATION
// ─────────────────────────────────────────────────────────────────────────────
export { Bell     as IconBell     } from 'lucide-react'
export { BellOff  as IconBellOff  } from 'lucide-react'
export { BellRing as IconBellRing } from 'lucide-react'
export { Wifi     as IconWifi     } from 'lucide-react'

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 9 — SETTINGS & ACCOUNT
// ─────────────────────────────────────────────────────────────────────────────
export { User    as IconProfile } from 'lucide-react'
export { History as IconHistory } from 'lucide-react'
export { Target  as IconTarget  } from 'lucide-react'

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 10 — MEDIA
// ─────────────────────────────────────────────────────────────────────────────
export { ZoomIn  as IconZoomIn  } from 'lucide-react'
export { ZoomOut as IconZoomOut } from 'lucide-react'

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 11 — BRAND & BOTANICAL
// ─────────────────────────────────────────────────────────────────────────────
export { Leaf as IconLeaf } from 'lucide-react' // SeMa brand element

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 12 — MISC UI
// ─────────────────────────────────────────────────────────────────────────────
export { Sun          as IconSun         } from 'lucide-react'
export { AlignJustify as IconListView    } from 'lucide-react'
export { ShoppingBag  as IconShoppingBag } from 'lucide-react'

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 13 — SHOPPING CATEGORY ICONS
// Semantic food/grocery icons used on category chips in the Shopping room.
// ─────────────────────────────────────────────────────────────────────────────
export {
  Coffee, Milk, Beef, Croissant, Egg, Banana, Apple,
  Wine, Beer, Fish, Citrus, Droplets, Carrot, Cherry,
  Grape, Salad,
} from 'lucide-react'

// ─────────────────────────────────────────────────────────────────────────────
// RAW RE-EXPORTS  (backward-compat — existing files change only the import path)
// ─────────────────────────────────────────────────────────────────────────────
export {
  // Navigation
  Home, CalendarDays, CalendarClock, Wallet, Handshake,
  // Actions
  Plus, X, Check, Pencil, Trash2, Send, Search, LogOut, RefreshCw,
  // Directional
  ChevronLeft, ChevronRight, ChevronUp, ChevronDown,
  // Inputs
  Camera, FileText, CheckSquare, ScanLine, Pin, Clock,
  // Relationship
  Heart, Sparkles, Flag,
  // Finance
  TrendingUp, TrendingDown,
  // State
  Loader2, AlertTriangle, AlertCircle, CheckCircle2,
  // Notifications
  Bell, BellOff, BellRing, Wifi,
  // Account / goals
  User, History, Target,
  // Media
  ZoomIn, ZoomOut,
  // Brand
  Leaf,
  // Misc
  Sun, AlignJustify, ShoppingBag,
} from 'lucide-react'

// Image re-exported as ImageIcon to avoid conflict with Next.js <Image> component
export { Image as ImageIcon } from 'lucide-react'
