/**
 * Repository for photos and categories.
 *
 * Postgres is the source of truth once configured. Until then — or while it is
 * still empty — the repository serves the photos committed to the repository so
 * the public site is never blank.
 */
import { getSql } from './db'
import { LEGACY_PHOTOS } from './legacy-photos'
import { DEFAULT_CATEGORIES, FALLBACK_CATEGORY_SLUG } from './taxonomy'
import type { Category, CategoryWithCount, Photo, PhotoQuery } from './types'

const DEFAULT_LIMIT = 120
const MAX_LIMIT = 500

interface PhotoRow {
  id: string
  url: string
  width: number
  height: number
  alt: string
  caption: string | null
  category_slug: string
  confidence: number | null
  source: string
  created_at: string | Date
}

function toPhoto(row: PhotoRow): Photo {
  return {
    id: row.id,
    url: row.url,
    width: Number(row.width),
    height: Number(row.height),
    alt: row.alt,
    caption: row.caption,
    categorySlug: row.category_slug,
    confidence: row.confidence === null ? null : Number(row.confidence),
    source: row.source === 'legacy' ? 'legacy' : 'upload',
    createdAt: new Date(row.created_at).toISOString(),
  }
}

function clampLimit(limit: number | undefined): number {
  // A non-finite limit would turn slice(0, NaN) into an empty gallery, so it
  // falls back to the default rather than silently hiding every photo.
  if (limit === undefined || !Number.isFinite(Number(limit))) return DEFAULT_LIMIT
  return Math.min(Math.max(1, Math.trunc(Number(limit))), MAX_LIMIT)
}

function filterFallback(query: PhotoQuery): readonly Photo[] {
  const scoped =
    query.categorySlug === undefined
      ? LEGACY_PHOTOS
      : LEGACY_PHOTOS.filter((photo) => photo.categorySlug === query.categorySlug)
  const offset = query.offset ?? 0
  return scoped.slice(offset, offset + clampLimit(query.limit))
}

/** True when the database holds no photo yet, so we should serve the manifest. */
async function isDatabaseEmpty(): Promise<boolean> {
  const sql = getSql()
  if (sql === null) return true
  const rows = (await sql.query('select count(*)::int as total from photos')) as { total: number }[]
  return (rows[0]?.total ?? 0) === 0
}

export async function listPhotos(query: PhotoQuery = {}): Promise<readonly Photo[]> {
  const sql = getSql()
  if (sql === null) return filterFallback(query)

  try {
    if (await isDatabaseEmpty()) return filterFallback(query)

    const rows = (await sql.query(
      `select id, url, width, height, alt, caption, category_slug, confidence, source, created_at
         from photos
        where is_published = true
          and ($1::text is null or category_slug = $1)
        order by created_at desc, id desc
        limit $2 offset $3`,
      [query.categorySlug ?? null, clampLimit(query.limit), query.offset ?? 0],
    )) as PhotoRow[]

    return rows.map(toPhoto)
  } catch (error) {
    console.error('[photos] lecture impossible, repli sur le manifeste local', error)
    return filterFallback(query)
  }
}

function fallbackCategories(): readonly CategoryWithCount[] {
  return DEFAULT_CATEGORIES.map((category) => {
    const photos = LEGACY_PHOTOS.filter((photo) => photo.categorySlug === category.slug)
    return { ...category, photoCount: photos.length, coverUrl: photos[0]?.url ?? null }
  })
    .filter((category) => category.photoCount > 0)
    .sort((a, b) => a.sortOrder - b.sortOrder)
}

/**
 * Only categories that actually hold a published photo, so the site's sections
 * appear and disappear on their own as photos are added.
 */
export async function listCategoriesWithCounts(): Promise<readonly CategoryWithCount[]> {
  const sql = getSql()
  if (sql === null) return fallbackCategories()

  try {
    if (await isDatabaseEmpty()) return fallbackCategories()

    const rows = (await sql.query(
      `select c.slug, c.label, c.emoji, c.description, c.sort_order,
              count(p.id)::int as photo_count,
              (array_agg(p.url order by p.created_at desc))[1] as cover_url
         from categories c
         join photos p on p.category_slug = c.slug and p.is_published = true
        group by c.slug, c.label, c.emoji, c.description, c.sort_order
       having count(p.id) > 0
        order by c.sort_order asc, c.label asc`,
    )) as {
      slug: string
      label: string
      emoji: string
      description: string
      sort_order: number
      photo_count: number
      cover_url: string | null
    }[]

    return rows.map((row) => ({
      slug: row.slug,
      label: row.label,
      emoji: row.emoji,
      description: row.description,
      sortOrder: Number(row.sort_order),
      photoCount: Number(row.photo_count),
      coverUrl: row.cover_url,
    }))
  } catch (error) {
    console.error('[photos] catégories indisponibles, repli sur le manifeste local', error)
    return fallbackCategories()
  }
}

/** Every known category, including empty ones — used by the admin dropdown. */
export async function listAllCategories(): Promise<readonly Category[]> {
  const sql = getSql()
  if (sql === null) return DEFAULT_CATEGORIES

  try {
    const rows = (await sql.query(
      `select slug, label, emoji, description, sort_order from categories order by sort_order, label`,
    )) as { slug: string; label: string; emoji: string; description: string; sort_order: number }[]

    if (rows.length === 0) return DEFAULT_CATEGORIES
    return rows.map((row) => ({
      slug: row.slug,
      label: row.label,
      emoji: row.emoji,
      description: row.description,
      sortOrder: Number(row.sort_order),
    }))
  } catch (error) {
    console.error('[photos] liste des catégories indisponible', error)
    return DEFAULT_CATEGORIES
  }
}

/** Creates a category proposed by Gemini, or keeps the existing one. */
export async function ensureCategory(category: Omit<Category, 'sortOrder'>): Promise<string> {
  const sql = getSql()
  if (sql === null) return FALLBACK_CATEGORY_SLUG

  await sql.query(
    `insert into categories (slug, label, emoji, description, sort_order)
     values ($1, $2, $3, $4, 500)
     on conflict (slug) do nothing`,
    [category.slug, category.label, category.emoji, category.description],
  )
  return category.slug
}

export interface NewPhoto {
  readonly id: string
  readonly url: string
  readonly width: number
  readonly height: number
  readonly alt: string
  readonly caption: string | null
  readonly categorySlug: string
  readonly confidence: number | null
  readonly source?: 'upload' | 'legacy'
}

export async function createPhoto(photo: NewPhoto): Promise<Photo> {
  const sql = getSql()
  if (sql === null) {
    throw new Error('Base de données non configurée : impossible d’enregistrer la photo.')
  }

  const rows = (await sql.query(
    `insert into photos (id, url, width, height, alt, caption, category_slug, confidence, source)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     returning id, url, width, height, alt, caption, category_slug, confidence, source, created_at`,
    [
      photo.id,
      photo.url,
      photo.width,
      photo.height,
      photo.alt,
      photo.caption,
      photo.categorySlug,
      photo.confidence,
      photo.source ?? 'upload',
    ],
  )) as PhotoRow[]

  const created = rows[0]
  if (created === undefined) throw new Error('Insertion de la photo échouée.')
  return toPhoto(created)
}

export async function findPhotoById(id: string): Promise<Photo | null> {
  const sql = getSql()
  if (sql === null) return LEGACY_PHOTOS.find((photo) => photo.id === id) ?? null

  const rows = (await sql.query(
    `select id, url, width, height, alt, caption, category_slug, confidence, source, created_at
       from photos where id = $1`,
    [id],
  )) as PhotoRow[]

  const row = rows[0]
  return row === undefined ? null : toPhoto(row)
}

/** Removes a photo row. The caller is responsible for the stored file itself. */
export async function removePhoto(id: string): Promise<boolean> {
  const sql = getSql()
  if (sql === null) throw new Error('Base de données non configurée.')
  const rows = (await sql.query('delete from photos where id = $1 returning id', [id])) as {
    id: string
  }[]
  return rows.length > 0
}

export async function movePhotoToCategory(id: string, categorySlug: string): Promise<Photo | null> {
  const sql = getSql()
  if (sql === null) throw new Error('Base de données non configurée.')

  const rows = (await sql.query(
    `update photos set category_slug = $2 where id = $1
     returning id, url, width, height, alt, caption, category_slug, confidence, source, created_at`,
    [id, categorySlug],
  )) as PhotoRow[]

  const row = rows[0]
  return row === undefined ? null : toPhoto(row)
}

/** Copies the repository's photos into the database, skipping existing ids. */
export async function importLegacyPhotos(): Promise<number> {
  const sql = getSql()
  if (sql === null) throw new Error('Base de données non configurée.')

  let imported = 0
  for (const photo of LEGACY_PHOTOS) {
    const rows = (await sql.query(
      `insert into photos (id, url, width, height, alt, caption, category_slug, confidence, source, created_at)
       values ($1, $2, $3, $4, $5, $6, $7, null, 'legacy', $8)
       on conflict (id) do nothing
       returning id`,
      [
        photo.id,
        photo.url,
        photo.width,
        photo.height,
        photo.alt,
        photo.caption,
        photo.categorySlug,
        photo.createdAt,
      ],
    )) as { id: string }[]
    imported += rows.length
  }
  return imported
}
