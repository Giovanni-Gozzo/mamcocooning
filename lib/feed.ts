/**
 * The news feed: publications in reverse chronological order.
 *
 * A Facebook post becomes one publication with its cleaned text and all its
 * photos. A manual upload is a publication of its own. The photos inherited
 * from the old site are gathered per activity as "memories", so they do not
 * flood the feed with dozens of single-photo entries.
 */
import { getSql } from './db'
import { LEGACY_PHOTOS } from './legacy-photos'
import { isDatabaseEmpty, listPhotos, toPhoto, type PhotoRow } from './photos'
import { FEED_PAGE_SIZE } from './feed-format'
import type { FeedItem, FeedPage, Photo } from './types'

export { FEED_PAGE_SIZE }
const MAX_FEED_PAGE_SIZE = 24

export interface FeedQuery {
  readonly categorySlug?: string
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

/** Enough to cover the whole gallery of a MAM when the feed query is unavailable. */
const MAX_FALLBACK_PHOTOS = 500

function memoriesItem(slug: string, photos: readonly Photo[]): FeedItem {
  const sorted = [...photos].sort(byOldestFirst)
  return {
    id: `legacy:${slug}`,
    kind: 'memories',
    createdAt: sorted.at(-1)?.createdAt ?? new Date(0).toISOString(),
    body: null,
    categorySlug: slug,
    photos: sorted,
  }
}

function singlePhotoItem(photo: Photo): FeedItem {
  return {
    id: photo.id,
    kind: 'photo',
    createdAt: photo.createdAt,
    body: null,
    categorySlug: photo.categorySlug,
    photos: [photo],
  }
}

/**
 * Builds the feed in memory from a list of photos: repository photos gathered
 * per activity, every other photo on its own. Newest first.
 */
function groupPhotos(photos: readonly Photo[]): readonly FeedItem[] {
  const legacyByCategory = new Map<string, Photo[]>()
  for (const photo of photos.filter((entry) => entry.source === 'legacy')) {
    legacyByCategory.set(photo.categorySlug, [
      ...(legacyByCategory.get(photo.categorySlug) ?? []),
      photo,
    ])
  }

  return [
    ...[...legacyByCategory.entries()].map(([slug, group]) => memoriesItem(slug, group)),
    ...photos.filter((photo) => photo.source !== 'legacy').map(singlePhotoItem),
  ].sort((a, b) => b.createdAt.localeCompare(a.createdAt) || a.id.localeCompare(b.id))
}

const legacyFeed = (): readonly FeedItem[] => groupPhotos(LEGACY_PHOTOS)

function paginate(items: readonly FeedItem[], query: FeedQuery): FeedPage {
  const scoped =
    query.categorySlug === undefined
      ? items
      : items.filter((item) => item.photos.some((photo) => photo.categorySlug === query.categorySlug))
  const offset = query.offset ?? 0
  const limit = clampLimit(query.limit)
  return {
    items: scoped.slice(offset, offset + limit),
    hasMore: scoped.length > offset + limit,
  }
}

interface FeedRow {
  item_id: string
  created_at: string | Date
  body: string | null
  has_post: boolean
  category_slug: string
  photos: PhotoRow[]
}

function kindOf(itemId: string, hasPost: boolean): FeedItem['kind'] {
  if (hasPost) return 'post'
  return itemId.startsWith('legacy:') ? 'memories' : 'photo'
}

function toFeedItem(row: FeedRow): FeedItem {
  return {
    id: row.item_id,
    kind: kindOf(row.item_id, row.has_post),
    createdAt: new Date(row.created_at).toISOString(),
    body: row.body,
    categorySlug: row.category_slug,
    photos: row.photos.map(toPhoto),
  }
}

const FEED_SQL = `
  with grouped as (
    select coalesce(
             p.post_id,
             case when p.source = 'legacy' then 'legacy:' || p.category_slug else p.id end
           ) as item_id,
           p.*
      from photos p
     where p.is_published = true
       and p.created_at <= now() -- scheduled posts stay hidden until their day
  )
  select g.item_id,
         max(g.created_at) as created_at,
         max(po.body) as body,
         bool_or(g.post_id is not null) as has_post,
         (array_agg(g.category_slug order by g.created_at, g.id))[1] as category_slug,
         json_agg(json_build_object(
           'id', g.id, 'url', g.url, 'width', g.width, 'height', g.height,
           'alt', g.alt, 'caption', g.caption, 'category_slug', g.category_slug,
           'confidence', g.confidence, 'source', g.source, 'created_at', g.created_at
         ) order by g.created_at, g.id) as photos
    from grouped g
    left join posts po on po.id = g.post_id
   group by g.item_id
  having ($1::text is null or bool_or(g.category_slug = $1))
   order by max(g.created_at) desc, g.item_id desc
   limit $2 offset $3`

export async function listFeed(query: FeedQuery = {}): Promise<FeedPage> {
  const sql = getSql()
  if (sql === null) return paginate(legacyFeed(), query)

  try {
    if (await isDatabaseEmpty()) return paginate(legacyFeed(), query)

    const limit = clampLimit(query.limit)
    // One extra row tells whether another page exists without a count query.
    const rows = (await sql.query(FEED_SQL, [
      query.categorySlug ?? null,
      limit + 1,
      query.offset ?? 0,
    ])) as FeedRow[]

    return { items: rows.slice(0, limit).map(toFeedItem), hasMore: rows.length > limit }
  } catch (error) {
    // Typically the posts table is missing until "Initialiser la base" is run
    // again. Falling back to the repository manifest would bring deleted
    // photos back, so the feed is rebuilt from the photos actually stored.
    console.error('[feed] lecture du fil impossible, repli sur les photos enregistrées', error)
    return paginate(groupPhotos(await listPhotos({ limit: MAX_FALLBACK_PHOTOS })), query)
  }
}
