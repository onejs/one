import { defineConfig } from 'drizzle-kit'

const { DATABASE_URL } = process.env

if (!DATABASE_URL || typeof DATABASE_URL !== 'string') {
  throw new Error('DATABASE_URL is not set or not a string')
}

export default defineConfig({
  schema: './db/schema.ts',
  out: './db/migrations',
  dialect: 'sqlite', // 'postgresql' | 'mysql' | 'sqlite'
  dbCredentials: {
    url: DATABASE_URL as string, // Type assertion to ensure it's a string
  },
})
