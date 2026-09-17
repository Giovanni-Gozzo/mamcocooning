/**
 * Classification must never block an upload: whatever Gemini returns, the photo
 * has to end up in a valid category.
 */
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

const generateContent = vi.fn()

vi.mock('@google/genai', () => ({
  GoogleGenAI: class {
    models = { generateContent }
  },
  Type: { OBJECT: 'OBJECT', STRING: 'STRING', NUMBER: 'NUMBER' },
}))

const { classifyPhoto, fallbackClassification } = await import('@/lib/gemini')
const { DEFAULT_CATEGORIES, FALLBACK_CATEGORY_SLUG } = await import('@/lib/taxonomy')

const IMAGE = 'ZmFrZQ=='

function respondWith(payload: unknown) {
  generateContent.mockResolvedValueOnce({ text: JSON.stringify(payload) })
}

beforeEach(() => {
  vi.stubEnv('GEMINI_API_KEY', 'cle-de-test')
  generateContent.mockReset()
})

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('classifyPhoto', () => {
  test('returns the fallback without calling the API when no key is configured', async () => {
    vi.stubEnv('GEMINI_API_KEY', '')
    vi.stubEnv('GOOGLE_GENERATIVE_AI_API_KEY', '')

    const result = await classifyPhoto(IMAGE, DEFAULT_CATEGORIES)

    expect(generateContent).not.toHaveBeenCalled()
    expect(result).toEqual(fallbackClassification())
  })

  test('keeps a category the model picked from the existing list', async () => {
    respondWith({
      categorySlug: 'musique',
      confidence: 0.91,
      alt: 'Des enfants découvrent des maracas',
      caption: 'Éveil musical du matin',
    })

    const result = await classifyPhoto(IMAGE, DEFAULT_CATEGORIES)

    expect(result.categorySlug).toBe('musique')
    expect(result.confidence).toBeCloseTo(0.91)
    expect(result.caption).toBe('Éveil musical du matin')
    expect(result.isNewCategory).toBe(false)
  })

  test('creates a new category when the model proposes one', async () => {
    respondWith({
      categorySlug: '',
      confidence: 0.7,
      alt: 'Un enfant observe un escargot',
      caption: '',
      newCategoryLabel: 'Découverte nature',
      newCategoryEmoji: '🐌',
      newCategoryDescription: 'Observation du vivant.',
    })

    const result = await classifyPhoto(IMAGE, DEFAULT_CATEGORIES)

    expect(result.isNewCategory).toBe(true)
    expect(result.categorySlug).toBe('decouverte-nature')
    expect(result.newCategory).toMatchObject({ label: 'Découverte nature', emoji: '🐌' })
    expect(result.caption).toBeNull()
  })

  test('falls back when the model names a category that does not exist and proposes nothing', async () => {
    respondWith({
      categorySlug: 'categorie-inventee',
      confidence: 0.4,
      alt: 'Un moment de jeu',
      caption: '',
    })

    const result = await classifyPhoto(IMAGE, DEFAULT_CATEGORIES)

    expect(result.categorySlug).toBe(FALLBACK_CATEGORY_SLUG)
    expect(result.alt).toBe('Un moment de jeu')
  })

  test('clamps a confidence outside the 0 to 1 range', async () => {
    respondWith({ categorySlug: 'lecture', confidence: 8, alt: 'Une histoire', caption: '' })

    await expect(classifyPhoto(IMAGE, DEFAULT_CATEGORIES)).resolves.toMatchObject({
      confidence: 1,
    })
  })

  test('truncates an over-long alt text rather than storing it whole', async () => {
    respondWith({
      categorySlug: 'lecture',
      confidence: 0.5,
      alt: 'a'.repeat(400),
      caption: '',
    })

    const result = await classifyPhoto(IMAGE, DEFAULT_CATEGORIES)

    expect(result.alt).toHaveLength(160)
  })

  test('tries the next model when the first one is unavailable', async () => {
    generateContent.mockRejectedValueOnce(new Error('503 high demand'))
    respondWith({ categorySlug: 'jardinage', confidence: 0.8, alt: 'Des semis', caption: '' })

    const result = await classifyPhoto(IMAGE, DEFAULT_CATEGORIES)

    expect(generateContent).toHaveBeenCalledTimes(2)
    expect(result.categorySlug).toBe('jardinage')
  })

  test('falls back when every model is unavailable', async () => {
    generateContent.mockRejectedValue(new Error('503 high demand'))

    const result = await classifyPhoto(IMAGE, DEFAULT_CATEGORIES)

    expect(result).toEqual(fallbackClassification())
  })

  test('falls back when the response is not valid JSON', async () => {
    generateContent.mockResolvedValue({ text: 'ceci nest pas du json' })

    await expect(classifyPhoto(IMAGE, DEFAULT_CATEGORIES)).resolves.toEqual(
      fallbackClassification(),
    )
  })

  test('skips a model that answers with an empty body', async () => {
    generateContent.mockResolvedValueOnce({ text: '' })
    respondWith({ categorySlug: 'repas', confidence: 0.6, alt: 'À table', caption: '' })

    await expect(classifyPhoto(IMAGE, DEFAULT_CATEGORIES)).resolves.toMatchObject({
      categorySlug: 'repas',
    })
  })
})
