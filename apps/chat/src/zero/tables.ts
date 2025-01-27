import { boolean, json, number, relationships, string, table } from '@rocicorp/zero'
import type { UserState } from './types'

export const user = table('user')
  .columns({
    id: string(),
    username: string(),
    email: string(),
    name: string(),
    image: string(),
    state: json<UserState>(),
    updatedAt: number().optional(),
    createdAt: number().optional(),
  })
  .primaryKey('id')

export const attachment = table('attachment')
  .columns({
    id: string(),
    userId: string(),
    messageId: string().optional(),
    channelId: string().optional(),
    type: string(),
    data: string().optional(),
    url: string().optional(),
    createdAt: number().optional(),
  })
  .primaryKey('id')

export const role = table('role')
  .columns({
    id: string(),
    name: string(),
    color: string(),
    serverId: string(),
    creatorId: string(),
    canAdmin: boolean().optional(),
    canEditChannel: boolean().optional(),
    canEditServer: boolean().optional(),
    updatedAt: number().optional(),
    createdAt: number().optional(),
  })
  .primaryKey('id')

export const userRole = table('userRole')
  .columns({
    serverId: string(),
    userId: string(),
    roleId: string(),
    granterId: string(),
    createdAt: number().optional(),
  })
  .primaryKey('serverId', 'userId', 'roleId')

export const channelPermission = table('channelPermission')
  .columns({
    id: string(),
    serverId: string(),
    channelId: string(),
    roleId: string(),
    granterId: string(),
    createdAt: number().optional(),
  })
  .primaryKey('id')

export const pin = table('pin')
  .columns({
    id: string(),
    serverId: string(),
    channelId: string(),
    messageId: string(),
    creatorId: string(),
    createdAt: number().optional(),
  })
  .primaryKey('id')

export const friendship = table('friendship')
  .columns({
    requestingId: string(),
    acceptingId: string(),
    accepted: boolean(),
    createdAt: number().optional(),
  })
  .primaryKey('requestingId', 'acceptingId')

export const server = table('server')
  .columns({
    id: string(),
    name: string(),
    creatorId: string(),
    channelSort: json(),
    description: string(),
    icon: string(),
    createdAt: number().optional(),
  })
  .primaryKey('id')

export const serverMember = table('serverMember')
  .columns({
    serverId: string(),
    userId: string(),
    joinedAt: number().optional(),
  })
  .primaryKey('serverId', 'userId')

export const channel = table('channel')
  .columns({
    id: string(),
    serverId: string(),
    name: string(),
    description: string(),
    private: boolean(),
    createdAt: number().optional(),
  })
  .primaryKey('id')

export const thread = table('thread')
  .columns({
    id: string(),
    channelId: string(),
    creatorId: string(),
    messageId: string(),
    title: string(),
    deleted: boolean(),
    description: string(),
    createdAt: number().optional(),
  })
  .primaryKey('id')

export const message = table('message')
  .columns({
    id: string(),
    serverId: string(),
    channelId: string(),
    threadId: string().optional(),
    isThreadReply: boolean(),
    creatorId: string(),
    replyingToId: string().optional(),
    content: string(),
    createdAt: number().optional(),
    updatedAt: number().optional(),
    deleted: boolean().optional(),
  })
  .primaryKey('id')

export const messageReaction = table('messageReaction')
  .columns({
    messageId: string(),
    creatorId: string(),
    reactionId: string(),
    createdAt: number().optional(),
    updatedAt: number().optional(),
  })
  .primaryKey('messageId', 'creatorId', 'reactionId')

export const reaction = table('reaction')
  .columns({
    id: string(),
    value: string(),
    keyword: string(),
    createdAt: number().optional(),
    updatedAt: number().optional(),
  })
  .primaryKey('id')

export const allTables = [
  user,
  attachment,
  role,
  userRole,
  channelPermission,
  pin,
  friendship,
  server,
  serverMember,
  channel,
  thread,
  message,
  messageReaction,
  reaction,
]

export const userRelationships = relationships(user, ({ many }) => ({
  servers: many(
    { sourceField: ['id'], destSchema: serverMember, destField: ['userId'] },
    { sourceField: ['serverId'], destSchema: server, destField: ['id'] }
  ),
  friends: many(
    { sourceField: ['id'], destSchema: friendship, destField: ['requestingId'] },
    { sourceField: ['acceptingId'], destSchema: user, destField: ['id'] }
  ),
  attachments: many({
    sourceField: ['id'],
    destSchema: attachment,
    destField: ['userId'],
  }),
}))

export const roleRelationships = relationships(role, ({ many }) => ({
  members: many(
    { sourceField: ['id'], destSchema: userRole, destField: ['roleId'] },
    { sourceField: ['userId'], destSchema: user, destField: ['id'] }
  ),
}))

export const channelPermissionRelationships = relationships(channelPermission, ({ one }) => ({
  role: one({
    sourceField: ['roleId'],
    destSchema: role,
    destField: ['id'],
  }),
}))

export const pinRelationships = relationships(pin, ({ one }) => ({
  message: one({
    sourceField: ['messageId'],
    destSchema: message,
    destField: ['id'],
  }),
}))

export const serverRelationships = relationships(server, ({ many, one }) => ({
  channels: many({
    sourceField: ['id'],
    destSchema: channel,
    destField: ['serverId'],
  }),
  members: many(
    { sourceField: ['id'], destSchema: serverMember, destField: ['serverId'] },
    { sourceField: ['userId'], destSchema: user, destField: ['id'] }
  ),
  roles: many({
    sourceField: ['id'],
    destSchema: role,
    destField: ['serverId'],
  }),
}))

export const channelRelationships = relationships(channel, ({ many, one }) => ({
  messages: many({
    sourceField: ['id'],
    destSchema: message,
    destField: ['channelId'],
  }),
  threads: many({
    sourceField: ['id'],
    destSchema: thread,
    destField: ['channelId'],
  }),
  pins: many({
    sourceField: ['id'],
    destSchema: pin,
    destField: ['channelId'],
  }),
  roles: many(
    { sourceField: ['id'], destSchema: channelPermission, destField: ['channelId'] },
    { sourceField: ['roleId'], destSchema: role, destField: ['id'] }
  ),
  server: one({
    sourceField: ['serverId'],
    destSchema: server,
    destField: ['id'],
  }),
  permissions: many({
    sourceField: ['id'],
    destSchema: channelPermission,
    destField: ['channelId'],
  }),
}))

export const threadRelationships = relationships(thread, ({ many, one }) => ({
  messages: many({
    sourceField: ['id'],
    destSchema: message,
    destField: ['threadId'],
  }),
}))

export const messageRelationships = relationships(message, ({ many, one }) => ({
  thread: one({
    sourceField: ['id'],
    destSchema: thread,
    destField: ['messageId'],
  }),
  channel: one({
    sourceField: ['channelId'],
    destSchema: channel,
    destField: ['id'],
  }),
  replyingTo: one({
    sourceField: ['replyingToId'],
    destSchema: message,
    destField: ['id'],
  }),
  sender: one({
    sourceField: ['creatorId'],
    destSchema: user,
    destField: ['id'],
  }),
  reactions: many(
    { sourceField: ['id'], destSchema: messageReaction, destField: ['messageId'] },
    { sourceField: ['reactionId'], destSchema: reaction, destField: ['id'] }
  ),
  attachments: many({
    sourceField: ['id'],
    destSchema: attachment,
    destField: ['messageId'],
  }),
}))

export const allRelationships = [
  userRelationships,
  roleRelationships,
  channelPermissionRelationships,
  pinRelationships,
  serverRelationships,
  channelRelationships,
  threadRelationships,
  messageRelationships,
]
