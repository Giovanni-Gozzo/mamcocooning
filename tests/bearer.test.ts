import { describe, expect, test } from 'vitest'
import { hasBearerSecret } from '@/lib/bearer'

function requestWith(authorization?: string): Request {
  return new Request('https://example.test', {
    headers: authorization === undefined ? {} : { authorization },
  })
}

describe('hasBearerSecret', () => {
  test('accepts the exact secret', () => {
    expect(hasBearerSecret(requestWith('Bearer s3cret'), 's3cret')).toBe(true)
  })

  test.each([
    ['a wrong secret', 'Bearer nope!!'],
    ['a secret of another length', 'Bearer s3cret-longer'],
    ['no Bearer prefix', 's3cret'],
    ['no header', undefined],
  ])('refuses %s', (_label, header) => {
    expect(hasBearerSecret(requestWith(header), 's3cret')).toBe(false)
  })

  test('refuses everything when no secret is configured', () => {
    expect(hasBearerSecret(requestWith('Bearer '), null)).toBe(false)
  })
})
