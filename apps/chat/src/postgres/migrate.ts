import pg from 'pg'
import type { PoolClient } from 'pg'
import { readdir } from 'node:fs/promises'
import { join } from 'node:path'
import { Resource } from 'sst'

// @ts-ignore
console.info('testing123', Resource['Postgres'])

/**
 * Custom migration script - why?
 * Well migration scripts aren't so complex, and we haven't found a simple enough library
 * to deserve a new dependency. We like this setup because we can customize it easily
 * and it's pretty easy to understand.
 */

const MAX_CONNECTION_TRIES = 5

type Migration = {
  name: string
  up?: (client: PoolClient) => Promise<void>
  // down?: (client: PoolClient) => Promise<void>
}

async function migrate() {
  const client = await getClient()

  const hasZeroDB = await client.query(`
    SELECT 1 FROM pg_database WHERE datname = 'zero_change'
  `)
  if (!hasZeroDB.rows.length) {
    // setup main db and zero dbs
    await client.query(`CREATE DATABASE zero_cvr;`)
    await client.query(`CREATE DATABASE zero_change;`)
  }

  try {
    // we create three databases: your main one, and two for zero
    await client.query('BEGIN')
    await client.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        run_on TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `)

    const appliedMigrations = await client.query('SELECT name FROM migrations')
    const appliedMigrationNames = new Set(appliedMigrations.rows.map((row) => row.name))

    const migrationsDir = join(__dirname, 'migrations')
    const files = await readdir(migrationsDir)
    const migrationFiles = files.filter((file) => /^\d+.*\.ts$/.test(file)).sort()

    const migrations: Migration[] = await Promise.all(
      migrationFiles.map(async (file) => {
        const name = file.replace(/[^\d]/g, '')
        if (appliedMigrationNames.has(name)) {
          console.info(`Migration applied already: ${file}`)
          return null
        }
        const migration = await import(join(migrationsDir, file))
        return { ...migration, name }
      })
    ).then((migrations) => migrations.filter(Boolean) as Migration[])

    if (!migrations.length) {
      console.info(`No migrations to apply!`)
      return
    }

    for (const migration of migrations) {
      // don't try catch here, we want to exit and rollback all migrations if one fails
      console.info(`Migrating: ${migration.name}`)
      await migration.up?.(client)
      await client.query('INSERT INTO migrations (name) VALUES ($1)', [migration.name])
    }

    await client.query('COMMIT')
  } catch (e) {
    await client.query('ROLLBACK')
    throw e
  } finally {
    client.release()
  }
}

migrate()

async function getClient(tries = 0): Promise<pg.PoolClient> {
  try {
    let connectionString = process.env.ZERO_UPSTREAM_DB || ''
    if (process.env.IN_DOCKER) {
      connectionString = connectionString.replace('127.0.0.1', 'pgdb')
    }
    console.info(`Connecting to: ${connectionString}`)
    const pool = new pg.Pool({
      connectionString,
    })
    return await pool.connect()
  } catch (err) {
    if (tries > MAX_CONNECTION_TRIES) {
      console.error(`Cannot connect :/`)
      process.exit(1)
    }
    console.error(`Failed to connect to the database.\n${err}\nRetrying in 8 seconds...`)
    await new Promise((res) => setTimeout(res, 8000))
    return await getClient(tries + 1)
  }
}
