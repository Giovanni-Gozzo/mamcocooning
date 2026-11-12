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

const { FEED_PAGE_SIZE, MEMORIES_ID, listFeed } = await import('@/lib/feed')
const { LEGACY_PHOTOS } = await import('@/lib/legacy-photos')

const PHOTO = {
  id: 'p1',
  url: 'https://blob.example/p1.webp',
  width: 1600,
  height: 1200,
  alt: 'Atelier peinture',
  caption: null,
  category_slug: 'le-quotidien',
  confidence: null,
  source: 'upload',
  created_at: '2026-11-12T08:30:00+00:00',
  media_type: 'image',
  poster_url: null,
}

const POST_ROW = {
  item_id: 'post-1',
  created_at: '2026-11-12T08:30:00.000Z',
  body: 'Atelier peinture ce matin 🎨',
  has_post: true,
  photos: [PHOTO],
}

beforeEach(() => {
  isConfigured = true
  query.mockReset()
  vi.spyOn(console, 'error').mockImplementation(() => undefined)
})

describe('listFeed with a database', () => {
  test('maps rows into dated publications with their photos', async () => {
    query.mockResolvedValueOnce([{ total: 3 }]).mockResolvedValueOnce([POST_ROW])

    const page = await listFeed()

    expect(page.hasMore).toBe(false)
    expect(page.items[0]).toEqual({
      id: 'post-1',
      kind: 'post',
      createdAt: '2026-11-12T08:30:00.000Z',
      body: 'Atelier peinture ce matin 🎨',
      photos: [expect.objectContaining({ id: 'p1', mediaType: 'image' })],
    })
  })

  test('labels single photos and the old-site photos by kind', async () => {
    query.mockResolvedValueOnce([{ total: 3 }]).mockResolvedValueOnce([
      { ...POST_ROW, item_id: 'abc', has_post: false, body: null },
      { ...POST_ROW, item_id: MEMORIES_ID, has_post: false, body: null },
    ])

    const page = await listFeed()

    expect(page.items.map((item) => item.kind)).toEqual(['photo', 'memories'])
  })

  test('asks for one extra row to know whether another page exists', async () => {
    const rows = Array.from({ length: 3 }, (_, index) => ({ ...POST_ROW, item_id: `post-${index}` }))
    query.mockResolvedValueOnce([{ total: 9 }]).mockResolvedValueOnce(rows)

    const page = await listFeed({ limit: 2, offset: 4 })

    expect(query.mock.calls[1]?.[1]).toEqual([3, 4])
    expect(page.items).toHaveLength(2)
    expect(page.hasMore).toBe(true)
  })

  test('shows the repository photos while the database is still empty', async () => {
    query.mockResolvedValueOnce([{ total: 0 }])

    const page = await listFeed()

    expect(page.items).toHaveLength(1)
    expect(page.items[0]?.kind).toBe('memories')
  })

  test('rebuilds the feed from stored photos when the feed query fails, so deleted photos stay gone', async () => {
    const legacyKept = { ...PHOTO, id: 'kept', source: 'legacy' }
    const upload = { ...PHOTO, id: 'up', created_at: '2026-11-13T09:00:00+00:00' }
    query
      .mockResolvedValueOnce([{ total: 2 }]) // feed: is the database empty?
      .mockRejectedValueOnce(new Error('relation "posts" does not exist'))
      .mockResolvedValueOnce([{ total: 2 }]) // listPhotos: is the database empty?
      .mockResolvedValueOnce([upload, legacyKept])

    const page = await listFeed()

    expect(page.items.map((item) => item.kind)).toEqual(['photo', 'memories'])
    expect(page.items.flatMap((item) => item.photos.map((photo) => photo.id))).toEqual(['up', 'kept'])
  })
})

describe('listFeed without a database', () => {
  beforeEach(() => {
    isConfigured = false
  })

  test('gathers every repository photo into one memories publication, oldest first', async () => {
    const page = await listFeed()

    expect(page.items).toHaveLength(1)
    const [memories] = page.items
    expect(memories?.id).toBe(MEMORIES_ID)
    expect(memories?.photos).toHaveLength(LEGACY_PHOTOS.length)
    const dates = memories?.photos.map((photo) => photo.createdAt) ?? []
    expect(dates).toEqual([...dates].sort())
  })

  test('pages past the end without inventing items', async () => {
    const page = await listFeed({ offset: 5 })

    expect(page).toEqual({ items: [], hasMore: false })
  })

  test('uses the default page size for an invalid limit', async () => {
    const page = await listFeed({ limit: Number.NaN })

    expect(page.items.length).toBeLessThanOrEqual(FEED_PAGE_SIZE)
  })
})
