/** The fixed photos of the site: defaults, replacements, and graceful fallbacks. */
import { beforeEach, describe, expect, test, vi } from 'vitest'

const query = vi.fn()
let isConfigured = true

vi.mock('@/lib/db', () => ({
  getSql: () => (isConfigured ? { query } : null),
  requireSql: () => ({ query }),
}))

const {
  SITE_IMAGE_SLOTS,
  applyToHouseTour,
  applyToTeam,
  getSiteImageOverrides,
  isKnownSlot,
  listSiteImages,
  resetSiteImage,
  setSiteImage,
} = await import('@/lib/site-images')
const { HOUSE_TOUR, TEAM } = await import('@/lib/site')

const CUSTOM = 'https://x.public.blob.vercel-storage.com/site/new.webp'
const firstTourSlot = SITE_IMAGE_SLOTS.find((slot) => slot.group === 'maison')!
const firstTeamSlot = SITE_IMAGE_SLOTS.find((slot) => slot.group === 'equipe')!

beforeEach(() => {
  isConfigured = true
  query.mockReset()
  vi.spyOn(console, 'error').mockImplementation(() => undefined)
})

describe('slots', () => {
  test('cover every house tour photo and every team member, with unique ids', () => {
    expect(SITE_IMAGE_SLOTS).toHaveLength(HOUSE_TOUR.length + TEAM.length)
    expect(new Set(SITE_IMAGE_SLOTS.map((slot) => slot.id)).size).toBe(SITE_IMAGE_SLOTS.length)
    expect(firstTourSlot.id).toMatch(/^maison-[a-z0-9-]+$/)
  })

  test('only known slots are accepted', () => {
    expect(isKnownSlot(firstTourSlot.id)).toBe(true)
    expect(isKnownSlot('../../etc/passwd')).toBe(false)
  })
})

describe('overrides', () => {
  test('replace the default photo of the matching slot only', () => {
    const overrides = new Map([
      [firstTourSlot.id, CUSTOM],
      [firstTeamSlot.id, CUSTOM],
    ])

    const tour = applyToHouseTour(overrides)
    const team = applyToTeam(overrides)

    expect(tour[0]?.image).toBe(CUSTOM)
    expect(tour[1]?.image).toBe(HOUSE_TOUR[1]?.image)
    expect(team[0]?.photoUrl).toBe(CUSTOM)
    expect(team[1]?.photoUrl).toBe(TEAM[1]?.photoUrl)
  })

  test('are read from the database', async () => {
    query.mockResolvedValueOnce([{ slot: firstTourSlot.id, url: CUSTOM }])

    const overrides = await getSiteImageOverrides()

    expect(overrides.get(firstTourSlot.id)).toBe(CUSTOM)
  })

  test('are empty without a database', async () => {
    isConfigured = false

    expect((await getSiteImageOverrides()).size).toBe(0)
  })

  test('are empty, silently, before the table is created', async () => {
    query.mockRejectedValueOnce(Object.assign(new Error('missing'), { code: '42P01' }))

    expect((await getSiteImageOverrides()).size).toBe(0)
    expect(console.error).not.toHaveBeenCalled()
  })

  test('are empty, and logged, when the database fails', async () => {
    query.mockRejectedValueOnce(new Error('ECONNRESET'))

    expect((await getSiteImageOverrides()).size).toBe(0)
    expect(console.error).toHaveBeenCalled()
  })
})

describe('listSiteImages', () => {
  test('tells which photos were replaced', async () => {
    query.mockResolvedValueOnce([{ slot: firstTourSlot.id, url: CUSTOM }])

    const images = await listSiteImages()

    expect(images.find((image) => image.id === firstTourSlot.id)).toMatchObject({
      url: CUSTOM,
      isCustom: true,
    })
    expect(images.find((image) => image.id === firstTeamSlot.id)).toMatchObject({
      url: firstTeamSlot.defaultUrl,
      isCustom: false,
    })
  })
})

describe('setSiteImage / resetSiteImage', () => {
  test('stores a replacement and returns the one it replaced', async () => {
    query.mockResolvedValueOnce([{ url: 'old-url' }]).mockResolvedValueOnce([])

    await expect(setSiteImage(firstTourSlot.id, CUSTOM)).resolves.toBe('old-url')
    expect(query.mock.calls[1]?.[1]).toEqual([firstTourSlot.id, CUSTOM])
  })

  test('returns null when the slot still showed its default', async () => {
    query.mockResolvedValueOnce([]).mockResolvedValueOnce([])

    await expect(setSiteImage(firstTourSlot.id, CUSTOM)).resolves.toBeNull()
  })

  test('going back to the original returns the removed replacement', async () => {
    query.mockResolvedValueOnce([{ url: CUSTOM }])
    await expect(resetSiteImage(firstTourSlot.id)).resolves.toBe(CUSTOM)

    query.mockResolvedValueOnce([])
    await expect(resetSiteImage(firstTourSlot.id)).resolves.toBeNull()
  })
})
