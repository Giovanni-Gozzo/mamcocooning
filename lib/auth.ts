/**
 * Single-owner authentication: one password, hashed with scrypt and kept in an
 * environment variable, exchanged for a signed httpOnly session cookie.
 */
import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'
import { cookies } from 'next/headers'
import { env } from './env'
import { SESSION_COOKIE, SESSION_DURATION_SECONDS, isValidSessionToken } from './session'

export { createSessionToken, isValidSessionToken } from './session'

const scryptAsync = promisify(scrypt)

const KEY_LENGTH = 64

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex')
  const derived = (await scryptAsync(password, salt, KEY_LENGTH)) as Buffer
  return `${salt}:${derived.toString('hex')}`
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [salt, expectedHex] = stored.split(':')
  if (!salt || !expectedHex) return false

  const expected = Buffer.from(expectedHex, 'hex')
  if (expected.length !== KEY_LENGTH) return false

  const derived = (await scryptAsync(password, salt, KEY_LENGTH)) as Buffer
  return timingSafeEqual(derived, expected)
}

/** Reads the session cookie in a Server Component or Route Handler. */
export async function isAuthenticated(): Promise<boolean> {
  const store = await cookies()
  return isValidSessionToken(store.get(SESSION_COOKIE)?.value)
}

export const sessionCookie = {
  name: SESSION_COOKIE,
  maxAge: SESSION_DURATION_SECONDS,
  options: {
    httpOnly: true,
    sameSite: 'lax',
    secure: env.isProduction,
    path: '/',
  },
} as const
