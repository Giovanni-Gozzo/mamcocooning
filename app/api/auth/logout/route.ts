import { ok } from '@/lib/api'
import { sessionCookie } from '@/lib/auth'

export const runtime = 'nodejs'

export async function POST() {
  const response = ok({ authenticated: false })
  response.cookies.set(sessionCookie.name, '', { ...sessionCookie.options, maxAge: 0 })
  return response
}
