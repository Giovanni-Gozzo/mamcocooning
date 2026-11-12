/**
 * The news feed: dated publications, newest first.
 *
 * A publication written in /admin shows its text with all its photos and
 * videos. A photo without a publication stands on its own. The photos
 * inherited from the old site are gathered into a single "memories"
 * publication, so they do not flood the feed.
 */
import { getSql } from './db'
import { FEED_PAGE_SIZE } from './feed-format'
import { LEGACY_PHOTOS } from './legacy-photos'
import { isDatabaseEmpty, listPhotos, toPhoto, type PhotoRow } from './photos'
import type { FeedItem, FeedPage, Photo } from './types'

export { FEED_PAGE_SIZE }
const MAX_FEED_PAGE_SIZE = 24
/** Enough to cover the whole gallery of a MAM when the feed query is unavailable. */
const MAX_FALLBACK_PHOTOS = 500
export const MEMORIES_ID = 'legacy'

export interface FeedQuery {
  readonly limit?: number
  readonly offset?: number
}

function clampLimit(limit: number | undefined): number {
  if (limit === undefined || !Number.isFinite(limit)) return FEED_PAGE_SIZE
  return Math.min(Math.max(1, Math.trunc(limit)), MAX_FEED_PAGE_SIZE)
}

function byOldestFirst(a: Photo, b: Photo): number {
  return a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id)
}

function memoriesItem(photos: readonly Photo[]): FeedItem {
  const sorted = [...photos].sort(byOldestFirst)
  return {
    id: MEMORIES_ID,
    kind: 'memories',
    createdAt: sorted.at(-1)?.createdAt ?? new Date(0).toISOString(),
    body: null,
    photos: sorted,
  }
}

function singlePhotoItem(photo: Photo): FeedItem {
  return { id: photo.id, kind: 'photo', createdAt: photo.createdAt, body: null, photos: [photo] }
}

/** Builds the feed in memory: old-site photos together, every other photo on its own. */
function groupPhotos(photos: readonly Photo[]): readonly FeedItem[] {
  const legacy = photos.filter((photo) => photo.source === 'legacy')
  return [
    ...(legacy.length > 0 ? [memoriesItem(legacy)] : []),
    ...photos.filter((photo) => photo.source !== 'legacy').map(singlePhotoItem),
  ].sort((a, b) => b.createdAt.localeCompare(a.createdAt) || a.id.localeCompare(b.id))
}

const legacyFeed = (): readonly FeedItem[] => groupPhotos(LEGACY_PHOTOS)

function paginate(items: readonly FeedItem[], query: FeedQuery): FeedPage {
  const offset = query.offset ?? 0
  const limit = clampLimit(query.limit)
  return { items: items.slice(offset, offset + limit), hasMore: items.length > offset + limit }
}

interface FeedRow {
  item_id: string
  created_at: string | Date
  body: string | null
  has_post: boolean
  photos: PhotoRow[]
}

function kindOf(itemId: string, hasPost: boolean): FeedItem['kind'] {
  if (hasPost) return 'post'
  return itemId === MEMORIES_ID ? 'memories' : 'photo'
}

function toFeedItem(row: FeedRow): FeedItem {
  return {
    id: row.item_id,
    kind: kindOf(row.item_id, row.has_post),
    createdAt: new Date(row.created_at).toISOString(),
    body: row.body,
    photos: row.photos.map(toPhoto),
  }
}

const FEED_SQL = `
  with grouped as (
    select coalesce(
             p.post_id,
             case when p.source = 'legacy' then '${MEMORIES_ID}' else p.id end
           ) as item_id,
           p.*
      from photos p
     where p.is_published = true
  )
  select g.item_id,
         max(g.created_at) as created_at,
         max(po.body) as body,
         bool_or(g.post_id is not null) as has_post,
         json_agg(json_build_object(
           'id', g.id, 'url', g.url, 'width', g.width, 'height', g.height,
           'alt', g.alt, 'caption', g.caption, 'category_slug', g.category_slug,
           'confidence', g.confidence, 'source', g.source, 'created_at', g.created_at,
           'media_type', g.media_type, 'poster_url', g.poster_url
         ) order by g.created_at, g.id) as photos
    from grouped g
    left join posts po on po.id = g.post_id
   group by g.item_id
   order by max(g.created_at) desc, g.item_id desc
   limit $1 offset $2`

export async function listFeed(query: FeedQuery = {}): Promise<FeedPage> {
  const sql = getSql()
  if (sql === null) return paginate(legacyFeed(), query)

  try {
    if (await isDatabaseEmpty()) return paginate(legacyFeed(), query)

    const limit = clampLimit(query.limit)
    // One extra row tells whether another page exists without a count query.
    const rows = (await sql.query(FEED_SQL, [limit + 1, query.offset ?? 0])) as FeedRow[]
    return { items: rows.slice(0, limit).map(toFeedItem), hasMore: rows.length > limit }
  } catch (error) {
    // Falling back to the repository manifest would bring deleted photos back,
    // so the feed is rebuilt from the photos actually stored.
    console.error('[feed] lecture du fil impossible, repli sur les photos enregistrées', error)
    return paginate(groupPhotos(await listPhotos({ limit: MAX_FALLBACK_PHOTOS })), query)
  }
}
