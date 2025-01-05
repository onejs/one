import { relations } from 'drizzle-orm'
import { sql } from 'drizzle-orm'
import {
  boolean,
  jsonb,
  pgTable,
  primaryKey,
  timestamp,
  varchar,
  type AnyPgColumn,
} from 'drizzle-orm/pg-core'
import { account, session } from './privateSchema'

export type ChannelsState = {
  [server_and_channel_id: string]: ChannelState
}

export type ChannelState = {
  mainView?: 'thread' | 'chat'
  focusedMessageId?: string
  editingMessageId?: string
  openedThreadId?: string
  maximized?: boolean
}

export type UserState = {
  serversSort?: string[]
  activeServer?: string
  // serverId to channelId
  activeChannels: Record<string, string>
  showSidePanel?: 'user' | 'settings'
  channelState?: ChannelsState
  // array so we can occasionally cull oldest, only need to remember a few
  messageEdits?: [{ id: string; content: string }]
}

export const user = pgTable('user', {
  id: varchar('id').primaryKey(),
  username: varchar('username', { length: 200 }),
  name: varchar('name', { length: 200 }),
  email: varchar('email', { length: 200 }).notNull().unique(),
  state: jsonb('state').$type<UserState>().default(sql`'{}'::jsonb`),
  updatedAt: timestamp('updatedAt').default(sql`CURRENT_TIMESTAMP`),
  emailVerified: boolean('emailVerified').notNull().default(false),
  image: varchar('image'),
  createdAt: timestamp('createdAt').default(sql`CURRENT_TIMESTAMP`),
})

export const userRelations = relations(user, ({ many }) => ({
  friendshipsRequested: many(friendship, { relationName: 'requestingUser' }),
  friendshipsAccepted: many(friendship, { relationName: 'acceptingUser' }),
  serverMemberships: many(serverMember),
  rolesCreated: many(role, { relationName: 'creator' }),
  userRoles: many(userRole),
  messages: many(message),
  pins: many(pin),
  attachments: many(attachment),
  sessions: many(session),
  accounts: many(account),
}))

export const friendship = pgTable(
  'friendship',
  {
    requestingId: varchar('requestingId')
      .notNull()
      .references(() => user.id),
    acceptingId: varchar('acceptingId')
      .notNull()
      .references(() => user.id),
    accepted: boolean('accepted').notNull().default(false),
    createdAt: timestamp('createdAt').default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [primaryKey({ columns: [table.requestingId, table.acceptingId] })]
)

export const friendshipRelations = relations(friendship, ({ one }) => ({
  requestingUser: one(user, {
    fields: [friendship.requestingId],
    references: [user.id],
    relationName: 'requestingUser',
  }),
  acceptingUser: one(user, {
    fields: [friendship.acceptingId],
    references: [user.id],
    relationName: 'acceptingUser',
  }),
}))

export const server = pgTable('server', {
  id: varchar('id').primaryKey(),
  name: varchar('name', { length: 200 }).notNull(),
  creatorId: varchar('creatorId')
    .notNull()
    .references(() => user.id),
  description: varchar('description'),
  channelSort: jsonb('channelSort').default(sql`'{}'::jsonb`),
  icon: varchar('icon', { length: 255 }),
  updatedAt: timestamp('updatedAt'),
  createdAt: timestamp('createdAt').default(sql`CURRENT_TIMESTAMP`),
})

export const serverRelations = relations(server, ({ one, many }) => ({
  creator: one(user, {
    fields: [server.creatorId],
    references: [user.id],
    relationName: 'creator',
  }),
  members: many(serverMember),
  channels: many(channel),
  roles: many(role),
}))

export const serverMember = pgTable(
  'serverMember',
  {
    serverId: varchar('serverId')
      .notNull()
      .references(() => server.id),
    userId: varchar('userId')
      .notNull()
      .references(() => user.id),
    hasClosedWelcome: boolean('hasClosedWelcome').notNull().default(false),
    joinedAt: timestamp('joinedAt').default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [primaryKey({ columns: [table.serverId, table.userId] })]
)

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

export const role = pgTable('role', {
  id: varchar('id').primaryKey(),
  serverId: varchar('serverId')
    .notNull()
    .references(() => server.id),
  creatorId: varchar('creatorId')
    .notNull()
    .references(() => user.id),
  name: varchar('name', { length: 200 }).notNull(),
  color: varchar('color', { length: 200 }).notNull(),
  canAdmin: boolean('canAdmin').notNull().default(false),
  canEditServer: boolean('canEditServer').notNull().default(false),
  canEditChannel: boolean('canEditChannel').notNull().default(false),
  updatedAt: timestamp('updatedAt'),
  createdAt: timestamp('createdAt').default(sql`CURRENT_TIMESTAMP`),
})

export const roleRelations = relations(role, ({ one, many }) => ({
  server: one(server, {
    fields: [role.serverId],
    references: [server.id],
  }),
  creator: one(user, {
    fields: [role.creatorId],
    references: [user.id],
    relationName: 'creator',
  }),
  members: many(user),
}))

export const channel = pgTable('channel', {
  id: varchar('id').primaryKey(),
  serverId: varchar('serverId')
    .notNull()
    .references(() => server.id),
  name: varchar('name', { length: 200 }).notNull(),
  description: varchar('description'),
  private: boolean('private').notNull().default(false),
  updatedAt: timestamp('updatedAt'),
  createdAt: timestamp('createdAt').default(sql`CURRENT_TIMESTAMP`),
})

export const channelRelations = relations(channel, ({ one, many }) => ({
  server: one(server, {
    fields: [channel.serverId],
    references: [server.id],
  }),
  threads: many(thread),
  messages: many(message),
  pins: many(pin),
  channelPermissions: many(channelPermission),
}))

export const userRole = pgTable(
  'userRole',
  {
    serverId: varchar('serverId')
      .notNull()
      .references(() => server.id),
    userId: varchar('userId')
      .notNull()
      .references(() => user.id),
    roleId: varchar('roleId')
      .notNull()
      .references(() => role.id),
    granterId: varchar('granterId')
      .notNull()
      .references(() => user.id),
    createdAt: timestamp('createdAt').default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.serverId, table.userId, table.roleId] }),
  })
)

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

export const channelPermission = pgTable('channelPermission', {
  id: varchar('id').primaryKey(),
  channelId: varchar('channelId')
    .notNull()
    .references(() => channel.id),
  serverId: varchar('serverId')
    .notNull()
    .references(() => server.id),
  roleId: varchar('roleId')
    .notNull()
    .references(() => role.id),
  granterId: varchar('granterId')
    .notNull()
    .references(() => user.id),
  createdAt: timestamp('createdAt').default(sql`CURRENT_TIMESTAMP`),
})

export const channelPermissionRelations = relations(channelPermission, ({ one }) => ({
  channel: one(channel, {
    fields: [channelPermission.channelId],
    references: [channel.id],
  }),
  server: one(server, {
    fields: [channelPermission.serverId],
    references: [server.id],
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

export const thread = pgTable('thread', {
  id: varchar('id').primaryKey(),
  channelId: varchar('channelId')
    .notNull()
    .references(() => channel.id),
  messageId: varchar('messageId'),
  creatorId: varchar('creatorId')
    .notNull()
    .references(() => user.id),
  title: varchar('title', { length: 200 }),
  deleted: boolean('deleted').notNull().default(false),
  description: varchar('description', { length: 200 }),
  updatedAt: timestamp('updatedAt'),
  createdAt: timestamp('createdAt').default(sql`CURRENT_TIMESTAMP`),
})

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

export const message = pgTable('message', {
  id: varchar('id').primaryKey(),
  serverId: varchar('serverId')
    .notNull()
    .references(() => server.id),
  channelId: varchar('channelId')
    .notNull()
    .references(() => channel.id),
  replyingToId: varchar('replyingToId').references((): AnyPgColumn => message.id),
  threadId: varchar('threadId').references(() => thread.id),
  creatorId: varchar('creatorId')
    .notNull()
    .references(() => user.id),
  content: varchar('content').notNull(),
  isThreadReply: boolean('isThreadReply').notNull().default(false),
  createdAt: timestamp('createdAt').default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp('updatedAt'),
  deleted: boolean('deleted').notNull().default(false),
})

export const messageRelations = relations(message, ({ one, many }) => ({
  server: one(server, {
    fields: [message.serverId],
    references: [server.id],
  }),
  channel: one(channel, {
    fields: [message.channelId],
    references: [channel.id],
  }),
  thread: one(thread, {
    fields: [message.threadId],
    references: [thread.id],
  }),
  creator: one(user, {
    fields: [message.creatorId],
    references: [user.id],
  }),
  replyingTo: one(message, {
    fields: [message.replyingToId],
    references: [message.id],
  }),
  pins: many(pin),
  attachments: many(attachment),
  reactions: many(messageReaction),
}))

export const pin = pgTable('pin', {
  id: varchar('id').primaryKey(),
  channelId: varchar('channelId')
    .notNull()
    .references(() => channel.id),
  serverId: varchar('serverId')
    .notNull()
    .references(() => server.id),
  messageId: varchar('messageId')
    .notNull()
    .references(() => message.id),
  creatorId: varchar('creatorId')
    .notNull()
    .references(() => user.id),
  createdAt: timestamp('createdAt').default(sql`CURRENT_TIMESTAMP`),
})

export const pinRelations = relations(pin, ({ one }) => ({
  channel: one(channel, {
    fields: [pin.channelId],
    references: [channel.id],
  }),
  server: one(server, {
    fields: [pin.serverId],
    references: [server.id],
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

export const attachment = pgTable('attachment', {
  id: varchar('id').primaryKey(),
  userId: varchar('userId')
    .notNull()
    .references(() => user.id),
  messageId: varchar('messageId').references(() => message.id),
  channelId: varchar('channelId').references(() => channel.id),
  createdAt: timestamp('createdAt').default(sql`CURRENT_TIMESTAMP`),
  data: varchar('data'),
  url: varchar('url'),
  type: varchar('type').notNull(),
})

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

export const reaction = pgTable('reaction', {
  id: varchar('id').primaryKey(),
  value: varchar('value').unique(),
  keyword: varchar('keyword').unique(),
  createdAt: timestamp('createdAt').default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp('updatedAt'),
})

export const reactionRelations = relations(reaction, ({ many }) => ({
  messageReactions: many(messageReaction),
}))

export const messageReaction = pgTable(
  'messageReaction',
  {
    messageId: varchar('messageId')
      .notNull()
      .references(() => message.id),
    creatorId: varchar('creatorId')
      .notNull()
      .references(() => user.id),
    reactionId: varchar('reactionId')
      .notNull()
      .references(() => reaction.id),
    createdAt: timestamp('createdAt').default(sql`CURRENT_TIMESTAMP`),
    updatedAt: timestamp('updatedAt'),
  },
  (table) => [primaryKey({ columns: [table.messageId, table.creatorId, table.reactionId] })]
)

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
