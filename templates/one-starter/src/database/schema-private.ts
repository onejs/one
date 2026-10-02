import { pgTable } from 'drizzle-orm/pg-core'
import type { InferSelectModel } from 'drizzle-orm'
export const user = pgTable('user', (t) => ({
  id: t.varchar('id').primaryKey(),
  username: t.varchar('username', {
    length: 200,
  }),
  name: t.varchar('name', {
    length: 200,
  }),
  email: t
    .varchar('email', {
      length: 200,
    })
    .notNull()
    .unique(),
  normalizedEmail: t
    .varchar('normalizedEmail', {
      length: 200,
    })
    .unique(),
  updatedAt: t
    .timestamp('updatedAt', {
      mode: 'string',
    })
    .defaultNow(),
  emailVerified: t.boolean('emailVerified').default(false).notNull(),
  image: t.text('image'),
  createdAt: t
    .timestamp('createdAt', {
      mode: 'string',
    })
    .defaultNow(),
  role: t.varchar('role').default('user').notNull(),
  banned: t.boolean('banned').default(false).notNull(),
  banReason: t.varchar('banReason'),
  banExpires: t.bigint('banExpires', {
    mode: 'number',
  }),
}))
export type UserPrivate = InferSelectModel<typeof user>
export const account = pgTable('account', (t) => ({
  id: t.text('id').primaryKey().notNull(),
  accountId: t.text('accountId').notNull(),
  providerId: t.text('providerId').notNull(),
  userId: t
    .text('userId')
    .notNull()
    .references(() => user.id, {
      onDelete: 'cascade',
    }),
  accessToken: t.text('accessToken'),
  refreshToken: t.text('refreshToken'),
  idToken: t.text('idToken'),
  accessTokenExpiresAt: t.timestamp('accessTokenExpiresAt', {
    mode: 'string',
  }),
  refreshTokenExpiresAt: t.timestamp('refreshTokenExpiresAt', {
    mode: 'string',
  }),
  scope: t.text('scope'),
  password: t.text('password'),
  createdAt: t
    .timestamp('createdAt', {
      mode: 'string',
    })
    .notNull(),
  updatedAt: t
    .timestamp('updatedAt', {
      mode: 'string',
    })
    .notNull(),
}))
export const session = pgTable('session', (t) => ({
  id: t.text('id').primaryKey().notNull(),
  expiresAt: t
    .timestamp('expiresAt', {
      mode: 'string',
    })
    .notNull(),
  token: t.text('token').notNull(),
  createdAt: t
    .timestamp('createdAt', {
      mode: 'string',
    })
    .notNull(),
  updatedAt: t
    .timestamp('updatedAt', {
      mode: 'string',
    })
    .notNull(),
  ipAddress: t.text('ipAddress'),
  userAgent: t.text('userAgent'),
  userId: t
    .text('userId')
    .notNull()
    .references(() => user.id, {
      onDelete: 'cascade',
    }),
  impersonatedBy: t.varchar('impersonatedBy'),
}))
export const jwks = pgTable('jwks', (t) => ({
  id: t.text('id').primaryKey().notNull(),
  publicKey: t.text('publicKey').notNull(),
  privateKey: t.text('privateKey').notNull(),
  createdAt: t
    .timestamp('createdAt', {
      mode: 'string',
    })
    .notNull(),
}))
export const verification = pgTable('verification', (t) => ({
  id: t.text('id').primaryKey().notNull(),
  identifier: t.text('identifier').notNull(),
  value: t.text('value').notNull(),
  expiresAt: t
    .timestamp('expiresAt', {
      mode: 'string',
    })
    .notNull(),
  createdAt: t.timestamp('createdAt', {
    mode: 'string',
  }),
  updatedAt: t.timestamp('updatedAt', {
    mode: 'string',
  }),
}))
