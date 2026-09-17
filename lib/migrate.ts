/** Applies the schema and syncs the seed categories. Idempotent. */
import { requireSql } from './db'
import { SCHEMA_STATEMENTS } from './schema'
import { DEFAULT_CATEGORIES } from './taxonomy'

export interface MigrationReport {
  readonly statementsApplied: number
  readonly categoriesSynced: number
}

export async function runMigration(): Promise<MigrationReport> {
  const sql = requireSql()

  for (const statement of SCHEMA_STATEMENTS) {
    await sql.query(statement)
  }

  for (const category of DEFAULT_CATEGORIES) {
    await sql.query(
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
