import { beforeEach, describe, expect, test, vi } from 'vitest'

const query = vi.fn()

vi.mock('@/lib/db', () => ({ getSql: () => ({ query }), requireSql: () => ({ query }) }))

const { runMigration } = await import('@/lib/migrate')
const { SCHEMA_STATEMENTS } = await import('@/lib/schema')
const { DEFAULT_CATEGORIES } = await import('@/lib/taxonomy')

beforeEach(() => {
  query.mockReset()
  query.mockResolvedValue([])
})

describe('runMigration', () => {
  test('applies every schema statement then seeds every category', async () => {
    const report = await runMigration()

    expect(report).toEqual({
      statementsApplied: SCHEMA_STATEMENTS.length,
      categoriesSynced: DEFAULT_CATEGORIES.length,
    })
    expect(query).toHaveBeenCalledTimes(SCHEMA_STATEMENTS.length + DEFAULT_CATEGORIES.length)
  })

  test('creates tables only if they are absent, so it can be re-run', async () => {
    await runMigration()

    for (const statement of SCHEMA_STATEMENTS) {
      expect(statement).toMatch(/if not exists/)
    }
  })

  test('updates a category that already exists rather than failing', async () => {
    await runMigration()

    const seedCall = query.mock.calls[SCHEMA_STATEMENTS.length]
    expect(seedCall?.[0]).toContain('on conflict (slug) do update')
  })

  test('passes each seed category through as parameters, never inline SQL', async () => {
    await runMigration()

    const seedCalls = query.mock.calls.slice(SCHEMA_STATEMENTS.length)
    expect(seedCalls).toHaveLength(DEFAULT_CATEGORIES.length)
    for (const [, params] of seedCalls) expect(params).toHaveLength(5)
  })
})
