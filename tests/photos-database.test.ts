/**
 * Exercises the repository against a stubbed Neon driver: row mapping, the
 * "empty database falls back to the committed photos" rule, and the requirement
 * that a broken database degrades to the manifest instead of a blank page.
 */
import { beforeEach, describe, expect, test, vi } from 'vitest'

const query = vi.fn()

vi.mock('@/lib/db', () => ({
  getSql: () => ({ query }),
  requireSql: () => ({ query }),
}))

const {
  listPhotos,
  listCategoriesWithCounts,
  listAllCategories,
  createPhoto,
  findPhotoById,
  movePhotoToCategory,
  removePhoto,
  ensureCategory,
  importLegacyPhotos,
} = await import('@/lib/photos')
const { LEGACY_PHOTOS } = await import('@/lib/legacy-photos')

const PHOTO_ROW = {
  id: 'abc123',
  url: 'https://blob.example/photos/musique/abc123.webp',
  width: '1600',
  height: '1200',
  alt: 'Des enfants découvrent des maracas',
  caption: 'Éveil musical',
  category_slug: 'musique',
  confidence: '0.91',
  source: 'upload',
  created_at: '2026-03-04T10:15:00.000Z',
}

/** First call is always the "is the database empty" count. */
function withCount(total: number, ...results: unknown[][]) {
  query.mockResolvedValueOnce([{ total }])
  for (const result of results) query.mockResolvedValueOnce(result)
}

beforeEach(() => {
  query.mockReset()
})

describe('listPhotos', () => {
  test('maps rows into the domain shape, coercing driver strings to numbers', async () => {
    withCount(1, [PHOTO_ROW])

    const [photo] = await listPhotos()

    expect(photo).toEqual({
      id: 'abc123',
      url: 'https://blob.example/photos/musique/abc123.webp',
      width: 1600,
      height: 1200,
      alt: 'Des enfants découvrent des maracas',
      caption: 'Éveil musical',
      categorySlug: 'musique',
      confidence: 0.91,
      source: 'upload',
      createdAt: '2026-03-04T10:15:00.000Z',
    })
  })

  test('serves the committed photos while the database is still empty', async () => {
    withCount(0)

    const photos = await listPhotos()

    expect(photos.length).toBeGreaterThan(0)
    expect(photos[0]?.source).toBe('legacy')
  })

  test('passes the category, limit and offset to the query', async () => {
    withCount(1, [PHOTO_ROW])

    await listPhotos({ categorySlug: 'musique', limit: 12, offset: 24 })

    expect(query.mock.calls[1]?.[1]).toEqual(['musique', 12, 24])
  })

  test('sends null for the category when none is requested', async () => {
    withCount(1, [PHOTO_ROW])

    await listPhotos()

    expect(query.mock.calls[1]?.[1]?.[0]).toBeNull()
  })

  test('clamps the limit so a caller cannot ask for the whole table', async () => {
    withCount(1, [PHOTO_ROW])

    await listPhotos({ limit: 10_000 })

    expect(query.mock.calls[1]?.[1]?.[1]).toBe(500)
  })

  test('falls back to the manifest when the database errors', async () => {
    query.mockRejectedValue(new Error('connection terminated'))

    const photos = await listPhotos()

    expect(photos.length).toBeGreaterThan(0)
    expect(photos[0]?.source).toBe('legacy')
  })
})

describe('listCategoriesWithCounts', () => {
  test('maps aggregate rows, including the cover image', async () => {
    withCount(1, [
      {
        slug: 'musique',
        label: 'Musique',
        emoji: '🎵',
        description: 'Éveil musical.',
        sort_order: '20',
        photo_count: '6',
        cover_url: 'https://blob.example/a.webp',
      },
    ])

    const [category] = await listCategoriesWithCounts()

    expect(category).toEqual({
      slug: 'musique',
      label: 'Musique',
      emoji: '🎵',
      description: 'Éveil musical.',
      sortOrder: 20,
      photoCount: 6,
      coverUrl: 'https://blob.example/a.webp',
    })
  })

  test('falls back to the manifest when the database errors', async () => {
    query.mockRejectedValue(new Error('timeout'))

    await expect(listCategoriesWithCounts()).resolves.not.toHaveLength(0)
  })
})

describe('listAllCategories', () => {
  test('returns the stored categories, Gemini-created ones included', async () => {
    query.mockResolvedValueOnce([
      {
        slug: 'decouverte-nature',
        label: 'Découverte nature',
        emoji: '🐌',
        description: 'Observation du vivant.',
        sort_order: '500',
      },
    ])

    await expect(listAllCategories()).resolves.toEqual([
      {
        slug: 'decouverte-nature',
        label: 'Découverte nature',
        emoji: '🐌',
        description: 'Observation du vivant.',
        sortOrder: 500,
      },
    ])
  })

  test('falls back to the seed taxonomy when the table is empty', async () => {
    query.mockResolvedValueOnce([])

    await expect(listAllCategories()).resolves.not.toHaveLength(0)
  })

  test('falls back to the seed taxonomy when the query fails', async () => {
    query.mockRejectedValueOnce(new Error('relation does not exist'))

    await expect(listAllCategories()).resolves.not.toHaveLength(0)
  })
})

describe('single-photo operations', () => {
  test('createPhoto stores the photo and returns the mapped row', async () => {
    query.mockResolvedValueOnce([PHOTO_ROW])

    const photo = await createPhoto({
      id: 'abc123',
      url: PHOTO_ROW.url,
      width: 1600,
      height: 1200,
      alt: PHOTO_ROW.alt,
      caption: 'Éveil musical',
      categorySlug: 'musique',
      confidence: 0.91,
    })

    expect(photo.id).toBe('abc123')
    expect(query.mock.calls[0]?.[1]).toContain('upload')
  })

  test('createPhoto raises when the insert returns nothing', async () => {
    query.mockResolvedValueOnce([])

    await expect(
      createPhoto({
        id: 'x',
        url: 'https://blob.example/x.webp',
        width: 1,
        height: 1,
        alt: '',
        caption: null,
        categorySlug: 'musique',
        confidence: null,
      }),
    ).rejects.toThrow(/échouée/)
  })

  test('findPhotoById returns null when there is no such photo', async () => {
    query.mockResolvedValueOnce([])

    await expect(findPhotoById('inconnu')).resolves.toBeNull()
  })

  test('movePhotoToCategory returns the updated photo', async () => {
    query.mockResolvedValueOnce([{ ...PHOTO_ROW, category_slug: 'lecture' }])

    await expect(movePhotoToCategory('abc123', 'lecture')).resolves.toMatchObject({
      categorySlug: 'lecture',
    })
  })

  test('movePhotoToCategory returns null for an unknown photo', async () => {
    query.mockResolvedValueOnce([])

    await expect(movePhotoToCategory('inconnu', 'lecture')).resolves.toBeNull()
  })

  test('removePhoto reports whether a row was actually removed', async () => {
    query.mockResolvedValueOnce([{ id: 'abc123' }])
    await expect(removePhoto('abc123')).resolves.toBe(true)

    query.mockResolvedValueOnce([])
    await expect(removePhoto('inconnu')).resolves.toBe(false)
  })
})

describe('ensureCategory', () => {
  test('inserts the proposed category and returns its slug', async () => {
    query.mockResolvedValueOnce([])

    const slug = await ensureCategory({
      slug: 'decouverte-nature',
      label: 'Découverte nature',
      emoji: '🐌',
      description: 'Observation du vivant.',
    })

    expect(slug).toBe('decouverte-nature')
    expect(query.mock.calls[0]?.[0]).toContain('on conflict (slug) do nothing')
  })
})

describe('importLegacyPhotos', () => {
  test('counts only the rows that were actually inserted', async () => {
    query.mockResolvedValue([])
    query.mockResolvedValueOnce([{ id: 'legacy-001' }])
    query.mockResolvedValueOnce([{ id: 'legacy-002' }])

    await expect(importLegacyPhotos()).resolves.toBe(2)
    expect(query).toHaveBeenCalledTimes(LEGACY_PHOTOS.length)
  })
})
