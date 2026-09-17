import { afterEach, describe, expect, test, vi } from 'vitest'
import {
  env,
  isAdminConfigured,
  isBlobConfigured,
  isDatabaseConfigured,
  missingAdminConfig,
} from '@/lib/env'

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('env readers', () => {
  test('treat a blank value as absent', () => {
    vi.stubEnv('DATABASE_URL', '   ')
    vi.stubEnv('POSTGRES_URL', '')

    expect(env.databaseUrl).toBeNull()
    expect(isDatabaseConfigured()).toBe(false)
  })

  test('trim surrounding whitespace, which is easy to paste in by mistake', () => {
    vi.stubEnv('BLOB_READ_WRITE_TOKEN', '  vercel_blob_rw_xxx  ')

    expect(env.blobToken).toBe('vercel_blob_rw_xxx')
    expect(isBlobConfigured()).toBe(true)
  })

  test('fall back to POSTGRES_URL, which Vercel sets on some integrations', () => {
    vi.stubEnv('DATABASE_URL', '')
    vi.stubEnv('POSTGRES_URL', 'postgres://exemple')

    expect(env.databaseUrl).toBe('postgres://exemple')
  })

  test('accept either name for the Gemini key', () => {
    vi.stubEnv('GEMINI_API_KEY', '')
    vi.stubEnv('GOOGLE_GENERATIVE_AI_API_KEY', 'cle')

    expect(env.geminiApiKey).toBe('cle')
  })

  test('use the production domain when no site URL is given', () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', '')

    expect(env.siteUrl).toBe('https://mamcocooning.fr')
  })
})

describe('missingAdminConfig', () => {
  test('lists every variable that still has to be set', () => {
    for (const name of [
      'ADMIN_PASSWORD_HASH',
      'SESSION_SECRET',
      'DATABASE_URL',
      'POSTGRES_URL',
      'BLOB_READ_WRITE_TOKEN',
      'GEMINI_API_KEY',
      'GOOGLE_GENERATIVE_AI_API_KEY',
    ]) {
      vi.stubEnv(name, '')
    }

    expect(missingAdminConfig()).toEqual([
      'ADMIN_PASSWORD_HASH',
      'SESSION_SECRET',
      'DATABASE_URL',
      'BLOB_READ_WRITE_TOKEN',
      'GEMINI_API_KEY',
    ])
    expect(isAdminConfigured()).toBe(false)
  })

  test('is empty once everything is configured', () => {
    vi.stubEnv('ADMIN_PASSWORD_HASH', 'sel:hash')
    vi.stubEnv('SESSION_SECRET', 'secret')
    vi.stubEnv('DATABASE_URL', 'postgres://exemple')
    vi.stubEnv('BLOB_READ_WRITE_TOKEN', 'jeton')
    vi.stubEnv('GEMINI_API_KEY', 'cle')

    expect(missingAdminConfig()).toEqual([])
    expect(isAdminConfigured()).toBe(true)
  })
})
