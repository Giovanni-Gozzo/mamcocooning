import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

const neon = vi.fn((url: string) => ({ url, query: vi.fn() }))

vi.mock('@neondatabase/serverless', () => ({ neon }))

const { getSql, requireSql } = await import('@/lib/db')

beforeEach(() => {
  neon.mockClear()
})

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('getSql', () => {
  test('returns null when no database is configured', () => {
    vi.stubEnv('DATABASE_URL', '')
    vi.stubEnv('POSTGRES_URL', '')

    expect(getSql()).toBeNull()
    expect(neon).not.toHaveBeenCalled()
  })

  test('creates the client once and reuses it across calls', () => {
    vi.stubEnv('DATABASE_URL', 'postgres://exemple/mamcocooning')

    const first = getSql()
    const second = getSql()

    expect(first).toBe(second)
    expect(neon).toHaveBeenCalledTimes(1)
  })
})

describe('requireSql', () => {
  test('returns the client when one is available', () => {
    vi.stubEnv('DATABASE_URL', 'postgres://exemple/mamcocooning')

    expect(requireSql()).not.toBeNull()
  })

  test('raises a message the admin panel can show as-is', () => {
    vi.stubEnv('DATABASE_URL', '')
    vi.stubEnv('POSTGRES_URL', '')
    // The cached client from an earlier test must not mask a missing URL.
    vi.resetModules()

    expect(() => requireSql()).toThrow(/DATABASE_URL/)
  })
})
