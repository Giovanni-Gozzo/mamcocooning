/** Owner-only maintenance on a single photo: re-file it, or take it down. */
import { revalidatePath } from 'next/cache'
import { del } from '@vercel/blob'
import { z } from 'zod'
import { fail, ok, toPublicMessage } from '@/lib/api'
import { isAuthenticated } from '@/lib/auth'
import { env } from '@/lib/env'
import { findPhotoById, listAllCategories, movePhotoToCategory, removePhoto } from '@/lib/photos'

export const runtime = 'nodejs'

const MoveSchema = z.object({ categorySlug: z.string().trim().min(1).max(64) })

interface RouteContext {
  params: Promise<{ id: string }>
}

function revalidatePublicPages(): void {
  revalidatePath('/')
  revalidatePath('/galerie')
  revalidatePath('/programmes')
}

export async function PATCH(request: Request, context: RouteContext) {
  if (!(await isAuthenticated())) return fail('Connexion requise.', 401)

  const { id } = await context.params
  const parsed = MoveSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return fail('Catégorie manquante.', 400)

  try {
    const categories = await listAllCategories()
    const exists = categories.some((category) => category.slug === parsed.data.categorySlug)
    if (!exists) return fail('Catégorie inconnue.', 400)

    const photo = await movePhotoToCategory(id, parsed.data.categorySlug)
    if (photo === null) return fail('Photo introuvable.', 404)

    revalidatePublicPages()
    return ok({ photo })
  } catch (error) {
    console.error('[photo:patch] échec', error)
    return fail(toPublicMessage(error, 'Modification impossible.'), 500)
  }
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
    if (photo.source === 'upload' && photo.url.startsWith('https://')) {
      await del(photo.url, { token: env.blobToken ?? undefined }).catch((error: unknown) => {
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
