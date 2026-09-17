/**
 * Re-files the photos committed to the repository using Gemini, then rewrites
 * data/legacy-photos.json. Run once after adding a GEMINI_API_KEY:
 *   node --env-file=.env.local scripts/classify-legacy.mjs
 * Safe to re-run: photos already carrying a Gemini alt text are skipped unless
 * --force is passed.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import sharp from 'sharp'

const ROOT = new URL('..', import.meta.url).pathname
const MANIFEST = join(ROOT, 'data/legacy-photos.json')
/** Tried in order: flash models are occasionally saturated (HTTP 503). */
const MODELS = ['gemini-3.5-flash', 'gemini-3.1-flash-lite', 'gemini-2.5-flash']
const endpointFor = (model) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`
/** Free tier allows a limited number of requests per minute. */
const DELAY_MS = 4500
const DEFAULT_ALT = 'Un moment de la vie à la MAM Cocooning'

const apiKey = process.env.GEMINI_API_KEY
if (!apiKey) {
  console.error('GEMINI_API_KEY manquant. Lancez avec : node --env-file=.env.local scripts/classify-legacy.mjs')
  process.exit(1)
}

const force = process.argv.includes('--force')
const categories = JSON.parse(readFileSync(join(ROOT, 'data/categories.json'), 'utf8'))
const photos = JSON.parse(readFileSync(MANIFEST, 'utf8'))

const prompt = `Tu classes les photos du quotidien d'une MAM (Maison d'Assistantes Maternelles) française qui accueille des enfants de 0 à 3 ans.

Catégories disponibles :
${categories.map((c) => `- ${c.slug} — ${c.label} : ${c.description}`).join('\n')}

Consignes :
1. "categorySlug" : choisis l'identifiant de la catégorie qui décrit le mieux l'ACTIVITÉ visible. Utilise "le-quotidien" uniquement si vraiment aucune autre ne convient.
2. "alt" : description factuelle et chaleureuse de la scène en français, 160 caractères maximum, pour les lecteurs d'écran.
3. "caption" : légende très courte (3 à 8 mots), ou "".
4. "confidence" : ta certitude entre 0 et 1.
5. CONFIDENTIALITÉ ABSOLUE : ne nomme jamais un enfant, ne décris aucun visage, ne devine ni âge précis, ni genre, ni origine. Dis "un enfant", "les enfants", "des petites mains". Ne relaie aucun texte lisible sur la photo.`

const responseSchema = {
  type: 'OBJECT',
  properties: {
    categorySlug: { type: 'STRING' },
    confidence: { type: 'NUMBER' },
    alt: { type: 'STRING' },
    caption: { type: 'STRING' },
  },
  required: ['categorySlug', 'confidence', 'alt', 'caption'],
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

async function classify(localPath) {
  const base64 = (
    await sharp(localPath)
      .rotate()
      .resize({ width: 768, height: 768, fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 70 })
      .toBuffer()
  ).toString('base64')

  const body = JSON.stringify({
    contents: [
      {
        role: 'user',
        parts: [{ inline_data: { mime_type: 'image/jpeg', data: base64 } }, { text: prompt }],
      },
    ],
    generationConfig: { temperature: 0.2, responseMimeType: 'application/json', responseSchema },
  })

  let text
  let lastError = 'aucun modèle essayé'

  for (const model of MODELS) {
    const response = await fetch(endpointFor(model), {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-goog-api-key': apiKey },
      body,
    })

    if (!response.ok) {
      lastError = `${model}: HTTP ${response.status} — ${(await response.text()).slice(0, 140)}`
      continue
    }

    const payload = await response.json()
    text = payload.candidates?.[0]?.content?.parts?.[0]?.text
    if (typeof text === 'string') break
    lastError = `${model}: réponse sans texte`
  }

  if (typeof text !== 'string') throw new Error(lastError)

  const parsed = JSON.parse(text)
  const known = categories.find((c) => c.slug === parsed.categorySlug)

  return {
    categorySlug: known ? known.slug : 'le-quotidien',
    confidence: Math.min(1, Math.max(0, Number(parsed.confidence) || 0)),
    alt: String(parsed.alt ?? '').trim().slice(0, 160) || DEFAULT_ALT,
    caption: String(parsed.caption ?? '').trim().slice(0, 90) || null,
  }
}

const updated = [...photos]
let done = 0
let failed = 0

for (const [index, photo] of photos.entries()) {
  if (!force && photo.confidence !== null) continue

  const localPath = join(ROOT, 'public', decodeURIComponent(photo.url))

  try {
    const result = await classify(localPath)
    updated[index] = { ...photo, ...result }
    done += 1
    console.log(`[${index + 1}/${photos.length}] ${photo.id} -> ${result.categorySlug} (${result.confidence.toFixed(2)}) ${result.caption ?? ''}`)
  } catch (error) {
    failed += 1
    console.error(`[${index + 1}/${photos.length}] ${photo.id} ÉCHEC : ${error.message}`)
  }

  writeFileSync(MANIFEST, `${JSON.stringify(updated, null, 2)}\n`)
  await sleep(DELAY_MS)
}

const counts = updated.reduce((acc, p) => ({ ...acc, [p.categorySlug]: (acc[p.categorySlug] ?? 0) + 1 }), {})
console.log(`\nTerminé : ${done} classées, ${failed} en échec.`)
console.log(counts)
