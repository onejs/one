import 'server-only'
import { createSQLiteDatabase } from '@o/database/sqlite'
import { transactionProvider } from './applicationSql'
import { relations } from './relations'
import * as schema from './schema'

export { transactionProvider } from './applicationSql'

export const db = createSQLiteDatabase({
  schema,
  relations,
  transactionProvider,
})
