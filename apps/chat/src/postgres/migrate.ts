import type { PoolClient } from 'pg'
import { getClient } from './migrations/_lib'
import { readdir } from 'node:fs/promises'
import { join } from 'node:path'

type Migration = {
  name: string
  up?: (client: PoolClient) => Promise<void>
  // down?: (client: PoolClient) => Promise<void>
}

async function migrate() {
  const client = await getClient()

  try {
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
        if (appliedMigrationNames.has(file)) {
          return null
        }
        const migration = await import(join(migrationsDir, file))
        return { ...migration, name: file }
      })
    ).then((migrations) => migrations.filter(Boolean) as Migration[])

    for (const migration of migrations) {
      try {
        await migration.up?.(client)
        await client.query('INSERT INTO migrations (name) VALUES ($1)', [migration.name])
      } catch (e) {
        await client.query('ROLLBACK')
        throw e
      }
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
