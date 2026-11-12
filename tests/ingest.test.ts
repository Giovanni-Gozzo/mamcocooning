/** The shared photo pipeline, with storage and database stubbed out. */
import { beforeEach, describe, expect, test, vi } from 'vitest'
import sharp from 'sharp'

const put = vi.fn()
const createPhoto = vi.fn()

vi.mock('@vercel/blob', () => ({ put }))
vi.mock('@/lib/photos', () => ({ createPhoto }))

const { DEFAULT_ALT, altFromText, ingestImage } = await import('@/lib/ingest')

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
  createPhoto.mockReset().mockImplementation(async (photo) => photo)
})

describe('ingestImage', () => {
  test('stores a WebP and records the photo in its publication, hidden if asked', async () => {
    const photo = await ingestImage(await makePng(), {
      alt: 'Atelier peinture',
      createdAt: '2026-11-12T08:00:00.000Z',
      postId: 'post-1',
      isPublished: false,
    })

    const [path, , options] = put.mock.calls[0] as [string, Buffer, { contentType: string }]
    expect(path).toMatch(/^photos\/[\w-]{12}\.webp$/)
    expect(options.contentType).toBe('image/webp')
    expect(photo).toMatchObject({
      alt: 'Atelier peinture',
      width: 40,
      height: 30,
      source: 'upload',
      createdAt: '2026-11-12T08:00:00.000Z',
      postId: 'post-1',
      isPublished: false,
      caption: null,
      confidence: null,
    })
  })

  test('uses a generic description when none is given', async () => {
    const photo = await ingestImage(await makePng())

    expect(photo).toMatchObject({ alt: DEFAULT_ALT })
  })

  test('rejects data that is not an image before storing anything', async () => {
    await expect(
      ingestImage(new TextEncoder().encode('pas une image').buffer as ArrayBuffer),
    ).rejects.toThrow()
    expect(put).not.toHaveBeenCalled()
  })
})

describe('altFromText', () => {
  test('keeps the first sentence of the publication text', () => {
    expect(altFromText('Atelier peinture ce matin ! Les petits ont adoré.')).toBe('Atelier peinture ce matin !')
    expect(altFromText('Pâte à sel\nEt goûter')).toBe('Pâte à sel')
  })

  test('falls back to a generic description without text', () => {
    expect(altFromText(null)).toBe(DEFAULT_ALT)
    expect(altFromText('   ')).toBe(DEFAULT_ALT)
  })

  test('shortens a very long sentence', () => {
    const alt = altFromText('a'.repeat(400))

    expect(alt.length).toBeLessThanOrEqual(160)
    expect(alt.endsWith('…')).toBe(true)
  })
})
