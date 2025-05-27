import {
  ANYONE_CAN,
  createSchema,
  definePermissions,
  type ExpressionBuilder,
  json,
  number,
  type PermissionsConfig,
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

// The contents of your decoded JWT.
type AuthData = {
  sub: string | null
}

export const permissions = definePermissions<AuthData, Schema>(schema, () => {
  const allowIfLoggedIn = (
    authData: AuthData,
    { cmpLit }: ExpressionBuilder<Schema, keyof Schema["tables"]>
  ) => cmpLit(authData.sub, "IS NOT", null);

  const allowIfMessageSender = (
    authData: AuthData,
    { cmp }: ExpressionBuilder<Schema, 'message'>
  ) => cmp('senderId', '=', authData.sub ?? '')

  return {
    user: {
      row: {
        select: ANYONE_CAN,
      },
    },
    message: {
      row: {
        // anyone can insert
        insert: ANYONE_CAN,
        update: {
          // sender can only edit own messages
          preMutation: [allowIfMessageSender],
          // sender can only edit messages to be owned by self
          postMutation: [allowIfMessageSender],
        },
        // must be logged in to delete
        delete: [allowIfLoggedIn],
        // everyone can read current messages
        select: ANYONE_CAN,
      },
    },
  } satisfies PermissionsConfig<AuthData, Schema>
})
