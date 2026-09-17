/**
 * Generates the ADMIN_PASSWORD_HASH value.
 *   node scripts/hash-password.mjs "mon mot de passe"
 * Copy the printed line into the Vercel environment variables.
 */
import { randomBytes, scryptSync } from 'node:crypto'

const password = process.argv[2]

if (!password || password.length < 8) {
  console.error('Usage: node scripts/hash-password.mjs "mot de passe de 8 caractères minimum"')
  process.exit(1)
}

const salt = randomBytes(16).toString('hex')
const hash = scryptSync(password, salt, 64).toString('hex')

console.log('\nADMIN_PASSWORD_HASH=' + salt + ':' + hash + '\n')
console.log('SESSION_SECRET=' + randomBytes(32).toString('hex') + '\n')
