import { defineConfig } from 'drizzle-kit'
export default defineConfig({
  dialect: 'postgresql',
  schema: './src/zero/tables.ts',
  out: './src/zero/migrations',
  dbCredentials: {
    url: process.env.ZERO_UPSTREAM_DB as string,
  },
  strict: true,
  verbose: true,
})
