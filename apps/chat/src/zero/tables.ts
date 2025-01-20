import { pgTable, text, timestamp, boolean, json, primaryKey } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'
import type { UserState } from './types'

export const user = pgTable('user', {
  id: text('id').primaryKey(),
  username: text('username').notNull(),
  email: text('email').notNull(),
  name: text('name').notNull(),
  image: text('image'),
  state: json('state').$type<UserState>(),
  updatedAt: timestamp('updated_at'),
  createdAt: timestamp('created_at'),
})

export const friendship = pgTable(
  'friendship',
  {
    requestingId: text('requesting_id')
      .notNull()
      .references(() => user.id),
    acceptingId: text('accepting_id')
      .notNull()
      .references(() => user.id),
    accepted: boolean('accepted').notNull(),
    createdAt: timestamp('created_at'),
  },
  (t) => [primaryKey({ columns: [t.requestingId, t.acceptingId] })]
)

export const server = pgTable('server', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  creatorId: text('creator_id')
    .notNull()
    .references(() => user.id),
  channelSort: json('channel_sort'),
  description: text('description'),
  icon: text('icon'),
  createdAt: timestamp('created_at'),
})

export const serverMember = pgTable(
  'server_member',
  {
    serverId: text('server_id')
      .notNull()
      .references(() => server.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    joinedAt: timestamp('joined_at'),
  },
  (t) => [primaryKey({ columns: [t.serverId, t.userId] })]
)

export const channel = pgTable('channel', {
  id: text('id').primaryKey(),
  serverId: text('server_id')
    .notNull()
    .references(() => server.id),
  name: text('name').notNull(),
  description: text('description'),
  private: boolean('private').notNull(),
  createdAt: timestamp('created_at'),
})

export const message = pgTable('message', {
  id: text('id').primaryKey(),
  serverId: text('server_id')
    .notNull()
    .references(() => server.id),
  channelId: text('channel_id')
    .notNull()
    .references(() => channel.id),
  // threadId: text('thread_id'),
  isThreadReply: boolean('is_thread_reply').notNull(),
  creatorId: text('creator_id')
    .notNull()
    .references(() => user.id),
  // replyingToId: text('replying_to_id'),
  content: text('content').notNull(),
  createdAt: timestamp('created_at'),
  updatedAt: timestamp('updated_at'),
  deleted: boolean('deleted'),
})

// export const messageReferences = pgTable('message', {
//   threadId: text('thread_id').references(() => thread.id),
//   replyingToId: text('replying_to_id').references(() => message.id),
// })

export const thread = pgTable('thread', {
  id: text('id').primaryKey(),
  channelId: text('channel_id')
    .notNull()
    .references(() => channel.id),
  creatorId: text('creator_id')
    .notNull()
    .references(() => user.id),
  messageId: text('message_id')
    .notNull()
    .references(() => message.id),
  title: text('title').notNull(),
  deleted: boolean('deleted').notNull(),
  description: text('description'),
  createdAt: timestamp('created_at'),
})

export const attachment = pgTable('attachment', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id),
  messageId: text('message_id').references(() => message.id),
  channelId: text('channel_id').references(() => channel.id),
  type: text('type').notNull(),
  data: text('data'),
  url: text('url'),
  createdAt: timestamp('created_at'),
})

export const reaction = pgTable('reaction', {
  id: text('id').primaryKey(),
  value: text('value').notNull(),
  keyword: text('keyword').notNull(),
  createdAt: timestamp('created_at'),
  updatedAt: timestamp('updated_at'),
})

export const messageReaction = pgTable(
  'message_reaction',
  {
    messageId: text('message_id')
      .notNull()
      .references(() => message.id),
    creatorId: text('creator_id')
      .notNull()
      .references(() => user.id),
    reactionId: text('reaction_id')
      .notNull()
      .references(() => reaction.id),
    createdAt: timestamp('created_at'),
    updatedAt: timestamp('updated_at'),
  },
  (t) => [primaryKey({ columns: [t.messageId, t.creatorId, t.reactionId] })]
)

export const role = pgTable('role', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  color: text('color').notNull(),
  serverId: text('server_id')
    .notNull()
    .references(() => server.id),
  creatorId: text('creator_id')
    .notNull()
    .references(() => user.id),
  canAdmin: boolean('can_admin'),
  canEditChannel: boolean('can_edit_channel'),
  canEditServer: boolean('can_edit_server'),
  updatedAt: timestamp('updated_at'),
  createdAt: timestamp('created_at'),
})

export const userRole = pgTable(
  'user_role',
  {
    serverId: text('server_id')
      .notNull()
      .references(() => server.id),
    userId: text('user_id')
      .notNull()
      .references(() => user.id),
    roleId: text('role_id')
      .notNull()
      .references(() => role.id),
    granterId: text('granter_id')
      .notNull()
      .references(() => user.id),
    createdAt: timestamp('created_at'),
  },
  (t) => [primaryKey({ columns: [t.serverId, t.userId, t.roleId] })]
)

export const channelPermission = pgTable('channel_permission', {
  id: text('id').primaryKey(),
  serverId: text('server_id')
    .notNull()
    .references(() => server.id),
  channelId: text('channel_id')
    .notNull()
    .references(() => channel.id),
  roleId: text('role_id')
    .notNull()
    .references(() => role.id),
  granterId: text('granter_id')
    .notNull()
    .references(() => user.id),
  createdAt: timestamp('created_at'),
})

export const pin = pgTable('pin', {
  id: text('id').primaryKey(),
  serverId: text('server_id')
    .notNull()
    .references(() => server.id),
  channelId: text('channel_id')
    .notNull()
    .references(() => channel.id),
  messageId: text('message_id')
    .notNull()
    .references(() => message.id),
  creatorId: text('creator_id')
    .notNull()
    .references(() => user.id),
  createdAt: timestamp('created_at'),
})

export const userRelations = relations(user, ({ many }) => ({
  servers: many(serverMember),
  roles: many(userRole),
  messages: many(message),
  attachments: many(attachment),
}))

export const friendshipRelations = relations(friendship, ({ one }) => ({
  requester: one(user, {
    fields: [friendship.requestingId],
    references: [user.id],
  }),
  accepter: one(user, {
    fields: [friendship.acceptingId],
    references: [user.id],
  }),
}))

export const serverRelations = relations(server, ({ one, many }) => ({
  creator: one(user, {
    fields: [server.creatorId],
    references: [user.id],
  }),
  members: many(serverMember),
  channels: many(channel),
  roles: many(role),
}))

export const serverMemberRelations = relations(serverMember, ({ one }) => ({
  server: one(server, {
    fields: [serverMember.serverId],
    references: [server.id],
  }),
  user: one(user, {
    fields: [serverMember.userId],
    references: [user.id],
  }),
}))

export const channelRelations = relations(channel, ({ one, many }) => ({
  server: one(server, {
    fields: [channel.serverId],
    references: [server.id],
  }),
  messages: many(message),
  threads: many(thread),
  pins: many(pin),
  channelPermissions: many(channelPermission),
}))

export const messageRelations = relations(message, ({ one, many }) => ({
  thread: one(thread, {
    fields: [message.id],
    references: [thread.messageId],
  }),
  channel: one(channel, {
    fields: [message.channelId],
    references: [channel.id],
  }),
  sender: one(user, {
    fields: [message.creatorId],
    references: [user.id],
  }),
  attachments: many(attachment),
  reactions: many(messageReaction),
}))

export const threadRelations = relations(thread, ({ one, many }) => ({
  channel: one(channel, {
    fields: [thread.channelId],
    references: [channel.id],
  }),
  creator: one(user, {
    fields: [thread.creatorId],
    references: [user.id],
  }),
  originalMessage: one(message, {
    fields: [thread.messageId],
    references: [message.id],
  }),
  messages: many(message),
}))

export const attachmentRelations = relations(attachment, ({ one }) => ({
  user: one(user, {
    fields: [attachment.userId],
    references: [user.id],
  }),
  message: one(message, {
    fields: [attachment.messageId],
    references: [message.id],
  }),
  channel: one(channel, {
    fields: [attachment.channelId],
    references: [channel.id],
  }),
}))

export const reactionRelations = relations(reaction, ({ many }) => ({
  messageReactions: many(messageReaction),
}))

export const messageReactionRelations = relations(messageReaction, ({ one }) => ({
  message: one(message, {
    fields: [messageReaction.messageId],
    references: [message.id],
  }),
  creator: one(user, {
    fields: [messageReaction.creatorId],
    references: [user.id],
  }),
  reaction: one(reaction, {
    fields: [messageReaction.reactionId],
    references: [reaction.id],
  }),
}))

export const roleRelations = relations(role, ({ one, many }) => ({
  server: one(server, {
    fields: [role.serverId],
    references: [server.id],
  }),
  creator: one(user, {
    fields: [role.creatorId],
    references: [user.id],
  }),
  members: many(userRole),
  channelPermissions: many(channelPermission),
}))

export const userRoleRelations = relations(userRole, ({ one }) => ({
  server: one(server, {
    fields: [userRole.serverId],
    references: [server.id],
  }),
  user: one(user, {
    fields: [userRole.userId],
    references: [user.id],
  }),
  role: one(role, {
    fields: [userRole.roleId],
    references: [role.id],
  }),
  granter: one(user, {
    fields: [userRole.granterId],
    references: [user.id],
  }),
}))

export const channelPermissionRelations = relations(channelPermission, ({ one }) => ({
  server: one(server, {
    fields: [channelPermission.serverId],
    references: [server.id],
  }),
  channel: one(channel, {
    fields: [channelPermission.channelId],
    references: [channel.id],
  }),
  role: one(role, {
    fields: [channelPermission.roleId],
    references: [role.id],
  }),
  granter: one(user, {
    fields: [channelPermission.granterId],
    references: [user.id],
  }),
}))

export const pinRelations = relations(pin, ({ one }) => ({
  server: one(server, {
    fields: [pin.serverId],
    references: [server.id],
  }),
  channel: one(channel, {
    fields: [pin.channelId],
    references: [channel.id],
  }),
  message: one(message, {
    fields: [pin.messageId],
    references: [message.id],
  }),
  creator: one(user, {
    fields: [pin.creatorId],
    references: [user.id],
  }),
}))

export type User = typeof user.$inferSelect
export type Friendship = typeof friendship.$inferSelect
export type Server = typeof server.$inferSelect
export type ServerMember = typeof serverMember.$inferSelect
export type Channel = typeof channel.$inferSelect
export type Message = typeof message.$inferSelect
export type Thread = typeof thread.$inferSelect
export type Attachment = typeof attachment.$inferSelect
export type Reaction = typeof reaction.$inferSelect
export type MessageReaction = typeof messageReaction.$inferSelect
export type Role = typeof role.$inferSelect
export type UserRole = typeof userRole.$inferSelect
export type ChannelPermission = typeof channelPermission.$inferSelect
export type Pin = typeof pin.$inferSelect
export type MessageWithRelations = Message & {
  channel?: Channel
  reactions?: readonly MessageReaction[]
  thread?: Thread
  sender?: User
  attachments?: readonly Attachment[]
}

export type ThreadWithRelations = Thread & {
  channel?: Channel
  creator?: User
  originalMessage?: Message
  messages?: Message[]
}

export type RoleWithRelations = Role & {
  server?: Server
  creator?: User
  members?: UserRole[]
  channelPermissions?: ChannelPermission[]
}

export type ChannelWithRelations = Channel & {
  server?: Server
  messages?: Message[]
  threads?: Thread[]
  pins?: Pin[]
  channelPermissions?: ChannelPermission[]
}

export type ServerWithRelations = Server & {
  creator?: User
  members?: ServerMember[]
  channels?: Channel[]
  roles?: Role[]
}

export type UserWithRelations = User & {
  servers?: ServerMember[]
  roles?: UserRole[]
  messages?: Message[]
  attachments?: Attachment[]
  requestingFriendships?: Friendship[]
  acceptingFriendships?: Friendship[]
}

const rolePermissionsKeys = ['canAdmin', 'canEditChannel', 'canEditServer'] satisfies (keyof Role)[]
export type RolePermissionsKeys = (typeof rolePermissionsKeys)[number]
