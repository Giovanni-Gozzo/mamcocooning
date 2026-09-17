/** Shared domain types for the MAM Cocooning gallery. */

export type PhotoSource = 'upload' | 'legacy'

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

export interface PhotoQuery {
  readonly categorySlug?: string
  readonly limit?: number
  readonly offset?: number
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
