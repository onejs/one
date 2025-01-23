import {
  pgTable,
  text,
  timestamp,
  boolean,
  json,
  primaryKey,
  foreignKey,
  type AnyPgColumn,
} from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'
import type { UserState } from './types'

export const user = pgTable('user', {
  id: text('id').primaryKey(),
  username: text('username').notNull(),
  email: text('email').notNull(),
  emailVerified: boolean('emailVerified').notNull().default(false),
  name: text('name').notNull(),
  image: text('image'),
  state: json('state').$type<UserState>(),
  updatedAt: timestamp('updatedAt').defaultNow(),
  createdAt: timestamp('createdAt').defaultNow(),
})

export const friendship = pgTable(
  'friendship',
  {
    requestingId: text('requestingId')
      .notNull()
      .references(() => user.id),
    acceptingId: text('acceptingId')
      .notNull()
      .references(() => user.id),
    accepted: boolean('accepted').notNull(),
    createdAt: timestamp('createdAt').defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.requestingId, t.acceptingId] })]
)

export const server = pgTable('server', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  creatorId: text('creatorId')
    .notNull()
    .references(() => user.id),
  channelSort: json('channelSort'),
  description: text('description'),
  icon: text('icon'),
  createdAt: timestamp('createdAt').defaultNow(),
})

export const serverMember = pgTable(
  'serverMember',
  {
    serverId: text('serverId')
      .notNull()
      .references(() => server.id, { onDelete: 'cascade' }),
    userId: text('userId')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    joinedAt: timestamp('joinedAt').defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.serverId, t.userId] })]
)

export const channel = pgTable('channel', {
  id: text('id').primaryKey(),
  serverId: text('serverId')
    .notNull()
    .references(() => server.id),
  name: text('name').notNull(),
  description: text('description'),
  private: boolean('private').notNull(),
  createdAt: timestamp('createdAt').defaultNow(),
})

export const thread = pgTable('thread', {
  id: text('id').primaryKey(),
  channelId: text('channelId')
    .notNull()
    .references(() => channel.id),
  creatorId: text('creatorId')
    .notNull()
    .references(() => user.id),
  title: text('title').notNull(),
  description: text('description'),
  deleted: boolean('deleted').notNull(),
  createdAt: timestamp('createdAt').defaultNow(),
})

export const message = pgTable('message', {
  id: text('id').primaryKey(),
  serverId: text('serverId')
    .notNull()
    .references(() => server.id),
  channelId: text('channelId')
    .notNull()
    .references(() => channel.id),
  threadId: text('threadId').references(() => thread.id),
  creatorId: text('creatorId')
    .notNull()
    .references(() => user.id),
  content: text('content').notNull(),
  createdAt: timestamp('createdAt').defaultNow(),
  updatedAt: timestamp('updatedAt').defaultNow(),
  deleted: boolean('deleted'),
  isThreadReply: boolean('isThreadReply').notNull().default(false),
  replyingToId: text('replyingToId').references((): AnyPgColumn => message.id),
})

export const attachment = pgTable('attachment', {
  id: text('id').primaryKey(),
  userId: text('userId')
    .notNull()
    .references(() => user.id),
  messageId: text('messageId').references(() => message.id),
  channelId: text('channelId').references(() => channel.id),
  type: text('type').notNull(),
  data: text('data'),
  url: text('url'),
  createdAt: timestamp('createdAt').defaultNow(),
})

export const reaction = pgTable('reaction', {
  id: text('id').primaryKey(),
  value: text('value').notNull(),
  keyword: text('keyword').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
})

export const messageReaction = pgTable(
  'messageReaction',
  {
    messageId: text('messageId')
      .notNull()
      .references(() => message.id),
    creatorId: text('creatorId')
      .notNull()
      .references(() => user.id),
    reactionId: text('reactionId')
      .notNull()
      .references(() => reaction.id),
    createdAt: timestamp('createdAt').defaultNow(),
    updatedAt: timestamp('updatedAt').defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.messageId, t.creatorId, t.reactionId] })]
)

export const role = pgTable('role', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  color: text('color').notNull(),
  serverId: text('serverId')
    .notNull()
    .references(() => server.id),
  creatorId: text('creatorId')
    .notNull()
    .references(() => user.id),
  canAdmin: boolean('canAdmin'),
  canEditChannel: boolean('canEditChannel'),
  canEditServer: boolean('canEditServer'),
  createdAt: timestamp('createdAt').defaultNow(),
  updatedAt: timestamp('updatedAt').defaultNow(),
})

export const userRole = pgTable(
  'userRole',
  {
    serverId: text('serverId')
      .notNull()
      .references(() => server.id),
    userId: text('userId')
      .notNull()
      .references(() => user.id),
    roleId: text('roleId')
      .notNull()
      .references(() => role.id),
    granterId: text('granterId')
      .notNull()
      .references(() => user.id),
    createdAt: timestamp('createdAt').defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.serverId, t.userId, t.roleId] })]
)

export const channelPermission = pgTable('channelPermission', {
  id: text('id').primaryKey(),
  serverId: text('serverId')
    .notNull()
    .references(() => server.id),
  channelId: text('channelId')
    .notNull()
    .references(() => channel.id),
  roleId: text('roleId')
    .notNull()
    .references(() => role.id),
  granterId: text('granterId')
    .notNull()
    .references(() => user.id),
  createdAt: timestamp('createdAt').defaultNow(),
})

export const pin = pgTable('pin', {
  id: text('id').primaryKey(),
  serverId: text('serverId')
    .notNull()
    .references(() => server.id),
  channelId: text('channelId')
    .notNull()
    .references(() => channel.id),
  messageId: text('messageId')
    .notNull()
    .references(() => message.id),
  creatorId: text('creatorId')
    .notNull()
    .references(() => user.id),
  createdAt: timestamp('createdAt').defaultNow(),
})

export const userRelations = relations(user, ({ many }) => ({
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

export const messageRelations = relations(message, ({ one }) => ({
  thread: one(thread, {
    fields: [message.threadId],
    references: [thread.id],
  }),
  channel: one(channel, {
    fields: [message.channelId],
    references: [channel.id],
    relationName: 'channel',
  }),
  creator: one(user, {
    fields: [message.creatorId],
    references: [user.id],
    relationName: 'creator',
  }),
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
  channels?: Channel[]
  roles?: Role[]
}

export type UserWithRelations = User & {
  messages?: Message[]
  attachments?: Attachment[]
  requestingFriendships?: Friendship[]
  acceptingFriendships?: Friendship[]
}

const rolePermissionsKeys = ['canAdmin', 'canEditChannel', 'canEditServer'] satisfies (keyof Role)[]
export type RolePermissionsKeys = (typeof rolePermissionsKeys)[number]
