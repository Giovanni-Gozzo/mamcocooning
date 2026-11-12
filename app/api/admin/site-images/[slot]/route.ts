/**
 * Owner-only: replace one fixed photo of the site (house tour, team portrait)
 * or go back to the original one.
 */
import { del, put } from '@vercel/blob'
import { nanoid } from 'nanoid'
import { clientKey, fail, ok, toPublicMessage } from '@/lib/api'
import { isAuthenticated } from '@/lib/auth'
import { env, isBlobConfigured, isDatabaseConfigured } from '@/lib/env'
import { MAX_UPLOAD_BYTES, isAcceptedMimeType, prepareForStorage } from '@/lib/image'
import { checkRateLimit } from '@/lib/rate-limit'
import { revalidateSiteImagePages } from '@/lib/revalidate'
import { isKnownSlot, resetSiteImage, setSiteImage } from '@/lib/site-images'

export const runtime = 'nodejs'
export const maxDuration = 60

const FILE_ID_LENGTH = 10
const BLOB_HOST_SUFFIX = '.public.blob.vercel-storage.com'

interface RouteContext {
  params: Promise<{ slot: string }>
}

/** Only files we stored ourselves are deleted; the repository defaults are never touched. */
async function deleteStoredFile(url: string | null): Promise<void> {
  if (url === null) return
  try {
    if (new URL(url).hostname.endsWith(BLOB_HOST_SUFFIX)) {
      await del(url, { token: env.blobToken ?? undefined })
    }
  } catch (error) {
    console.error('[site-images] ancien fichier non supprimé', error)
  }
}

async function guard(request: Request, slot: string): Promise<Response | null> {
  if (!(await isAuthenticated())) return fail('Connexion requise.', 401)
  if (!isKnownSlot(slot)) return fail('Photo inconnue.', 404)
  if (!checkRateLimit(`site-image:${clientKey(request)}`).isAllowed) {
    return fail('Trop de modifications d’affilée. Patientez quelques minutes.', 429)
  }
  if (!isDatabaseConfigured() || !isBlobConfigured()) {
    return fail('La base de données et le stockage doivent être configurés.', 503)
  }
  return null
}

export async function POST(request: Request, context: RouteContext) {
  const { slot } = await context.params
  const refusal = await guard(request, slot)
  if (refusal !== null) return refusal

  const form = await request.formData().catch(() => null)
  const file = form?.get('file')
  if (!(file instanceof File) || file.size === 0) return fail('Aucun fichier reçu.', 400)
  if (file.size > MAX_UPLOAD_BYTES) {
    return fail(`Fichier trop lourd (maximum ${Math.round(MAX_UPLOAD_BYTES / 1024 / 1024)} Mo).`, 413)
  }
  if (!isAcceptedMimeType(file.type)) {
    return fail('Format non pris en charge. Utilisez JPEG, PNG, WebP ou HEIC.', 415)
  }

  try {
    const prepared = await prepareForStorage(await file.arrayBuffer())
    const blob = await put(`site/${slot}/${nanoid(FILE_ID_LENGTH)}.${prepared.extension}`, prepared.data, {
      access: 'public',
      contentType: prepared.mimeType,
      token: env.blobToken ?? undefined,
      addRandomSuffix: false,
    })
    const previous = await setSiteImage(slot, blob.url)
    await deleteStoredFile(previous)
    revalidateSiteImagePages()
    return ok({ slot, url: blob.url }, { status: 201 })
  } catch (error) {
    console.error('[site-images] remplacement échoué', error)
    return fail(toPublicMessage(error, 'Remplacement impossible. Réessayez dans un instant.'), 500)
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  const { slot } = await context.params
  const refusal = await guard(request, slot)
  if (refusal !== null) return refusal

  try {
    await deleteStoredFile(await resetSiteImage(slot))
    revalidateSiteImagePages()
    return ok({ slot })
  } catch (error) {
    console.error('[site-images] retour à l’originale échoué', error)
    return fail(toPublicMessage(error, 'Opération impossible. Réessayez dans un instant.'), 500)
  }
}
