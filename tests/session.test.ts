import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

vi.mock('next/headers', () => ({ cookies: vi.fn() }))

const { createSessionToken, isValidSessionToken, sessionCookie } = await import('@/lib/auth')

beforeEach(() => {
  vi.stubEnv('SESSION_SECRET', 'un-secret-de-test-suffisamment-long-0123456789')
})

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('session tokens', () => {
  test('a token it issued is accepted back', async () => {
    const token = await createSessionToken()

    await expect(isValidSessionToken(token)).resolves.toBe(true)
  })

  test('rejects a token signed with a different secret', async () => {
    const token = await createSessionToken()
    vi.stubEnv('SESSION_SECRET', 'un-autre-secret-totalement-different-9876543')

    await expect(isValidSessionToken(token)).resolves.toBe(false)
  })

  test('rejects a tampered token', async () => {
    const token = await createSessionToken()

    await expect(isValidSessionToken(`${token}x`)).resolves.toBe(false)
  })

  test('rejects an absent token', async () => {
    await expect(isValidSessionToken(undefined)).resolves.toBe(false)
    await expect(isValidSessionToken('')).resolves.toBe(false)
  })

  test('rejects any token when no secret is configured', async () => {
    const token = await createSessionToken()
    vi.stubEnv('SESSION_SECRET', '')

    await expect(isValidSessionToken(token)).resolves.toBe(false)
  })

  test('refuses to mint a token without a secret', async () => {
    vi.stubEnv('SESSION_SECRET', '')

    await expect(createSessionToken()).rejects.toThrow(/SESSION_SECRET/)
  })
})

describe('sessionCookie', () => {
  test('is httpOnly and scoped to the whole site', () => {
    expect(sessionCookie.options.httpOnly).toBe(true)
    expect(sessionCookie.options.sameSite).toBe('lax')
    expect(sessionCookie.options.path).toBe('/')
  })

  test('lasts long enough that Sigrid is not asked to log in every visit', () => {
    expect(sessionCookie.maxAge).toBeGreaterThanOrEqual(60 * 60 * 24 * 7)
  })
})
