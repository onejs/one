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
        name: true,
        image: true,
        state: true,
        updated_at: true,
        created_at: true,
      },
      server: {
        id: true,
        name: true,
        creator_id: true,
        channel_sort: true,
        description: true,
        icon: true,
        created_at: true,
      },
      channel: {
        id: true,
        server_id: true,
        name: true,
        description: true,
        private: true,
        created_at: true,
      },
      message: {
        id: true,
        server_id: true,
        channel_id: true,
        thread_id: true,
        is_thread_reply: true,
        creator_id: true,
        replying_to_id: true,
        content: true,
        created_at: true,
        updated_at: true,
        deleted: true,
      },
      attachment: {
        id: true,
        user_id: true,
        message_id: true,
        channel_id: true,
        type: true,
        data: true,
        url: true,
        created_at: true,
      },
      role: {
        id: true,
        name: true,
        color: true,
        server_id: true,
        creator_id: true,
        can_admin: true,
        can_edit_channel: true,
        can_edit_server: true,
        updated_at: true,
        created_at: true,
      },
      user_role: {
        server_id: true,
        user_id: true,
        role_id: true,
        granter_id: true,
        created_at: true,
      },
      channel_permission: {
        id: true,
        server_id: true,
        channel_id: true,
        role_id: true,
        granter_id: true,
        created_at: true,
      },
      pin: {
        id: true,
        server_id: true,
        channel_id: true,
        message_id: true,
        creator_id: true,
        created_at: true,
      },
      friendship: {
        requesting_id: true,
        accepting_id: true,
        accepted: true,
        created_at: true,
      },
      server_member: {
        server_id: true,
        user_id: true,
        joined_at: true,
      },
      thread: {
        id: true,
        channel_id: true,
        creator_id: true,
        message_id: true,
        title: true,
        deleted: true,
        description: true,
        created_at: true,
      },
      message_reaction: {
        message_id: true,
        creator_id: true,
        reaction_id: true,
        created_at: true,
        updated_at: true,
      },
      reaction: {
        id: true,
        value: true,
        keyword: true,
        created_at: true,
        updated_at: true,
      },
    },
    manyToMany: {
      user: {
        servers: ['server_member', 'server'],
        roles: ['user_role', 'role'],
      },
      server: {
        members: ['server_member', 'user'],
      },
      role: {
        members: ['user_role', 'user'],
      },
      channel: {
        roles: ['channel_permission', 'role'],
      },
      message: {
        reactions: ['message_reaction', 'reaction'],
      },
    },
  })
)

export type Schema = typeof schema
