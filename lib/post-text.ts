/**
 * Cleans the text of a Facebook post before it is shown on the site.
 *
 * Sigrid writes for the families who follow the page, and a post may mention
 * a child by name. Gemini keeps her words and tone but removes anything that
 * identifies a child or a family. When it cannot be asked, the text is left
 * out entirely: the raw post is never published as is.
 */
import { GoogleGenAI, Type } from '@google/genai'
import { env } from './env'
import { GEMINI_MODELS } from './gemini'

export const MAX_POST_TEXT_LENGTH = 1200
const TIMEOUT_MS = 20_000

const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    text: { type: Type.STRING, description: 'Le texte nettoyé, ou "" s’il ne reste rien d’utile.' },
  },
  required: ['text'],
} as const

const PROMPT = `Tu prépares le texte d'une publication Facebook d'une MAM (Maison d'Assistantes Maternelles) française pour l'afficher sur son site internet public.

Règles :
1. Garde le texte de l'assistante maternelle le plus fidèlement possible : mêmes mots, même ton, mêmes emojis.
2. RÈGLE ABSOLUE : retire tout ce qui permet d'identifier un enfant ou une famille. Remplace les prénoms et surnoms d'enfants par "un enfant", "les enfants", "les petits" ou "un copain", en gardant une phrase naturelle. Retire aussi les noms de famille, les âges précis associés à un enfant, les informations de santé, les adresses, les numéros de téléphone et les détails sur la vie des familles.
3. Les prénoms des assistantes maternelles de l'équipe peuvent rester.
4. Ne rajoute rien, n'invente rien, ne commente pas.
5. Si, une fois nettoyé, il ne reste rien d'utile, renvoie "".

Texte de la publication :
`

/** Removes hashtags and tidies whitespace; the hashtags are Facebook-only markers. */
export function stripHashtags(text: string): string {
  return text
    .replace(/(^|\s)#[\p{L}\p{N}_]+/gu, '$1')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function readCleanedText(raw: string): string | null {
  const parsed: unknown = JSON.parse(raw)
  if (typeof parsed !== 'object' || parsed === null) return null
  const text = (parsed as { text?: unknown }).text
  if (typeof text !== 'string') return null
  const cleaned = stripHashtags(text).slice(0, MAX_POST_TEXT_LENGTH)
  return cleaned.length > 0 ? cleaned : null
}

/** The publication text ready for the site, or null when there is none to show. */
export async function cleanPostText(message: string | undefined): Promise<string | null> {
  const stripped = stripHashtags(message ?? '')
  if (stripped.length === 0) return null

  const apiKey = env.geminiApiKey
  if (apiKey === null) return null

  const ai = new GoogleGenAI({ apiKey })
  for (const model of GEMINI_MODELS) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: [{ role: 'user', parts: [{ text: `${PROMPT}${stripped}` }] }],
        config: {
          responseMimeType: 'application/json',
          responseSchema: RESPONSE_SCHEMA,
          temperature: 0,
          abortSignal: AbortSignal.timeout(TIMEOUT_MS),
        },
      })
      const text = response.text
      if (typeof text !== 'string' || text.trim().length === 0) continue
      return readCleanedText(text)
    } catch (error) {
      console.error(`[post-text] ${model} indisponible, essai du modèle suivant`, error)
    }
  }

  console.error('[post-text] aucun modèle disponible, texte non publié')
  return null
}
