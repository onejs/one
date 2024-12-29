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
        destField: 'userID',
        destSchema: () => serverMember,
      },
      {
        sourceField: 'serverID',
        destField: 'id',
        destSchema: () => server,
      },
    ],

    friends: [
      {
        sourceField: 'id',
        destField: 'requestingID',
        destSchema: () => friendship,
      },
      {
        sourceField: 'acceptingID',
        destField: 'id',
        destSchema: () => user,
      },
    ],

    attachments: {
      sourceField: 'id',
      destField: 'userID',
      destSchema: () => attachment,
    },
  },
} as const

export const attachment = {
  tableName: 'attachment',
  columns: {
    id: 'string',
    userID: 'string',
    // attached to a specific message
    messageID: { type: 'string', optional: true },
    // if authoring a message in a channel
    channelID: { type: 'string', optional: true },
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
        destSchema: () => userRole,
      },
      {
        sourceField: 'userID',
        destField: 'id',
        destSchema: () => user,
      },
    ],
  },
} as const

export const userRole = createTableSchema({
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

export const channelRole = createTableSchema({
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

export const friendship = createTableSchema({
  tableName: 'friendship',
  primaryKey: ['requestingID', 'acceptingID'],
  columns: {
    requestingID: 'string',
    acceptingID: 'string',
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
      destSchema: () => channel,
    },

    members: [
      {
        sourceField: 'id',
        destField: 'serverID',
        destSchema: () => serverMember,
      },
      {
        sourceField: 'userID',
        destField: 'id',
        destSchema: () => user,
      },
    ],

    roles: {
      sourceField: 'id',
      destField: 'serverID',
      destSchema: () => role,
    },
  },
} as const

export const serverMember = createTableSchema({
  tableName: 'serverMember',
  primaryKey: ['serverID', 'userID'],
  columns: {
    serverID: 'string',
    userID: 'string',
    joinedAt: { type: 'number', optional: true },
  },
})

export const channel = createTableSchema({
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
      destSchema: () => message,
    },

    threads: {
      sourceField: 'id',
      destField: 'channelID',
      destSchema: () => thread,
    },

    roles: [
      {
        sourceField: 'id',
        destField: 'channelID',
        destSchema: () => channelRole,
      },
      {
        sourceField: 'roleID',
        destField: 'id',
        destSchema: () => role,
      },
    ],

    server: {
      sourceField: 'serverID',
      destField: 'id',
      destSchema: () => server,
    },
  },
})

export const thread = {
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
      destSchema: () => message,
    },
  },
} as const

export const message = {
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
      destSchema: () => thread,
    },

    sender: {
      sourceField: 'creatorID',
      destField: 'id',
      destSchema: () => user,
    },

    reactions: [
      {
        sourceField: 'id',
        destField: 'messageID',
        destSchema: () => messageReaction,
      },
      {
        sourceField: 'reactionID',
        destField: 'id',
        destSchema: () => reaction,
      },
    ],

    attachments: {
      sourceField: 'id',
      destField: 'messageID',
      destSchema: () => attachment,
    },
  },
} as const

export const messageReaction = createTableSchema({
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
export type ChannelRole = Row<typeof channelRole>

const rolePermissionsKeys = ['canAdmin', 'canEditChannel', 'canEditServer'] satisfies (keyof Role)[]
export type RolePermissionsKeys = (typeof rolePermissionsKeys)[0]

export type MessageWithRelations = Message & {
  reactions: readonly Reaction[]
  thread?: readonly Thread[]
  sender: readonly User[]
}
export type ThreadWithRelations = Thread & { messages: readonly Message[] }
export type RoleWithRelations = Role & { members: readonly User[] }
