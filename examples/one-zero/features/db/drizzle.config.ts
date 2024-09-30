import { defineConfig } from 'drizzle-kit'

const { DATABASE_URL } = process.env

if (!DATABASE_URL || typeof DATABASE_URL !== 'string') {
  throw new Error('DATABASE_URL is not set or not a string')
}

export default defineConfig({
  schema: './features/db/schema.ts',
  out: './features/db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: DATABASE_URL as string, // Type assertion to ensure it's a string
  },
})
