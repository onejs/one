import {
  createSchema,
  createTableSchema,
  definePermissions,
  type Row,
  column,
  NOBODY_CAN,
  type ExpressionBuilder,
  type TableSchema,
} from '@rocicorp/zero'

export type UserState = {
  serversSort?: string[]
  activeServer?: string
  // serverId to channelId
  activeChannels: Record<string, string>
  showSidePanel?: 'user' | 'settings'
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
    updatedAt: { type: 'number', optional: true },
    createdAt: { type: 'number', optional: true },
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
    canAdmin: { type: 'boolean', optional: true },
    canEditChannel: { type: 'boolean', optional: true },
    canEditServer: { type: 'boolean', optional: true },
    updatedAt: { type: 'number', optional: true },
    createdAt: { type: 'number', optional: true },
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
    createdAt: { type: 'number', optional: true },
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
    createdAt: { type: 'number', optional: true },
  },
})

const friendshipSchema = createTableSchema({
  tableName: 'friendship',
  primaryKey: ['requestingId', 'acceptingId'],
  columns: {
    requestingId: 'string',
    acceptingId: 'string',
    accepted: 'boolean',
    createdAt: { type: 'number', optional: true },
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
    createdAt: { type: 'number', optional: true },
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
    joinedAt: { type: 'number', optional: true },
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
    createdAt: { type: 'number', optional: true },
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
    createdAt: { type: 'number', optional: true },
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
    createdAt: { type: 'number', optional: true },
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
    createdAt: { type: 'number', optional: true },
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
    createdAt: { type: 'number', optional: true },
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
  reactions: readonly Reaction[]
  thread?: readonly Thread[]
  sender: readonly User[]
}

export type ThreadWithRelations = Thread & { messages: readonly Message[] }

// The contents of your decoded JWT.
type AuthData = {
  id: string
  sub: string
}

export const permissions = definePermissions<AuthData, Schema>(schema, () => {
  const userIsLoggedIn = (authData: AuthData, { cmpLit }: ExpressionBuilder<TableSchema>) => {
    console.log('??', authData)
    return cmpLit(authData.sub, 'IS NOT', null)
  }

  return {
    user: {
      // Only the authentication system can write to the user table.
      row: {
        insert: NOBODY_CAN,
        update: {
          preMutation: NOBODY_CAN,
        },
        delete: NOBODY_CAN,
      },
    },

    server: {
      row: {
        insert: [userIsLoggedIn],
        update: {
          preMutation: [
            (ad, eb) => {
              console.log('check', ad)
              return eb.exists('roles', (q) =>
                q.where('canAdmin', true).whereExists('members', (q) => q.where('id', ad.id))
              )
            },
          ],
        },
      },
    },

    // channel: {
    //   row: {
    //     insert: [
    //       (authData, { exists }) => {
    //         return cmp()
    //       }
    //     ]
    //   }
    // }
  }
})
