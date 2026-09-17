/** Neon Postgres access. Returns null when no database is configured yet. */
import { neon, type NeonQueryFunction } from '@neondatabase/serverless'
import { env } from './env'

let cached: NeonQueryFunction<false, false> | null = null

export function getSql(): NeonQueryFunction<false, false> | null {
  const url = env.databaseUrl
  if (url === null) return null
  if (cached === null) cached = neon(url)
  return cached
}

/** Throws a clear error instead of a driver-level one when the DB is missing. */
export function requireSql(): NeonQueryFunction<false, false> {
  const sql = getSql()
  if (sql === null) {
    throw new Error(
      'Base de données non configurée. Ajoutez DATABASE_URL dans les variables d’environnement Vercel.',
    )
  }
  return sql
}
