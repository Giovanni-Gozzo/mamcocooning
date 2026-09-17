import Link from 'next/link'
import type { ComponentProps, ReactNode } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost'

const BASE =
  'inline-flex items-center justify-center gap-2 rounded-full px-7 py-3.5 text-[0.95rem] font-semibold transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] active:scale-[0.97]'

const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-terracotta text-cream shadow-[0_10px_30px_-12px_rgba(156,86,56,0.8)] hover:bg-terracotta-deep hover:shadow-[0_18px_40px_-14px_rgba(156,86,56,0.9)] hover:-translate-y-0.5',
  secondary:
    'bg-sand text-ink ring-1 ring-clay/70 hover:bg-shell hover:ring-terracotta/40 hover:-translate-y-0.5',
  ghost: 'text-ink-soft hover:text-terracotta-deep hover:bg-sand/70',
}

interface ButtonLinkProps extends Omit<ComponentProps<typeof Link>, 'className'> {
  readonly variant?: Variant
  readonly className?: string
  readonly children: ReactNode
}

export function ButtonLink({
  variant = 'primary',
  className = '',
  children,
  ...props
}: ButtonLinkProps) {
  return (
    <Link className={`${BASE} ${VARIANTS[variant]} ${className}`} {...props}>
      {children}
    </Link>
  )
}

interface ButtonProps extends Omit<ComponentProps<'button'>, 'className'> {
  readonly variant?: Variant
  readonly className?: string
}

export function Button({ variant = 'primary', className = '', ...props }: ButtonProps) {
  return (
    <button
      className={`${BASE} ${VARIANTS[variant]} disabled:pointer-events-none disabled:opacity-50 ${className}`}
      {...props}
    />
  )
}
