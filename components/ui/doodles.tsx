/**
 * Hand-drawn childhood doodles, drawn in the site palette so they sit next to
 * the photographs without shouting. Purely decorative: every consumer renders
 * them inside an aria-hidden container.
 */
import type { SVGProps } from 'react'

type DoodleProps = SVGProps<SVGSVGElement>

const STROKE = {
  fill: 'none',
  strokeWidth: 2.2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const

export function Cloud(props: DoodleProps) {
  return (
    <svg viewBox="0 0 120 70" {...props}>
      <path
        d="M28 58c-11 0-19-7-19-16 0-8 6-14 14-15 2-12 12-21 25-21 12 0 22 8 25 19 2-1 4-1 6-1 9 0 17 7 17 17s-8 17-18 17H28Z"
        fill="currentColor"
      />
    </svg>
  )
}

export function Star(props: DoodleProps) {
  return (
    <svg viewBox="0 0 48 48" {...props}>
      <path
        d="M24 5l5.6 12.2L43 19l-9.6 9.3L35.8 42 24 35.4 12.2 42l2.4-13.7L5 19l13.4-1.8L24 5Z"
        fill="currentColor"
      />
    </svg>
  )
}

export function Moon(props: DoodleProps) {
  return (
    <svg viewBox="0 0 48 48" {...props}>
      <path
        d="M38 30A17 17 0 0 1 18 10a17 17 0 1 0 20 20Z"
        fill="currentColor"
      />
    </svg>
  )
}

export function Teddy(props: DoodleProps) {
  return (
    <svg viewBox="0 0 64 64" {...props}>
      <circle cx="17" cy="17" r="9" fill="currentColor" opacity="0.85" />
      <circle cx="47" cy="17" r="9" fill="currentColor" opacity="0.85" />
      <circle cx="32" cy="36" r="20" fill="currentColor" />
      <circle cx="25" cy="32" r="2.6" fill="var(--color-cream)" />
      <circle cx="39" cy="32" r="2.6" fill="var(--color-cream)" />
      <ellipse cx="32" cy="41" rx="7" ry="5.5" fill="var(--color-cream)" opacity="0.65" />
      <circle cx="32" cy="39" r="2.4" fill="currentColor" />
    </svg>
  )
}

export function Blocks(props: DoodleProps) {
  return (
    <svg viewBox="0 0 64 64" {...props}>
      <rect x="8" y="38" width="20" height="20" rx="4" fill="currentColor" />
      <rect x="32" y="38" width="20" height="20" rx="4" fill="currentColor" opacity="0.6" />
      <rect x="20" y="16" width="20" height="20" rx="4" fill="currentColor" opacity="0.8" />
      <circle cx="30" cy="26" r="3.4" fill="var(--color-cream)" />
    </svg>
  )
}

export function Ball(props: DoodleProps) {
  return (
    <svg viewBox="0 0 64 64" {...props}>
      <circle cx="32" cy="32" r="24" fill="currentColor" />
      <path
        d="M8 32h48M32 8c8 7 8 41 0 48M32 8c-8 7-8 41 0 48"
        stroke="var(--color-cream)"
        {...STROKE}
      />
    </svg>
  )
}

export function Balloon(props: DoodleProps) {
  return (
    <svg viewBox="0 0 48 72" {...props}>
      <ellipse cx="24" cy="24" rx="17" ry="21" fill="currentColor" />
      <path d="M24 45l-3 5h6l-3-5Z" fill="currentColor" />
      <path d="M24 50c4 6-4 10 0 18" stroke="currentColor" {...STROKE} />
    </svg>
  )
}

export function Rattle(props: DoodleProps) {
  return (
    <svg viewBox="0 0 64 64" {...props}>
      <circle cx="24" cy="24" r="15" fill="currentColor" />
      <circle cx="19" cy="20" r="3" fill="var(--color-cream)" />
      <circle cx="29" cy="27" r="3" fill="var(--color-cream)" />
      <rect
        x="33"
        y="34"
        width="9"
        height="24"
        rx="4.5"
        fill="currentColor"
        opacity="0.7"
        transform="rotate(-38 37 46)"
      />
    </svg>
  )
}

export function Rainbow(props: DoodleProps) {
  return (
    <svg viewBox="0 0 80 46" {...props}>
      <path d="M8 42a32 32 0 0 1 64 0" stroke="currentColor" {...STROKE} strokeWidth={6} />
      <path d="M19 42a21 21 0 0 1 42 0" stroke="currentColor" {...STROKE} strokeWidth={6} opacity="0.6" />
      <path d="M30 42a10 10 0 0 1 20 0" stroke="currentColor" {...STROKE} strokeWidth={6} opacity="0.35" />
    </svg>
  )
}

export function Kite(props: DoodleProps) {
  return (
    <svg viewBox="0 0 56 76" {...props}>
      <path d="M28 4l20 22-20 22L8 26 28 4Z" fill="currentColor" />
      <path d="M28 4v44M8 26h40" stroke="var(--color-cream)" {...STROKE} />
      <path d="M28 48c6 6-6 10 0 16s-6 8 0 12" stroke="currentColor" {...STROKE} />
    </svg>
  )
}

export function Sprout(props: DoodleProps) {
  return (
    <svg viewBox="0 0 64 64" {...props}>
      <path d="M32 58V28" stroke="currentColor" {...STROKE} strokeWidth={4} />
      <path d="M32 32c0-12 8-21 20-22 1 13-7 22-20 22Z" fill="currentColor" />
      <path d="M32 42c0-9-7-16-16-17-1 11 5 17 16 17Z" fill="currentColor" opacity="0.65" />
    </svg>
  )
}

export function Heart(props: DoodleProps) {
  return (
    <svg viewBox="0 0 48 44" {...props}>
      <path
        d="M24 41S4 29 4 16C4 9 9 4 16 4c4 0 7 2 8 5 1-3 4-5 8-5 7 0 12 5 12 12 0 13-20 25-20 25Z"
        fill="currentColor"
      />
    </svg>
  )
}

export function Duck(props: DoodleProps) {
  return (
    <svg viewBox="0 0 64 56" {...props}>
      <path d="M12 44c0-12 9-20 21-20 10 0 19 6 21 16 1 5-3 8-8 8H20c-5 0-8-2-8-4Z" fill="currentColor" />
      <circle cx="41" cy="18" r="11" fill="currentColor" />
      <circle cx="44" cy="15" r="2.4" fill="var(--color-cream)" />
      <path d="M52 19h9l-9 6v-6Z" fill="var(--color-honey)" />
    </svg>
  )
}

export const DOODLES = {
  cloud: Cloud,
  star: Star,
  moon: Moon,
  teddy: Teddy,
  blocks: Blocks,
  ball: Ball,
  balloon: Balloon,
  rattle: Rattle,
  rainbow: Rainbow,
  kite: Kite,
  sprout: Sprout,
  heart: Heart,
  duck: Duck,
} as const

export type DoodleName = keyof typeof DOODLES
