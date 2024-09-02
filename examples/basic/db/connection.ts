import { config } from 'dotenv'
// @ts-expect-error
import postgres from 'postgres'
import { drizzle } from 'drizzle-orm/postgres-js'
config({ path: '../.env' })
import * as schema from './schema'
export const connection = postgres(process.env.DATABASE_URL!)
export const db = drizzle(connection, { schema })
