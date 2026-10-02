import { defineConfig } from 'drizzle-kit'
export default defineConfig({
  schema: './src/database/schema.ts',
  out: './src/database/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.ZERO_UPSTREAM_DB!,
  },
  strict: true,
})
