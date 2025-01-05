import { createSchema, createTableSchema, Row } from '@rocicorp/zero'
import type { PgTable } from 'drizzle-orm/pg-core'
import { createZeroSchema } from 'drizzle-zero'
import * as drizzleSchema from '~/db/publicSchema'

export const schema = createSchema(
  createZeroSchema(drizzleSchema, {
    version: 1,
    tables: {
      user: allColumns(drizzleSchema.user),
      friendship: allColumns(drizzleSchema.friendship),
      server: allColumns(drizzleSchema.server),
      serverMember: allColumns(drizzleSchema.serverMember),
      role: allColumns(drizzleSchema.role),
      channel: allColumns(drizzleSchema.channel),
      userRole: allColumns(drizzleSchema.userRole),
      channelPermission: allColumns(drizzleSchema.channelPermission),
      thread: allColumns(drizzleSchema.thread),
      message: allColumns(drizzleSchema.message),
      pin: allColumns(drizzleSchema.pin),
      attachment: allColumns(drizzleSchema.attachment),
      reaction: allColumns(drizzleSchema.reaction),
      messageReaction: allColumns(drizzleSchema.messageReaction),
    },
  })
)

export type Schema = typeof schema
export type Tables = Schema['tables']

function allColumns<T extends PgTable>(table: T): Record<keyof T['_']['columns'], true> {
  const columns = table._.columns
  const result = {} as Record<keyof T['_']['columns'], true>

  for (const columnName in columns) {
    // @ts-expect-error - We know the column names are valid
    result[columnName] = true
  }

  return result
}
