import {
  createSchema,
  definePermissions,
  json,
  number,
  type Row,
  string,
  table,
} from '@rocicorp/zero'

export const user = table('user')
  .columns({
    id: string(),
    username: string(),
    email: string(),
    name: string(),
    image: string(),
    state: json(),
    updatedAt: number(),
    createdAt: number(),
  })
  .primaryKey('id')

export const message = table('message')
  .columns({
    id: string(),
    senderId: string(),
    content: string(),
    createdAt: number(),
    updatedAt: number().optional(),
  })
  .primaryKey('id')

export const schema = createSchema({
  tables: [user, message],
})

export type Schema = typeof schema
export type Message = Row<Schema['tables']['message']>
export type User = Row<Schema['tables']['user']>

export const permissions = definePermissions<{}, Schema>(schema, () => {
  return {}
})
