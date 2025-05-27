import {
  ANYONE_CAN,
  createSchema,
  definePermissions,
  json,
  number,
  relationships,
  string,
  table,
  type ExpressionBuilder,
  type PermissionsConfig,
  type Row,
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
    senderId: string().optional(),
    content: string(),
    createdAt: number(),
    updatedAt: number().optional(),
  })
  .primaryKey('id')

const messageRelationships = relationships(message, ({ one }) => ({
  sender: one({
    sourceField: ['senderId'],
    destField: ['id'],
    destSchema: user,
  }),
}))

export const schema = createSchema({
  tables: [user, message],
  relationships: [messageRelationships],
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
    { cmpLit }: ExpressionBuilder<Schema, keyof Schema['tables']>
  ) => cmpLit(authData.sub, 'IS NOT', null)

  const allowIfIsMessageSender = (
    authData: AuthData,
    { cmp }: ExpressionBuilder<Schema, 'message'>
  ) => cmp('senderId', '=', authData.sub ?? '')

  const allowIfMessageSenderIsSelf = (
    authData: AuthData,
    { or, cmp }: ExpressionBuilder<Schema, 'message'>
  ) => or(cmp('senderId', 'IS', null), cmp('senderId', '=', authData.sub ?? ''))

  return {
    user: {
      row: {
        select: ANYONE_CAN,
      },
    },
    message: {
      row: {
        // anyone can insert, but the senderId of the message must match the current user
        insert: [allowIfMessageSenderIsSelf],
        update: {
          // sender can only edit own messages
          preMutation: [allowIfIsMessageSender],
          // sender can only edit messages to be owned by themselves
          postMutation: [allowIfIsMessageSender],
        },
        // must be logged in to delete
        delete: [allowIfLoggedIn],
        // everyone can read current messages
        select: ANYONE_CAN,
      },
    },
  } satisfies PermissionsConfig<AuthData, Schema>
})
