/**
 * GET  — public listing, optionally scoped to one category.
 * POST — owner-only upload: strip metadata, ask Gemini to sort it, store it.
 */
import { revalidatePath } from 'next/cache'
import { put } from '@vercel/blob'
import { nanoid } from 'nanoid'
import { z } from 'zod'
import { clientKey, fail, ok, toPublicMessage } from '@/lib/api'
import { isAuthenticated } from '@/lib/auth'
import { env, isBlobConfigured, isDatabaseConfigured } from '@/lib/env'
import { classifyPhoto } from '@/lib/gemini'
import {
  MAX_UPLOAD_BYTES,
  isAcceptedMimeType,
  prepareForAnalysis,
  prepareForStorage,
} from '@/lib/image'
import { createPhoto, ensureCategory, listAllCategories, listPhotos } from '@/lib/photos'
import { checkRateLimit } from '@/lib/rate-limit'

export const runtime = 'nodejs'
export const maxDuration = 60

const QuerySchema = z.object({
  category: z.string().trim().min(1).max(64).optional(),
  limit: z.coerce.number().int().min(1).max(500).optional(),
  offset: z.coerce.number().int().min(0).max(10_000).optional(),
})

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams
  const parsed = QuerySchema.safeParse({
    category: params.get('category') ?? undefined,
    limit: params.get('limit') ?? undefined,
    offset: params.get('offset') ?? undefined,
  })

  if (!parsed.success) return fail('Paramètres de recherche invalides.', 400)

  const photos = await listPhotos({
    categorySlug: parsed.data.category,
    limit: parsed.data.limit,
    offset: parsed.data.offset,
  })
  return ok({ photos })
}

export async function POST(request: Request) {
  if (!(await isAuthenticated())) return fail('Connexion requise.', 401)

  const limit = checkRateLimit(`upload:${clientKey(request)}`)
  if (!limit.isAllowed) return fail('Trop d’envois d’affilée. Patientez quelques minutes.', 429)

  if (!isDatabaseConfigured()) {
    return fail('Base de données non configurée : ajoutez DATABASE_URL puis relancez.', 503)
  }
  if (!isBlobConfigured()) {
    return fail('Stockage non configuré : ajoutez BLOB_READ_WRITE_TOKEN puis relancez.', 503)
  }

  const form = await request.formData().catch(() => null)
  const file = form?.get('file')

  if (!(file instanceof File)) return fail('Aucun fichier reçu.', 400)
  if (file.size === 0) return fail('Le fichier est vide.', 400)
  if (file.size > MAX_UPLOAD_BYTES) {
    return fail(`Fichier trop lourd (maximum ${Math.round(MAX_UPLOAD_BYTES / 1024 / 1024)} Mo).`, 413)
  }
  if (!isAcceptedMimeType(file.type)) {
    return fail('Format non pris en charge. Utilisez JPEG, PNG, WebP ou HEIC.', 415)
  }

  try {
    const prepared = await prepareForStorage(await file.arrayBuffer())
    const categories = await listAllCategories()
    const analysisImage = await prepareForAnalysis(prepared.data)
    const classification = await classifyPhoto(analysisImage, categories)

    const categorySlug =
      classification.isNewCategory && classification.newCategory !== null
        ? await ensureCategory(classification.newCategory)
        : classification.categorySlug

    const id = nanoid(12)
    const blob = await put(`photos/${categorySlug}/${id}.${prepared.extension}`, prepared.data, {
      access: 'public',
      contentType: prepared.mimeType,
      token: env.blobToken ?? undefined,
      addRandomSuffix: false,
    })

    const photo = await createPhoto({
      id,
      url: blob.url,
      width: prepared.width,
      height: prepared.height,
      alt: classification.alt,
      caption: classification.caption,
      categorySlug,
      confidence: classification.confidence,
    })

    revalidatePath('/')
    revalidatePath('/galerie')
    revalidatePath('/programmes')

    return ok({ photo, createdCategory: classification.isNewCategory }, { status: 201 })
  } catch (error) {
    console.error('[upload] échec', error)
    return fail(toPublicMessage(error, 'Envoi impossible. Réessayez dans un instant.'), 500)
  }
}
