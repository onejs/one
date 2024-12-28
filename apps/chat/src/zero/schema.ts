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
  // serverID to channelID
  activeChannels: Record<string, string>
  showSidePanel?: 'user' | 'settings'
  channelState?: ChannelsState
  // array so we can occasionally cull oldest, only need to remember a few
  messageEdits?: [{ id: string; content: string }]
}

export type ChannelsState = {
  [server_and_channel_id: string]: ChannelState
}

export type ChannelState = {
  mainView?: 'thread' | 'chat'
  focusedMessageId?: string
  editingMessageId?: string
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
        destField: 'userID',
        destSchema: () => serverMemberSchema,
      },
      {
        sourceField: 'serverID',
        destField: 'id',
        destSchema: () => serverSchema,
      },
    ],

    friends: [
      {
        sourceField: 'id',
        destField: 'requestingID',
        destSchema: () => friendshipSchema,
      },
      {
        sourceField: 'acceptingID',
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
    serverID: 'string',
    creatorID: 'string',
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
        destField: 'roleID',
        destSchema: () => userRoleSchema,
      },
      {
        sourceField: 'userID',
        destField: 'id',
        destSchema: () => userSchema,
      },
    ],
  },
} as const

const userRoleSchema = createTableSchema({
  tableName: 'userRole',
  primaryKey: ['serverID', 'userID', 'roleID'],
  columns: {
    serverID: 'string',
    userID: 'string',
    roleID: 'string',
    granterID: 'string',
    createdAt: { type: 'number', optional: true },
  },
})

const channelRoleSchema = createTableSchema({
  tableName: 'channelRole',
  primaryKey: ['serverID', 'channelID', 'roleID'],
  columns: {
    serverID: 'string',
    channelID: 'string',
    roleID: 'string',
    granterID: 'string',
    createdAt: { type: 'number', optional: true },
  },
})

const friendshipSchema = createTableSchema({
  tableName: 'friendship',
  primaryKey: ['requestingID', 'acceptingID'],
  columns: {
    requestingID: 'string',
    acceptingID: 'string',
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
    creatorID: 'string',
    channelSort: 'json',
    description: 'string',
    icon: 'string',
    createdAt: { type: 'number', optional: true },
  },
  relationships: {
    channels: {
      sourceField: 'id',
      destField: 'serverID',
      destSchema: () => channelSchema,
    },

    members: [
      {
        sourceField: 'id',
        destField: 'serverID',
        destSchema: () => serverMemberSchema,
      },
      {
        sourceField: 'userID',
        destField: 'id',
        destSchema: () => userSchema,
      },
    ],

    roles: {
      sourceField: 'id',
      destField: 'serverID',
      destSchema: () => roleSchema,
    },
  },
} as const

const serverMemberSchema = createTableSchema({
  tableName: 'serverMember',
  primaryKey: ['serverID', 'userID'],
  columns: {
    serverID: 'string',
    userID: 'string',
    joinedAt: { type: 'number', optional: true },
  },
})

const channelSchema = createTableSchema({
  tableName: 'channel',
  columns: {
    id: 'string',
    serverID: 'string',
    name: 'string',
    description: 'string',
    private: { type: 'boolean' },
    createdAt: { type: 'number', optional: true },
  },
  primaryKey: ['id'],
  relationships: {
    messages: {
      sourceField: 'id',
      destField: 'channelID',
      destSchema: () => messageSchema,
    },

    threads: {
      sourceField: 'id',
      destField: 'channelID',
      destSchema: () => threadSchema,
    },

    roles: [
      {
        sourceField: 'id',
        destField: 'channelID',
        destSchema: () => channelRoleSchema,
      },
      {
        sourceField: 'roleID',
        destField: 'id',
        destSchema: () => roleSchema,
      },
    ],

    server: {
      sourceField: 'serverID',
      destField: 'id',
      destSchema: () => serverSchema,
    },
  },
})

const threadSchema = {
  tableName: 'thread',
  columns: {
    id: 'string',
    channelID: 'string',
    creatorID: 'string',
    messageID: 'string',
    title: 'string',
    description: 'string',
    createdAt: { type: 'number', optional: true },
  },
  primaryKey: ['id'],
  relationships: {
    messages: {
      sourceField: 'id',
      destField: 'threadID',
      destSchema: () => messageSchema,
    },
  },
} as const

const messageSchema = {
  tableName: 'message',
  primaryKey: ['id'],
  columns: {
    id: 'string',
    serverID: 'string',
    channelID: 'string',
    threadID: { type: 'string', optional: true },
    isThreadReply: 'boolean',
    creatorID: 'string',
    content: 'string',
    createdAt: { type: 'number', optional: true },
    updatedAt: { type: 'number', optional: true },
    deleted: { type: 'boolean', optional: true },
  },
  relationships: {
    thread: {
      sourceField: 'id',
      destField: 'messageID',
      destSchema: () => threadSchema,
    },

    sender: {
      sourceField: 'creatorID',
      destField: 'id',
      destSchema: () => userSchema,
    },

    reactions: [
      {
        sourceField: 'id',
        destField: 'messageID',
        destSchema: () => messageReactionSchema,
      },
      {
        sourceField: 'reactionID',
        destField: 'id',
        destSchema: () => reactionSchema,
      },
    ],
  },
} as const

const messageReactionSchema = createTableSchema({
  tableName: 'messageReaction',
  primaryKey: ['messageID', 'creatorID', 'reactionID'],
  columns: {
    messageID: 'string',
    creatorID: 'string',
    reactionID: 'string',
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

const rolePermissionsKeys = ['canAdmin', 'canEditChannel', 'canEditServer'] satisfies (keyof Role)[]

export type RolePermissionsKeys = (typeof rolePermissionsKeys)[0]

export type RoleWithRelations = Role & { members: readonly User[] }

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
    return cmpLit(authData.sub, 'IS NOT', null)
  }

  // const loggedInUserIsCreator = (
  //   authData: AuthData,
  //   eb: ExpressionBuilder<typeof commentSchema | typeof emojiSchema | typeof issueSchema>
  // ) => eb.and(userIsLoggedIn(authData, eb), eb.cmp('creatorID', '=', authData.sub))

  const channelRowUserHasPermissions = (
    ad: AuthData,
    eb: ExpressionBuilder<typeof channelSchema>
  ) => {
    return eb.exists('server', (server) => {
      return server.whereExists('roles', (q) =>
        q.where('canAdmin', true).whereExists('members', (q) => q.where('id', ad.id))
      )
    })
  }

  return {
    user: {
      // Only the authentication system can write to the user table.
      row: {
        insert: NOBODY_CAN,
        // update: {
        //   preMutation: [
        //     // logged in user is user
        //     // TODO should move to a separate userState table likely
        //     (ad, eb) => {
        //       return eb.and(userIsLoggedIn(ad, eb), eb.cmp('id', ad.id))
        //     },
        //   ],
        // },
        delete: NOBODY_CAN,
      },
    },

    server: {
      row: {
        insert: [userIsLoggedIn],
        update: {
          preMutation: [
            (ad, eb) => {
              return eb.or(
                eb.exists('roles', (q) =>
                  q.where('canAdmin', true).whereExists('members', (q) => q.where('id', ad.id))
                ),
                eb.exists('roles', (q) =>
                  q.where('canEditServer', true).whereExists('members', (q) => q.where('id', ad.id))
                )
              )
            },
          ],
        },
      },
    },

    channel: {
      row: {
        insert: [channelRowUserHasPermissions],
        update: {
          preMutation: [channelRowUserHasPermissions],
        },
      },
    },
  }
})
