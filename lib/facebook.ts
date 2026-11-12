/**
 * Reads the MAM's Facebook page through Meta's Graph API.
 *
 * Only posts carrying the agreed hashtag (#site by default) are considered, so
 * nothing reaches the public site by accident. The post text may name children,
 * so it only reaches the site after lib/post-text.ts has cleaned it.
 */
import { z } from 'zod'
import { MAX_UPLOAD_BYTES } from './image'

const GRAPH_API_VERSION = 'v23.0'
const GRAPH_BASE_URL = `https://graph.facebook.com/${GRAPH_API_VERSION}`
const POSTS_PER_REQUEST = 25
const SUBATTACHMENTS_PER_POST = 50
const REQUEST_TIMEOUT_MS = 15_000
/** Graph error codes meaning the token is expired, revoked or lacks a permission. */
const TOKEN_ERROR_CODES = new Set([10, 102, 190, 200])
/** Facebook serves photos from its own CDN; anything else is refused (SSRF guard). */
const ALLOWED_IMAGE_HOST_SUFFIXES = ['.fbcdn.net'] as const

const POST_FIELDS = [
  'id',
  'message',
  'created_time',
  `attachments{media_type,target{id},media{image{src}},subattachments.limit(${SUBATTACHMENTS_PER_POST}){media_type,target{id},media{image{src}}}}`,
].join(',')

const MediaSchema = z.object({
  media_type: z.string().optional(),
  target: z.object({ id: z.string() }).optional(),
  media: z.object({ image: z.object({ src: z.string() }).optional() }).optional(),
})

const AttachmentSchema = MediaSchema.extend({
  subattachments: z.object({ data: z.array(MediaSchema) }).optional(),
})

const PostSchema = z.object({
  id: z.string(),
  message: z.string().optional(),
  created_time: z.string(),
  attachments: z.object({ data: z.array(AttachmentSchema) }).optional(),
})

const PostsResponseSchema = z.object({ data: z.array(PostSchema) })

const GraphErrorSchema = z.object({
  error: z.object({ message: z.string(), code: z.number().optional() }),
})

export type FacebookPost = z.infer<typeof PostSchema>
type FacebookMedia = z.infer<typeof MediaSchema>

export interface FacebookImage {
  /** Stable identity used to never import the same picture twice. */
  readonly externalId: string
  readonly postId: string
  /** Raw text of the post. Never shown as is: see lib/post-text.ts. */
  readonly postMessage: string | undefined
  /** Facebook's own photo id, used to ask for the full-size file. */
  readonly photoId: string | undefined
  /** Preview from the post listing, often reduced to ~720 px. */
  readonly url: string
  readonly createdAt: string | undefined
}

export interface FacebookConfig {
  readonly pageId: string
  readonly accessToken: string
}

export class FacebookApiError extends Error {
  readonly isTokenProblem: boolean

  constructor(message: string, isTokenProblem: boolean) {
    super(message)
    this.name = 'FacebookApiError'
    this.isTokenProblem = isTokenProblem
  }
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** True when the message holds the hashtag as a whole word, in any case. */
export function hasHashtag(message: string | undefined, hashtag: string): boolean {
  if (message === undefined || hashtag.length === 0) return false
  const pattern = new RegExp(`#${escapeRegExp(hashtag)}(?![\\p{L}\\p{N}_])`, 'iu')
  return pattern.test(message)
}

export function isAllowedImageUrl(rawUrl: string): boolean {
  let url: URL
  try {
    url = new URL(rawUrl)
  } catch {
    return false
  }
  if (url.protocol !== 'https:') return false
  const host = url.hostname.toLowerCase()
  return ALLOWED_IMAGE_HOST_SUFFIXES.some((suffix) => host.endsWith(suffix))
}

function toIsoDate(value: string): string | undefined {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString()
}

function photosOf(post: FacebookPost): readonly FacebookMedia[] {
  const attachments = post.attachments?.data ?? []
  return attachments
    .flatMap((attachment) => attachment.subattachments?.data ?? [attachment])
    .filter((media) => media.media_type === 'photo' && media.media?.image?.src !== undefined)
}

/** Every photo from the posts tagged with the hashtag, ready to download. */
export function extractTaggedImages(
  posts: readonly FacebookPost[],
  hashtag: string,
): readonly FacebookImage[] {
  return posts
    .filter((post) => hasHashtag(post.message, hashtag))
    .flatMap((post) =>
      photosOf(post).map((media, index) => ({
        externalId: `fb:${media.target?.id ?? `${post.id}:${index}`}`,
        postId: post.id,
        postMessage: post.message,
        photoId: media.target?.id,
        url: media.media?.image?.src ?? '',
        createdAt: toIsoDate(post.created_time),
      })),
    )
    .filter((image) => isAllowedImageUrl(image.url))
}

function graphErrorFrom(body: unknown, status: number): FacebookApiError {
  const parsed = GraphErrorSchema.safeParse(body)
  const code = parsed.success ? parsed.data.error.code : undefined
  const isTokenProblem = status === 401 || (code !== undefined && TOKEN_ERROR_CODES.has(code))
  const detail = parsed.success ? parsed.data.error.message : `HTTP ${status}`
  return new FacebookApiError(`Graph API : ${detail}`, isTokenProblem)
}

/** The page's most recent posts, newest first. */
export async function fetchRecentPosts(config: FacebookConfig): Promise<readonly FacebookPost[]> {
  const url = new URL(`${GRAPH_BASE_URL}/${encodeURIComponent(config.pageId)}/posts`)
  url.searchParams.set('fields', POST_FIELDS)
  url.searchParams.set('limit', String(POSTS_PER_REQUEST))

  // The token travels in a header so it never shows up in a logged URL.
  const response = await fetch(url, {
    headers: { authorization: `Bearer ${config.accessToken}` },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    cache: 'no-store',
  })
  const body: unknown = await response.json().catch(() => null)

  if (!response.ok) throw graphErrorFrom(body, response.status)

  const parsed = PostsResponseSchema.safeParse(body)
  if (!parsed.success) throw new FacebookApiError('Graph API : réponse inattendue.', false)
  return parsed.data.data
}

const PhotoSizesSchema = z.object({
  images: z.array(z.object({ source: z.string(), width: z.number() })),
})

/**
 * The largest version of a photo. The post listing only carries a reduced
 * preview, so one extra call per new photo buys a sharper gallery. Any failure
 * falls back to the preview rather than losing the photo.
 */
export async function resolveFullSizeUrl(
  image: FacebookImage,
  config: FacebookConfig,
): Promise<string> {
  if (image.photoId === undefined) return image.url

  try {
    const url = new URL(`${GRAPH_BASE_URL}/${encodeURIComponent(image.photoId)}`)
    url.searchParams.set('fields', 'images')
    const response = await fetch(url, {
      headers: { authorization: `Bearer ${config.accessToken}` },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      cache: 'no-store',
    })
    const parsed = PhotoSizesSchema.safeParse(await response.json())
    if (!response.ok || !parsed.success) return image.url

    const largest = parsed.data.images
      .filter((size) => isAllowedImageUrl(size.source))
      .reduce<{ source: string; width: number } | null>(
        (best, size) => (best === null || size.width > best.width ? size : best),
        null,
      )
    return largest?.source ?? image.url
  } catch (error) {
    console.error(`[facebook] taille originale indisponible pour ${image.photoId}`, error)
    return image.url
  }
}

/** Downloads one photo from Facebook's CDN, refusing anything that is not an image. */
export async function downloadImage(url: string): Promise<ArrayBuffer> {
  if (!isAllowedImageUrl(url)) throw new Error(`Adresse d’image refusée : ${url}`)

  const response = await fetch(url, {
    redirect: 'error',
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    cache: 'no-store',
  })
  if (!response.ok) throw new Error(`Téléchargement impossible (HTTP ${response.status}).`)

  const contentType = response.headers.get('content-type') ?? ''
  if (!contentType.startsWith('image/')) throw new Error(`Type de fichier inattendu : ${contentType}`)

  const declaredSize = Number(response.headers.get('content-length') ?? 0)
  if (declaredSize > MAX_UPLOAD_BYTES) throw new Error('Image trop lourde.')

  const data = await response.arrayBuffer()
  if (data.byteLength === 0 || data.byteLength > MAX_UPLOAD_BYTES) {
    throw new Error('Image vide ou trop lourde.')
  }
  return data
}
