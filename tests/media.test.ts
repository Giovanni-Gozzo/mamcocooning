import { describe, expect, test } from 'vitest'
import { describeMedia, thumbnailUrl } from '@/lib/media'
import { isVideoFile } from '@/lib/publication-limits'

describe('thumbnailUrl', () => {
  test('uses the poster of a video and the photo itself otherwise', () => {
    expect(thumbnailUrl({ url: 'v.mp4', posterUrl: 'v.webp' })).toBe('v.webp')
    expect(thumbnailUrl({ url: 'p.webp', posterUrl: null })).toBe('p.webp')
  })
})

describe('describeMedia', () => {
  const image = { mediaType: 'image' as const }
  const video = { mediaType: 'video' as const }

  test('counts photos and videos in plain French', () => {
    expect(describeMedia([image, image, image])).toBe('3 photos')
    expect(describeMedia([video])).toBe('1 vidéo')
    expect(describeMedia([image, image, video])).toBe('2 photos et 1 vidéo')
  })
})

describe('isVideoFile', () => {
  test('recognises videos by type or by extension', () => {
    expect(isVideoFile({ type: 'video/quicktime', name: 'IMG_1.MOV' })).toBe(true)
    expect(isVideoFile({ type: '', name: 'clip.mp4' })).toBe(true)
    expect(isVideoFile({ type: 'image/jpeg', name: 'photo.jpg' })).toBe(false)
  })
})
