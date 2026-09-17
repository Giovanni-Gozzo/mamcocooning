import { describe, expect, test } from 'vitest'
import { hashPassword, verifyPassword } from '@/lib/auth'

describe('password hashing', () => {
  test('a freshly hashed password verifies', async () => {
    const stored = await hashPassword('un mot de passe solide')

    await expect(verifyPassword('un mot de passe solide', stored)).resolves.toBe(true)
  })

  test('a wrong password does not verify', async () => {
    const stored = await hashPassword('un mot de passe solide')

    await expect(verifyPassword('un mot de passe SOLIDE', stored)).resolves.toBe(false)
  })

  test('hashing the same password twice yields different salts', async () => {
    const first = await hashPassword('identique')
    const second = await hashPassword('identique')

    expect(first).not.toBe(second)
    await expect(verifyPassword('identique', second)).resolves.toBe(true)
  })

  test('the stored value is salt and hash separated by a colon', async () => {
    const [salt, hash] = (await hashPassword('format')).split(':')

    expect(salt).toMatch(/^[0-9a-f]{32}$/)
    expect(hash).toMatch(/^[0-9a-f]{128}$/)
  })

  test('returns false for a malformed stored value instead of throwing', async () => {
    await expect(verifyPassword('peu importe', 'pas-un-hash')).resolves.toBe(false)
    await expect(verifyPassword('peu importe', '')).resolves.toBe(false)
    await expect(verifyPassword('peu importe', 'abc:def')).resolves.toBe(false)
  })
})
