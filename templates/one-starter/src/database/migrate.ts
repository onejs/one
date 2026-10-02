import { migrate } from '@o/database/postgres/migrate'
import { getTableName } from 'drizzle-orm'
import { PgTable } from 'drizzle-orm/pg-core'
import { ZERO_CHANGE_DB, ZERO_CVR_DB, ZERO_UPSTREAM_DB } from '~/server/env-server'
import * as schemaPrivate from './schema-private'
const migrationsTS = import.meta.glob(`./migrations/*.ts`)

// vite tries to eval this at build time :/
const PROCESS_ENV = globalThis['process']['env']

// derive private table names from schema-private.ts — no manual list to maintain
const PRIVATE_TABLES = [
  ...Object.values(schemaPrivate)
    .filter((v) => v instanceof PgTable)
    .map((t) => getTableName(t as PgTable)),
  'migrations',
]
async function ensureZeroPublication() {
  const { Pool } = await import('pg')
  const pool = new Pool({
    connectionString: ZERO_UPSTREAM_DB,
    ssl: ZERO_UPSTREAM_DB?.includes('sslmode=require')
      ? {
          rejectUnauthorized: false,
        }
      : undefined,
  })
  const client = await pool.connect()
  try {
    const { rows } = await client.query(
      `SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename NOT IN (${PRIVATE_TABLES.map((_, i) => `$${i + 1}`).join(', ')})`,
      PRIVATE_TABLES
    )
    if (!rows.length) return
    const tableList = rows.map((r: any) => `"${r.tablename}"`).join(', ')
    await client.query('DROP PUBLICATION IF EXISTS zero_takeout')
    await client.query(`CREATE PUBLICATION zero_takeout FOR TABLE ${tableList}`)
    console.info(`[migrate] created publication zero_takeout for ${rows.length} tables`)
  } finally {
    client.release()
    await pool.end()
  }
}
function stripQueryParams(connStr: string | undefined): string | undefined {
  if (!connStr) return connStr
  return connStr.split('?')[0]
}
export async function main() {
  console.info('🔄 waiting for database to be ready...')
  await waitForDatabase(ZERO_UPSTREAM_DB!)
  console.info('🚀 running migrations...')
  await migrate({
    connectionString: ZERO_UPSTREAM_DB!,
    migrations: migrationsTS,
    cvrDb: stripQueryParams(ZERO_CVR_DB),
    changeDb: stripQueryParams(ZERO_CHANGE_DB),
    gitSha: process.env.GIT_SHA,
    onMigrationComplete: async () => {
      await ensureZeroPublication()
    },
  })
  console.info('✅ migrations complete')
}
if (PROCESS_ENV.RUN) {
  main().catch((err: unknown) => {
    console.error('Migration failed:', err)
    process.exit(1)
  })
}
async function waitForDatabase(connectionString: string, maxRetries = 30) {
  const { Pool } = await import('pg')
  for (let i = 0; i < maxRetries; i++) {
    try {
      const pool = new Pool({
        connectionString,
        ssl: connectionString.includes('sslmode=require')
          ? {
              rejectUnauthorized: false,
            }
          : undefined,
      })
      await pool.query('SELECT 1')
      await pool.end()
      console.info('✅ database connection successful')
      return
    } catch (err) {
      const delay = Math.min(1000 * 1.5 ** i, 10000)
      console.info(
        `⏳ waiting for database... attempt ${i + 1}/${maxRetries} (retry in ${delay}ms)`
      )
      await new Promise((resolve) => setTimeout(resolve, delay))
    }
  }
  throw new Error('database connection timeout after ' + maxRetries + ' attempts')
}
