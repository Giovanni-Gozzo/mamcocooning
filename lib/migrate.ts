/** Applies the schema and syncs the seed categories. Idempotent. */
import { SCHEMA_STATEMENTS } from './schema'
import { DEFAULT_CATEGORIES } from './taxonomy'

export interface MigrationReport {
  readonly statementsApplied: number
  readonly categoriesSynced: number
}

/** Runs one SQL statement. Given the raw driver, so a migration never triggers itself. */
export type StatementRunner = (text: string, params?: unknown[]) => Promise<unknown>

export async function applySchema(run: StatementRunner): Promise<MigrationReport> {
  for (const statement of SCHEMA_STATEMENTS) {
    await run(statement)
  }

  for (const category of DEFAULT_CATEGORIES) {
    await run(
      `insert into categories (slug, label, emoji, description, sort_order)
       values ($1, $2, $3, $4, $5)
       on conflict (slug) do update
         set label = excluded.label,
             emoji = excluded.emoji,
             description = excluded.description,
             sort_order = excluded.sort_order`,
      [category.slug, category.label, category.emoji, category.description, category.sortOrder],
    )
  }

  return {
    statementsApplied: SCHEMA_STATEMENTS.length,
    categoriesSynced: DEFAULT_CATEGORIES.length,
  }
}

/** The "Initialiser la base" button. Day to day, lib/db.ts runs the same thing on its own. */
export async function runMigration(): Promise<MigrationReport> {
  const { requireRawSql } = await import('./db')
  const raw = requireRawSql()
  return applySchema((text, params) => raw.query(text, params))
}
