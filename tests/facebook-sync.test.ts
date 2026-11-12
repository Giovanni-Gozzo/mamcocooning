/**
 * The sync against a stubbed database, Graph API and ingestion pipeline: what
 * gets imported, what is skipped, and how failures are released for a retry.
 */
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import type { FacebookPost } from '@/lib/facebook'

const query = vi.fn()
const ingestImage = vi.fn()
const fetchRecentPosts = vi.fn()
const downloadImage = vi.fn()

vi.mock('@/lib/db', () => ({ requireSql: () => ({ query }), getSql: () => ({ query }) }))
vi.mock('@/lib/ingest', () => ({ ingestImage }))
const cleanPostText = vi.fn()
vi.mock('@/lib/post-text', () => ({ cleanPostText }))
const findPostByExternalId = vi.fn()
const createScheduledPost = vi.fn()
vi.mock('@/lib/post-schedule', () => ({ findPostByExternalId, createScheduledPost }))
vi.mock('@/lib/facebook', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/facebook')>()),
  fetchRecentPosts,
  downloadImage,
  resolveFullSizeUrl: async (image: { url: string }) => image.url,
}))

const {
  MAX_ATTEMPTS,
  MAX_IMPORTS_PER_RUN,
  MAX_PHOTOS_PER_POST,
  importIncomingImages,
  triageIncomingPost,
  SyncConfigurationError,
  describeSyncFailure,
  syncFacebookPhotos,
} = await import('@/lib/facebook-sync')
const { FacebookApiError } = await import('@/lib/facebook')

const CDN = 'https://scontent.xx.fbcdn.net/photo'

function taggedPost(id: string, photoIds: readonly string[], createdTime: string): FacebookPost {
  return {
    id,
    message: 'Les petits chefs en cuisine #site',
    created_time: createdTime,
    attachments: {
      data: [
        {
          media_type: 'album',
          subattachments: {
            data: photoIds.map((photoId) => ({
              media_type: 'photo',
              target: { id: photoId },
              media: { image: { src: `${CDN}/${photoId}.jpg` } },
            })),
          },
        },
      ],
    },
  }
}

/** Routes each SQL statement to a canned answer, like the real driver would. */
function stubDatabase(options: { known?: readonly string[]; claimed?: readonly string[] } = {}) {
  const known = options.known ?? []
  const alreadyClaimed = new Set(options.claimed ?? [])
  query.mockImplementation(async (statement: string, params: unknown[] = []) => {
    if (statement.startsWith('select external_id')) {
      return known.map((externalId) => ({ external_id: externalId }))
    }
    if (statement.startsWith('insert into facebook_imports')) {
      const externalId = params[0] as string
      return alreadyClaimed.has(externalId) ? [] : [{ external_id: externalId }]
    }
    return []
  })
}

/** external_id → posts known to the stubbed scheduler. */
const createdPosts = new Map<string, { id: string; publishAt: string }>()

/** Each new post takes the next day, from 13 November 2026, like the real scheduler. */
function stubScheduler() {
  findPostByExternalId.mockImplementation(async (externalId: string) => createdPosts.get(externalId) ?? null)
  createScheduledPost.mockImplementation(async ({ externalId }: { externalId: string }) => {
    const day = 13 + createdPosts.size
    const post = { id: `post-${createdPosts.size + 1}`, publishAt: `2026-11-${day}T07:00:00.000Z` }
    createdPosts.set(externalId, post)
    return post
  })
}

function statementsStartingWith(prefix: string): unknown[][] {
  return query.mock.calls.filter(([statement]) => (statement as string).startsWith(prefix))
}

let photoCounter = 0

beforeEach(() => {
  vi.stubEnv('DATABASE_URL', 'postgres://stub')
  vi.stubEnv('BLOB_READ_WRITE_TOKEN', 'blob-token')
  vi.stubEnv('FACEBOOK_PAGE_ID', '12345')
  vi.stubEnv('FACEBOOK_PAGE_ACCESS_TOKEN', 'page-token')
  vi.stubEnv('FACEBOOK_HASHTAG', '#site')
  query.mockReset()
  createdPosts.clear()
  stubScheduler()
  cleanPostText.mockReset().mockResolvedValue('Les petits chefs en cuisine')
  ingestImage.mockReset().mockImplementation(async () => {
    photoCounter += 1
    return { photo: { id: `photo-${photoCounter}` } }
  })
  fetchRecentPosts.mockReset()
  downloadImage.mockReset().mockResolvedValue(new ArrayBuffer(8))
  vi.spyOn(console, 'error').mockImplementation(() => undefined)
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})

describe('syncFacebookPhotos', () => {
  test('imports new tagged photos oldest first, each dated at its publication day', async () => {
    fetchRecentPosts.mockResolvedValue([
      taggedPost('new', ['3'], '2026-11-12T08:00:00+0000'),
      taggedPost('old', ['1'], '2026-11-10T08:00:00+0000'),
    ])
    stubDatabase()

    const report = await syncFacebookPhotos()

    expect(report).toEqual({ imported: 2, failed: 0, remaining: 0 })
    // The older post takes the first free day, the newer one the next day.
    expect(ingestImage.mock.calls.map(([, options]) => options)).toEqual([
      { source: 'facebook', createdAt: '2026-11-13T07:00:00.000Z', postId: 'post-1' },
      { source: 'facebook', createdAt: '2026-11-14T07:00:00.000Z', postId: 'post-2' },
    ])
    expect(fetchRecentPosts).toHaveBeenCalledWith({ pageId: '12345', accessToken: 'page-token' })
  })

  test('turns one post into one publication, its text cleaned only once', async () => {
    fetchRecentPosts.mockResolvedValue([taggedPost('p', ['1', '2'], '2026-11-12T08:00:00+0000')])
    stubDatabase()

    await syncFacebookPhotos()

    expect(cleanPostText).toHaveBeenCalledTimes(1)
    expect(cleanPostText).toHaveBeenCalledWith('Les petits chefs en cuisine #site')
    expect(createScheduledPost).toHaveBeenCalledTimes(1)
    expect(createScheduledPost).toHaveBeenCalledWith({
      externalId: 'fbpost:p',
      body: 'Les petits chefs en cuisine',
    })
    const postIds = ingestImage.mock.calls.map(([, options]) => options.postId)
    expect(postIds).toEqual(['post-1', 'post-1'])
  })

  test('reuses the publication created by an earlier run for later photos of a post', async () => {
    fetchRecentPosts.mockResolvedValue([taggedPost('p', ['2'], '2026-11-12T08:00:00+0000')])
    stubDatabase()
    createdPosts.set('fbpost:p', { id: 'existing-post', publishAt: '2026-11-12T07:00:00.000Z' })

    await syncFacebookPhotos()

    expect(cleanPostText).not.toHaveBeenCalled()
    expect(createScheduledPost).not.toHaveBeenCalled()
    expect(ingestImage.mock.calls[0]?.[1]).toMatchObject({
      postId: 'existing-post',
      createdAt: '2026-11-12T07:00:00.000Z',
    })
  })

  test('counts the photo as failed when its publication cannot be created', async () => {
    fetchRecentPosts.mockResolvedValue([taggedPost('p', ['1'], '2026-11-12T08:00:00+0000')])
    stubDatabase()
    createScheduledPost.mockRejectedValueOnce(new Error('introuvable'))

    const report = await syncFacebookPhotos()

    expect(report).toEqual({ imported: 0, failed: 1, remaining: 0 })
    expect(ingestImage).not.toHaveBeenCalled()
  })

  test('retries the publication for the next photo when creating it failed', async () => {
    fetchRecentPosts.mockResolvedValue([taggedPost('p', ['1', '2'], '2026-11-12T08:00:00+0000')])
    cleanPostText.mockRejectedValueOnce(new Error('boom'))
    stubDatabase()

    const report = await syncFacebookPhotos()

    expect(report).toEqual({ imported: 1, failed: 1, remaining: 0 })
    expect(cleanPostText).toHaveBeenCalledTimes(2)
  })

  test('records which photo each Facebook image became', async () => {
    fetchRecentPosts.mockResolvedValue([taggedPost('p', ['7'], '2026-11-12T08:00:00+0000')])
    ingestImage.mockResolvedValue({ photo: { id: 'photo-7' } })
    stubDatabase()

    await syncFacebookPhotos()

    expect(statementsStartingWith('update facebook_imports')[0]?.[1]).toEqual(['fb:7', 'photo-7'])
  })

  test('never re-imports an image already in the ledger, even if its photo was removed', async () => {
    fetchRecentPosts.mockResolvedValue([taggedPost('p', ['1', '2'], '2026-11-12T08:00:00+0000')])
    stubDatabase({ known: ['fb:1'] })

    const report = await syncFacebookPhotos()

    expect(report.imported).toBe(1)
    expect(downloadImage).toHaveBeenCalledTimes(1)
    expect(downloadImage).toHaveBeenCalledWith(`${CDN}/2.jpg`)
  })

  test('skips an image another run claimed in the meantime', async () => {
    fetchRecentPosts.mockResolvedValue([taggedPost('p', ['1'], '2026-11-12T08:00:00+0000')])
    stubDatabase({ claimed: ['fb:1'] })

    const report = await syncFacebookPhotos()

    expect(report).toEqual({ imported: 0, failed: 0, remaining: 0 })
    expect(downloadImage).not.toHaveBeenCalled()
  })

  test('releases the claim of a failed image so the next run retries it', async () => {
    fetchRecentPosts.mockResolvedValue([taggedPost('p', ['1', '2'], '2026-11-12T08:00:00+0000')])
    // The sync walks the feed in reverse, so "2" is the first one attempted.
    downloadImage.mockRejectedValueOnce(new Error('CDN indisponible'))
    stubDatabase()

    const report = await syncFacebookPhotos()

    expect(report).toEqual({ imported: 1, failed: 1, remaining: 0 })
    const releases = statementsStartingWith('update facebook_imports set imported_at')
    expect(releases.map(([, params]) => params)).toEqual([['fb:2']])
  })

  test('keeps the claim when only the ledger update fails, so the photo is not published twice', async () => {
    fetchRecentPosts.mockResolvedValue([taggedPost('p', ['1'], '2026-11-12T08:00:00+0000')])
    stubDatabase()
    const answer = query.getMockImplementation()
    query.mockImplementation(async (statement: string, params?: unknown[]) => {
      if (statement.startsWith('update facebook_imports set photo_id')) throw new Error('timeout')
      return answer?.(statement, params)
    })

    const report = await syncFacebookPhotos()

    expect(report).toEqual({ imported: 1, failed: 0, remaining: 0 })
    expect(statementsStartingWith('update facebook_imports set imported_at')).toEqual([])
  })

  test('only skips images that are imported, given up on, or being imported right now', async () => {
    fetchRecentPosts.mockResolvedValue([taggedPost('p', ['1'], '2026-11-12T08:00:00+0000')])
    stubDatabase()

    await syncFacebookPhotos()

    const [statement, params] = statementsStartingWith('select external_id')[0] as [string, unknown[]]
    expect(statement).toContain('photo_id is not null')
    expect(statement).toContain('attempts >=')
    expect(params).toEqual([['fb:1'], MAX_ATTEMPTS])
  })

  test('caps each run and reports what is left for the next one', async () => {
    const ids = Array.from({ length: MAX_IMPORTS_PER_RUN + 3 }, (_, index) => String(index))
    fetchRecentPosts.mockResolvedValue([taggedPost('p', ids, '2026-11-12T08:00:00+0000')])
    stubDatabase()

    const report = await syncFacebookPhotos()

    expect(report).toEqual({ imported: MAX_IMPORTS_PER_RUN, failed: 0, remaining: 3 })
  })

  test('does nothing when no post carries the hashtag', async () => {
    fetchRecentPosts.mockResolvedValue([
      { ...taggedPost('p', ['1'], '2026-11-12T08:00:00+0000'), message: 'Fermé lundi' },
    ])
    stubDatabase()

    const report = await syncFacebookPhotos()

    expect(report).toEqual({ imported: 0, failed: 0, remaining: 0 })
    expect(query).not.toHaveBeenCalled()
  })

  test('refuses to run without the Facebook credentials', async () => {
    vi.stubEnv('FACEBOOK_PAGE_ACCESS_TOKEN', '')

    await expect(syncFacebookPhotos()).rejects.toBeInstanceOf(SyncConfigurationError)
    expect(fetchRecentPosts).not.toHaveBeenCalled()
  })

  test('refuses to run without storage, where photos could not be saved', async () => {
    vi.stubEnv('BLOB_READ_WRITE_TOKEN', '')

    await expect(syncFacebookPhotos()).rejects.toThrow('stockage')
  })
})

describe('describeSyncFailure', () => {
  test('passes configuration problems through as a 503', () => {
    expect(describeSyncFailure(new SyncConfigurationError('Ajoutez X.'))).toEqual({
      message: 'Ajoutez X.',
      status: 503,
    })
  })

  test('tells the owner to regenerate an expired token', () => {
    const failure = describeSyncFailure(new FacebookApiError('Graph API : expired', true))

    expect(failure.status).toBe(502)
    expect(failure.message).toContain('FACEBOOK_PAGE_ACCESS_TOKEN')
  })

  test('hides the details of other Facebook errors', () => {
    const failure = describeSyncFailure(new FacebookApiError('Graph API : internal', false))

    expect(failure).toEqual({
      message: 'Facebook ne répond pas correctement. Réessayez plus tard.',
      status: 502,
    })
  })

  test('asks the owner to update the database when the ledger table is missing', () => {
    const missingTable = Object.assign(new Error('relation does not exist'), { code: '42P01' })

    const failure = describeSyncFailure(missingTable)

    expect(failure.status).toBe(503)
    expect(failure.message).toContain('Initialiser la base')
  })

  test('falls back to a generic message for anything else', () => {
    expect(describeSyncFailure(new Error('ECONNRESET')).status).toBe(500)
  })
})

describe('posts sent by Make', () => {
  const cdn = (name: string) => `https://scontent.xx.fbcdn.net/v/t39/${name}.jpg?oh=signed`
  const incoming = (overrides: Partial<{ message: string; imageUrls: string[] }> = {}) => ({
    postId: '111_222',
    message: 'Pâte à sel ce matin #site',
    imageUrls: [cdn('9001_n')],
    ...overrides,
  })

  test('take a post without hashtag when no filter is configured', () => {
    vi.stubEnv('FACEBOOK_HASHTAG', '')

    expect(triageIncomingPost(incoming({ message: 'Bonne semaine à tous' })).status).toBe('accepted')
  })

  test('ignore a post without the hashtag when a filter is configured', () => {
    expect(triageIncomingPost(incoming({ message: 'Fermé lundi' }))).toEqual({
      status: 'ignored',
      reason: 'hashtag',
    })
  })

  test('ignore a post without any usable photo', () => {
    expect(triageIncomingPost(incoming({ imageUrls: ['https://evil.example/x.jpg'] }))).toEqual({
      status: 'ignored',
      reason: 'no-photo',
    })
  })

  test('keep each photo once, identified by its file name, and cap large albums', () => {
    const names = Array.from({ length: MAX_PHOTOS_PER_POST + 2 }, (_, index) => `${index}_n`)
    const urls = [cdn('0_n'), ...names.map(cdn)]

    const verdict = triageIncomingPost(incoming({ imageUrls: urls }))

    expect(verdict.status).toBe('accepted')
    if (verdict.status !== 'accepted') return
    expect(verdict.images).toHaveLength(MAX_PHOTOS_PER_POST)
    expect(verdict.images[0]).toMatchObject({
      externalId: 'fb:111_222:0_n.jpg',
      postId: '111_222',
      postMessage: 'Pâte à sel ce matin #site',
      url: cdn('0_n'),
    })
  })

  test('import the photos straight from their URL, in the publication of their day', async () => {
    stubDatabase()
    const verdict = triageIncomingPost(incoming({ imageUrls: [cdn('1_n'), cdn('2_n')] }))
    if (verdict.status !== 'accepted') throw new Error('attendu : accepté')

    const report = await importIncomingImages(verdict.images)

    expect(report).toEqual({ imported: 2, failed: 0 })
    expect(downloadImage.mock.calls.map(([url]) => url)).toEqual([cdn('1_n'), cdn('2_n')])
    expect(createScheduledPost).toHaveBeenCalledTimes(1)
    expect(ingestImage.mock.calls.map(([, options]) => options.postId)).toEqual(['post-1', 'post-1'])
  })

  test('count a photo that fails without stopping the others', async () => {
    stubDatabase()
    downloadImage.mockRejectedValueOnce(new Error('CDN'))
    const verdict = triageIncomingPost(incoming({ imageUrls: [cdn('1_n'), cdn('2_n')] }))
    if (verdict.status !== 'accepted') throw new Error('attendu : accepté')

    await expect(importIncomingImages(verdict.images)).resolves.toEqual({ imported: 1, failed: 1 })
  })
})
