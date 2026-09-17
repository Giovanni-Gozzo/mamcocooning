import { describe, expect, test } from 'vitest'
import { DEFAULT_CATEGORIES, FALLBACK_CATEGORY_SLUG, toSlug } from '@/lib/taxonomy'

describe('toSlug', () => {
  test('strips accents and lowercases', () => {
    expect(toSlug('Pâtisserie')).toBe('patisserie')
  })

  test('replaces runs of punctuation and spaces with a single dash', () => {
    expect(toSlug("Notions d'anglais !")).toBe('notions-d-anglais')
  })

  test('trims leading and trailing dashes', () => {
    expect(toSlug('  --Jardinage--  ')).toBe('jardinage')
  })

  test('returns an empty string for input with no alphanumerics', () => {
    expect(toSlug('🎨🎵')).toBe('')
  })

  test('caps the length so a slug can never overflow the database column', () => {
    expect(toSlug('a'.repeat(200))).toHaveLength(48)
  })
})

describe('DEFAULT_CATEGORIES', () => {
  test('every seed category has a slug matching its own slugified form', () => {
    for (const category of DEFAULT_CATEGORIES) {
      expect(toSlug(category.slug)).toBe(category.slug)
    }
  })

  test('slugs are unique', () => {
    const slugs = DEFAULT_CATEGORIES.map((category) => category.slug)
    expect(new Set(slugs).size).toBe(slugs.length)
  })

  test('the fallback category exists in the seed list', () => {
    const slugs = DEFAULT_CATEGORIES.map((category) => category.slug)
    expect(slugs).toContain(FALLBACK_CATEGORY_SLUG)
  })
})
