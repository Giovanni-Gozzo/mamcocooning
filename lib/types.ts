/** Shared domain types for the MAM Cocooning gallery. */

export type PhotoSource = 'upload' | 'legacy'

export type MediaType = 'image' | 'video'

export interface Category {
  readonly slug: string
  readonly label: string
  readonly emoji: string
  readonly description: string
  readonly sortOrder: number
}


export interface Photo {
  readonly id: string
  readonly url: string
  readonly width: number
  readonly height: number
  readonly alt: string
  readonly caption: string | null
  readonly categorySlug: string
  readonly confidence: number | null
  readonly source: PhotoSource
  readonly createdAt: string
  /** A "photo" of the feed can also be a video, shown with its poster frame. */
  readonly mediaType: MediaType
  /** Still image of a video (WebP), used for thumbnails. Null for photos. */
  readonly posterUrl: string | null
}

/** One publication of the news feed: a date, an optional text, its photos. */
export interface FeedItem {
  readonly id: string
  /**
   * post: a publication with its text · photo: a single photo ·
   * memories: the photos from the old site, gathered together.
   */
  readonly kind: 'post' | 'photo' | 'memories'
  readonly createdAt: string
  /** The text as written in /admin. Null when there is none. */
  readonly body: string | null
  /** Photos are shown oldest first, the way they were posted. */
  readonly photos: readonly Photo[]
}

export interface FeedPage {
  readonly items: readonly FeedItem[]
  readonly hasMore: boolean
}

export interface PhotoQuery {
  readonly categorySlug?: string
  readonly limit?: number
  readonly offset?: number
}

