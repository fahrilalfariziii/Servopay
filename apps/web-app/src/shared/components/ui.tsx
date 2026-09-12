import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from 'react'

export function Button({
  children,
  variant = 'primary',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'ghost' | 'outline' | 'cream'
}) {
  const styles = {
    primary: 'bg-ink text-white shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1)]',
    ghost: 'bg-transparent text-ink',
    outline: 'border border-ink text-ink bg-transparent',
    cream: 'bg-sand text-stone',
  }[variant]
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-[12px] px-5 py-3 text-sm font-semibold tracking-[0.14px] disabled:opacity-40 ${styles} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}

export function Field({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[12px] font-medium tracking-[0.14px] text-soil">{label}</span>
      {children}
    </label>
  )
}

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className="h-12 w-full rounded-[8px] border border-clay bg-white px-4 text-base text-ink outline-none transition-colors focus:border-sage"
      {...props}
    />
  )
}

export function Badge({
  children,
  tone = 'sage',
}: {
  children: ReactNode
  tone?: 'sage' | 'warn' | 'muted' | 'dark'
}) {
  const cls = {
    sage: 'bg-mint text-sage',
    warn: 'bg-[#ba1a1a] text-white',
    muted: 'bg-sand text-stone',
    dark: 'bg-ink text-leaf',
  }[tone]
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-[0.4px] uppercase ${cls}`}>
      {children}
    </span>
  )
}

export function Sheet({
  open,
  onClose,
  children,
}: {
  open: boolean
  onClose: () => void
  children: ReactNode
}) {
  if (!open) return null
  return (
    <div className="absolute inset-0 z-50 flex items-end bg-black/70" onClick={onClose}>
      <div
        className="max-h-[92%] w-full overflow-hidden rounded-t-[12px] bg-paper shadow-[0_10px_15px_-3px_rgba(0,0,0,0.1)]"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  )
}
