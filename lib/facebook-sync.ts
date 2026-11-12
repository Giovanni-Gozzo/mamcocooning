/**
 * Pulls #site-tagged Facebook posts into the news feed: one publication per
 * post, with its cleaned text and its photos.
 *
 * Each picture goes through the same pipeline as a manual upload (metadata
 * stripped, sorted and described by Gemini). A ledger table remembers every
 * image ever imported, so the sync is safe to run as often as wanted and never
 * resurrects a photo Sigrid has taken down.
 */
import { nanoid } from 'nanoid'
import { requireSql } from './db'
import { env, isBlobConfigured, isDatabaseConfigured } from './env'
import {
  FacebookApiError,
  downloadImage,
  extractTaggedImages,
  fetchRecentPosts,
  resolveFullSizeUrl,
  type FacebookConfig,
  type FacebookImage,
} from './facebook'
import { ingestImage } from './ingest'
import { cleanPostText } from './post-text'

const POST_ID_LENGTH = 12

/** Keeps one run well inside the function time limit (Gemini takes a few seconds per photo). */
export const MAX_IMPORTS_PER_RUN = 8

export interface SyncReport {
  readonly imported: number
  readonly failed: number
  /** Tagged photos left for the next run because of the per-run cap. */
  readonly remaining: number
}

export class SyncConfigurationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'SyncConfigurationError'
  }
}

function requireConfig(): FacebookConfig {
  if (!isDatabaseConfigured() || !isBlobConfigured()) {
    throw new SyncConfigurationError('La base de données et le stockage doivent être configurés.')
  }
  const pageId = env.facebookPageId
  const accessToken = env.facebookPageToken
  if (pageId === null || accessToken === null) {
    throw new SyncConfigurationError(
      'Ajoutez FACEBOOK_PAGE_ID et FACEBOOK_PAGE_ACCESS_TOKEN dans Vercel.',
    )
  }
  return { pageId, accessToken }
}

/** A failed picture is retried on later runs, up to this many times in total. */
export const MAX_ATTEMPTS = 3
/**
 * A claim older than this without a photo belongs to a run that died midway
 * (timeout, redeploy), so another run may take it over.
 */
const STALE_CLAIM = `interval '15 minutes'`
const POSTGRES_UNDEFINED_TABLE = '42P01'

/** Images that must not be attempted now: imported, given up on, or in progress. */
async function findSettledIds(externalIds: readonly string[]): Promise<ReadonlySet<string>> {
  if (externalIds.length === 0) return new Set()
  const rows = (await requireSql().query(
    `select external_id from facebook_imports
      where external_id = any($1::text[])
        and (photo_id is not null
             or attempts >= $2
             or imported_at > now() - ${STALE_CLAIM})`,
    [externalIds, MAX_ATTEMPTS],
  )) as { external_id: string }[]
  return new Set(rows.map((row) => row.external_id))
}

/**
 * Reserves an image so two overlapping runs never import it twice. A failed
 * or abandoned claim can be taken over, which counts as a new attempt.
 */
async function claim(externalId: string): Promise<boolean> {
  const rows = (await requireSql().query(
    `insert into facebook_imports (external_id) values ($1)
     on conflict (external_id) do update
        set attempts = facebook_imports.attempts + 1, imported_at = now()
      where facebook_imports.photo_id is null
        and facebook_imports.attempts < $2
        and facebook_imports.imported_at <= now() - ${STALE_CLAIM}
     returning external_id`,
    [externalId, MAX_ATTEMPTS],
  )) as { external_id: string }[]
  return rows.length > 0
}

/** Marks the claim as stale right away, so the next run may retry it. */
async function releaseClaim(externalId: string): Promise<void> {
  await requireSql().query(
    `update facebook_imports set imported_at = now() - interval '1 day'
      where external_id = $1 and photo_id is null`,
    [externalId],
  )
}

/** Post ids already resolved during this run, so each text is cleaned once. */
type PostCache = Map<string, Promise<string>>

async function findPostId(externalId: string): Promise<string | null> {
  const rows = (await requireSql().query('select id from posts where external_id = $1', [
    externalId,
  ])) as { id: string }[]
  return rows[0]?.id ?? null
}

/** The feed publication for a Facebook post, created with its cleaned text on first sight. */
async function createOrFindPost(image: FacebookImage): Promise<string> {
  const externalId = `fbpost:${image.postId}`
  const existing = await findPostId(externalId)
  if (existing !== null) return existing

  const body = await cleanPostText(image.postMessage)
  const rows = (await requireSql().query(
    `insert into posts (id, external_id, body, source, created_at)
     values ($1, $2, $3, 'facebook', coalesce($4::timestamptz, now()))
     on conflict (external_id) do nothing
     returning id`,
    [nanoid(POST_ID_LENGTH), externalId, body, image.createdAt ?? null],
  )) as { id: string }[]

  // Another run may have created it in the meantime.
  const created = rows[0]?.id ?? (await findPostId(externalId))
  if (created === null) throw new Error(`Publication ${externalId} introuvable après création.`)
  return created
}

function ensurePost(image: FacebookImage, cache: PostCache): Promise<string> {
  const cached = cache.get(image.postId)
  if (cached !== undefined) return cached
  const pending = createOrFindPost(image)
  cache.set(image.postId, pending)
  // A failure must not poison the other photos of the same post.
  pending.catch(() => cache.delete(image.postId))
  return pending
}

async function importOne(
  image: FacebookImage,
  config: FacebookConfig,
  posts: PostCache,
): Promise<boolean> {
  if (!(await claim(image.externalId))) return false

  let photoId: string
  try {
    const postId = await ensurePost(image, posts)
    const url = await resolveFullSizeUrl(image, config)
    const data = await downloadImage(url)
    const { photo } = await ingestImage(data, {
      source: 'facebook',
      createdAt: image.createdAt,
      postId,
    })
    photoId = photo.id
  } catch (error) {
    await releaseClaim(image.externalId)
    throw error
  }

  // The photo is already online: a failure here must not release the claim,
  // or the next run would publish it a second time.
  try {
    await requireSql().query('update facebook_imports set photo_id = $2 where external_id = $1', [
      image.externalId,
      photoId,
    ])
  } catch (error) {
    console.error(`[facebook] ${image.externalId} importée mais non consignée`, error)
  }
  return true
}

function isMissingTable(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    (error as { code?: unknown }).code === POSTGRES_UNDEFINED_TABLE
  )
}

export async function syncFacebookPhotos(): Promise<SyncReport> {
  const config = requireConfig()
  const feed = await fetchRecentPosts(config)
  const tagged = extractTaggedImages(feed, env.facebookHashtag)

  const known = await findSettledIds(tagged.map((image) => image.externalId))
  // Oldest first, so the gallery fills in the order things happened.
  const fresh = [...tagged.filter((image) => !known.has(image.externalId))].reverse()
  const batch = fresh.slice(0, MAX_IMPORTS_PER_RUN)

  const posts: PostCache = new Map()
  let imported = 0
  let failed = 0
  for (const image of batch) {
    try {
      if (await importOne(image, config, posts)) imported += 1
    } catch (error) {
      failed += 1
      console.error(`[facebook] import de ${image.externalId} impossible`, error)
    }
  }

  return { imported, failed, remaining: fresh.length - batch.length }
}

/** Maps a sync failure to a message the owner can act on, and an HTTP status. */
export function describeSyncFailure(error: unknown): { message: string; status: number } {
  if (error instanceof SyncConfigurationError) return { message: error.message, status: 503 }
  if (isMissingTable(error)) {
    return {
      message: 'La base doit être mise à jour : cliquez sur « Initialiser la base » en bas de page.',
      status: 503,
    }
  }
  if (error instanceof FacebookApiError && error.isTokenProblem) {
    return {
      message:
        'Facebook refuse l’accès : le jeton a expiré ou a été révoqué. Régénérez FACEBOOK_PAGE_ACCESS_TOKEN.',
      status: 502,
    }
  }
  if (error instanceof FacebookApiError) {
    return { message: 'Facebook ne répond pas correctement. Réessayez plus tard.', status: 502 }
  }
  return { message: 'Synchronisation impossible. Réessayez dans un instant.', status: 500 }
}
