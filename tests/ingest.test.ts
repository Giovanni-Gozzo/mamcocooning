/** The shared photo pipeline, with storage, database and Gemini stubbed out. */
import { beforeEach, describe, expect, test, vi } from 'vitest'
import sharp from 'sharp'
import type { Classification } from '@/lib/types'

const put = vi.fn()
const classifyPhoto = vi.fn()
const createPhoto = vi.fn()
const ensureCategory = vi.fn()

vi.mock('@vercel/blob', () => ({ put }))
vi.mock('@/lib/gemini', () => ({ classifyPhoto }))
vi.mock('@/lib/photos', () => ({
  createPhoto,
  ensureCategory,
  listAllCategories: async () => [],
}))

const { ingestImage } = await import('@/lib/ingest')

const KNOWN: Classification = {
  categorySlug: 'peinture',
  confidence: 0.9,
  alt: 'Des petites mains couvertes de peinture',
  caption: 'Atelier peinture',
  isNewCategory: false,
  newCategory: null,
}

async function makePng(): Promise<ArrayBuffer> {
  const buffer = await sharp({
    create: { width: 40, height: 30, channels: 3, background: '#e07a5f' },
  })
    .png()
    .toBuffer()
  return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer
}

beforeEach(() => {
  put.mockReset().mockImplementation(async (path: string) => ({ url: `https://blob.test/${path}` }))
  classifyPhoto.mockReset().mockResolvedValue(KNOWN)
  createPhoto.mockReset().mockImplementation(async (photo) => photo)
  ensureCategory.mockReset().mockImplementation(async (category) => category.slug)
})

describe('ingestImage', () => {
  test('stores a WebP under its category and records the photo with its source and date', async () => {
    const result = await ingestImage(await makePng(), {
      source: 'facebook',
      createdAt: '2026-11-12T08:00:00.000Z',
    })

    const [path, , options] = put.mock.calls[0] as [string, Buffer, { contentType: string }]
    expect(path).toMatch(/^photos\/peinture\/[\w-]{12}\.webp$/)
    expect(options.contentType).toBe('image/webp')
    expect(createPhoto).toHaveBeenCalledWith(
      expect.objectContaining({
        categorySlug: 'peinture',
        alt: KNOWN.alt,
        width: 40,
        height: 30,
        source: 'facebook',
        createdAt: '2026-11-12T08:00:00.000Z',
      }),
    )
    expect(result.createdCategory).toBe(false)
  })

  test('creates the category Gemini proposes when nothing fits', async () => {
    classifyPhoto.mockResolvedValue({
      ...KNOWN,
      categorySlug: 'jardinage',
      isNewCategory: true,
      newCategory: { slug: 'jardinage', label: 'Jardinage', emoji: '🌱', description: 'Au jardin.' },
    })

    const result = await ingestImage(await makePng(), { source: 'upload' })

    expect(ensureCategory).toHaveBeenCalledWith(expect.objectContaining({ slug: 'jardinage' }))
    expect(result.createdCategory).toBe(true)
  })

  test('rejects data that is not an image before storing anything', async () => {
    await expect(
      ingestImage(new TextEncoder().encode('pas une image').buffer as ArrayBuffer, {
        source: 'upload',
      }),
    ).rejects.toThrow()
    expect(put).not.toHaveBeenCalled()
  })
})
