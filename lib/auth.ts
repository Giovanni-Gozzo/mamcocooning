/**
 * Single-owner authentication: one password, hashed with scrypt and kept in an
 * environment variable, exchanged for a signed httpOnly session cookie.
 */
import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'
import { cookies } from 'next/headers'
import { SignJWT, jwtVerify } from 'jose'
import { env } from './env'

const scryptAsync = promisify(scrypt)

const KEY_LENGTH = 64
const SESSION_COOKIE = 'mc_session'
const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 30
const SESSION_SUBJECT = 'mam-cocooning-admin'

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

function secretKey(): Uint8Array {
  const secret = env.sessionSecret
  if (secret === null) {
    throw new Error('SESSION_SECRET manquant dans les variables d’environnement.')
  }
  return new TextEncoder().encode(secret)
}

export async function createSessionToken(): Promise<string> {
  return new SignJWT({ role: 'admin' })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(SESSION_SUBJECT)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION_SECONDS}s`)
    .sign(secretKey())
}

export async function isValidSessionToken(token: string | undefined): Promise<boolean> {
  if (!token || env.sessionSecret === null) return false
  try {
    const { payload } = await jwtVerify(token, secretKey(), { subject: SESSION_SUBJECT })
    return payload.role === 'admin'
  } catch {
    return false
  }
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
