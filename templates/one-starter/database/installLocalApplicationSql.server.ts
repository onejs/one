import { createLocalApplicationSqlClientFactory } from 'orez-lite/local'

export const localApplicationSqlClientFactory = createLocalApplicationSqlClientFactory({
  dataDir: '.orez/application-sql',
})

Reflect.set(
  globalThis,
  '__one_cf_application_sql_client',
  localApplicationSqlClientFactory,
)
