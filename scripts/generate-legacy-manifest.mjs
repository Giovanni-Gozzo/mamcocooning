/**
 * One-off generator: walks public/img and writes data/legacy-photos.json.
 * Runs `sips` (macOS) to read real pixel dimensions so the gallery can reserve
 * the right aspect ratio before an image loads.
 */
import { execFileSync } from 'node:child_process'
import { readdirSync, statSync, writeFileSync } from 'node:fs'
import { join, relative } from 'node:path'

const ROOT = new URL('..', import.meta.url).pathname
const IMG_DIR = join(ROOT, 'public/img')

/** Folder -> category mapping, most specific first. */
const FOLDER_CATEGORIES = [
  ['activite/manuel', 'activite-manuelle'],
  ['activite/musique', 'musique'],
  ['activite', 'le-quotidien'],
  ['divers', 'le-quotidien'],
]

/** Illustrations and cut-outs used by the layout, never gallery photos. */
const EXCLUDED = /(removebg|remove background|rainbow-|doodle|instruments|drape|book png|dessin|motricité background|écureuil|bdkf|photo 687|dcg from|img_0428|img_2063|carroussel)/i

const ALLOWED_EXT = /\.(jpe?g|png)$/i

function walk(dir) {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry)
    return statSync(full).isDirectory() ? walk(full) : [full]
  })
}

function dimensions(file) {
  try {
    const out = execFileSync('sips', ['-g', 'pixelWidth', '-g', 'pixelHeight', file], {
      encoding: 'utf8',
    })
    const width = Number(out.match(/pixelWidth:\s*(\d+)/)?.[1] ?? 0)
    const height = Number(out.match(/pixelHeight:\s*(\d+)/)?.[1] ?? 0)
    return width > 0 && height > 0 ? { width, height } : null
  } catch {
    return null
  }
}

function categoryFor(relativePath) {
  const match = FOLDER_CATEGORIES.find(([folder]) => relativePath.startsWith(`${folder}/`))
  return match ? match[1] : 'le-quotidien'
}

const photos = walk(IMG_DIR)
  .map((file) => relative(IMG_DIR, file))
  .filter((rel) => ALLOWED_EXT.test(rel) && !EXCLUDED.test(rel))
  .sort()
  .map((rel, index) => {
    const size = dimensions(join(IMG_DIR, rel))
    if (size === null) return null
    const categorySlug = categoryFor(rel)
    return {
      id: `legacy-${String(index + 1).padStart(3, '0')}`,
      url: `/img/${rel.split('/').map(encodeURIComponent).join('/')}`,
      width: size.width,
      height: size.height,
      alt: 'Un moment de la vie à la MAM Cocooning',
      caption: null,
      categorySlug,
      confidence: null,
      source: 'legacy',
      createdAt: new Date('2024-01-01T09:00:00Z').toISOString(),
    }
  })
  .filter((photo) => photo !== null)

writeFileSync(join(ROOT, 'data/legacy-photos.json'), `${JSON.stringify(photos, null, 2)}\n`)

const counts = photos.reduce((acc, p) => ({ ...acc, [p.categorySlug]: (acc[p.categorySlug] ?? 0) + 1 }), {})
console.log(`${photos.length} photos ->`, counts)
