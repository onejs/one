#!/usr/bin/env bun

/**
 * @description Build migrations for production
 */

import { $ } from 'bun'

console.info('Building migrations for production...')

// run drizzle migration generation
await $`bun drizzle-kit generate --config ./src/database/drizzle.config.ts`

// sync directory migrations to flat .ts wrappers
const { syncDrizzleMigrations } = await import('./sync-drizzle')
await syncDrizzleMigrations()

// build the migration scripts using vite config (run from database directory)
await $`cd src/database && bun vite build`

console.info('✅ Migrations built successfully')
