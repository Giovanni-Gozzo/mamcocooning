/**
 * Jungle set, drawn after the MAM's own logo: tropical foliage, hibiscus, and
 * the five animals that appear on it. Decorative only — consumers render these
 * inside an aria-hidden container.
 */
import type { SVGProps } from 'react'

type JungleProps = SVGProps<SVGSVGElement>

export function Monstera(props: JungleProps) {
  return (
    <svg viewBox="0 0 64 72" {...props}>
      <path d="M32 70V40" stroke="currentColor" strokeWidth="3" strokeLinecap="round" fill="none" />
      <path
        d="M32 42C14 42 4 30 4 16 4 8 8 2 14 2c6 0 8 6 12 6s6-6 12-6c8 0 14 7 14 16 0 14-10 24-20 24Z"
        fill="currentColor"
      />
      <path
        d="M32 8v32M32 18l-12-6M32 18l12-6M32 30l-15-4M32 30l15-4"
        stroke="var(--color-cream)"
        strokeWidth="2.4"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  )
}

export function PalmLeaf(props: JungleProps) {
  return (
    <svg viewBox="0 0 64 64" {...props}>
      <path d="M8 60C20 46 34 30 52 10" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" fill="none" />
      <g fill="currentColor">
        <path d="M16 50c-2-12 3-21 13-25-1 13-5 21-13 25Z" />
        <path d="M18 48c11-5 20-3 26 5-11 4-20 2-26-5Z" />
        <path d="M28 36c-1-12 5-20 15-23-2 13-7 20-15 23Z" />
        <path d="M30 34c11-4 19-1 24 7-11 3-19 0-24-7Z" />
        <path d="M40 22c0-10 5-16 13-18-1 10-5 16-13 18Z" />
        <path d="M42 20c9-3 15 0 19 7-9 2-15-1-19-7Z" />
      </g>
    </svg>
  )
}

export function Fern(props: JungleProps) {
  return (
    <svg viewBox="0 0 40 72" {...props}>
      <path d="M20 70C20 46 20 22 20 4" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" fill="none" />
      <g fill="currentColor">
        {[10, 22, 34, 46, 56].map((y, index) => (
          <g key={y}>
            <ellipse cx={20 - (14 - index * 2)} cy={y} rx={12 - index * 2} ry="4" transform={`rotate(-24 ${20 - (14 - index * 2)} ${y})`} />
            <ellipse cx={20 + (14 - index * 2)} cy={y} rx={12 - index * 2} ry="4" transform={`rotate(24 ${20 + (14 - index * 2)} ${y})`} />
          </g>
        ))}
      </g>
    </svg>
  )
}

export function Hibiscus(props: JungleProps) {
  return (
    <svg viewBox="0 0 64 64" {...props}>
      <g fill="currentColor">
        {[0, 72, 144, 216, 288].map((angle) => (
          <ellipse key={angle} cx="32" cy="18" rx="11" ry="14" transform={`rotate(${angle} 32 32)`} />
        ))}
      </g>
      <circle cx="32" cy="32" r="7" fill="var(--color-frangipani)" />
      <path d="M32 32l9 12" stroke="var(--color-frangipani)" strokeWidth="3" strokeLinecap="round" fill="none" />
    </svg>
  )
}

export function Frangipani(props: JungleProps) {
  return (
    <svg viewBox="0 0 64 64" {...props}>
      <g fill="currentColor">
        {[0, 72, 144, 216, 288].map((angle) => (
          <path
            key={angle}
            d="M32 32c0-10 4-18 10-18s8 8 3 15c-4 5-9 7-13 3Z"
            transform={`rotate(${angle} 32 32)`}
          />
        ))}
      </g>
      <circle cx="32" cy="32" r="6" fill="var(--color-honey)" />
    </svg>
  )
}

export function Elephant(props: JungleProps) {
  return (
    <svg viewBox="0 0 64 64" {...props}>
      <ellipse cx="32" cy="30" rx="19" ry="17" fill="currentColor" />
      <ellipse cx="11" cy="28" rx="9" ry="12" fill="currentColor" opacity="0.75" />
      <ellipse cx="53" cy="28" rx="9" ry="12" fill="currentColor" opacity="0.75" />
      <path d="M32 44c0 9 3 14 9 15" stroke="currentColor" strokeWidth="8" strokeLinecap="round" fill="none" />
      <circle cx="25" cy="27" r="2.6" fill="var(--color-cream)" />
      <circle cx="39" cy="27" r="2.6" fill="var(--color-cream)" />
    </svg>
  )
}

export function Monkey(props: JungleProps) {
  return (
    <svg viewBox="0 0 64 64" {...props}>
      <circle cx="12" cy="30" r="9" fill="currentColor" />
      <circle cx="52" cy="30" r="9" fill="currentColor" />
      <circle cx="32" cy="32" r="20" fill="currentColor" />
      <ellipse cx="32" cy="38" rx="13" ry="11" fill="var(--color-frangipani)" />
      <circle cx="26" cy="28" r="2.8" fill="var(--color-cream)" />
      <circle cx="38" cy="28" r="2.8" fill="var(--color-cream)" />
      <circle cx="28" cy="36" r="1.6" fill="currentColor" />
      <circle cx="36" cy="36" r="1.6" fill="currentColor" />
      <path d="M26 42c3 3 9 3 12 0" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" fill="none" />
    </svg>
  )
}

export function Lion(props: JungleProps) {
  return (
    <svg viewBox="0 0 64 64" {...props}>
      <g fill="currentColor">
        {Array.from({ length: 12 }, (_unused, index) => (
          <circle
            key={index}
            cx={32 + 22 * Math.cos((index * Math.PI) / 6)}
            cy={32 + 22 * Math.sin((index * Math.PI) / 6)}
            r="8"
          />
        ))}
      </g>
      <circle cx="32" cy="32" r="16" fill="var(--color-frangipani)" />
      <circle cx="26" cy="29" r="2.4" fill="var(--color-ink)" />
      <circle cx="38" cy="29" r="2.4" fill="var(--color-ink)" />
      <path d="M32 36l-3 2M32 36l3 2" stroke="var(--color-ink)" strokeWidth="2" strokeLinecap="round" fill="none" />
    </svg>
  )
}

export function Giraffe(props: JungleProps) {
  return (
    <svg viewBox="0 0 64 64" {...props}>
      <path d="M22 14V8M42 14V8" stroke="currentColor" strokeWidth="4" strokeLinecap="round" fill="none" />
      <circle cx="22" cy="7" r="4" fill="currentColor" />
      <circle cx="42" cy="7" r="4" fill="currentColor" />
      <ellipse cx="9" cy="24" rx="8" ry="5" fill="currentColor" opacity="0.8" transform="rotate(-24 9 24)" />
      <ellipse cx="55" cy="24" rx="8" ry="5" fill="currentColor" opacity="0.8" transform="rotate(24 55 24)" />
      <path d="M17 22c0-6 7-9 15-9s15 3 15 9c0 7-2 12-5 17-3 4-6 6-10 6s-7-2-10-6c-3-5-5-10-5-17Z" fill="currentColor" />
      <ellipse cx="32" cy="45" rx="10" ry="8" fill="var(--color-frangipani)" />
      <circle cx="24" cy="26" r="2.6" fill="var(--color-cream)" />
      <circle cx="40" cy="26" r="2.6" fill="var(--color-cream)" />
      <circle cx="29" cy="44" r="1.6" fill="currentColor" />
      <circle cx="35" cy="44" r="1.6" fill="currentColor" />
      <g fill="var(--color-frangipani)" opacity="0.55">
        <circle cx="23" cy="34" r="3" />
        <circle cx="41" cy="34" r="3" />
        <circle cx="32" cy="20" r="2.6" />
      </g>
    </svg>
  )
}

export function Zebra(props: JungleProps) {
  return (
    <svg viewBox="0 0 64 64" {...props}>
      <path d="M18 16l-4-10 12 6ZM46 16l4-10-12 6Z" fill="currentColor" />
      <path d="M32 6c2 0 4 3 4 8h-8c0-5 2-8 4-8Z" fill="currentColor" />
      <path d="M17 24c0-7 7-11 15-11s15 4 15 11c0 8-2 13-5 18-3 4-6 6-10 6s-7-2-10-6c-3-5-5-10-5-18Z" fill="currentColor" />
      <ellipse cx="32" cy="46" rx="10" ry="8" fill="var(--color-ink)" opacity="0.75" />
      <circle cx="24" cy="27" r="2.6" fill="var(--color-cream)" />
      <circle cx="40" cy="27" r="2.6" fill="var(--color-cream)" />
      <g stroke="var(--color-cream)" strokeWidth="2.6" strokeLinecap="round" fill="none">
        <path d="M20 21l5 3M44 21l-5 3M19 33h6M45 33h-6M21 39h5M43 39h-5" />
      </g>
    </svg>
  )
}

export const JUNGLE = {
  monstera: Monstera,
  palmLeaf: PalmLeaf,
  fern: Fern,
  hibiscus: Hibiscus,
  frangipani: Frangipani,
  giraffe: Giraffe,
  elephant: Elephant,
  monkey: Monkey,
  lion: Lion,
  zebra: Zebra,
} as const

export type JungleName = keyof typeof JUNGLE
