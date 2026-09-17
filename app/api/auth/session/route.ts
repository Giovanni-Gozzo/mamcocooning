import { ok } from '@/lib/api'
import { isAuthenticated } from '@/lib/auth'
import { isAdminConfigured } from '@/lib/env'

export const runtime = 'nodejs'

export async function GET() {
  return ok({ authenticated: await isAuthenticated(), configured: isAdminConfigured() })
}
