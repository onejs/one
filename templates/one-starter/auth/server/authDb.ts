import 'server-only'
import { createBetterAuthSQLiteAdapter } from '@o/database/better-auth'
import { transactionProvider } from '~/database/db'
import { relations } from '~/database/relations'
import * as schema from '~/database/schema'

export const authDatabase = createBetterAuthSQLiteAdapter({
  schema,
  relations,
  transactionProvider,
})
