/**
 * The repository must keep serving the photos committed to the repository when
 * no database is configured — that is what keeps the public site alive between
 * the first deploy and the Vercel storage setup.
 */
import { beforeEach, describe, expect, test, vi } from 'vitest'

vi.mock('@/lib/db', () => ({
  getSql: () => null,
  requireSql: () => {
    throw new Error('Base de données non configurée.')
  },
}))

const { listPhotos, createPhoto, removePhoto } = await import('@/lib/photos')
const { LEGACY_PHOTOS } = await import('@/lib/legacy-photos')

describe('listPhotos without a database', () => {
  test('returns the committed photos', async () => {
    const photos = await listPhotos()

    expect(photos.length).toBeGreaterThan(0)
    expect(photos.length).toBeLessThanOrEqual(LEGACY_PHOTOS.length)
  })

  test('scopes the result to one category', async () => {
    const [sample] = LEGACY_PHOTOS
    expect(sample).toBeDefined()

    const photos = await listPhotos({ categorySlug: sample!.categorySlug })

    expect(photos.length).toBeGreaterThan(0)
    for (const photo of photos) expect(photo.categorySlug).toBe(sample!.categorySlug)
  })

  test('returns nothing for a category that holds no photo', async () => {
    await expect(listPhotos({ categorySlug: 'categorie-inexistante' })).resolves.toEqual([])
  })

  test('honours limit and offset', async () => {
    const firstTwo = await listPhotos({ limit: 2 })
    const second = await listPhotos({ limit: 1, offset: 1 })

    expect(firstTwo).toHaveLength(2)
    expect(second[0]?.id).toBe(firstTwo[1]?.id)
  })

  test('clamps an absurd limit rather than trusting the caller', async () => {
    const photos = await listPhotos({ limit: 99_999 })

    expect(photos.length).toBeLessThanOrEqual(LEGACY_PHOTOS.length)
  })

  // A client-component export read from a Server Component arrives as a proxy,
  // and Math.trunc(proxy) is NaN — which used to empty the whole gallery.
  test('falls back to the default limit when the limit is not a finite number', async () => {
    const nonFinite = [Number.NaN, Number.POSITIVE_INFINITY, undefined] as const

    for (const limit of nonFinite) {
      const photos = await listPhotos({ limit: limit as number | undefined })
      expect(photos.length).toBeGreaterThan(0)
    }
  })
})

describe('write operations without a database', () => {

  test('createPhoto fails loudly instead of silently dropping the upload', async () => {
    await expect(
      createPhoto({
        id: 'x',
        url: 'https://example.test/x.webp',
        width: 10,
        height: 10,
        alt: '',
        caption: null,
        categorySlug: 'musique',
        confidence: null,
      }),
    ).rejects.toThrow(/Base de données/)
  })

  test('removePhoto fails loudly too', async () => {
    await expect(removePhoto('x')).rejects.toThrow(/Base de données/)
  })
})
