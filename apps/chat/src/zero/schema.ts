import { createSchema } from '@rocicorp/zero'
import { createZeroSchema } from 'drizzle-zero'
import * as drizzleSchema from '~/db/schema'

export const schema = createSchema(
  createZeroSchema(drizzleSchema, {
    version: 1,
    tables: {
      user: {
        id: true,
      },
    },
  })
)

export type Schema = typeof schema
