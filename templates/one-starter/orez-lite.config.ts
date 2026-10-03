import { resolve } from 'node:path'
import { drizzleZeroConfig } from 'drizzle-zero-sqlite'
import { defineLocalConfig } from 'orez-lite/local'
import * as drizzleSchema from './database/drizzle-zero.config.ts'
import { localApplicationSqlClientFactory } from './database/installLocalApplicationSql.server.ts'
import { migrateApplicationDatabase } from './database/migrate.ts'
import { ports, server } from './env.ts'

const applicationSql = localApplicationSqlClientFactory('singleton')

export default defineLocalConfig({
  schema: drizzleZeroConfig(drizzleSchema, { suppressDefaultsWarning: true }),
  dataDir: resolve(import.meta.dirname, '.orez/application-sql'),
  namespace: 'singleton',
  port: ports.zero,
  prepare: () =>
    migrateApplicationDatabase(
      (work) =>
        applicationSql.transaction(() => {
          throw new Error('application migration cannot execute a query AST')
        }, work),
      { seed: true },
    ),
  callbacks: {
    authenticate: `http://127.0.0.1:${ports.web}/api/zero/rust-auth`,
    authorizeWake: `http://127.0.0.1:${ports.web}/api/zero/wake-authorize`,
    transformQueries: `http://127.0.0.1:${ports.web}/api/zero/pull`,
  },
  // the app's own public origin must be allowed or a deployed runtime's
  // same-origin /zero-http requests are refused with "origin not allowed";
  // ONE_SERVER_URL is that origin in every environment.
  allowedOrigins: [
    `http://localhost:${ports.web}`,
    `http://127.0.0.1:${ports.web}`,
    ...(server.ONE_SERVER_URL ? [new URL(server.ONE_SERVER_URL).origin] : []),
  ],
})
