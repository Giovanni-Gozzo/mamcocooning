/**
 * Prepares a photo in the browser before it is sent.
 *
 * - iPhone HEIC photos are converted to JPEG: the server cannot read them.
 * - Large photos are scaled down, which keeps every upload under the 4.5 MB
 *   request limit of Vercel functions.
 * - Re-drawing the image drops its metadata, GPS position included.
 *
 * The server still re-encodes and checks everything; this only removes the
 * reasons an upload could fail.
 */
const MAX_EDGE_PX = 2400
const JPEG_QUALITY = 0.88
const HEIC_PATTERN = /\.(heic|heif)$/i

export function looksLikeHeic(file: File): boolean {
  return /image\/hei[cf]/i.test(file.type) || HEIC_PATTERN.test(file.name)
}

async function decode(blob: Blob): Promise<ImageBitmap> {
  return createImageBitmap(blob, { imageOrientation: 'from-image' })
}

async function decodeHeic(file: File): Promise<ImageBitmap> {
  // Loaded only when needed: the converter is heavy.
  const { heicTo } = await import('heic-to/next')
  const jpeg = await heicTo({ blob: file, type: 'image/jpeg', quality: 0.92 })
  return decode(jpeg)
}

function toJpeg(bitmap: ImageBitmap): Promise<Blob> {
  const scale = Math.min(1, MAX_EDGE_PX / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  const context = canvas.getContext('2d')
  if (context === null) return Promise.reject(new Error('Canvas indisponible'))
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob === null ? reject(new Error('Conversion impossible')) : resolve(blob)),
      'image/jpeg',
      JPEG_QUALITY,
    )
  })
}

export class ImagePreparationError extends Error {}

/** A JPEG ready to send, or the original file when the browser cannot help. */
export async function prepareImageForUpload(file: File): Promise<File> {
  try {
    const bitmap = await decode(file).catch((error: unknown) => {
      if (looksLikeHeic(file)) return decodeHeic(file)
      throw error
    })
    const jpeg = await toJpeg(bitmap)
    return new File([jpeg], `${file.name.replace(/\.[^.]+$/, '') || 'photo'}.jpg`, {
      type: 'image/jpeg',
    })
  } catch (error) {
    if (looksLikeHeic(file)) {
      throw new ImagePreparationError(
        'Cette photo iPhone (HEIC) n’a pas pu être convertie. Ouvrez-la puis exportez-la en JPEG.',
      )
    }
    console.warn('[upload] préparation impossible, envoi du fichier d’origine', error)
    return file
  }
}

/** Reads any answer of our API, including the non-JSON errors of the platform. */
export async function readApiResponse<T>(
  response: Response,
  fallback: string,
): Promise<{ ok: true; data: T } | { ok: false; error: string }> {
  const payload: unknown = await response.json().catch(() => null)
  if (payload !== null && typeof payload === 'object' && 'success' in payload) {
    const body = payload as { success: boolean; data: T; error: string | null }
    if (response.ok && body.success) return { ok: true, data: body.data }
    return { ok: false, error: body.error ?? fallback }
  }
  if (response.status === 413) return { ok: false, error: 'Fichier trop lourd pour être envoyé.' }
  return { ok: false, error: `${fallback} (erreur ${response.status})` }
}
