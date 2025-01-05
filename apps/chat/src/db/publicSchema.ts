import { relations, sql } from 'drizzle-orm'
import * as _ from 'drizzle-orm/pg-core'

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

export const user = _.pgTable('user', {
  id: _.varchar('id').primaryKey(),
  username: _.varchar('username', { length: 200 }),
  name: _.varchar('name', { length: 200 }),
  email: _.varchar('email', { length: 200 }).notNull().unique(),
  state: _.jsonb('state').$type<UserState>().default(sql`'{}'::jsonb`),
  updatedAt: _.timestamp('updatedAt').default(sql`CURRENT_TIMESTAMP`),
  emailVerified: _.boolean('emailVerified').notNull().default(false),
  image: _.varchar('image'),
  createdAt: _.timestamp('createdAt').default(sql`CURRENT_TIMESTAMP`),
})

export const userRelations = relations(user, ({ many }) => ({
  friendshipsRequested: many(friendship, { relationName: 'requestingUser' }),
  friendshipsAccepted: many(friendship, { relationName: 'acceptingUser' }),
  friends: many(user, { relationName: 'friends' }),
  servers: many(server, { relationName: 'serverMembership' }),
  rolesCreated: many(role, { relationName: 'creator' }),
  userRoles: many(userRole),
  messages: many(message),
  pins: many(pin),
  attachments: many(attachment),
}))

export const friendship = _.pgTable(
  'friendship',
  {
    requestingId: _.varchar('requestingId')
      .notNull()
      .references(() => user.id),
    acceptingId: _.varchar('acceptingId')
      .notNull()
      .references(() => user.id),
    accepted: _.boolean('accepted').notNull().default(false),
    createdAt: _.timestamp('createdAt').default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [_.primaryKey({ columns: [table.requestingId, table.acceptingId] })]
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
  friend: one(user, {
    fields: [friendship.acceptingId],
    references: [user.id],
    relationName: 'friends',
  }),
}))

export const server = _.pgTable('server', {
  id: _.varchar('id').primaryKey(),
  name: _.varchar('name', { length: 200 }).notNull(),
  creatorId: _.varchar('creatorId')
    .notNull()
    .references(() => user.id),
  description: _.varchar('description'),
  channelSort: _.jsonb('channelSort').default(sql`'{}'::jsonb`),
  icon: _.varchar('icon', { length: 255 }),
  updatedAt: _.timestamp('updatedAt'),
  createdAt: _.timestamp('createdAt').default(sql`CURRENT_TIMESTAMP`),
})

export const serverRelations = relations(server, ({ one, many }) => ({
  creator: one(user, {
    fields: [server.creatorId],
    references: [user.id],
    relationName: 'creator',
  }),
  members: many(user, { relationName: 'serverMembership' }),
  channels: many(channel),
  roles: many(role),
}))

export const serverMember = _.pgTable(
  'serverMember',
  {
    serverId: _.varchar('serverId')
      .notNull()
      .references(() => server.id),
    userId: _.varchar('userId')
      .notNull()
      .references(() => user.id),
    hasClosedWelcome: _.boolean('hasClosedWelcome').notNull().default(false),
    joinedAt: _.timestamp('joinedAt').default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [_.primaryKey({ columns: [table.serverId, table.userId] })]
)

export const serverMemberRelations = relations(serverMember, ({ one }) => ({
  server: one(server, {
    fields: [serverMember.serverId],
    references: [server.id],
  }),
  user: one(user, {
    fields: [serverMember.userId],
    references: [user.id],
    relationName: 'serverMembership',
  }),
}))

export const role = _.pgTable('role', {
  id: _.varchar('id').primaryKey(),
  serverId: _.varchar('serverId')
    .notNull()
    .references(() => server.id),
  creatorId: _.varchar('creatorId')
    .notNull()
    .references(() => user.id),
  name: _.varchar('name', { length: 200 }).notNull(),
  color: _.varchar('color', { length: 200 }).notNull(),
  canAdmin: _.boolean('canAdmin').notNull().default(false),
  canEditServer: _.boolean('canEditServer').notNull().default(false),
  canEditChannel: _.boolean('canEditChannel').notNull().default(false),
  updatedAt: _.timestamp('updatedAt'),
  createdAt: _.timestamp('createdAt').default(sql`CURRENT_TIMESTAMP`),
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

export const channel = _.pgTable('channel', {
  id: _.varchar('id').primaryKey(),
  serverId: _.varchar('serverId')
    .notNull()
    .references(() => server.id),
  name: _.varchar('name', { length: 200 }).notNull(),
  description: _.varchar('description'),
  private: _.boolean('private').notNull().default(false),
  updatedAt: _.timestamp('updatedAt'),
  createdAt: _.timestamp('createdAt').default(sql`CURRENT_TIMESTAMP`),
})

export const channelRelations = relations(channel, ({ one, many }) => ({
  server: one(server, {
    fields: [channel.serverId],
    references: [server.id],
  }),
  threads: many(thread),
  messages: many(message),
  pins: many(pin),
  permissions: many(channelPermission, { relationName: 'channelPermissions' }),
}))

export const userRole = _.pgTable(
  'userRole',
  {
    serverId: _.varchar('serverId')
      .notNull()
      .references(() => server.id),
    userId: _.varchar('userId')
      .notNull()
      .references(() => user.id),
    roleId: _.varchar('roleId')
      .notNull()
      .references(() => role.id),
    granterId: _.varchar('granterId')
      .notNull()
      .references(() => user.id),
    createdAt: _.timestamp('createdAt').default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [_.primaryKey({ columns: [table.serverId, table.userId, table.roleId] })]
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

export const channelPermission = _.pgTable('channelPermission', {
  id: _.varchar('id').primaryKey(),
  channelId: _.varchar('channelId')
    .notNull()
    .references(() => channel.id),
  serverId: _.varchar('serverId')
    .notNull()
    .references(() => server.id),
  roleId: _.varchar('roleId')
    .notNull()
    .references(() => role.id),
  granterId: _.varchar('granterId')
    .notNull()
    .references(() => user.id),
  createdAt: _.timestamp('createdAt').default(sql`CURRENT_TIMESTAMP`),
})

export const channelPermissionRelations = relations(channelPermission, ({ one }) => ({
  channel: one(channel, {
    fields: [channelPermission.channelId],
    references: [channel.id],
    relationName: 'channelPermissions',
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

export const thread = _.pgTable('thread', {
  id: _.varchar('id').primaryKey(),
  channelId: _.varchar('channelId')
    .notNull()
    .references(() => channel.id),
  messageId: _.varchar('messageId'),
  creatorId: _.varchar('creatorId')
    .notNull()
    .references(() => user.id),
  title: _.varchar('title', { length: 200 }),
  deleted: _.boolean('deleted').notNull().default(false),
  description: _.varchar('description', { length: 200 }),
  updatedAt: _.timestamp('updatedAt'),
  createdAt: _.timestamp('createdAt').default(sql`CURRENT_TIMESTAMP`),
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

export const message = _.pgTable('message', {
  id: _.varchar('id').primaryKey(),
  serverId: _.varchar('serverId')
    .notNull()
    .references(() => server.id),
  channelId: _.varchar('channelId')
    .notNull()
    .references(() => channel.id),
  replyingToId: _.varchar('replyingToId').references((): _.AnyPgColumn => message.id),
  threadId: _.varchar('threadId').references(() => thread.id),
  creatorId: _.varchar('creatorId')
    .notNull()
    .references(() => user.id),
  content: _.varchar('content').notNull(),
  isThreadReply: _.boolean('isThreadReply').notNull().default(false),
  createdAt: _.timestamp('createdAt').default(sql`CURRENT_TIMESTAMP`),
  updatedAt: _.timestamp('updatedAt'),
  deleted: _.boolean('deleted').notNull().default(false),
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
  sender: one(user, {
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

export const pin = _.pgTable('pin', {
  id: _.varchar('id').primaryKey(),
  channelId: _.varchar('channelId')
    .notNull()
    .references(() => channel.id),
  serverId: _.varchar('serverId')
    .notNull()
    .references(() => server.id),
  messageId: _.varchar('messageId')
    .notNull()
    .references(() => message.id),
  creatorId: _.varchar('creatorId')
    .notNull()
    .references(() => user.id),
  createdAt: _.timestamp('createdAt').default(sql`CURRENT_TIMESTAMP`),
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

export const attachment = _.pgTable('attachment', {
  id: _.varchar('id').primaryKey(),
  userId: _.varchar('userId')
    .notNull()
    .references(() => user.id),
  messageId: _.varchar('messageId').references(() => message.id),
  channelId: _.varchar('channelId').references(() => channel.id),
  createdAt: _.timestamp('createdAt').default(sql`CURRENT_TIMESTAMP`),
  data: _.varchar('data'),
  url: _.varchar('url'),
  type: _.varchar('type').notNull(),
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

export const reaction = _.pgTable('reaction', {
  id: _.varchar('id').primaryKey(),
  value: _.varchar('value').unique(),
  keyword: _.varchar('keyword').unique(),
  createdAt: _.timestamp('createdAt').default(sql`CURRENT_TIMESTAMP`),
  updatedAt: _.timestamp('updatedAt'),
})

export const reactionRelations = relations(reaction, ({ many }) => ({
  messageReactions: many(messageReaction),
}))

export const messageReaction = _.pgTable(
  'messageReaction',
  {
    messageId: _.varchar('messageId')
      .notNull()
      .references(() => message.id),
    creatorId: _.varchar('creatorId')
      .notNull()
      .references(() => user.id),
    reactionId: _.varchar('reactionId')
      .notNull()
      .references(() => reaction.id),
    createdAt: _.timestamp('createdAt').default(sql`CURRENT_TIMESTAMP`),
    updatedAt: _.timestamp('updatedAt'),
  },
  (table) => [_.primaryKey({ columns: [table.messageId, table.creatorId, table.reactionId] })]
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
