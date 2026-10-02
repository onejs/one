import { Pool } from 'pg'
import { ZERO_UPSTREAM_DB } from '~/server/env-server'
if (!ZERO_UPSTREAM_DB) {
  throw new Error(`No db string connection found`)
}
export const database = new Pool({
  connectionString: ZERO_UPSTREAM_DB,
  max: 20,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
  allowExitOnIdle: true,
  // handle self-signed certificates in production
  ssl: ZERO_UPSTREAM_DB.includes('sslmode=require')
    ? {
        rejectUnauthorized: false,
      }
    : undefined,
})
database.on('error', (error) => {
  console.error(`[postgres] database error`, error)
})

// cleanup function that can be called during shutdown
export async function closeDatabase() {
  try {
    await database.end()
  } catch (error) {
    console.error(`[postgres] error closing database:`, error)
  }
}
