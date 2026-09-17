import { describe, expect, test } from 'vitest'
import { clientKey, fail, ok, toPublicMessage } from '@/lib/api'

describe('response envelope', () => {
  test('ok wraps the payload and leaves error null', async () => {
    const response = ok({ photos: [] })

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      success: true,
      data: { photos: [] },
      error: null,
    })
  })

  test('ok honours an explicit status', () => {
    expect(ok({ created: true }, { status: 201 }).status).toBe(201)
  })

  test('fail carries the message and status, with a null payload', async () => {
    const response = fail('Mot de passe incorrect.', 401)

    expect(response.status).toBe(401)
    await expect(response.json()).resolves.toEqual({
      success: false,
      data: null,
      error: 'Mot de passe incorrect.',
    })
  })
})

describe('toPublicMessage', () => {
  test('passes through configuration errors, which are safe to show', () => {
    const error = new Error('Base de données non configurée.')

    expect(toPublicMessage(error, 'repli')).toBe('Base de données non configurée.')
  })

  test('hides unexpected errors behind the fallback message', () => {
    const error = new Error('connect ECONNREFUSED 10.0.0.1:5432')

    expect(toPublicMessage(error, 'Envoi impossible.')).toBe('Envoi impossible.')
  })

  test('handles values that are not Error instances', () => {
    expect(toPublicMessage('boom', 'Envoi impossible.')).toBe('Envoi impossible.')
  })
})

describe('clientKey', () => {
  test('uses the first address of x-forwarded-for', () => {
    const request = new Request('https://example.test', {
      headers: { 'x-forwarded-for': '203.0.113.7, 70.41.3.18' },
    })

    expect(clientKey(request)).toBe('203.0.113.7')
  })

  test('falls back to a constant when the header is absent', () => {
    expect(clientKey(new Request('https://example.test'))).toBe('unknown')
  })
})
