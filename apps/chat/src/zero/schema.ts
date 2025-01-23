import { createSchema } from '@rocicorp/zero'
import { createZeroSchema } from 'drizzle-zero'
import * as drizzleSchema from './tables'

export const schema = createSchema(
  createZeroSchema(drizzleSchema, {
    version: 1,
    tables: {
      user: {
        id: true,
        username: true,
        email: true,
        emailVerified: true,
        name: true,
        image: true,
        state: true,
        updatedAt: true,
        createdAt: true,
      },
      server: {
        id: true,
        name: true,
        creatorId: true,
        channelSort: true,
        description: true,
        icon: true,
        createdAt: true,
      },
      channel: {
        id: true,
        serverId: true,
        name: true,
        description: true,
        private: true,
        createdAt: true,
      },
      message: {
        id: true,
        serverId: true,
        channelId: true,
        threadId: true,
        isThreadReply: true,
        creatorId: true,
        replyingToId: true,
        content: true,
        createdAt: true,
        updatedAt: true,
        deleted: true,
      },
      attachment: {
        id: true,
        userId: true,
        messageId: true,
        channelId: true,
        type: true,
        data: true,
        url: true,
        createdAt: true,
      },
      role: {
        id: true,
        name: true,
        color: true,
        serverId: true,
        creatorId: true,
        canAdmin: true,
        canEditChannel: true,
        canEditServer: true,
        updatedAt: true,
        createdAt: true,
      },
      userRole: {
        serverId: true,
        userId: true,
        roleId: true,
        granterId: true,
        createdAt: true,
      },
      channelPermission: {
        id: true,
        serverId: true,
        channelId: true,
        roleId: true,
        granterId: true,
        createdAt: true,
      },
      pin: {
        id: true,
        serverId: true,
        channelId: true,
        messageId: true,
        creatorId: true,
        createdAt: true,
      },
      friendship: {
        requestingId: true,
        acceptingId: true,
        accepted: true,
        createdAt: true,
      },
      serverMember: {
        serverId: true,
        userId: true,
        joinedAt: true,
      },
      thread: {
        id: true,
        channelId: true,
        creatorId: true,
        messageId: true,
        title: true,
        deleted: true,
        description: true,
        createdAt: true,
      },
      messageReaction: {
        messageId: true,
        creatorId: true,
        reactionId: true,
        createdAt: true,
        updatedAt: true,
      },
      reaction: {
        id: true,
        value: true,
        keyword: true,
        createdAt: true,
        updatedAt: true,
      },
    },
    manyToMany: {
      user: {
        servers: ['serverMember', 'server'],
        roles: ['userRole', 'role'],
      },
      server: {
        members: ['serverMember', 'user'],
      },
      role: {
        members: ['userRole', 'user'],
      },
      channel: {
        roles: ['channelPermission', 'role'],
      },
      message: {
        reactions: ['messageReaction', 'reaction'],
      },
    },
  })
)

export type Schema = typeof schema
