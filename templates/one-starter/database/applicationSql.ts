import { createQueryCompiler } from 'orez-lite/cloudflare/query-compiler'
import { schema } from '~/data/generated/schema'
import type { SQLiteTransactionProvider } from '@o/database/sqlite'
import type { LocalApplicationSqlClient } from 'orez-lite/local'

type ApplicationSqlClientFactory = (namespace: string) => LocalApplicationSqlClient

function isApplicationSqlClientFactory(value: unknown): value is ApplicationSqlClientFactory {
  return typeof value === 'function'
}

const compileQuery = createQueryCompiler(schema)

export const transactionProvider: SQLiteTransactionProvider = (work) => {
  const factory = Reflect.get(globalThis, '__one_cf_application_sql_client')
  if (!isApplicationSqlClientFactory(factory)) {
    throw new Error('application SQLite service is not initialized')
  }
  return factory('singleton').transaction(compileQuery, work)
}
