import { describe, expect, test } from 'vitest'
import { looksLikeHeic, readApiResponse } from '@/lib/client-image'

const file = (name: string, type: string) => new File([new Uint8Array([1])], name, { type })

describe('looksLikeHeic', () => {
  test('recognises iPhone photos by type or by extension', () => {
    expect(looksLikeHeic(file('IMG_1.HEIC', ''))).toBe(true)
    expect(looksLikeHeic(file('photo', 'image/heif'))).toBe(true)
    expect(looksLikeHeic(file('photo.jpg', 'image/jpeg'))).toBe(false)
  })
})

describe('readApiResponse', () => {
  test('returns the data of a successful answer', async () => {
    const response = Response.json({ success: true, data: { id: 'a' }, error: null })

    await expect(readApiResponse(response, 'repli')).resolves.toEqual({ ok: true, data: { id: 'a' } })
  })

  test('returns the message of an API error', async () => {
    const response = Response.json({ success: false, data: null, error: 'Photo inconnue.' }, { status: 404 })

    await expect(readApiResponse(response, 'repli')).resolves.toEqual({ ok: false, error: 'Photo inconnue.' })
  })

  test('explains a file rejected by the platform for its size', async () => {
    const response = new Response('Request Entity Too Large', { status: 413 })

    await expect(readApiResponse(response, 'repli')).resolves.toEqual({
      ok: false,
      error: 'Fichier trop lourd pour être envoyé.',
    })
  })

  test('mentions the status of any other unreadable answer', async () => {
    const response = new Response('<html>oops</html>', { status: 502 })

    await expect(readApiResponse(response, 'Envoi impossible.')).resolves.toEqual({
      ok: false,
      error: 'Envoi impossible. (erreur 502)',
    })
  })
})
