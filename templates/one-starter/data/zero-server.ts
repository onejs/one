import { createZeroServerBindings } from 'on-zero/server'
import { createSQLiteApplicationDatabase, createSyncExecutor } from 'orez-lite'
import { models } from '~/data/generated/models'
import { schema } from '~/data/generated/schema'
import { mutationValidators } from '~/data/generated/syncedMutations'
import { queries } from '~/data/generated/syncedQueries'
import { transactionProvider } from '~/database/applicationSql'

export const zeroBindings = createZeroServerBindings({
  schema,
  models,
  queries,
  mutations: mutationValidators,
  // a deployment published as a public read-only demo (the demo deploy script
  // sets DEMO_READ_ONLY on the worker) refuses every mutation at the one layer
  // all write paths share. anyone who wants to change things forks the demo to
  // their own account; nothing a visitor does may persist into a database every
  // other visitor sees.
  validateMutation: () => {
    if (process.env.DEMO_READ_ONLY) {
      throw new Error(
        'this is a read-only public demo — fork it to your own account to make changes',
      )
    }
  },
  createServerActions() {
    return {}
  },
})

export const zeroApplicationDatabase = createSQLiteApplicationDatabase({
  transaction: (work) =>
    transactionProvider((executor) =>
      work({
        async exec(sql, params, metadata) {
          return executor.exec(sql, params, metadata)
        },
        async query(sql, params) {
          return executor.query(sql, params)
        },
        async queryAst(ast, format, queryName) {
          return executor.queryAst(ast, format, queryName)
        },
      }),
    ),
  query: (sql, params) => transactionProvider((executor) => executor.query(sql, params)),
})

export const zeroEffects = {
  runBackground(promise: Promise<void>) {
    return promise
  },
  report(error: unknown) {
    console.error('[on-zero] async task failed', error)
  },
}

export const zeroExecutor = createSyncExecutor({
  schema,
  mutators: zeroBindings.mutators,
  database: zeroApplicationDatabase,
  effects: zeroEffects,
})

export const zeroServer = zeroBindings.server(zeroExecutor)
