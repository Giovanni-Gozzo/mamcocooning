/**
 * Display helpers shared by the feed on the server and in the browser. The
 * time zone is fixed so both render the same date and hydration never differs.
 */
import type { FeedItem } from './types'

/** Publications per page. Lives here so browser code can import it without the database layer. */
export const FEED_PAGE_SIZE = 8

const DATE_FORMAT = new Intl.DateTimeFormat('fr-FR', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'Europe/Paris',
})

/** "mardi 12 novembre 2026" → "Mardi 12 novembre 2026". */
export function formatFeedDate(iso: string): string {
  const formatted = DATE_FORMAT.format(new Date(iso))
  return formatted.charAt(0).toUpperCase() + formatted.slice(1)
}

/** Text shown on a publication: its own words, or a short line for the others. */
export function feedText(item: FeedItem): string | null {
  if (item.kind === 'memories') return 'Quelques souvenirs de la MAM.'
  if (item.body !== null) return item.body
  return item.photos[0]?.caption ?? null
}
