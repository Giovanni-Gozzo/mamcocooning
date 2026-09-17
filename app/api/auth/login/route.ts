import { z } from 'zod'
import { clientKey, fail, ok } from '@/lib/api'
import { createSessionToken, sessionCookie, verifyPassword } from '@/lib/auth'
import { env, isAdminConfigured } from '@/lib/env'
import { checkRateLimit, resetRateLimit } from '@/lib/rate-limit'

export const runtime = 'nodejs'

const LoginSchema = z.object({ password: z.string().min(1).max(200) })

export async function POST(request: Request) {
  if (!isAdminConfigured()) {
    return fail(
      'L’espace admin n’est pas encore configuré (ADMIN_PASSWORD_HASH et SESSION_SECRET manquants).',
      503,
    )
  }

  const key = clientKey(request)
  const limit = checkRateLimit(key)
  if (!limit.isAllowed) {
    return fail(
      `Trop de tentatives. Réessayez dans ${Math.ceil(limit.retryAfterSeconds / 60)} minutes.`,
      429,
    )
  }

  const parsed = LoginSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return fail('Mot de passe manquant.', 400)

  const storedHash = env.adminPasswordHash
  if (storedHash === null) return fail('Configuration incomplète.', 503)

  const isValid = await verifyPassword(parsed.data.password, storedHash)
  if (!isValid) return fail('Mot de passe incorrect.', 401)

  resetRateLimit(key)

  const response = ok({ authenticated: true })
  response.cookies.set(sessionCookie.name, await createSessionToken(), {
    ...sessionCookie.options,
    maxAge: sessionCookie.maxAge,
  })
  return response
}
