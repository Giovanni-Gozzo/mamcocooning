/** Publications written in /admin, with storage, database, Gemini and ffmpeg stubbed. */
import { beforeEach, describe, expect, test, vi } from 'vitest'

const query = vi.fn()
const put = vi.fn()
const del = vi.fn()
const ingestImage = vi.fn()
const prepareVideoFromUrl = vi.fn()
const classifyPhoto = vi.fn()
const createPhoto = vi.fn()
const ensureCategory = vi.fn()

vi.mock('@/lib/db', () => ({ requireSql: () => ({ query }), getSql: () => ({ query }) }))
vi.mock('@vercel/blob', () => ({ put, del }))
vi.mock('@/lib/ingest', () => ({ ingestImage }))
vi.mock('@/lib/video', () => ({ prepareVideoFromUrl }))
vi.mock('@/lib/gemini', () => ({ classifyPhoto }))
vi.mock('@/lib/image', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/image')>()),
  prepareForAnalysis: async () => 'base64',
}))
vi.mock('@/lib/photos', () => ({ createPhoto, ensureCategory, listAllCategories: async () => [] }))

const { addMedia, createDraft, isIncomingUpload, publishDraft, MAX_MEDIA_PER_POST } = await import(
  '@/lib/publications'
)

const INCOMING = 'https://abc.public.blob.vercel-storage.com/incoming/1-0-xyz.jpg'
const DRAFT_ROW = { id: 'post-1', created_at: '2026-11-12T10:00:00.000Z' }

/** Draft lookup, then media count, like the real queries. */
function stubDraft(mediaCount = 0) {
  query.mockImplementation(async (text: string) => {
    if (text.startsWith('select id, created_at from posts')) return [DRAFT_ROW]
    if (text.startsWith('select count(*)')) return [{ total: mediaCount }]
    return []
  })
}

beforeEach(() => {
  for (const mock of [query, put, del, ingestImage, prepareVideoFromUrl, classifyPhoto, createPhoto, ensureCategory]) {
    mock.mockReset()
  }
  del.mockResolvedValue(undefined)
  put.mockImplementation(async (path: string) => ({ url: `https://abc.public.blob.vercel-storage.com/${path}` }))
  createPhoto.mockImplementation(async (photo) => photo)
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(new Uint8Array([1, 2, 3]))))
  vi.spyOn(console, 'error').mockImplementation(() => undefined)
})

describe('isIncomingUpload', () => {
  test('accepts only files just uploaded to our storage', () => {
    expect(isIncomingUpload(INCOMING)).toBe(true)
    expect(isIncomingUpload('https://abc.public.blob.vercel-storage.com/photos/x.webp')).toBe(false)
    expect(isIncomingUpload('https://evil.example/incoming/x.jpg')).toBe(false)
    expect(isIncomingUpload('http://abc.public.blob.vercel-storage.com/incoming/x.jpg')).toBe(false)
    expect(isIncomingUpload('pas une adresse')).toBe(false)
  })
})

describe('createDraft', () => {
  test('stores the text as written, trimmed', async () => {
    query.mockResolvedValueOnce([DRAFT_ROW])

    const draft = await createDraft('  Atelier pâte à sel 🎨  ')

    expect(draft).toEqual({ id: 'post-1', createdAt: '2026-11-12T10:00:00.000Z' })
    expect(query.mock.calls[0]?.[1]?.[1]).toBe('Atelier pâte à sel 🎨')
  })

  test('stores no text at all for an empty one', async () => {
    query.mockResolvedValueOnce([DRAFT_ROW])

    await createDraft('   ')

    expect(query.mock.calls[0]?.[1]?.[1]).toBeNull()
  })
})

describe('addMedia', () => {
  test('refuses a file that is not a fresh upload, before touching anything', async () => {
    await expect(addMedia('post-1', 'https://evil.example/x.jpg', 'image')).rejects.toThrow('Fichier non reconnu')
    expect(query).not.toHaveBeenCalled()
  })

  test('adds a photo, hidden until the publication goes online, then drops the original', async () => {
    stubDraft()
    ingestImage.mockResolvedValue({ photo: { id: 'photo-1' } })

    await expect(addMedia('post-1', INCOMING, 'image')).resolves.toEqual({ id: 'photo-1' })

    expect(ingestImage.mock.calls[0]?.[1]).toEqual({
      source: 'upload',
      createdAt: '2026-11-12T10:00:00.000Z',
      postId: 'post-1',
      isPublished: false,
    })
    expect(del).toHaveBeenCalledWith(INCOMING, expect.anything())
  })

  test('re-encodes a video, sorts it by its poster frame and stores both files', async () => {
    stubDraft()
    prepareVideoFromUrl.mockResolvedValue({
      video: Buffer.from('mp4'),
      poster: Buffer.from('webp'),
      width: 720,
      height: 1280,
    })
    classifyPhoto.mockResolvedValue({
      categorySlug: 'motricite',
      confidence: 0.8,
      alt: 'Des enfants dansent',
      caption: 'Danse',
      isNewCategory: false,
      newCategory: null,
    })

    const video = await addMedia('post-1', INCOMING, 'video')

    expect(prepareVideoFromUrl).toHaveBeenCalledWith(INCOMING)
    expect(put.mock.calls.map(([path]) => path)).toEqual([
      expect.stringMatching(/^videos\/[\w-]+\.mp4$/),
      expect.stringMatching(/^videos\/[\w-]+\.webp$/),
    ])
    expect(video).toMatchObject({
      mediaType: 'video',
      width: 720,
      height: 1280,
      categorySlug: 'motricite',
      isPublished: false,
      postId: 'post-1',
    })
    expect(del).toHaveBeenCalledWith(INCOMING, expect.anything())
  })

  test('creates the category Gemini proposes for a video', async () => {
    stubDraft()
    prepareVideoFromUrl.mockResolvedValue({ video: Buffer.from('a'), poster: Buffer.from('b'), width: 1, height: 1 })
    classifyPhoto.mockResolvedValue({
      categorySlug: 'cuisine',
      confidence: 0.7,
      alt: 'x',
      caption: null,
      isNewCategory: true,
      newCategory: { slug: 'cuisine', label: 'Cuisine', emoji: '🍪', description: 'Petits chefs.' },
    })
    ensureCategory.mockResolvedValue('cuisine')

    await addMedia('post-1', INCOMING, 'video')

    expect(ensureCategory).toHaveBeenCalledWith(expect.objectContaining({ slug: 'cuisine' }))
  })

  test('returns null for an unknown publication, and still drops the upload', async () => {
    query.mockResolvedValue([])

    await expect(addMedia('nope', INCOMING, 'image')).resolves.toBeNull()
    expect(del).toHaveBeenCalled()
  })

  test('refuses more files than a publication can hold', async () => {
    stubDraft(MAX_MEDIA_PER_POST)

    await expect(addMedia('post-1', INCOMING, 'image')).rejects.toThrow('au maximum')
  })

  test('fails clearly when the uploaded photo cannot be fetched', async () => {
    stubDraft()
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status: 404 })))

    await expect(addMedia('post-1', INCOMING, 'image')).rejects.toThrow('HTTP 404')
  })
})

describe('publishDraft', () => {
  test('puts every item online at once, dated now', async () => {
    query.mockImplementation(async (text: string) => {
      if (text.startsWith('select id, created_at from posts')) return [DRAFT_ROW]
      if (text.startsWith('update photos')) return [{ id: 'a' }, { id: 'b' }]
      return []
    })

    await expect(publishDraft('post-1')).resolves.toBe(2)
    expect(query.mock.calls.some(([text]) => String(text).startsWith('update posts set created_at = now()'))).toBe(true)
  })

  test('does nothing on a second click', async () => {
    query.mockImplementation(async (text: string) => {
      if (text.startsWith('select id, created_at from posts')) return [DRAFT_ROW]
      if (text.startsWith('select count(*)')) return [{ total: 2 }]
      return []
    })

    await expect(publishDraft('post-1')).resolves.toBe(0)
    expect(query.mock.calls.some(([text]) => String(text).startsWith('delete from posts'))).toBe(false)
  })

  test('removes an empty publication and explains why', async () => {
    query.mockImplementation(async (text: string) => {
      if (text.startsWith('select id, created_at from posts')) return [DRAFT_ROW]
      if (text.startsWith('select count(*)')) return [{ total: 0 }]
      return []
    })

    await expect(publishDraft('post-1')).rejects.toThrow('au moins une photo ou une vidéo')
    expect(query.mock.calls.some(([text]) => String(text).startsWith('delete from posts'))).toBe(true)
  })

  test('returns null for an unknown publication', async () => {
    query.mockResolvedValue([])

    await expect(publishDraft('nope')).resolves.toBeNull()
  })
})
