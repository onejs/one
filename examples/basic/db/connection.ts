import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

let connection
let db

if (!global._db) {
  connection = postgres(process.env.DATABASE_URL!)
  db = drizzle(connection, { schema })
  global._db = db
} else {
  db = global._db
}

export { db, connection }
