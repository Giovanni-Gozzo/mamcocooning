/**
 * The single path every new photo takes, whether Sigrid drops it in /admin or
 * it arrives from the MAM's Facebook page: strip metadata, let Gemini sort it
 * and describe it, store the file, record the row.
 */
import { put } from '@vercel/blob'
import { nanoid } from 'nanoid'
import { env } from './env'
import { classifyPhoto } from './gemini'
import { prepareForAnalysis, prepareForStorage } from './image'
import { createPhoto, ensureCategory, listAllCategories } from './photos'
import type { Photo, PhotoSource } from './types'

const PHOTO_ID_LENGTH = 12

export interface IngestOptions {
  readonly source: Exclude<PhotoSource, 'legacy'>
  /** Keeps the gallery in chronological order for photos published elsewhere first. */
  readonly createdAt?: string
}

export interface IngestResult {
  readonly photo: Photo
  readonly createdCategory: boolean
}

export async function ingestImage(input: ArrayBuffer, options: IngestOptions): Promise<IngestResult> {
  const prepared = await prepareForStorage(input)
  const categories = await listAllCategories()
  const classification = await classifyPhoto(await prepareForAnalysis(prepared.data), categories)

  const categorySlug =
    classification.isNewCategory && classification.newCategory !== null
      ? await ensureCategory(classification.newCategory)
      : classification.categorySlug

  const id = nanoid(PHOTO_ID_LENGTH)
  const blob = await put(`photos/${categorySlug}/${id}.${prepared.extension}`, prepared.data, {
    access: 'public',
    contentType: prepared.mimeType,
    token: env.blobToken ?? undefined,
    addRandomSuffix: false,
  })

  const photo = await createPhoto({
    id,
    url: blob.url,
    width: prepared.width,
    height: prepared.height,
    alt: classification.alt,
    caption: classification.caption,
    categorySlug,
    confidence: classification.confidence,
    source: options.source,
    createdAt: options.createdAt,
  })

  return { photo, createdCategory: classification.isNewCategory }
}
