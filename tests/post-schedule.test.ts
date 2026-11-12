/** One post per day: the scheduler against a stubbed database. */
import { beforeEach, describe, expect, test, vi } from 'vitest'

const query = vi.fn()

vi.mock('@/lib/db', () => ({ requireSql: () => ({ query }), getSql: () => ({ query }) }))

const { createScheduledPost, findPostByExternalId } = await import('@/lib/post-schedule')

const NEW_POST = { externalId: 'fbpost:1_2', body: 'Atelier peinture' }
const ROW = { id: 'post-1', created_at: '2026-11-14T07:00:00.000Z' }
const uniqueViolation = () => Object.assign(new Error('duplicate key'), { code: '23505' })

beforeEach(() => {
  query.mockReset()
})

describe('createScheduledPost', () => {
  test('creates the post in the next free day and returns when it comes out', async () => {
    query.mockResolvedValueOnce([ROW])

    const post = await createScheduledPost(NEW_POST)

    expect(post).toEqual({ id: 'post-1', publishAt: '2026-11-14T07:00:00.000Z' })
    const [statement, params] = query.mock.calls[0] as [string, unknown[]]
    expect(statement).toContain('max(publish_on) + 1')
    expect(statement).toContain("time '08:00'")
    expect(statement).toContain("'Europe/Paris'")
    expect(params.slice(1)).toEqual(['fbpost:1_2', 'Atelier peinture'])
  })

  test('returns the existing post when the same one is sent twice', async () => {
    query.mockResolvedValueOnce([]).mockResolvedValueOnce([ROW])

    await expect(createScheduledPost(NEW_POST)).resolves.toEqual({
      id: 'post-1',
      publishAt: '2026-11-14T07:00:00.000Z',
    })
    expect(query.mock.calls[1]?.[1]).toEqual(['fbpost:1_2'])
  })

  test('tries the next day again when another post took the same day at the same instant', async () => {
    query.mockRejectedValueOnce(uniqueViolation()).mockResolvedValueOnce([ROW])

    await expect(createScheduledPost(NEW_POST)).resolves.toMatchObject({ id: 'post-1' })
    expect(query).toHaveBeenCalledTimes(2)
  })

  test('gives up after a few collisions in a row', async () => {
    query.mockRejectedValue(uniqueViolation())

    await expect(createScheduledPost(NEW_POST)).rejects.toThrow('duplicate key')
    expect(query).toHaveBeenCalledTimes(3)
  })

  test('does not retry on other database errors', async () => {
    query.mockRejectedValueOnce(new Error('ECONNRESET'))

    await expect(createScheduledPost(NEW_POST)).rejects.toThrow('ECONNRESET')
    expect(query).toHaveBeenCalledTimes(1)
  })

  test('fails clearly when the post is neither created nor found', async () => {
    query.mockResolvedValueOnce([]).mockResolvedValueOnce([])

    await expect(createScheduledPost(NEW_POST)).rejects.toThrow('introuvable')
  })
})

describe('findPostByExternalId', () => {
  test('returns null for an unknown post', async () => {
    query.mockResolvedValueOnce([])

    await expect(findPostByExternalId('fbpost:x')).resolves.toBeNull()
  })
})
