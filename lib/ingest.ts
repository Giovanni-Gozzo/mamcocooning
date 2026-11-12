/**
 * The single path every new photo takes: strip metadata, store the file,
 * record the row. Photos are no longer sorted into themes: a publication is
 * simply dated, and its text describes it.
 */
import { put } from '@vercel/blob'
import { nanoid } from 'nanoid'
import { env } from './env'
import { prepareForStorage } from './image'
import { createPhoto } from './photos'
import { FALLBACK_CATEGORY_SLUG } from './taxonomy'
import type { Photo } from './types'

const PHOTO_ID_LENGTH = 12
const MAX_ALT_LENGTH = 160
export const DEFAULT_ALT = 'Un moment de la vie à la MAM Cocooning'

export interface IngestOptions {
  /** Describes the photo for screen readers; usually drawn from the publication text. */
  readonly alt?: string
  readonly createdAt?: string
  /** Attaches the photo to a feed publication. */
  readonly postId?: string
  /** False while a publication is being put together in /admin. */
  readonly isPublished?: boolean
}

/** A short, readable description from a publication text: its first sentence. */
export function altFromText(text: string | null | undefined): string {
  const firstSentence = (text ?? '').trim().split(/(?<=[.!?…])\s|\n/)[0]?.trim() ?? ''
  if (firstSentence.length === 0) return DEFAULT_ALT
  return firstSentence.length > MAX_ALT_LENGTH
    ? `${firstSentence.slice(0, MAX_ALT_LENGTH - 1).trimEnd()}…`
    : firstSentence
}

export async function ingestImage(input: ArrayBuffer, options: IngestOptions = {}): Promise<Photo> {
  const prepared = await prepareForStorage(input)

  const id = nanoid(PHOTO_ID_LENGTH)
  const blob = await put(`photos/${id}.${prepared.extension}`, prepared.data, {
    access: 'public',
    contentType: prepared.mimeType,
    token: env.blobToken ?? undefined,
    addRandomSuffix: false,
  })

  return createPhoto({
    id,
    url: blob.url,
    width: prepared.width,
    height: prepared.height,
    alt: options.alt ?? DEFAULT_ALT,
    caption: null,
    // The database still requires a category; every new photo shares one.
    categorySlug: FALLBACK_CATEGORY_SLUG,
    confidence: null,
    source: 'upload',
    createdAt: options.createdAt,
    postId: options.postId,
    isPublished: options.isPublished,
  })
}
