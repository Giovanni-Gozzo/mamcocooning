/**
 * Neon Postgres access. Returns null when no database is configured yet.
 *
 * The client heals itself: when a query hits a table or column that does not
 * exist yet — typically right after a deploy that changed the schema — the
 * schema is applied once and the query retried. Nobody has to remember to
 * click "Initialiser la base" after an update.
 */
import { neon, type NeonQueryFunction } from '@neondatabase/serverless'
import { env } from './env'
import { applySchema } from './migrate'

type RawSql = NeonQueryFunction<false, false>

export interface SqlClient {
  query(text: string, params?: unknown[]): Promise<unknown>
}

/** undefined_table, undefined_column: the schema is behind the code. */
const SCHEMA_ERROR_CODES = new Set(['42P01', '42703'])

let cachedUrl: string | null = null
let raw: RawSql | null = null
let client: SqlClient | null = null
let pendingMigration: Promise<void> | null = null

export function isSchemaError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    SCHEMA_ERROR_CODES.has(String((error as { code?: unknown }).code))
  )
}

/** One migration at a time per instance; a failed one can be tried again later. */
function migrateOnce(driver: RawSql): Promise<void> {
  pendingMigration ??= applySchema((text, params) => driver.query(text, params))
    .then(() => {
      console.info('[db] schéma mis à jour automatiquement')
    })
    .catch((error: unknown) => {
      pendingMigration = null
      throw error
    })
  return pendingMigration
}

function selfHealing(driver: RawSql): SqlClient {
  return {
    async query(text, params) {
      try {
        return await driver.query(text, params)
      } catch (error) {
        if (!isSchemaError(error)) throw error
        await migrateOnce(driver)
        return driver.query(text, params)
      }
    },
  }
}

function connect(): void {
  const url = env.databaseUrl
  if (url === cachedUrl) return
  cachedUrl = url
  raw = url === null ? null : neon(url)
  client = raw === null ? null : selfHealing(raw)
  pendingMigration = null
}

export function getSql(): SqlClient | null {
  connect()
  return client
}

const MISSING_DATABASE =
  'Base de données non configurée. Ajoutez DATABASE_URL dans les variables d’environnement Vercel.'

/** Throws a clear error instead of a driver-level one when the DB is missing. */
export function requireSql(): SqlClient {
  const sql = getSql()
  if (sql === null) throw new Error(MISSING_DATABASE)
  return sql
}

/** The bare driver, for the migration itself. */
export function requireRawSql(): RawSql {
  connect()
  if (raw === null) throw new Error(MISSING_DATABASE)
  return raw
}
