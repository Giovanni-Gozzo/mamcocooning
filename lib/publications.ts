/**
 * Publications written in /admin: a text, photos and videos, like a Facebook
 * post.
 *
 * The browser sends each file straight to storage (under incoming/, so the
 * 4.5 MB request limit never applies), then asks the server to process it
 * into the publication. The publication stays invisible until it is
 * published, so the site never shows half of it.
 */
import { del, put } from '@vercel/blob'
import { nanoid } from 'nanoid'
import { requireSql } from './db'
import { env } from './env'
import { UserFacingError } from './errors'
import { classifyPhoto } from './gemini'
import { MAX_UPLOAD_BYTES, prepareForAnalysis } from './image'
import { ingestImage } from './ingest'
import { createPhoto, ensureCategory, listAllCategories } from './photos'
import type { MediaType, Photo } from './types'
import { prepareVideoFromUrl } from './video'

import { INCOMING_PREFIX, MAX_MEDIA_PER_POST, MAX_POST_TEXT_LENGTH } from './publication-limits'

export { INCOMING_PREFIX, MAX_MEDIA_PER_POST, MAX_POST_TEXT_LENGTH }
const ID_LENGTH = 12
const BLOB_HOST_SUFFIX = '.public.blob.vercel-storage.com'

export interface Draft {
  readonly id: string
  readonly createdAt: string
}

/** Only files the browser just uploaded to our own storage may be processed. */
export function isIncomingUpload(url: string): boolean {
  try {
    const parsed = new URL(url)
    return (
      parsed.protocol === 'https:' &&
      parsed.hostname.endsWith(BLOB_HOST_SUFFIX) &&
      parsed.pathname.startsWith(`/${INCOMING_PREFIX}`)
    )
  } catch {
    return false
  }
}

export async function createDraft(body: string): Promise<Draft> {
  const text = body.trim().slice(0, MAX_POST_TEXT_LENGTH)
  const rows = (await requireSql().query(
    `insert into posts (id, body, source, created_at) values ($1, $2, 'admin', now())
     returning id, created_at`,
    [nanoid(ID_LENGTH), text.length > 0 ? text : null],
  )) as { id: string; created_at: string | Date }[]
  const row = rows[0]
  if (row === undefined) throw new Error('Création de la publication échouée.')
  return { id: row.id, createdAt: new Date(row.created_at).toISOString() }
}

async function findDraft(postId: string): Promise<Draft | null> {
  const rows = (await requireSql().query(
    `select id, created_at from posts where id = $1 and source = 'admin'`,
    [postId],
  )) as { id: string; created_at: string | Date }[]
  const row = rows[0]
  return row === undefined ? null : { id: row.id, createdAt: new Date(row.created_at).toISOString() }
}

async function countMedia(postId: string): Promise<number> {
  const rows = (await requireSql().query(
    'select count(*)::int as total from photos where post_id = $1',
    [postId],
  )) as { total: number }[]
  return Number(rows[0]?.total ?? 0)
}

async function fetchImage(url: string): Promise<ArrayBuffer> {
  const response = await fetch(url, { cache: 'no-store' })
  if (!response.ok) throw new Error(`Photo introuvable dans le stockage (HTTP ${response.status}).`)
  const data = await response.arrayBuffer()
  if (data.byteLength > MAX_UPLOAD_BYTES) throw new UserFacingError('Photo trop lourde.')
  return data
}

async function addVideo(draft: Draft, url: string): Promise<Photo> {
  const prepared = await prepareVideoFromUrl(url)

  // The poster frame tells Gemini what the video shows, like a photo would.
  const categories = await listAllCategories()
  const classification = await classifyPhoto(await prepareForAnalysis(prepared.poster), categories)
  const categorySlug =
    classification.isNewCategory && classification.newCategory !== null
      ? await ensureCategory(classification.newCategory)
      : classification.categorySlug

  const id = nanoid(ID_LENGTH)
  const options = { access: 'public' as const, token: env.blobToken ?? undefined, addRandomSuffix: false }
  const video = await put(`videos/${id}.mp4`, prepared.video, { ...options, contentType: 'video/mp4' })
  const poster = await put(`videos/${id}.webp`, prepared.poster, { ...options, contentType: 'image/webp' })

  return createPhoto({
    id,
    url: video.url,
    width: prepared.width,
    height: prepared.height,
    alt: classification.alt,
    caption: classification.caption,
    categorySlug,
    confidence: classification.confidence,
    source: 'upload',
    createdAt: draft.createdAt,
    postId: draft.id,
    isPublished: false,
    mediaType: 'video',
    posterUrl: poster.url,
  })
}

/** Processes one uploaded file into the publication. Null when the publication is unknown. */
export async function addMedia(postId: string, url: string, kind: MediaType): Promise<Photo | null> {
  if (!isIncomingUpload(url)) throw new UserFacingError('Fichier non reconnu.')

  try {
    const draft = await findDraft(postId)
    if (draft === null) return null
    if ((await countMedia(postId)) >= MAX_MEDIA_PER_POST) {
      throw new UserFacingError(`${MAX_MEDIA_PER_POST} photos et vidéos au maximum par publication.`)
    }

    if (kind === 'video') return await addVideo(draft, url)
    const { photo } = await ingestImage(await fetchImage(url), {
      source: 'upload',
      createdAt: draft.createdAt,
      postId: draft.id,
      isPublished: false,
    })
    return photo
  } finally {
    // The original (with its metadata) is never kept.
    await del(url, { token: env.blobToken ?? undefined }).catch((error: unknown) => {
      console.error('[publication] fichier temporaire non supprimé', error)
    })
  }
}

/** Makes the whole publication visible at once, dated now. Returns how many items went online. */
export async function publishDraft(postId: string): Promise<number | null> {
  const sql = requireSql()
  const draft = await findDraft(postId)
  if (draft === null) return null

  const rows = (await sql.query(
    `update photos set is_published = true, created_at = now()
      where post_id = $1 and is_published = false
     returning id`,
    [postId],
  )) as { id: string }[]

  if (rows.length === 0) {
    // Published already (a second click): nothing to do.
    if ((await countMedia(postId)) > 0) return 0
    await sql.query('delete from posts where id = $1', [postId])
    throw new UserFacingError('Ajoutez au moins une photo ou une vidéo.')
  }
  await sql.query('update posts set created_at = now() where id = $1', [postId])
  return rows.length
}
