import { createSchema, createTableSchema, type TableSchemaToRow } from '@rocicorp/zero'

const userSchema = createTableSchema({
  tableName: 'user',
  columns: {
    id: { type: 'string' },
    username: { type: 'string' },
    email: { type: 'string' },
    name: { type: 'string' },
    image: { type: 'string' },
    state: { type: 'json' },
    updatedAt: { type: 'number' },
    createdAt: { type: 'number' },
  },
  primaryKey: ['id'],
  relationships: {},
})

const serverSchema = createTableSchema({
  tableName: 'server',
  columns: {
    id: { type: 'string' },
    name: { type: 'string' },
    ownerId: { type: 'string' },
    description: { type: 'string' },
    icon: { type: 'string' },
    createdAt: { type: 'number' },
  },
  primaryKey: ['id'],
  relationships: {
    owner: {
      source: 'ownerId',
      dest: {
        schema: () => userSchema,
        field: 'id',
      },
    },
    channels: {
      source: 'id',
      dest: {
        schema: () => channelSchema,
        field: 'serverId',
      },
    },
  },
})

const serverMemberSchema = createTableSchema({
  tableName: 'serverMember',
  columns: {
    serverId: { type: 'string' },
    userId: { type: 'string' },
    joinedAt: { type: 'number' },
  },
  primaryKey: ['serverId', 'userId'],
  relationships: {
    server: {
      source: 'serverId',
      dest: {
        schema: () => serverSchema,
        field: 'id',
      },
    },
    user: {
      source: 'userId',
      dest: {
        schema: () => userSchema,
        field: 'id',
      },
    },
  },
})

const channelSchema = createTableSchema({
  tableName: 'channel',
  columns: {
    id: { type: 'string' },
    serverId: { type: 'string' },
    name: { type: 'string' },
    description: { type: 'string' },
    private: { type: 'boolean' },
    createdAt: { type: 'number' },
  },
  primaryKey: ['id'],
  relationships: {
    chats: {
      source: 'id',
      dest: {
        schema: () => messageSchema,
        field: 'channelId',
      },
    },
    threads: {
      source: 'id',
      dest: {
        schema: () => threadSchema,
        field: 'channelId',
      },
    },
  },
})

const threadSchema = createTableSchema({
  tableName: 'thread',
  columns: {
    id: { type: 'string' },
    channelId: { type: 'string' },
    creatorId: { type: 'string' },
    title: { type: 'string' },
    description: { type: 'string' },
    createdAt: { type: 'number' },
  },
  primaryKey: ['id'],
  relationships: {
    creator: {
      source: 'creatorId',
      dest: {
        schema: () => userSchema,
        field: 'id',
      },
    },
    chats: {
      source: 'id',
      dest: {
        schema: () => messageSchema,
        field: 'channelId',
      },
    },
  },
})

const messageSchema = createTableSchema({
  tableName: 'message',
  columns: {
    id: { type: 'string' },
    serverId: { type: 'string' },
    channelId: { type: 'string' },
    threadId: { type: 'string', optional: true },
    senderId: { type: 'string' },
    content: { type: 'string' },
    createdAt: { type: 'number' },
    editedAt: { type: 'number', optional: true },
    deleted: { type: 'boolean', optional: true },
  },
  primaryKey: ['id'],
  relationships: {
    sender: {
      source: 'senderId',
      dest: {
        schema: () => userSchema,
        field: 'id',
      },
    },
  },
})

export const schema = createSchema({
  version: 1,
  tables: {
    user: userSchema,
    server: serverSchema,
    serverMember: serverMemberSchema,
    channel: channelSchema,
    thread: threadSchema,
    message: messageSchema,
  },
})

// The contents of your decoded JWT.
type AuthData = {
  sub: string
}

export type Schema = typeof schema
export type Message = TableSchemaToRow<typeof messageSchema>
export type Server = TableSchemaToRow<typeof serverSchema>
export type Channel = TableSchemaToRow<typeof channelSchema>
export type Thread = TableSchemaToRow<typeof threadSchema>
export type User = TableSchemaToRow<typeof userSchema>
export type ServerMember = TableSchemaToRow<typeof serverMemberSchema>

// export const authorization = defineAuthorization<AuthData, Schema>(schema, (query) => {
//   const allowIfLoggedIn = (authData: AuthData) => query.user.where('id', '=', authData.sub)

//   const allowIfMessageSender = (authData: AuthData, row: Message) => {
//     return query.message.where('id', row.id).where('senderId', '=', authData.sub)
//   }

//   const allowIfServerMember = (authData: AuthData, row: Server) => {
//     return query.serverMember.where('serverId', row.id).where('userId', '=', authData.sub)
//   }

//   return {
//     user: {
//       row: {
//         insert: [],
//         update: [],
//         delete: [],
//       },
//     },
//     server: {
//       row: {
//         insert: [allowIfLoggedIn],
//         update: [allowIfServerMember],
//         delete: [allowIfServerMember],
//       },
//     },
//     serverMember: {
//       row: {
//         insert: [allowIfLoggedIn],
//         update: [allowIfLoggedIn],
//         delete: [allowIfLoggedIn],
//       },
//     },
//     channel: {
//       row: {
//         // Channel creation/modification requires server membership
//         insert: [allowIfLoggedIn],
//         update: [],
//         delete: [],
//       },
//     },
//     thread: {
//       row: {
//         insert: [allowIfLoggedIn],
//         update: [allowIfLoggedIn],
//         delete: [allowIfLoggedIn],
//       },
//     },
//     message: {
//       row: {
//         insert: [allowIfLoggedIn],
//         update: [allowIfMessageSender],
//         delete: [allowIfMessageSender],
//       },
//     },
//   }
// })
