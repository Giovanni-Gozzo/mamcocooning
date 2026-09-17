'use client'

import { motion } from 'motion/react'
import type { CategoryWithCount } from '@/lib/types'

interface CategoryFilterProps {
  readonly categories: readonly CategoryWithCount[]
  readonly activeSlug: string | null
  readonly onChange: (slug: string | null) => void
  readonly totalCount: number
}

/**
 * Category pills. The list is built from the photos themselves, so a category
 * shows up here the moment its first photo is published.
 */
export function CategoryFilter({
  categories,
  activeSlug,
  onChange,
  totalCount,
}: CategoryFilterProps) {
  return (
    <div
      role="group"
      aria-label="Filtrer les photos par activité"
      className="no-scrollbar -mx-6 flex gap-2 overflow-x-auto px-6 pb-2 sm:mx-0 sm:flex-wrap sm:justify-center sm:overflow-visible sm:px-0"
    >
      <Pill
        isActive={activeSlug === null}
        onClick={() => onChange(null)}
        emoji="🌿"
        label="Tout voir"
        count={totalCount}
      />

      {categories.map((category) => (
        <Pill
          key={category.slug}
          isActive={activeSlug === category.slug}
          onClick={() => onChange(category.slug)}
          emoji={category.emoji}
          label={category.label}
          count={category.photoCount}
        />
      ))}
    </div>
  )
}

interface PillProps {
  readonly isActive: boolean
  readonly onClick: () => void
  readonly emoji: string
  readonly label: string
  readonly count: number
}

function Pill({ isActive, onClick, emoji, label, count }: PillProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={isActive}
      className={`relative shrink-0 rounded-full px-4 py-2.5 text-sm font-semibold whitespace-nowrap transition-colors duration-300 ${
        isActive ? 'text-cream' : 'text-ink-soft hover:text-ink'
      }`}
    >
      {isActive && (
        <motion.span
          layoutId="category-pill"
          className="absolute inset-0 -z-10 rounded-full bg-terracotta"
          transition={{ type: 'spring', stiffness: 360, damping: 30 }}
        />
      )}
      {!isActive && (
        <span className="absolute inset-0 -z-10 rounded-full bg-sand ring-1 ring-clay/50" />
      )}
      <span aria-hidden className="mr-1.5">
        {emoji}
      </span>
      {label}
      <span className={`ml-1.5 text-xs ${isActive ? 'text-cream/70' : 'text-ink-faint'}`}>
        {count}
      </span>
    </button>
  )
}
