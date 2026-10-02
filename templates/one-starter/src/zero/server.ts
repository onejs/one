import { createZeroServerBindings } from 'on-zero/server'
import {
  createPostgreSQLApplicationDatabase,
  createSyncExecutor,
} from 'orez-sync-executor'
import { database } from '~/database/database'
import { models } from '~/data/generated/models'
import { mutationValidators } from '~/data/generated/syncedMutations'
import { queries } from '~/data/generated/syncedQueries'
import { schema } from '~/data/generated/schema'
export const zeroBindings = createZeroServerBindings({
  schema,
  createServerActions: () => ({}),
  models,
  queries,
  mutations: mutationValidators,
})
export const zeroExecutor = createSyncExecutor({
  schema,
  mutators: zeroBindings.mutators,
  database: createPostgreSQLApplicationDatabase(database, {
    internalSchema: `${process.env.ZERO_APP_ID}_0`,
    schema,
  }),
  effects: {
    runBackground(promise) {
      void promise
    },
    report(error) {
      console.error('[zero] background task failed', error)
    },
  },
})
