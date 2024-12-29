import { createSchema } from '@rocicorp/zero'
import * as tables from './tables'

export const schema = createSchema({
  version: 1,
  tables,
})

export type Schema = typeof schema
