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

describe('self-healing schema', () => {
  const missingTable = () => Object.assign(new Error('relation "site_images" does not exist'), { code: '42P01' })

  async function freshClient(rawQuery: ReturnType<typeof vi.fn>) {
    vi.resetModules()
    vi.stubEnv('DATABASE_URL', 'postgres://exemple/mamcocooning')
    neon.mockImplementation((url: string) => ({ url, query: rawQuery }))
    const db = await import('@/lib/db')
    return db
  }

  test('applies the schema once, then retries the query that failed', async () => {
    const rawQuery = vi.fn().mockRejectedValueOnce(missingTable()).mockResolvedValue([{ ok: 1 }])
    vi.spyOn(console, 'info').mockImplementation(() => undefined)
    const { requireSql } = await freshClient(rawQuery)

    const rows = await requireSql().query('select url from site_images')

    expect(rows).toEqual([{ ok: 1 }])
    const statements = rawQuery.mock.calls.map(([text]) => String(text))
    expect(statements[0]).toBe('select url from site_images')
    expect(statements.some((text) => text.includes('create table if not exists site_images'))).toBe(true)
    expect(statements.at(-1)).toBe('select url from site_images')
  })

  test('migrates only once for concurrent failures', async () => {
    const rawQuery = vi.fn(async (text: string) => {
      if (text.startsWith('select') && rawQuery.mock.calls.filter(([t]) => t === text).length <= 2) {
        throw missingTable()
      }
      return []
    })
    vi.spyOn(console, 'info').mockImplementation(() => undefined)
    const { requireSql } = await freshClient(rawQuery)

    await Promise.all([requireSql().query('select 1'), requireSql().query('select 1')])

    const migrations = rawQuery.mock.calls.filter(([text]) => String(text).includes('create table if not exists categories'))
    expect(migrations).toHaveLength(1)
  })

  test('lets other errors through untouched', async () => {
    const rawQuery = vi.fn().mockRejectedValue(new Error('ECONNRESET'))
    const { requireSql } = await freshClient(rawQuery)

    await expect(requireSql().query('select 1')).rejects.toThrow('ECONNRESET')
    expect(rawQuery).toHaveBeenCalledTimes(1)
  })

  test('tries the migration again later when it failed', async () => {
    const rawQuery = vi
      .fn()
      .mockRejectedValueOnce(missingTable())
      .mockRejectedValueOnce(new Error('timeout during migration'))
      .mockRejectedValueOnce(missingTable())
      .mockResolvedValue([])
    vi.spyOn(console, 'info').mockImplementation(() => undefined)
    const { requireSql } = await freshClient(rawQuery)

    await expect(requireSql().query('select 1')).rejects.toThrow('timeout during migration')
    await expect(requireSql().query('select 1')).resolves.toEqual([])
  })

  test('requireRawSql explains a missing database', async () => {
    vi.resetModules()
    vi.stubEnv('DATABASE_URL', '')
    vi.stubEnv('POSTGRES_URL', '')
    const { requireRawSql } = await import('@/lib/db')

    expect(() => requireRawSql()).toThrow(/DATABASE_URL/)
  })
})
