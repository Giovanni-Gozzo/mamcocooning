/**
 * Seed taxonomy. Gemini sorts every upload into one of these, or proposes a new
 * category when nothing fits. Categories only become visible once they hold at
 * least one published photo, so the site's navigation stays dynamic.
 *
 * The list itself lives in `data/categories.json` so that the app and the
 * maintenance scripts read exactly the same source.
 */
import seed from '@/data/categories.json'
import type { Category } from './types'

export const DEFAULT_CATEGORIES: readonly Category[] = seed as readonly Category[]

export const FALLBACK_CATEGORY_SLUG = 'le-quotidien'

/** Turns any free text into a safe URL slug (used for Gemini-proposed categories). */
export function toSlug(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)
}
