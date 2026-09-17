/**
 * Phone photos carry EXIF that often includes GPS coordinates. For a childcare
 * service that is the address of the house, so stripping it is a guarantee the
 * upload pipeline owes and must keep.
 */
import { describe, expect, test } from 'vitest'
import sharp from 'sharp'
import {
  ACCEPTED_MIME_TYPES,
  MAX_UPLOAD_BYTES,
  isAcceptedMimeType,
  prepareForAnalysis,
  prepareForStorage,
} from '@/lib/image'

async function makeJpeg(width: number, height: number, withExif = false): Promise<Buffer> {
  const base = sharp({
    create: { width, height, channels: 3, background: { r: 200, g: 150, b: 120 } },
  })

  const pipeline = withExif
    ? base.withExif({
        IFD0: { Copyright: 'MAM Cocooning' },
        IFD3: { GPSLatitudeRef: 'N', GPSLongitudeRef: 'E' },
      })
    : base

  return pipeline.jpeg().toBuffer()
}

describe('isAcceptedMimeType', () => {
  test('accepts every format the upload form offers', () => {
    for (const mimeType of ACCEPTED_MIME_TYPES) expect(isAcceptedMimeType(mimeType)).toBe(true)
  })

  test('is case insensitive, since browsers are inconsistent', () => {
    expect(isAcceptedMimeType('IMAGE/JPEG')).toBe(true)
  })

  test('rejects anything that is not one of the listed image types', () => {
    expect(isAcceptedMimeType('application/pdf')).toBe(false)
    expect(isAcceptedMimeType('image/svg+xml')).toBe(false)
    expect(isAcceptedMimeType('')).toBe(false)
  })
})

describe('prepareForStorage', () => {
  test('re-encodes to WebP', async () => {
    const source = await makeJpeg(800, 600)

    const prepared = await prepareForStorage(source.buffer as ArrayBuffer)

    expect(prepared.mimeType).toBe('image/webp')
    expect(prepared.extension).toBe('webp')
    expect((await sharp(prepared.data).metadata()).format).toBe('webp')
  })

  test('removes EXIF metadata, GPS included', async () => {
    const source = await makeJpeg(400, 300, true)
    expect((await sharp(source).metadata()).exif).toBeDefined()

    const prepared = await prepareForStorage(source.buffer as ArrayBuffer)

    expect((await sharp(prepared.data).metadata()).exif).toBeUndefined()
  })

  test('caps the longest edge at 2200 pixels', async () => {
    const source = await makeJpeg(4000, 3000)

    const prepared = await prepareForStorage(source.buffer as ArrayBuffer)

    expect(prepared.width).toBe(2200)
    expect(prepared.height).toBe(1650)
  })

  test('does not enlarge an image that is already small', async () => {
    const source = await makeJpeg(320, 240)

    const prepared = await prepareForStorage(source.buffer as ArrayBuffer)

    expect(prepared.width).toBe(320)
    expect(prepared.height).toBe(240)
  })

  test('reports the dimensions of what was actually written', async () => {
    const source = await makeJpeg(1000, 500)

    const prepared = await prepareForStorage(source.buffer as ArrayBuffer)
    const metadata = await sharp(prepared.data).metadata()

    expect(metadata.width).toBe(prepared.width)
    expect(metadata.height).toBe(prepared.height)
  })

  test('rejects a buffer that is not an image', async () => {
    const notAnImage = new TextEncoder().encode('bonjour').buffer

    await expect(prepareForStorage(notAnImage as ArrayBuffer)).rejects.toThrow()
  })
})

describe('prepareForAnalysis', () => {
  test('returns base64 small enough to stay cheap to classify', async () => {
    const source = await makeJpeg(3000, 2000)

    const base64 = await prepareForAnalysis(source)
    const metadata = await sharp(Buffer.from(base64, 'base64')).metadata()

    expect(metadata.format).toBe('jpeg')
    expect(metadata.width).toBeLessThanOrEqual(768)
    expect(metadata.height).toBeLessThanOrEqual(768)
  })
})

describe('MAX_UPLOAD_BYTES', () => {
  test('leaves room for a modern phone photo', () => {
    expect(MAX_UPLOAD_BYTES).toBeGreaterThanOrEqual(10 * 1024 * 1024)
  })
})
