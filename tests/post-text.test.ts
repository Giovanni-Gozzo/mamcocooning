/**
 * The text of a Facebook post must never reach the site raw: either Gemini
 * cleaned it, or nothing is shown.
 */
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

const generateContent = vi.fn()

vi.mock('@google/genai', () => ({
  GoogleGenAI: class {
    models = { generateContent }
  },
  Type: { OBJECT: 'OBJECT', STRING: 'STRING', NUMBER: 'NUMBER' },
}))

const { MAX_POST_TEXT_LENGTH, cleanPostText, stripHashtags } = await import('@/lib/post-text')

const RAW = 'Atelier peinture avec Léo ce matin 🎨 #site #mam'

beforeEach(() => {
  vi.stubEnv('GEMINI_API_KEY', 'cle-de-test')
  generateContent.mockReset()
  vi.spyOn(console, 'error').mockImplementation(() => undefined)
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})

describe('stripHashtags', () => {
  test('removes every hashtag and tidies the spacing', () => {
    expect(stripHashtags('Pâte à sel #site   aujourd’hui\n\n\n\n#mam_cocooning')).toBe(
      'Pâte à sel aujourd’hui',
    )
  })

  test('keeps a # that is not a hashtag', () => {
    expect(stripHashtags('Atelier n°#1 ? Non : atelier # 1')).toBe('Atelier n°#1 ? Non : atelier # 1')
  })
})

describe('cleanPostText', () => {
  test('returns the text Gemini cleaned, without hashtags', async () => {
    generateContent.mockResolvedValueOnce({
      text: JSON.stringify({ text: 'Atelier peinture avec un enfant ce matin 🎨 #site' }),
    })

    await expect(cleanPostText(RAW)).resolves.toBe('Atelier peinture avec un enfant ce matin 🎨')
  })

  test('sends the text already stripped of its hashtags', async () => {
    generateContent.mockResolvedValueOnce({ text: JSON.stringify({ text: 'ok' }) })

    await cleanPostText(RAW)

    const prompt = generateContent.mock.calls[0]?.[0].contents[0].parts[0].text as string
    expect(prompt.endsWith('Atelier peinture avec Léo ce matin 🎨')).toBe(true)
  })

  test('never publishes the raw text when no Gemini key is configured', async () => {
    vi.stubEnv('GEMINI_API_KEY', '')
    vi.stubEnv('GOOGLE_GENERATIVE_AI_API_KEY', '')

    await expect(cleanPostText(RAW)).resolves.toBeNull()
    expect(generateContent).not.toHaveBeenCalled()
  })

  test('returns null for a post that only holds hashtags', async () => {
    await expect(cleanPostText('#site')).resolves.toBeNull()
    await expect(cleanPostText(undefined)).resolves.toBeNull()
    expect(generateContent).not.toHaveBeenCalled()
  })

  test('falls back to the next model when one is unavailable', async () => {
    generateContent
      .mockRejectedValueOnce(new Error('503'))
      .mockResolvedValueOnce({ text: '' })
      .mockResolvedValueOnce({ text: JSON.stringify({ text: 'Bonne journée !' }) })

    await expect(cleanPostText(RAW)).resolves.toBe('Bonne journée !')
  })

  test('publishes no text at all when every model fails', async () => {
    generateContent.mockRejectedValue(new Error('503'))

    await expect(cleanPostText(RAW)).resolves.toBeNull()
  })

  test('returns null when Gemini finds nothing worth keeping', async () => {
    generateContent.mockResolvedValueOnce({ text: JSON.stringify({ text: '' }) })

    await expect(cleanPostText(RAW)).resolves.toBeNull()
  })

  test('returns null for an answer with an unexpected shape', async () => {
    generateContent.mockResolvedValueOnce({ text: JSON.stringify({ message: 'x' }) })
    await expect(cleanPostText(RAW)).resolves.toBeNull()

    generateContent.mockResolvedValueOnce({ text: 'null' })
    await expect(cleanPostText(RAW)).resolves.toBeNull()
  })

  test('caps very long texts', async () => {
    generateContent.mockResolvedValueOnce({ text: JSON.stringify({ text: 'a'.repeat(5000) }) })

    const cleaned = await cleanPostText(RAW)

    expect(cleaned).toHaveLength(MAX_POST_TEXT_LENGTH)
  })
})
