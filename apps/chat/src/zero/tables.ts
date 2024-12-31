import { column, createTableSchema, type Row } from '@rocicorp/zero'
import type { UserState } from './types'

export const user = {
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
        destSchema: () => serverMember,
      },
      {
        sourceField: 'serverId',
        destField: 'id',
        destSchema: () => server,
      },
    ],

    friends: [
      {
        sourceField: 'id',
        destField: 'requestingId',
        destSchema: () => friendship,
      },
      {
        sourceField: 'acceptingId',
        destField: 'id',
        destSchema: () => user,
      },
    ],

    attachments: {
      sourceField: 'id',
      destField: 'userId',
      destSchema: () => attachment,
    },
  },
} as const

export const attachment = {
  tableName: 'attachment',
  columns: {
    id: 'string',
    userId: 'string',
    // attached to a specific message
    messageId: { type: 'string', optional: true },
    // if authoring a message in a channel
    channelId: { type: 'string', optional: true },
    type: 'string',
    data: { type: 'string', optional: true },
    url: { type: 'string', optional: true },
    createdAt: { type: 'number', optional: true },
  },
  primaryKey: ['id'],
} as const

export const role = {
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
        destSchema: () => userRole,
      },
      {
        sourceField: 'userId',
        destField: 'id',
        destSchema: () => user,
      },
    ],
  },
} as const

export const userRole = createTableSchema({
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

export const channelPermission = {
  tableName: 'channelPermission',
  primaryKey: ['serverId', 'channelId', 'roleId'],
  columns: {
    serverId: 'string',
    channelId: 'string',
    roleId: 'string',
    granterId: 'string',
    createdAt: { type: 'number', optional: true },
  },

  relationships: {
    role: {
      sourceField: 'roleId',
      destField: 'id',
      destSchema: () => role,
    },
  },
} as const

export const friendship = createTableSchema({
  tableName: 'friendship',
  primaryKey: ['requestingId', 'acceptingId'],
  columns: {
    requestingId: 'string',
    acceptingId: 'string',
    accepted: 'boolean',
    createdAt: { type: 'number', optional: true },
  },
})

export const server = {
  tableName: 'server',
  primaryKey: ['id'],
  columns: {
    id: 'string',
    name: 'string',
    creatorId: 'string',
    channelSort: 'json',
    description: 'string',
    icon: 'string',
    createdAt: { type: 'number', optional: true },
  },
  relationships: {
    channels: {
      sourceField: 'id',
      destField: 'serverId',
      destSchema: () => channel,
    },

    members: [
      {
        sourceField: 'id',
        destField: 'serverId',
        destSchema: () => serverMember,
      },
      {
        sourceField: 'userId',
        destField: 'id',
        destSchema: () => user,
      },
    ],

    roles: {
      sourceField: 'id',
      destField: 'serverId',
      destSchema: () => role,
    },
  },
} as const

export const serverMember = createTableSchema({
  tableName: 'serverMember',
  primaryKey: ['serverId', 'userId'],
  columns: {
    serverId: 'string',
    userId: 'string',
    joinedAt: { type: 'number', optional: true },
  },
})

export const channel = createTableSchema({
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
      destSchema: () => message,
    },

    threads: {
      sourceField: 'id',
      destField: 'channelId',
      destSchema: () => thread,
    },

    roles: [
      {
        sourceField: 'id',
        destField: 'channelId',
        destSchema: () => channelPermission,
      },
      {
        sourceField: 'roleId',
        destField: 'id',
        destSchema: () => role,
      },
    ],

    server: {
      sourceField: 'serverId',
      destField: 'id',
      destSchema: () => server,
    },

    permissions: {
      sourceField: 'id',
      destField: 'channelId',
      destSchema: () => channelPermission,
    },
  },
})

export const thread = {
  tableName: 'thread',
  columns: {
    id: 'string',
    channelId: 'string',
    creatorId: 'string',
    messageId: 'string',
    title: 'string',
    deleted: 'boolean',
    description: 'string',
    createdAt: { type: 'number', optional: true },
  },
  primaryKey: ['id'],
  relationships: {
    messages: {
      sourceField: 'id',
      destField: 'threadId',
      destSchema: () => message,
    },
  },
} as const

export const message = {
  tableName: 'message',
  primaryKey: ['id'],
  columns: {
    id: 'string',
    serverId: 'string',
    channelId: 'string',
    threadId: { type: 'string', optional: true },
    isThreadReply: 'boolean',
    creatorId: 'string',
    replyingToId: { type: 'string', optional: true },
    content: 'string',
    createdAt: { type: 'number', optional: true },
    updatedAt: { type: 'number', optional: true },
    deleted: { type: 'boolean', optional: true },
  },
  relationships: {
    thread: {
      sourceField: 'id',
      destField: 'messageId',
      destSchema: () => thread,
    },

    replyingTo: {
      sourceField: 'replyingToId',
      destField: 'id',
      destSchema: () => message,
    },

    sender: {
      sourceField: 'creatorId',
      destField: 'id',
      destSchema: () => user,
    },

    reactions: [
      {
        sourceField: 'id',
        destField: 'messageId',
        destSchema: () => messageReaction,
      },
      {
        sourceField: 'reactionId',
        destField: 'id',
        destSchema: () => reaction,
      },
    ],

    attachments: {
      sourceField: 'id',
      destField: 'messageId',
      destSchema: () => attachment,
    },
  },
} as const

export const messageReaction = createTableSchema({
  tableName: 'messageReaction',
  primaryKey: ['messageId', 'creatorId', 'reactionId'],
  columns: {
    messageId: 'string',
    creatorId: 'string',
    reactionId: 'string',
    createdAt: { type: 'number', optional: true },
    updatedAt: { type: 'number', optional: true },
  },
})

export const reaction = createTableSchema({
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

export type Attachment = Row<typeof attachment>
export type Message = Row<typeof message>
export type Server = Row<typeof server>
export type Channel = Row<typeof channel>
export type Thread = Row<typeof thread>
export type User = Row<typeof user>
export type ServerMember = Row<typeof serverMember>
export type MessageReaction = Row<typeof messageReaction>
export type Reaction = Row<typeof reaction>
export type Friendship = Row<typeof friendship>
export type Role = Row<typeof role>
export type UserRole = Row<typeof userRole>
export type ChannelPermission = Row<typeof channelPermission>

const rolePermissionsKeys = ['canAdmin', 'canEditChannel', 'canEditServer'] satisfies (keyof Role)[]
export type RolePermissionsKeys = (typeof rolePermissionsKeys)[0]

export type MessageWithRelations = Message & {
  reactions: readonly Reaction[]
  thread?: Thread
  sender?: User
  replyingTo?: Message & { sender?: User }
  attachments: readonly Attachment[]
}
export type ThreadWithRelations = Thread & { messages: readonly Message[] }
export type RoleWithRelations = Role & { members: readonly User[] }
