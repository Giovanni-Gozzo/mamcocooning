/** Owner-only: take a photo or video down. */
import { del } from '@vercel/blob'
import { fail, ok, toPublicMessage } from '@/lib/api'
import { isAuthenticated } from '@/lib/auth'
import { env } from '@/lib/env'
import { findPhotoById, removePhoto } from '@/lib/photos'
import { revalidatePublicPages } from '@/lib/revalidate'

export const runtime = 'nodejs'


interface RouteContext {
  params: Promise<{ id: string }>
}

export async function DELETE(_request: Request, context: RouteContext) {
  if (!(await isAuthenticated())) return fail('Connexion requise.', 401)

  const { id } = await context.params

  try {
    const photo = await findPhotoById(id)
    if (photo === null) return fail('Photo introuvable.', 404)

    const wasRemoved = await removePhoto(id)
    if (!wasRemoved) return fail('Photo introuvable.', 404)

    // Removing the stored file is best-effort: the row is gone either way, and
    // a stray blob costs less than leaving a photo visible on the site.
    // A video also has its poster frame stored next to it.
    const storedFiles = [photo.url, photo.posterUrl].filter(
      (url): url is string => url !== null && url.startsWith('https://'),
    )
    if (photo.source !== 'legacy' && storedFiles.length > 0) {
      await del(storedFiles, { token: env.blobToken ?? undefined }).catch((error: unknown) => {
        console.error('[photo:delete] fichier non retiré du stockage', error)
      })
    }

    revalidatePublicPages()
    return ok({ id })
  } catch (error) {
    console.error('[photo:delete] échec', error)
    return fail(toPublicMessage(error, 'Suppression impossible.'), 500)
  }
}
