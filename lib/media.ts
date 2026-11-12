/** Display helpers for photos and videos, safe in the browser. */
import type { Photo } from './types'

/** The still image to show for a media: the poster of a video, the photo itself otherwise. */
export function thumbnailUrl(photo: Pick<Photo, 'url' | 'posterUrl'>): string {
  return photo.posterUrl ?? photo.url
}

/** "3 photos", "1 vidéo", "2 photos et 1 vidéo". */
export function describeMedia(photos: readonly Pick<Photo, 'mediaType'>[]): string {
  const videos = photos.filter((photo) => photo.mediaType === 'video').length
  const images = photos.length - videos
  const parts = [
    images > 0 ? `${images} photo${images > 1 ? 's' : ''}` : null,
    videos > 0 ? `${videos} vidéo${videos > 1 ? 's' : ''}` : null,
  ].filter((part): part is string => part !== null)
  return parts.join(' et ')
}
