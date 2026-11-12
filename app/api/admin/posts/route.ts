/** Owner-only: starts a publication (its text). Photos and videos are added next. */
import { z } from 'zod'
import { fail, ok, toPublicMessage } from '@/lib/api'
import { isAuthenticated } from '@/lib/auth'
import { isBlobConfigured, isDatabaseConfigured } from '@/lib/env'
import { MAX_POST_TEXT_LENGTH, createDraft } from '@/lib/publications'

export const runtime = 'nodejs'

const BodySchema = z.object({ body: z.string().max(MAX_POST_TEXT_LENGTH).default('') })

export async function POST(request: Request) {
  if (!(await isAuthenticated())) return fail('Connexion requise.', 401)
  if (!isDatabaseConfigured() || !isBlobConfigured()) {
    return fail('La base de données et le stockage doivent être configurés.', 503)
  }

  const parsed = BodySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return fail(`Texte trop long (${MAX_POST_TEXT_LENGTH} caractères maximum).`, 400)

  try {
    return ok({ post: await createDraft(parsed.data.body) }, { status: 201 })
  } catch (error) {
    console.error('[publication] création échouée', error)
    return fail(toPublicMessage(error, 'Création de la publication impossible.'), 500)
  }
}
