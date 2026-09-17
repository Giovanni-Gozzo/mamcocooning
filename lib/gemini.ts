/**
 * Gemini sorts each uploaded photo into a category and writes its alt text.
 *
 * It may propose a brand-new category when nothing fits, which is what keeps
 * the site's sections growing on their own. Classification never blocks an
 * upload: on any failure the photo lands in the fallback category and can be
 * moved by hand from the admin panel.
 */
import { GoogleGenAI, Type } from '@google/genai'
import { env } from './env'
import { FALLBACK_CATEGORY_SLUG, toSlug } from './taxonomy'
import type { Category, Classification } from './types'

/**
 * Tried in order. Google's flash models are occasionally saturated (HTTP 503),
 * so a lighter sibling takes over rather than dropping the photo into the
 * fallback category.
 */
const MODELS = ['gemini-3.5-flash', 'gemini-3.1-flash-lite', 'gemini-2.5-flash'] as const
const TIMEOUT_MS = 20_000
const MAX_ALT_LENGTH = 160
const MAX_CAPTION_LENGTH = 90

const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    categorySlug: {
      type: Type.STRING,
      description: 'Identifiant de la catégorie existante la plus adaptée, ou "" si aucune ne convient.',
    },
    confidence: { type: Type.NUMBER, description: 'Confiance entre 0 et 1.' },
    alt: { type: Type.STRING, description: 'Description courte de la scène, en français.' },
    caption: { type: Type.STRING, description: 'Légende de 3 à 8 mots, ou "".' },
    newCategoryLabel: { type: Type.STRING, description: 'Nom de la nouvelle catégorie, ou "".' },
    newCategoryEmoji: { type: Type.STRING, description: 'Un seul emoji, ou "".' },
    newCategoryDescription: { type: Type.STRING, description: 'Une phrase, ou "".' },
  },
  required: ['categorySlug', 'confidence', 'alt', 'caption'],
} as const

function buildPrompt(categories: readonly Category[]): string {
  const list = categories
    .map((category) => `- ${category.slug} — ${category.label} : ${category.description}`)
    .join('\n')

  return `Tu classes les photos du quotidien d'une MAM (Maison d'Assistantes Maternelles) française qui accueille des enfants de 0 à 3 ans.

Catégories existantes :
${list}

Consignes :
1. Choisis l'identifiant (slug) de la catégorie existante qui décrit le mieux l'ACTIVITÉ visible sur la photo.
2. Si et seulement si aucune catégorie existante ne convient vraiment, renvoie categorySlug = "" et propose une nouvelle catégorie (newCategoryLabel en français, newCategoryEmoji, newCategoryDescription). Reste générique et durable : une activité qui reviendra, pas un événement unique.
3. Rédige "alt" : une description factuelle et chaleureuse de la scène en français, pour les lecteurs d'écran. Maximum ${MAX_ALT_LENGTH} caractères.
4. Rédige "caption" : une légende très courte (3 à 8 mots) affichée sous la photo, ou "" si rien de pertinent.
5. RÈGLE ABSOLUE DE CONFIDENTIALITÉ : ne nomme jamais un enfant, ne décris jamais un visage, ne devine ni l'âge précis, ni le genre, ni l'origine, ni aucun signe distinctif. Parle de "un enfant", "les enfants", "des petites mains". Ne mentionne aucun texte lisible (prénom sur un porte-manteau, étiquette, plaque).
6. "confidence" reflète ta certitude sur la catégorie, entre 0 et 1.`
}

interface RawResponse {
  categorySlug?: unknown
  confidence?: unknown
  alt?: unknown
  caption?: unknown
  newCategoryLabel?: unknown
  newCategoryEmoji?: unknown
  newCategoryDescription?: unknown
}

function asTrimmedString(value: unknown, maxLength: number): string {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : ''
}

function asConfidence(value: unknown): number {
  const parsed = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(parsed)) return 0
  return Math.min(1, Math.max(0, parsed))
}

/** Result used whenever Gemini is unavailable or returns something unusable. */
export function fallbackClassification(): Classification {
  return {
    categorySlug: FALLBACK_CATEGORY_SLUG,
    confidence: 0,
    alt: 'Un moment de la vie à la MAM Cocooning',
    caption: null,
    isNewCategory: false,
    newCategory: null,
  }
}

function interpret(raw: RawResponse, categories: readonly Category[]): Classification {
  const alt = asTrimmedString(raw.alt, MAX_ALT_LENGTH) || 'Un moment de la vie à la MAM Cocooning'
  const caption = asTrimmedString(raw.caption, MAX_CAPTION_LENGTH)
  const confidence = asConfidence(raw.confidence)

  const proposedSlug = asTrimmedString(raw.categorySlug, 64)
  const known = categories.find((category) => category.slug === proposedSlug)
  if (known !== undefined) {
    return {
      categorySlug: known.slug,
      confidence,
      alt,
      caption: caption || null,
      isNewCategory: false,
      newCategory: null,
    }
  }

  const newLabel = asTrimmedString(raw.newCategoryLabel, 40)
  const newSlug = toSlug(newLabel)
  if (newLabel.length >= 3 && newSlug.length >= 3) {
    return {
      categorySlug: newSlug,
      confidence,
      alt,
      caption: caption || null,
      isNewCategory: true,
      newCategory: {
        slug: newSlug,
        label: newLabel,
        emoji: asTrimmedString(raw.newCategoryEmoji, 4) || '✨',
        description: asTrimmedString(raw.newCategoryDescription, 160),
      },
    }
  }

  return { ...fallbackClassification(), alt, caption: caption || null }
}

export async function classifyPhoto(
  imageBase64: string,
  categories: readonly Category[],
): Promise<Classification> {
  const apiKey = env.geminiApiKey
  if (apiKey === null) return fallbackClassification()

  const ai = new GoogleGenAI({ apiKey })
  const prompt = buildPrompt(categories)

  for (const model of MODELS) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: [
          {
            role: 'user',
            parts: [
              { inlineData: { mimeType: 'image/jpeg', data: imageBase64 } },
              { text: prompt },
            ],
          },
        ],
        config: {
          responseMimeType: 'application/json',
          responseSchema: RESPONSE_SCHEMA,
          temperature: 0.2,
          abortSignal: AbortSignal.timeout(TIMEOUT_MS),
        },
      })

      const text = response.text
      if (typeof text !== 'string' || text.trim().length === 0) {
        console.error(`[gemini] réponse vide de ${model}`)
        continue
      }

      return interpret(JSON.parse(text) as RawResponse, categories)
    } catch (error) {
      console.error(`[gemini] ${model} indisponible, essai du modèle suivant`, error)
    }
  }

  console.error('[gemini] aucun modèle disponible, catégorie par défaut appliquée')
  return fallbackClassification()
}
