/** Owner-only: turns one uploaded file into a photo or video of the publication. */
import { z } from 'zod'
import { fail, ok, toPublicMessage } from '@/lib/api'
import { isAuthenticated } from '@/lib/auth'
import { addMedia } from '@/lib/publications'

export const runtime = 'nodejs'
// Videos are re-encoded here: give ffmpeg room.
export const maxDuration = 300

const BodySchema = z.object({
  url: z.string().url().max(2048),
  kind: z.enum(['image', 'video']),
})

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function POST(request: Request, context: RouteContext) {
  if (!(await isAuthenticated())) return fail('Connexion requise.', 401)

  const { id } = await context.params
  const parsed = BodySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return fail('Fichier invalide.', 400)

  try {
    const photo = await addMedia(id, parsed.data.url, parsed.data.kind)
    if (photo === null) return fail('Publication introuvable.', 404)
    return ok({ photo }, { status: 201 })
  } catch (error) {
    console.error('[publication] ajout échoué', error)
    return fail(toPublicMessage(error, 'Ce fichier n’a pas pu être ajouté.'), 500)
  }
}
