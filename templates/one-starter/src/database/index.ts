import { drizzle } from 'drizzle-orm/node-postgres'
import { database } from './database'
import * as schema from './schema'
const db = drizzle({
  client: database,
  schema,
})
export const getDb = () => db
