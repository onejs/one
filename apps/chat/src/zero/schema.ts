import {
  createSchema,
  createTableSchema,
  definePermissions,
  type Row,
  column,
} from '@rocicorp/zero'

export type UserState = {
  serversSort?: string[]
  activeServer?: string
  // serverId to channelId
  activeChannels: Record<string, string>
  showSidePanel?: 'user' | 'settings'
  showHotMenu?: boolean
  channelState?: ChannelsState
}

export type ChannelsState = {
  [server_and_channel_id: string]: ChannelState
}

export type ChannelState = {
  mainView?: 'thread' | 'chat'
  focusedMessageId?: string
  openedThreadId?: string
}

export type RolePermissions = {}

const userSchema = {
  tableName: 'user',
  primaryKey: ['id'],
  columns: {
    id: 'string',
    username: 'string',
    email: 'string',
    name: 'string',
    image: 'string',
    state: column.json<UserState>(),
    updatedAt: 'number',
    createdAt: 'number',
  },
  relationships: {
    servers: [
      {
        sourceField: 'id',
        destField: 'userId',
        destSchema: () => serverMemberSchema,
      },
      {
        sourceField: 'serverId',
        destField: 'id',
        destSchema: () => serverSchema,
      },
    ],

    friends: [
      {
        sourceField: 'id',
        destField: 'requestingId',
        destSchema: () => friendshipSchema,
      },
      {
        sourceField: 'acceptingId',
        destField: 'id',
        destSchema: () => userSchema,
      },
    ],
  },
} as const

const roleSchema = {
  tableName: 'role',
  primaryKey: ['id'],
  columns: {
    id: 'string',
    name: 'string',
    color: 'string',
    serverId: 'string',
    creatorId: 'string',
    permissions: column.json<RolePermissions>(),
    updatedAt: 'number',
    createdAt: 'number',
  },

  relationships: {
    members: [
      {
        sourceField: 'id',
        destField: 'roleId',
        destSchema: () => userRoleSchema,
      },
      {
        sourceField: 'userId',
        destField: 'id',
        destSchema: () => userSchema,
      },
    ],
  },
} as const

const userRoleSchema = createTableSchema({
  tableName: 'userRole',
  primaryKey: ['serverId', 'userId', 'roleId'],
  columns: {
    serverId: 'string',
    userId: 'string',
    roleId: 'string',
    granterId: 'string',
    createdAt: 'number',
  },
})

const channelRoleSchema = createTableSchema({
  tableName: 'channelRole',
  primaryKey: ['serverId', 'channelId', 'roleId'],
  columns: {
    serverId: 'string',
    channelId: 'string',
    roleId: 'string',
    granterId: 'string',
    createdAt: 'number',
  },
})

const friendshipSchema = createTableSchema({
  tableName: 'friendship',
  primaryKey: ['requestingId', 'acceptingId'],
  columns: {
    requestingId: 'string',
    acceptingId: 'string',
    accepted: 'boolean',
    createdAt: 'number',
  },
})

const serverSchema = {
  tableName: 'server',
  primaryKey: ['id'],
  columns: {
    id: 'string',
    name: 'string',
    ownerId: 'string',
    channelSort: 'json',
    description: 'string',
    icon: 'string',
    createdAt: 'number',
  },
  relationships: {
    channels: {
      sourceField: 'id',
      destField: 'serverId',
      destSchema: () => channelSchema,
    },

    members: [
      {
        sourceField: 'id',
        destField: 'serverId',
        destSchema: () => serverMemberSchema,
      },
      {
        sourceField: 'userId',
        destField: 'id',
        destSchema: () => userSchema,
      },
    ],

    roles: {
      sourceField: 'id',
      destField: 'serverId',
      destSchema: () => roleSchema,
    },
  },
} as const

const serverMemberSchema = createTableSchema({
  tableName: 'serverMember',
  primaryKey: ['serverId', 'userId'],
  columns: {
    serverId: 'string',
    userId: 'string',
    joinedAt: 'number',
  },
})

const channelSchema = createTableSchema({
  tableName: 'channel',
  columns: {
    id: 'string',
    serverId: 'string',
    name: 'string',
    description: 'string',
    private: { type: 'boolean' },
    createdAt: 'number',
  },
  primaryKey: ['id'],
  relationships: {
    messages: {
      sourceField: 'id',
      destField: 'channelId',
      destSchema: () => messageSchema,
    },

    threads: {
      sourceField: 'id',
      destField: 'channelId',
      destSchema: () => threadSchema,
    },

    roles: [
      {
        sourceField: 'id',
        destField: 'channelId',
        destSchema: () => channelRoleSchema,
      },
      {
        sourceField: 'roleId',
        destField: 'id',
        destSchema: () => roleSchema,
      },
    ],
  },
})

const threadSchema = {
  tableName: 'thread',
  columns: {
    id: 'string',
    channelId: 'string',
    creatorId: 'string',
    messageId: 'string',
    title: 'string',
    description: 'string',
    createdAt: 'number',
  },
  primaryKey: ['id'],
  relationships: {
    messages: {
      sourceField: 'id',
      destField: 'threadId',
      destSchema: () => messageSchema,
    },
  },
} as const

const messageSchema = {
  tableName: 'message',
  primaryKey: ['id'],
  columns: {
    id: 'string',
    serverId: 'string',
    channelId: 'string',
    threadId: { type: 'string', optional: true },
    isThreadReply: 'boolean',
    senderId: 'string',
    content: 'string',
    createdAt: 'number',
    updatedAt: { type: 'number', optional: true },
    deleted: { type: 'boolean', optional: true },
  },
  relationships: {
    thread: {
      sourceField: 'id',
      destField: 'messageId',
      destSchema: () => threadSchema,
    },

    sender: {
      sourceField: 'senderId',
      destField: 'id',
      destSchema: () => userSchema,
    },

    reactions: [
      {
        sourceField: 'id',
        destField: 'messageId',
        destSchema: () => messageReactionSchema,
      },
      {
        sourceField: 'reactionId',
        destField: 'id',
        destSchema: () => reactionSchema,
      },
    ],
  },
} as const

const messageReactionSchema = createTableSchema({
  tableName: 'messageReaction',
  primaryKey: ['messageId', 'userId', 'reactionId'],
  columns: {
    messageId: 'string',
    userId: 'string',
    reactionId: 'string',
    createdAt: 'number',
    updatedAt: { type: 'number', optional: true },
  },
})

const reactionSchema = createTableSchema({
  tableName: 'reaction',
  primaryKey: ['id'],
  columns: {
    id: 'string',
    value: 'string',
    keyword: 'string',
    createdAt: 'number',
    updatedAt: { type: 'number', optional: true },
  },
})

export const schema = createSchema({
  version: 1,
  tables: {
    user: userSchema,
    friendship: friendshipSchema,
    server: serverSchema,
    serverMember: serverMemberSchema,
    channel: channelSchema,
    thread: threadSchema,
    message: messageSchema,
    messageReaction: messageReactionSchema,
    reaction: reactionSchema,
    role: roleSchema,
    userRole: userRoleSchema,
    channelRole: channelRoleSchema,
  },
})

export type Schema = typeof schema
export type Message = Row<typeof messageSchema>
export type Server = Row<typeof serverSchema>
export type Channel = Row<typeof channelSchema>
export type Thread = Row<typeof threadSchema>
export type User = Row<typeof userSchema>
export type ServerMember = Row<typeof serverMemberSchema>
export type MessageReaction = Row<typeof messageReactionSchema>
export type Reaction = Row<typeof reactionSchema>
export type Friendship = Row<typeof friendshipSchema>
export type Role = Row<typeof roleSchema>
export type UserRole = Row<typeof userRoleSchema>
export type ChannelRole = Row<typeof channelRoleSchema>

export type MessageWithRelations = Message & {
  reactions: Reaction[]
  thread?: Thread[]
  sender: User[]
}

export type ThreadWithRelations = Thread & { messages: Message[] }

// The contents of your decoded JWT.
type AuthData = {
  sub: string
}

export const permissions = definePermissions<AuthData, Schema>(schema, () => {
  // const allowIfLoggedIn = (
  //   authData: AuthData,
  //   { cmpLit }: ExpressionBuilder<TableSchema>
  // ) => cmpLit(authData.sub, "IS NOT", null);

  // const allowIfMessageSender = (
  //   authData: AuthData,
  //   { cmp }: ExpressionBuilder<typeof messageSchema>
  // ) => cmp("senderID", "=", authData.sub ?? "");

  return {
    // Nobody can write to the medium or user tables -- they are populated
    // and fixed by seed.sql
    // medium: {
    //   row: {
    //     insert: [],
    //     update: {
    //       preMutation: [],
    //     },
    //     delete: [],
    //   },
    // },
    // user: {
    //   row: {
    //     insert: [],
    //     update: {
    //       preMutation: [],
    //     },
    //     delete: [],
    //   },
    // },
    // message: {
    //   row: {
    //     // anyone can insert
    //     insert: undefined,
    //     // only sender can edit their own messages
    //     update: {
    //       preMutation: [allowIfMessageSender],
    //     },
    //     // must be logged in to delete
    //     delete: [allowIfLoggedIn],
    //   },
    // },
  }
})

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
