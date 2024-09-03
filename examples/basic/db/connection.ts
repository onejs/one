import { drizzle } from 'drizzle-orm/better-sqlite3'
import Database from 'better-sqlite3'
import * as schema from './schema'

let sqlite
let db

if (!global._db) {
  sqlite = new Database('sqlite.db')
  db = drizzle(sqlite, { schema })
  global._db = db
} else {
  db = global._db
}

export { db, sqlite as connection }
