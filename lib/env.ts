/**
 * Environment access. Every optional integration degrades gracefully: without a
 * database the site still renders the photos committed to the repository, and
 * without a Gemini key uploads fall back to manual category selection.
 */

function read(name: string): string | null {
  const value = process.env[name]
  return value && value.trim().length > 0 ? value.trim() : null
}

export const env = {
  get databaseUrl(): string | null {
    return read('DATABASE_URL') ?? read('POSTGRES_URL')
  },
  get blobToken(): string | null {
    return read('BLOB_READ_WRITE_TOKEN')
  },
  get geminiApiKey(): string | null {
    return read('GEMINI_API_KEY') ?? read('GOOGLE_GENERATIVE_AI_API_KEY')
  },
  get adminPasswordHash(): string | null {
    return read('ADMIN_PASSWORD_HASH')
  },
  get sessionSecret(): string | null {
    return read('SESSION_SECRET')
  },
  get siteUrl(): string {
    return read('NEXT_PUBLIC_SITE_URL') ?? 'https://mamcocooning.fr'
  },
  get isProduction(): boolean {
    return process.env.NODE_ENV === 'production'
  },
} as const

export const isDatabaseConfigured = (): boolean => env.databaseUrl !== null
export const isBlobConfigured = (): boolean => env.blobToken !== null
export const isAdminConfigured = (): boolean =>
  env.adminPasswordHash !== null && env.sessionSecret !== null

/** Lists what still needs configuring, for the admin diagnostics panel. */
export function missingAdminConfig(): readonly string[] {
  const missing: string[] = []
  if (env.adminPasswordHash === null) missing.push('ADMIN_PASSWORD_HASH')
  if (env.sessionSecret === null) missing.push('SESSION_SECRET')
  if (env.databaseUrl === null) missing.push('DATABASE_URL')
  if (env.blobToken === null) missing.push('BLOB_READ_WRITE_TOKEN')
  if (env.geminiApiKey === null) missing.push('GEMINI_API_KEY')
  return missing
}
