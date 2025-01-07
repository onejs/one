import { createSchema, createTableSchema, Row } from '@rocicorp/zero'
import { getTableColumns } from 'drizzle-orm'
import type { PgTable } from 'drizzle-orm/pg-core'
import { createZeroSchema } from 'drizzle-zero'
import * as drizzleSchema from '~/db/publicSchema'

const zeroSchema = createZeroSchema(drizzleSchema, {
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

export const schema = createSchema(zeroSchema)

export type Schema = typeof schema
export type Tables = Schema['tables']

/**
 * Maps all columns of a Drizzle schema table to `true`.
 */
function allColumns<T extends PgTable>(table: T): Record<keyof T['_']['columns'], true> {
  const columns = getTableColumns(table)
  const result = {} as Record<keyof T['_']['columns'], true>
  for (const columnName in columns) {
    result[columnName] = true
  }
  return result
}
