/**
 * Image preparation before storage.
 *
 * Phone photos carry EXIF metadata that often includes GPS coordinates — the
 * home address of a childminding service. Every upload is therefore re-encoded
 * without metadata, rotated upright, and capped in size.
 */
import sharp from 'sharp'

const MAX_EDGE_PX = 2200
const WEB_QUALITY = 82
/** Smaller copy sent to Gemini: enough detail to classify, far fewer tokens. */
const ANALYSIS_EDGE_PX = 768
const ANALYSIS_QUALITY = 70

export const MAX_UPLOAD_BYTES = 15 * 1024 * 1024
export const ACCEPTED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
  'image/avif',
] as const

export interface PreparedImage {
  readonly data: Buffer
  readonly width: number
  readonly height: number
  readonly mimeType: 'image/webp'
  readonly extension: 'webp'
}

export function isAcceptedMimeType(mimeType: string): boolean {
  return (ACCEPTED_MIME_TYPES as readonly string[]).includes(mimeType.toLowerCase())
}

/** Re-encodes to WebP: upright, capped, stripped of all metadata. */
export async function prepareForStorage(input: ArrayBuffer): Promise<PreparedImage> {
  const { data, info } = await sharp(Buffer.from(input), { failOn: 'error' })
    .rotate()
    .resize({ width: MAX_EDGE_PX, height: MAX_EDGE_PX, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: WEB_QUALITY })
    .toBuffer({ resolveWithObject: true })

  return {
    data,
    width: info.width,
    height: info.height,
    mimeType: 'image/webp',
    extension: 'webp',
  }
}

/** Small JPEG used only for classification, never stored. */
export async function prepareForAnalysis(input: Buffer): Promise<string> {
  const data = await sharp(input)
    .rotate()
    .resize({
      width: ANALYSIS_EDGE_PX,
      height: ANALYSIS_EDGE_PX,
      fit: 'inside',
      withoutEnlargement: true,
    })
    .jpeg({ quality: ANALYSIS_QUALITY })
    .toBuffer()

  return data.toString('base64')
}
