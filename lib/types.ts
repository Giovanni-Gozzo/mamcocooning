/** Shared domain types for the MAM Cocooning gallery. */

export type PhotoSource = 'upload' | 'legacy' | 'facebook'

export interface Category {
  readonly slug: string
  readonly label: string
  readonly emoji: string
  readonly description: string
  readonly sortOrder: number
}

export interface CategoryWithCount extends Category {
  readonly photoCount: number
  readonly coverUrl: string | null
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
}

/** One publication of the news feed: a date, an optional text, its photos. */
export interface FeedItem {
  readonly id: string
  /**
   * post: a Facebook publication with its text · photo: a single upload ·
   * memories: the photos from the old site, gathered per activity.
   */
  readonly kind: 'post' | 'photo' | 'memories'
  readonly createdAt: string
  /** Already cleaned of hashtags and personal details. Null when there is no text. */
  readonly body: string | null
  /** Activity of the first photo, used for the badge and the filter. */
  readonly categorySlug: string
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
  /** Also return photos of posts planned for a later day (admin only). */
  readonly includeScheduled?: boolean
}

/** Result of asking Gemini to sort an uploaded photo. */
export interface Classification {
  readonly categorySlug: string
  readonly confidence: number
  readonly alt: string
  readonly caption: string | null
  readonly isNewCategory: boolean
  readonly newCategory: Omit<Category, 'sortOrder'> | null
}
