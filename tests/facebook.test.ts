import { afterEach, describe, expect, test, vi } from 'vitest'
import {
  FacebookApiError,
  downloadImage,
  extractTaggedImages,
  fetchRecentPosts,
  hasHashtag,
  passesHashtagFilter,
  isAllowedImageUrl,
  resolveFullSizeUrl,
  type FacebookPost,
} from '@/lib/facebook'
import { MAX_UPLOAD_BYTES } from '@/lib/image'

const CDN = 'https://scontent-cdg4-1.xx.fbcdn.net/v/t39/photo.jpg?oh=abc'

function photo(id: string, src = CDN) {
  return { media_type: 'photo', target: { id }, media: { image: { src } } }
}

function post(overrides: Partial<FacebookPost> = {}): FacebookPost {
  return {
    id: 'page_1',
    message: 'Peinture propre ce matin ! #site',
    created_time: '2026-11-12T08:30:00+0000',
    attachments: { data: [photo('901')] },
    ...overrides,
  }
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('hasHashtag', () => {
  test('matches the hashtag regardless of case', () => {
    expect(hasHashtag('Atelier pâte à sel #Site', 'site')).toBe(true)
  })

  test('ignores a longer hashtag that merely starts with it', () => {
    expect(hasHashtag('Nouveau #siteweb en ligne', 'site')).toBe(false)
  })

  test('accepts punctuation right after the hashtag', () => {
    expect(hasHashtag('Bonne journée #site!', 'site')).toBe(true)
  })

  test('returns false without a message or a hashtag', () => {
    expect(hasHashtag(undefined, 'site')).toBe(false)
    expect(hasHashtag('#site', '')).toBe(false)
  })

  test('treats regex characters in the hashtag literally', () => {
    expect(hasHashtag('#a.b', 'a.b')).toBe(true)
    expect(hasHashtag('#axb', 'a.b')).toBe(false)
  })
})

describe('passesHashtagFilter', () => {
  test('lets every post through when no hashtag is configured', () => {
    expect(passesHashtagFilter('Fermé lundi', null)).toBe(true)
    expect(passesHashtagFilter(undefined, null)).toBe(true)
  })

  test('requires the hashtag when one is configured', () => {
    expect(passesHashtagFilter('Fermé lundi', 'site')).toBe(false)
    expect(passesHashtagFilter('Atelier #site', 'site')).toBe(true)
  })
})

describe('isAllowedImageUrl', () => {
  test('accepts Facebook CDN addresses over https', () => {
    expect(isAllowedImageUrl(CDN)).toBe(true)
  })

  test.each([
    ['plain http', 'http://scontent.xx.fbcdn.net/photo.jpg'],
    ['another host', 'https://evil.example/photo.jpg'],
    ['a look-alike host', 'https://fbcdn.net.evil.example/photo.jpg'],
    ['an internal address', 'https://169.254.169.254/latest'],
    ['garbage', 'not a url'],
  ])('refuses %s', (_label, url) => {
    expect(isAllowedImageUrl(url)).toBe(false)
  })
})

describe('extractTaggedImages', () => {
  test('keeps only photos from posts carrying the hashtag', () => {
    const posts = [post(), post({ id: 'page_2', message: 'Fermeture lundi' })]

    const images = extractTaggedImages(posts, 'site')

    expect(images).toEqual([
      {
        externalId: 'fb:901',
        postId: 'page_1',
        postMessage: 'Peinture propre ce matin ! #site',
        photoId: '901',
        url: CDN,
        createdAt: '2026-11-12T08:30:00.000Z',
      },
    ])
  })

  test('expands albums into one entry per photo', () => {
    const album = post({
      attachments: {
        data: [{ media_type: 'album', subattachments: { data: [photo('1'), photo('2')] } }],
      },
    })

    expect(extractTaggedImages([album], 'site').map((image) => image.externalId)).toEqual([
      'fb:1',
      'fb:2',
    ])
  })

  test('skips videos and photos served from outside the Facebook CDN', () => {
    const mixed = post({
      attachments: {
        data: [
          { media_type: 'video', target: { id: '5' }, media: { image: { src: CDN } } },
          photo('6', 'https://evil.example/x.jpg'),
          photo('7'),
        ],
      },
    })

    expect(extractTaggedImages([mixed], 'site').map((image) => image.externalId)).toEqual(['fb:7'])
  })

  test('falls back to the post id and position when the photo has no id', () => {
    const anonymous = post({
      attachments: { data: [{ media_type: 'photo', media: { image: { src: CDN } } }] },
    })

    expect(extractTaggedImages([anonymous], 'site')[0]?.externalId).toBe('fb:page_1:0')
  })

  test('leaves the date undefined when Facebook sends an unreadable one', () => {
    expect(extractTaggedImages([post({ created_time: 'hier' })], 'site')[0]?.createdAt).toBe(
      undefined,
    )
  })

  test('takes every post with photos when no hashtag is configured', () => {
    const untagged = post({ id: 'page_9', message: 'Bonne semaine à tous' })

    expect(extractTaggedImages([untagged], null).map((image) => image.postId)).toEqual(['page_9'])
  })

  test('ignores tagged posts without attachments', () => {
    expect(extractTaggedImages([post({ attachments: undefined })], 'site')).toEqual([])
  })
})

describe('fetchRecentPosts', () => {
  const config = { pageId: '12345', accessToken: 'secret-token' }

  test('sends the token in a header, never in the URL, and parses posts', async () => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json({ data: [post()] }))
    vi.stubGlobal('fetch', fetchMock)

    const posts = await fetchRecentPosts(config)

    const [url, init] = fetchMock.mock.calls[0] as [URL, RequestInit]
    expect(url.toString()).toContain('/12345/posts')
    expect(url.toString()).not.toContain('secret-token')
    expect(init.headers).toEqual({ authorization: 'Bearer secret-token' })
    expect(posts).toHaveLength(1)
  })

  test('flags an expired token so the owner knows what to fix', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        Response.json({ error: { message: 'Session has expired', code: 190 } }, { status: 400 }),
      ),
    )

    const error = await fetchRecentPosts(config).catch((caught: unknown) => caught)

    expect(error).toBeInstanceOf(FacebookApiError)
    expect((error as FacebookApiError).isTokenProblem).toBe(true)
  })

  test('reports other API failures without blaming the token', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('oops', { status: 500 })))

    const error = await fetchRecentPosts(config).catch((caught: unknown) => caught)

    expect(error).toBeInstanceOf(FacebookApiError)
    expect((error as FacebookApiError).isTokenProblem).toBe(false)
    expect((error as Error).message).toContain('HTTP 500')
  })

  test('rejects a successful response with an unexpected shape', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ posts: [] })))

    await expect(fetchRecentPosts(config)).rejects.toThrow('réponse inattendue')
  })
})

describe('resolveFullSizeUrl', () => {
  const config = { pageId: '12345', accessToken: 'secret-token' }
  const preview = {
    externalId: 'fb:901',
    postId: 'page_1',
    postMessage: '#site',
    photoId: '901',
    url: CDN,
    createdAt: undefined,
  }
  const LARGE = 'https://scontent.xx.fbcdn.net/large.jpg'

  test('picks the widest version served from the Facebook CDN', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        Response.json({
          images: [
            { source: 'https://scontent.xx.fbcdn.net/small.jpg', width: 720 },
            { source: 'https://evil.example/huge.jpg', width: 4000 },
            { source: LARGE, width: 2048 },
          ],
        }),
      ),
    )

    await expect(resolveFullSizeUrl(preview, config)).resolves.toBe(LARGE)
  })

  test('keeps the preview when the photo has no Facebook id', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    await expect(resolveFullSizeUrl({ ...preview, photoId: undefined }, config)).resolves.toBe(CDN)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  test('keeps the preview when Facebook refuses the request', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(Response.json({ error: { message: 'no' } }, { status: 403 })),
    )

    await expect(resolveFullSizeUrl(preview, config)).resolves.toBe(CDN)
  })

  test('keeps the preview when the network fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))
    vi.spyOn(console, 'error').mockImplementation(() => undefined)

    await expect(resolveFullSizeUrl(preview, config)).resolves.toBe(CDN)
  })
})

describe('downloadImage', () => {
  function imageResponse(body: BodyInit, headers: Record<string, string> = {}, status = 200) {
    return new Response(body, { status, headers: { 'content-type': 'image/jpeg', ...headers } })
  }

  test('returns the bytes of a Facebook CDN image', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(imageResponse(new Uint8Array([1, 2, 3]))))

    const data = await downloadImage(CDN)

    expect(data.byteLength).toBe(3)
  })

  test('never contacts a host outside the Facebook CDN', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    await expect(downloadImage('https://evil.example/x.jpg')).rejects.toThrow('refusée')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  test('refuses redirects, which could point anywhere', async () => {
    const fetchMock = vi.fn().mockResolvedValue(imageResponse(new Uint8Array([1])))
    vi.stubGlobal('fetch', fetchMock)

    await downloadImage(CDN)

    expect((fetchMock.mock.calls[0] as [string, RequestInit])[1].redirect).toBe('error')
  })

  test('fails on an HTTP error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(imageResponse('', {}, 404)))

    await expect(downloadImage(CDN)).rejects.toThrow('HTTP 404')
  })

  test('refuses something that is not an image', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(imageResponse('<html>', { 'content-type': 'text/html' })),
    )

    await expect(downloadImage(CDN)).rejects.toThrow('Type de fichier inattendu')
  })

  test('refuses an image announced as too heavy before reading it', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          imageResponse(new Uint8Array([1]), { 'content-length': String(MAX_UPLOAD_BYTES + 1) }),
        ),
    )

    await expect(downloadImage(CDN)).rejects.toThrow('trop lourde')
  })

  test('refuses an empty body', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(imageResponse(new Uint8Array())))

    await expect(downloadImage(CDN)).rejects.toThrow('vide')
  })
})
