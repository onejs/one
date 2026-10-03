/**
 * @agent-rule
 * Store dates as integer epoch milliseconds. Private Better Auth columns use
 * `mode: 'timestamp_ms'` at the Drizzle boundary; synced columns stay numbers
 * end to end so Zero mutations and filters use `Date.now()` values directly.
 * Store money as integer cents in a column named for its unit
 * (`integer('amountCents')`), never `real`; `real` is for other fractional
 * values. A text column that stores a machine id (a status, a category, a
 * slug) has one id-to-label catalog exported from its `data/<table>/` module,
 * which the seed, the pickers, and every screen share.
 */
import { index, integer, primaryKey, sqliteTable, text } from 'drizzle-orm/sqlite-core'

// ─── private tables (auth — NOT synced to zero) ───

export const user = sqliteTable('user', {
  id: text('id').primaryKey(),
  name: text('name'),
  email: text('email').notNull().unique(),
  emailVerified: integer('emailVerified', { mode: 'boolean' }).default(false).notNull(),
  image: text('image'),
  role: text('role').default('user').notNull(),
  createdAt: integer('createdAt', { mode: 'timestamp_ms' }).notNull(),
  updatedAt: integer('updatedAt', { mode: 'timestamp_ms' }).notNull(),
})

export const account = sqliteTable('account', {
  id: text('id').primaryKey().notNull(),
  accountId: text('accountId').notNull(),
  providerId: text('providerId').notNull(),
  userId: text('userId')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  accessToken: text('accessToken'),
  refreshToken: text('refreshToken'),
  idToken: text('idToken'),
  accessTokenExpiresAt: integer('accessTokenExpiresAt', { mode: 'timestamp_ms' }),
  refreshTokenExpiresAt: integer('refreshTokenExpiresAt', {
    mode: 'timestamp_ms',
  }),
  scope: text('scope'),
  password: text('password'),
  createdAt: integer('createdAt', { mode: 'timestamp_ms' }).notNull(),
  updatedAt: integer('updatedAt', { mode: 'timestamp_ms' }).notNull(),
})

export const session = sqliteTable('session', {
  id: text('id').primaryKey().notNull(),
  expiresAt: integer('expiresAt', { mode: 'timestamp_ms' }).notNull(),
  token: text('token').notNull(),
  createdAt: integer('createdAt', { mode: 'timestamp_ms' }).notNull(),
  updatedAt: integer('updatedAt', { mode: 'timestamp_ms' }).notNull(),
  ipAddress: text('ipAddress'),
  userAgent: text('userAgent'),
  userId: text('userId')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
})

export const jwks = sqliteTable('jwks', {
  id: text('id').primaryKey().notNull(),
  publicKey: text('publicKey').notNull(),
  privateKey: text('privateKey').notNull(),
  createdAt: integer('createdAt', { mode: 'timestamp_ms' }).notNull(),
})

export const verification = sqliteTable('verification', {
  id: text('id').primaryKey().notNull(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: integer('expiresAt', { mode: 'timestamp_ms' }).notNull(),
  createdAt: integer('createdAt', { mode: 'timestamp_ms' }),
  updatedAt: integer('updatedAt', { mode: 'timestamp_ms' }),
})

// ─── public tables (synced to zero) ───

export const userPublic = sqliteTable(
  'userPublic',
  {
    id: text('id').primaryKey(),
    name: text('name'),
    username: text('username'),
    image: text('image'),
    joinedAt: integer('joinedAt').notNull(),
  },
  (table) => [index('userPublic_username_idx').on(table.username)],
)

export const post = sqliteTable(
  'post',
  {
    id: text('id').primaryKey(),
    userId: text('userId').notNull(),
    image: text('image').notNull(),
    imageWidth: integer('imageWidth'),
    imageHeight: integer('imageHeight'),
    caption: text('caption'),
    commentCount: integer('commentCount').notNull().default(0),
    createdAt: integer('createdAt').notNull(),
  },
  (table) => [
    index('post_userId_idx').on(table.userId),
    index('post_createdAt_id_idx').on(table.createdAt, table.id),
  ],
)

export const comment = sqliteTable(
  'comment',
  {
    id: text('id').primaryKey(),
    postId: text('postId').notNull(),
    userId: text('userId').notNull(),
    content: text('content').notNull(),
    createdAt: integer('createdAt').notNull(),
  },
  (table) => [
    index('comment_postId_idx').on(table.postId),
    index('comment_postId_createdAt_idx').on(table.postId, table.createdAt),
    index('comment_userId_idx').on(table.userId),
  ],
)

// one durable row per notification event. the inbox is the authority: a
// suppressed toast or a disabled system push changes only how the event is
// presented, never whether it was recorded. `readAt` is a timestamp rather
// than a flag so "when did the user read this" survives.
export const appNotification = sqliteTable(
  'appNotification',
  {
    id: text('id').primaryKey(),
    userId: text('userId').notNull(),
    workflow: text('workflow').notNull(),
    title: text('title').notNull(),
    body: text('body').notNull(),
    // a typed logical target, never a url. web and native each resolve the kind
    // through their own router, and an unknown kind opens the inbox instead.
    destinationKind: text('destinationKind').notNull(),
    destinationId: text('destinationId'),
    createdAt: integer('createdAt').notNull(),
    readAt: integer('readAt'),
  },
  (table) => [
    index('appNotification_userId_readAt_createdAt_idx').on(
      table.userId,
      table.readAt,
      table.createdAt,
    ),
    index('appNotification_userId_createdAt_id_idx').on(table.userId, table.createdAt, table.id),
  ],
)

// per-user, per-workflow presentation preferences. a missing row means the
// workflow's own defaults apply, so a new workflow needs no backfill.
export const notificationPreference = sqliteTable(
  'notificationPreference',
  {
    userId: text('userId').notNull(),
    workflow: text('workflow').notNull(),
    foregroundToastEnabled: integer('foregroundToastEnabled', { mode: 'boolean' })
      .notNull()
      .default(true),
    systemPushEnabled: integer('systemPushEnabled', { mode: 'boolean' }).notNull().default(true),
    updatedAt: integer('updatedAt').notNull(),
  },
  (table) => [primaryKey({ columns: [table.userId, table.workflow] })],
)
