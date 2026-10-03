#!/usr/bin/env bun

import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { SQLiteTransactionProvider } from '@o/database/sqlite'

type SeedRows = Record<string, readonly Record<string, unknown>[]>

type MigrationOptions = {
  seed?: boolean
}

function quoteIdentifier(value: string): string {
  return `"${value.replaceAll('"', '""')}"`
}

function sqliteValue(value: unknown): unknown {
  if (typeof value === 'boolean') return value ? 1 : 0
  if (value instanceof Date) return value.getTime()
  return value
}

export async function migrateApplicationDatabase(
  transactionProvider: SQLiteTransactionProvider,
  options: MigrationOptions = {},
) {
  const migrationsDir = join(import.meta.dirname, 'migrations')
  const migrationNames = (await readdir(migrationsDir, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort()
  const migrations = await Promise.all(
    migrationNames.map(async (name) => ({
      name,
      sql: await readFile(join(migrationsDir, name, 'migration.sql'), 'utf8'),
    })),
  )
  // seed rows are optional and only inserted during development.
  const seed: SeedRows | undefined = options.seed
    ? (await import('./seed.ts')).default
    : undefined

  await transactionProvider(async (executor) => {
    await executor.exec(
      `CREATE TABLE IF NOT EXISTS "_app_migrations" (
         name TEXT PRIMARY KEY,
         "appliedAt" INTEGER NOT NULL
       )`,
    )
    const applied = new Set(
      (await executor.query<{ name: string }>('SELECT name FROM "_app_migrations"')).map(
        (row) => row.name,
      ),
    )

    for (const migration of migrations) {
      if (applied.has(migration.name)) continue
      for (const statement of migration.sql.split('--> statement-breakpoint')) {
        // migration directives guard column repairs on existing databases.
        let guard: { column: string; missing: boolean; table: string } | null = null
        for (const line of statement.split('\n')) {
          const trimmed = line.trim()
          if (!trimmed.startsWith('-- migrate-if-')) continue
          const match =
            /^-- migrate-if-column-(exists|missing) ([A-Za-z_][A-Za-z0-9_]*)\.([A-Za-z_][A-Za-z0-9_]*)$/.exec(
              trimmed,
            )
          if (!match) throw new Error(`unparsable migration directive: ${trimmed}`)
          guard = { column: match[3], missing: match[1] === 'missing', table: match[2] }
        }
        const sql = statement
          .split('\n')
          .filter((line) => !line.trim().startsWith('--'))
          .join('\n')
          .trim()
        if (!sql) continue
        if (guard) {
          const columns = await executor.query<{ name: string }>(
            `PRAGMA table_info(${quoteIdentifier(guard.table)})`,
          )
          const hasColumn = columns.some((column) => column.name === guard.column)
          if (guard.missing ? hasColumn : !hasColumn) continue
        }
        // skip columns already present when applying a regenerated baseline.
        const added =
          /^ALTER TABLE\s+[`"]?([A-Za-z_][A-Za-z0-9_]*)[`"]?\s+ADD\s+(?:COLUMN\s+)?[`"]?([A-Za-z_][A-Za-z0-9_]*)[`"]?/i.exec(
            sql,
          )
        if (added) {
          const columns = await executor.query<{ name: string }>(
            `PRAGMA table_info(${quoteIdentifier(added[1])})`,
          )
          if (columns.some((column) => column.name === added[2])) continue
        }
        await executor.exec(sql)
      }
      await executor.exec(
        'INSERT INTO "_app_migrations" (name, "appliedAt") VALUES (?1, ?2)',
        [migration.name, Date.now()],
      )
    }

    if (!seed) return
    for (const [table, rows] of Object.entries(seed)) {
      for (const row of rows) {
        const columns = Object.keys(row).filter((column) => row[column] !== undefined)
        if (columns.length === 0) continue
        await executor.exec(
          `INSERT INTO ${quoteIdentifier(table)} (${columns
            .map(quoteIdentifier)
            .join(
              ', ',
            )}) VALUES (${columns.map((_, index) => `?${index + 1}`).join(', ')}) ON CONFLICT DO NOTHING`,
          columns.map((column) => sqliteValue(row[column])),
        )
      }
    }
  })
}

if (import.meta.main) {
  const { transactionProvider } = await import('./applicationSql.ts')
  migrateApplicationDatabase(transactionProvider, {
    seed: process.argv.includes('--seed'),
  }).catch((error: unknown) => {
    console.error('Migration failed:', error)
    process.exit(1)
  })
}
