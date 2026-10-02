#!/usr/bin/env bun

// @description Sync drizzle-kit generated migrations to TypeScript wrappers

import { existsSync } from 'node:fs'
import { readdir, readFile, writeFile, stat } from 'node:fs/promises'
import { join } from 'node:path'

const MIGRATIONS_DIR = './src/database/migrations'

/**
 * drizzle-kit v1 beta generates migrations as directories:
 *   YYYYMMDDHHMMSS_name/migration.sql + snapshot.json
 *
 * our migration runner uses import.meta.glob('./migrations/*.ts') which only
 * finds flat .ts files. this script creates a flat .ts wrapper for each
 * directory migration so the runner can pick them up.
 *
 * the wrapper inlines the SQL as a string constant (no ?raw import needed)
 * which makes it work with both vite and bun.
 */
export async function syncDrizzleMigrations() {
  const entries = await readdir(MIGRATIONS_DIR, { withFileTypes: true })

  // find directory-format migrations (contain migration.sql)
  const migrationDirs = entries.filter(
    (e) => e.isDirectory() && e.name !== 'meta' && e.name !== 'node_modules',
  )

  let created = 0
  let updated = 0

  for (const dir of migrationDirs) {
    const sqlPath = join(MIGRATIONS_DIR, dir.name, 'migration.sql')
    if (!existsSync(sqlPath)) continue

    const sql = await readFile(sqlPath, 'utf-8')
    const trimmed = sql.trim()

    // skip empty migrations (like seed)
    if (!trimmed || trimmed.startsWith('-- seed')) {
      continue
    }

    const wrapperPath = join(MIGRATIONS_DIR, `${dir.name}.ts`)

    // check if wrapper already exists and is up to date
    if (existsSync(wrapperPath)) {
      const sqlMtime = (await stat(sqlPath)).mtimeMs
      const tsMtime = (await stat(wrapperPath)).mtimeMs
      if (tsMtime > sqlMtime) continue
      updated++
    } else {
      created++
    }

    // generate wrapper with inlined SQL
    const escaped = trimmed
      .replace(/\\/g, '\\\\')
      .replace(/`/g, '\\`')
      .replace(/\$/g, '\\$')
    const content = `import type { PoolClient } from 'pg'

const sql = \`${escaped}\`

export async function up(client: PoolClient) {
  await client.query(sql)
}
`

    await writeFile(wrapperPath, content)
  }

  if (created > 0) console.info(`created ${created} migration wrapper(s)`)
  if (updated > 0) console.info(`updated ${updated} migration wrapper(s)`)
  if (created === 0 && updated === 0) console.info('migration wrappers up to date')
}

// allow running directly
if (import.meta.main) {
  await syncDrizzleMigrations()
}
