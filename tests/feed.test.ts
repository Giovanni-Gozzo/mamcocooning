/**
 * The news feed against a stubbed Neon driver, and its fallback on the photos
 * committed to the repository.
 */
import { beforeEach, describe, expect, test, vi } from 'vitest'

const query = vi.fn()
let isConfigured = true

vi.mock('@/lib/db', () => ({
  getSql: () => (isConfigured ? { query } : null),
  requireSql: () => ({ query }),
}))

const { FEED_PAGE_SIZE, listFeed } = await import('@/lib/feed')
const { LEGACY_PHOTOS } = await import('@/lib/legacy-photos')

const PHOTO = {
  id: 'p1',
  url: 'https://blob.example/p1.webp',
  width: 1600,
  height: 1200,
  alt: 'Des enfants peignent',
  caption: 'Atelier peinture',
  category_slug: 'peinture',
  confidence: 0.9,
  source: 'facebook',
  created_at: '2026-11-12T08:30:00+00:00',
}

const POST_ROW = {
  item_id: 'post-1',
  created_at: '2026-11-12T08:30:00.000Z',
  body: 'Atelier peinture ce matin 🎨',
  has_post: true,
  category_slug: 'peinture',
  photos: [PHOTO],
}

const legacyCategories = new Set(LEGACY_PHOTOS.map((photo) => photo.categorySlug))

beforeEach(() => {
  isConfigured = true
  query.mockReset()
  vi.spyOn(console, 'error').mockImplementation(() => undefined)
})

describe('listFeed with a database', () => {
  test('maps rows into publications with their photos', async () => {
    query.mockResolvedValueOnce([{ total: 3 }]).mockResolvedValueOnce([POST_ROW])

    const page = await listFeed()

    expect(page.hasMore).toBe(false)
    expect(page.items[0]).toEqual({
      id: 'post-1',
      kind: 'post',
      createdAt: '2026-11-12T08:30:00.000Z',
      body: 'Atelier peinture ce matin 🎨',
      categorySlug: 'peinture',
      photos: [
        expect.objectContaining({ id: 'p1', source: 'facebook', categorySlug: 'peinture' }),
      ],
    })
  })

  test('labels single uploads and repository groups by kind', async () => {
    query.mockResolvedValueOnce([{ total: 3 }]).mockResolvedValueOnce([
      { ...POST_ROW, item_id: 'abc', has_post: false, body: null },
      { ...POST_ROW, item_id: 'legacy:peinture', has_post: false, body: null },
    ])

    const page = await listFeed()

    expect(page.items.map((item) => item.kind)).toEqual(['photo', 'memories'])
  })

  test('asks for one extra row to know whether another page exists', async () => {
    const rows = Array.from({ length: 3 }, (_, index) => ({ ...POST_ROW, item_id: `post-${index}` }))
    query.mockResolvedValueOnce([{ total: 9 }]).mockResolvedValueOnce(rows)

    const page = await listFeed({ categorySlug: 'peinture', limit: 2, offset: 4 })

    expect(query.mock.calls[1]?.[1]).toEqual(['peinture', 3, 4])
    expect(page.items).toHaveLength(2)
    expect(page.hasMore).toBe(true)
  })

  test('falls back to the repository photos when the database is still empty', async () => {
    query.mockResolvedValueOnce([{ total: 0 }])

    const page = await listFeed({ limit: 24 })

    expect(page.items.every((item) => item.kind === 'memories')).toBe(true)
    expect(page.items).toHaveLength(Math.min(24, legacyCategories.size))
  })

  test('falls back to the repository photos when the database fails', async () => {
    query.mockRejectedValueOnce(new Error('ECONNREFUSED'))

    const page = await listFeed()

    expect(page.items.length).toBeGreaterThan(0)
    expect(page.items[0]?.kind).toBe('memories')
  })
})

describe('listFeed without a database', () => {
  beforeEach(() => {
    isConfigured = false
  })

  test('gathers the repository photos per activity, every photo kept once', async () => {
    const page = await listFeed({ limit: 24 })

    const photoIds = page.items.flatMap((item) => item.photos.map((photo) => photo.id))
    expect(new Set(photoIds).size).toBe(LEGACY_PHOTOS.length)
    expect(page.items.every((item) => item.id === `legacy:${item.categorySlug}`)).toBe(true)
  })

  test('orders groups newest first and photos oldest first', async () => {
    const { items } = await listFeed({ limit: 24 })

    const dates = items.map((item) => item.createdAt)
    expect(dates).toEqual([...dates].sort().reverse())
    for (const item of items) {
      const photoDates = item.photos.map((photo) => photo.createdAt)
      expect(photoDates).toEqual([...photoDates].sort())
    }
  })

  test('filters by activity and pages through the result', async () => {
    const [slug] = legacyCategories

    const filtered = await listFeed({ categorySlug: slug })
    const firstPage = await listFeed({ limit: 1 })

    expect(filtered.items.map((item) => item.categorySlug)).toEqual([slug])
    expect(firstPage.items).toHaveLength(1)
    expect(firstPage.hasMore).toBe(legacyCategories.size > 1)
  })

  test('uses the default page size for a missing or invalid limit', async () => {
    const page = await listFeed({ limit: Number.NaN })

    expect(page.items.length).toBeLessThanOrEqual(FEED_PAGE_SIZE)
  })
})
