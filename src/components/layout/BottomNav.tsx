'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Heart, Wallet, Compass, User } from 'lucide-react'
import { motion } from 'framer-motion'
import { useAppStore } from '@/store/useAppStore'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { href: '/together', label: 'Together', icon: Heart    },
  { href: '/plans',    label: 'Finance',  icon: Wallet   },
  { href: '/journey',  label: 'Journey',  icon: Compass  },
  { href: '/us',       label: 'Us',       icon: User     },
]

export function BottomNav() {
  const pathname = usePathname()
  const currentUser = useAppStore(s => s.currentUser)

  const isSeval = currentUser === 'seval'
  const activeColor = isSeval ? '#8b5cf6' : '#14b8a6'

  return (
    <nav className="glass-nav fixed bottom-0 left-0 right-0 z-40 pb-safe">
      <div className="flex items-center justify-around px-2 h-16 max-w-lg mx-auto">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              className="flex flex-col items-center justify-center gap-0.5 flex-1 h-full
                         relative active:opacity-70 transition-opacity"
            >
              {isActive && (
                <motion.div
                  layoutId="nav-indicator"
                  className="absolute top-1.5 w-1 h-1 rounded-full"
                  style={{ background: activeColor }}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              )}
              <Icon
                size={22}
                strokeWidth={isActive ? 2.2 : 1.7}
                color={isActive ? activeColor : '#9ca3af'}
              />
              <span
                className={cn('text-[10px] font-medium transition-colors', {
                  'font-semibold': isActive,
                })}
                style={{ color: isActive ? activeColor : '#9ca3af' }}
              >
                {label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
