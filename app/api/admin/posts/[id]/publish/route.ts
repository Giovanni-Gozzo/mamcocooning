/** Owner-only: puts the whole publication online at once. */
import { fail, ok, toPublicMessage } from '@/lib/api'
import { isAuthenticated } from '@/lib/auth'
import { publishDraft } from '@/lib/publications'
import { revalidatePublicPages } from '@/lib/revalidate'

export const runtime = 'nodejs'

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function POST(_request: Request, context: RouteContext) {
  if (!(await isAuthenticated())) return fail('Connexion requise.', 401)

  const { id } = await context.params
  try {
    const published = await publishDraft(id)
    if (published === null) return fail('Publication introuvable.', 404)
    revalidatePublicPages()
    return ok({ published })
  } catch (error) {
    console.error('[publication] mise en ligne échouée', error)
    return fail(toPublicMessage(error, 'Mise en ligne impossible.'), 500)
  }
}
