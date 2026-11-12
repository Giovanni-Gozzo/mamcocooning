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
  createPhoto,
  findPhotoById,
  removePhoto,
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
      mediaType: 'image',
      posterUrl: null,
    })
  })

  test('maps a video with its poster frame', async () => {
    withCount(1, [{ ...PHOTO_ROW, media_type: 'video', poster_url: 'https://blob.example/p.webp' }])

    const [video] = await listPhotos()

    expect(video).toMatchObject({ mediaType: 'video', posterUrl: 'https://blob.example/p.webp' })
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



  test('removePhoto reports whether a row was actually removed', async () => {
    query.mockResolvedValueOnce([{ id: 'abc123' }])
    await expect(removePhoto('abc123')).resolves.toBe(true)

    query.mockResolvedValueOnce([])
    await expect(removePhoto('inconnu')).resolves.toBe(false)
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
