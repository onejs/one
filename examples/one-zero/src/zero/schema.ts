import { createSchema, definePermissions, type Row } from '@rocicorp/zero'

const userSchema = {
  tableName: 'user',
  primaryKey: ['id'],
  columns: {
    id: 'string',
    username: 'string',
    email: 'string',
    name: 'string',
    image: 'string',
    state: 'json',
    updatedAt: 'number',
    createdAt: 'number',
  },
} as const

const messageSchema = {
  tableName: 'message',
  primaryKey: ['id'],
  columns: {
    id: 'string',
    senderId: 'string',
    content: 'string',
    createdAt: 'number',
    updatedAt: { type: 'number', optional: true },
  },
  relationships: {
    sender: {
      sourceField: 'senderId',
      destField: 'id',
      destSchema: () => userSchema,
    },
  },
} as const

export const schema = createSchema({
  version: 1,
  tables: {
    user: userSchema,
    message: messageSchema,
  },
})

export type Schema = typeof schema
export type Message = Row<typeof messageSchema>
export type User = Row<typeof userSchema>

export const permissions = definePermissions(schema, () => {
  return {}
})
