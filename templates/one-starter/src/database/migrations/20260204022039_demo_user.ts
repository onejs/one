import { scryptAsync } from '@noble/hashes/scrypt.js'
import { bytesToHex, randomBytes } from '@noble/hashes/utils.js'
import type { PoolClient } from 'pg'
const DEMO_ID = 'demo-user-id'
const DEMO_EMAIL = 'demo@example.com'
const DEMO_NAME = 'Demo User'
const DEMO_PASSWORD = 'demopassword123'

// same params as better-auth
const scryptConfig = {
  N: 16384,
  r: 16,
  p: 1,
  dkLen: 64,
}
async function hashPassword(password: string): Promise<string> {
  const salt = bytesToHex(randomBytes(16))
  const key = await scryptAsync(password.normalize('NFKC'), salt, {
    ...scryptConfig,
    maxmem: 128 * scryptConfig.N * scryptConfig.r * 2,
  })
  return `${salt}:${bytesToHex(key)}`
}
export async function up(client: PoolClient) {
  const passwordHash = await hashPassword(DEMO_PASSWORD)
  const now = new Date().toISOString()

  // insert demo user (skip if already exists by email)
  await client.query(
    `
    INSERT INTO "user" (id, name, email, "emailVerified", "createdAt", "updatedAt", role)
    VALUES ($1, $2, $3, true, $4, $4, 'user')
    ON CONFLICT (email) DO NOTHING
    `,
    [DEMO_ID, DEMO_NAME, DEMO_EMAIL, now],
  )

  // insert account with password
  await client.query(
    `
    INSERT INTO account (id, "accountId", "providerId", "userId", password, "createdAt", "updatedAt")
    VALUES ($1, $2, 'credential', $3, $4, $5, $5)
    ON CONFLICT (id) DO NOTHING
    `,
    [`${DEMO_ID}-account`, DEMO_ID, DEMO_ID, passwordHash, now],
  )

  // insert user public
  await client.query(
    `
    INSERT INTO "userPublic" (id, name, "joinedAt")
    VALUES ($1, $2, $3)
    ON CONFLICT (id) DO NOTHING
    `,
    [DEMO_ID, DEMO_NAME, now],
  )

  // insert user state
  await client.query(
    `
    INSERT INTO "userState" ("userId", "darkMode")
    VALUES ($1, false)
    ON CONFLICT ("userId") DO NOTHING
    `,
    [DEMO_ID],
  )
  console.info('demo user created:', DEMO_EMAIL)
}
