import { createZeroServerBindings } from 'on-zero/server'
import { zeroNodePg } from '@rocicorp/zero/server/adapters/pg'
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
export const zeroDatabase = zeroNodePg(schema, database)
