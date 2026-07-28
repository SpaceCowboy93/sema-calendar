'use client'

import { forwardRef } from 'react'
import { type LucideIcon, Search } from '@/design/iconSystem'
import { cn } from '@/lib/utils'

// ── Shared base styles ────────────────────────────────────────────────────────

const BASE_INPUT =
  'w-full bg-gray-50 rounded-2xl px-4 py-3 text-sm text-gray-700 ' +
  'placeholder:text-gray-300 outline-none transition-[background] duration-150'

// ── TextInput ─────────────────────────────────────────────────────────────────

export interface TextInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string
}

export const TextInput = forwardRef<HTMLInputElement, TextInputProps>(
  function TextInput({ className, error, ...rest }, ref) {
    return (
      <div className="w-full">
        <input
          ref={ref}
          className={cn(BASE_INPUT, error && 'ring-1 ring-[#D88A8A]', className)}
          {...rest}
        />
        {error && (
          <p className="text-xs text-[#D88A8A] mt-1 px-1">{error}</p>
        )}
      </div>
    )
  },
)

// ── DateInput ─────────────────────────────────────────────────────────────────

export const DateInput = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  function DateInput({ className, ...rest }, ref) {
    return (
      <input
        ref={ref}
        type="date"
        className={cn(BASE_INPUT, className)}
        {...rest}
      />
    )
  },
)

// ── TimeInput ─────────────────────────────────────────────────────────────────

export const TimeInput = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  function TimeInput({ className, ...rest }, ref) {
    return (
      <input
        ref={ref}
        type="time"
        className={cn(BASE_INPUT, className)}
        {...rest}
      />
    )
  },
)

// ── CurrencyInput ────────────────────────────────────────────────────────────

export interface CurrencyInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  symbol?: string
  error?: string
}

export const CurrencyInput = forwardRef<HTMLInputElement, CurrencyInputProps>(
  function CurrencyInput({ symbol = '€', className, error, ...rest }, ref) {
    return (
      <div className="w-full">
        <div className={cn(
          'flex items-center gap-2 bg-gray-50 rounded-2xl px-4 py-3',
          error && 'ring-1 ring-[#D88A8A]',
        )}>
          <span className="text-sm font-semibold text-gray-400 shrink-0">{symbol}</span>
          <input
            ref={ref}
            type="number"
            inputMode="decimal"
            className="flex-1 text-sm text-gray-700 placeholder:text-gray-300 outline-none bg-transparent"
            {...rest}
          />
        </div>
        {error && (
          <p className="text-xs text-[#D88A8A] mt-1 px-1">{error}</p>
        )}
      </div>
    )
  },
)

// ── SearchInput ───────────────────────────────────────────────────────────────

export interface SearchInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: LucideIcon
}

export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(
  function SearchInput({ icon: Icon = Search, className, ...rest }, ref) {
    return (
      <div className="relative w-full">
        <Icon
          size={15}
          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none"
          strokeWidth={1.75}
        />
        <input
          ref={ref}
          type="search"
          className={cn(BASE_INPUT, 'pl-9', className)}
          {...rest}
        />
      </div>
    )
  },
)
