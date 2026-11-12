/**
 * Pulls the Facebook posts into the news feed: one publication per
 * post, with its cleaned text and its photos.
 *
 * Each picture goes through the same pipeline as a manual upload (metadata
 * stripped, sorted and described by Gemini). A ledger table remembers every
 * image ever imported, so the sync is safe to run as often as wanted and never
 * resurrects a photo Sigrid has taken down.
 */
import { requireSql } from './db'
import { env, isBlobConfigured, isDatabaseConfigured } from './env'
import {
  FacebookApiError,
  downloadImage,
  extractTaggedImages,
  fetchRecentPosts,
  passesHashtagFilter,
  isAllowedImageUrl,
  resolveFullSizeUrl,
  type FacebookConfig,
  type FacebookImage,
} from './facebook'
import { ingestImage } from './ingest'
import { cleanPostText } from './post-text'
import { createScheduledPost, findPostByExternalId, type ScheduledPost } from './post-schedule'

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

/** Posts already resolved during this run, so each text is cleaned once. */
type PostCache = Map<string, Promise<ScheduledPost>>

/**
 * The feed publication for a Facebook post. On first sight its text is cleaned
 * and it takes the next free day (one post per day, see lib/post-schedule.ts).
 */
async function createOrFindPost(image: FacebookImage): Promise<ScheduledPost> {
  const externalId = `fbpost:${image.postId}`
  const existing = await findPostByExternalId(externalId)
  if (existing !== null) return existing
  return createScheduledPost({ externalId, body: await cleanPostText(image.postMessage) })
}

function ensurePost(image: FacebookImage, cache: PostCache): Promise<ScheduledPost> {
  const cached = cache.get(image.postId)
  if (cached !== undefined) return cached
  const pending = createOrFindPost(image)
  cache.set(image.postId, pending)
  // A failure must not poison the other photos of the same post.
  pending.catch(() => cache.delete(image.postId))
  return pending
}

/**
 * Imports one photo of a post. With Graph API credentials the full-size file
 * is fetched; posts sent by Make already carry the URL to download.
 */
async function importOne(
  image: FacebookImage,
  config: FacebookConfig | null,
  posts: PostCache,
): Promise<boolean> {
  if (!(await claim(image.externalId))) return false

  let photoId: string
  try {
    const post = await ensurePost(image, posts)
    const url = config === null ? image.url : await resolveFullSizeUrl(image, config)
    const data = await downloadImage(url)
    const { photo } = await ingestImage(data, {
      source: 'facebook',
      // Dated at the post's publication slot, so it stays hidden until then.
      createdAt: post.publishAt,
      postId: post.id,
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

/** A post as Make sends it: its Facebook id, its text, the URLs of its photos. */
export interface IncomingFacebookPost {
  readonly postId: string
  readonly message: string | undefined
  readonly imageUrls: readonly string[]
}

/** Albums can be huge; the site shows a handful and keeps the import quick. */
export const MAX_PHOTOS_PER_POST = 10

export type IncomingVerdict =
  | { readonly status: 'ignored'; readonly reason: 'hashtag' | 'no-photo' }
  | { readonly status: 'accepted'; readonly images: readonly FacebookImage[] }

/**
 * The file name in a Facebook CDN URL carries the photo id and, unlike the
 * signed query string, never changes: it identifies the picture for good.
 */
function photoKey(url: string): string {
  return new URL(url).pathname.split('/').at(-1) ?? url
}

/** Decides, without touching anything, whether a post sent by Make goes on the site. */
export function triageIncomingPost(post: IncomingFacebookPost): IncomingVerdict {
  if (!passesHashtagFilter(post.message, env.facebookHashtag)) {
    return { status: 'ignored', reason: 'hashtag' }
  }

  const urls = [...new Set(post.imageUrls.map((url) => url.trim()))].filter(isAllowedImageUrl)
  if (urls.length === 0) return { status: 'ignored', reason: 'no-photo' }

  return {
    status: 'accepted',
    images: urls.slice(0, MAX_PHOTOS_PER_POST).map((url) => ({
      externalId: `fb:${post.postId}:${photoKey(url)}`,
      postId: post.postId,
      postMessage: post.message,
      photoId: undefined,
      url,
      createdAt: undefined,
    })),
  }
}

/** Imports the photos of one post sent by Make. Safe to call twice for the same post. */
export async function importIncomingImages(
  images: readonly FacebookImage[],
): Promise<Omit<SyncReport, 'remaining'>> {
  const posts: PostCache = new Map()
  let imported = 0
  let failed = 0
  for (const image of images) {
    try {
      if (await importOne(image, null, posts)) imported += 1
    } catch (error) {
      failed += 1
      console.error(`[facebook] import de ${image.externalId} impossible`, error)
    }
  }
  return { imported, failed }
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
