import { relations } from 'drizzle-orm'
import { pgTable, timestamp, varchar } from 'drizzle-orm/pg-core'
import { user } from './publicSchema'

export const session = pgTable('session', {
  id: varchar('id').primaryKey(),
  expiresAt: timestamp('expiresAt', { mode: 'string' }).notNull(),
  token: varchar('token').notNull(),
  createdAt: timestamp('createdAt', { mode: 'string' }).notNull(),
  updatedAt: timestamp('updatedAt', { mode: 'string' }).notNull(),
  ipAddress: varchar('ipAddress'),
  userAgent: varchar('userAgent'),
  userId: varchar('userId')
    .notNull()
    .references(() => user.id),
})

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id],
  }),
}))

export const account = pgTable('account', {
  id: varchar('id').primaryKey(),
  accountId: varchar('accountId').notNull(),
  providerId: varchar('providerId').notNull(),
  userId: varchar('userId')
    .notNull()
    .references(() => user.id),
  accessToken: varchar('accessToken'),
  refreshToken: varchar('refreshToken'),
  idToken: varchar('idToken'),
  accessTokenExpiresAt: timestamp('accessTokenExpiresAt', { mode: 'string' }),
  refreshTokenExpiresAt: timestamp('refreshTokenExpiresAt', { mode: 'string' }),
  scope: varchar('scope'),
  password: varchar('password'),
  createdAt: timestamp('createdAt', { mode: 'string' }).notNull(),
  updatedAt: timestamp('updatedAt', { mode: 'string' }).notNull(),
})

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, {
    fields: [account.userId],
    references: [user.id],
  }),
}))

export const verification = pgTable('verification', {
  id: varchar('id').primaryKey(),
  identifier: varchar('identifier').notNull(),
  value: varchar('value').notNull(),
  expiresAt: timestamp('expiresAt', { mode: 'string' }).notNull(),
  createdAt: timestamp('createdAt', { mode: 'string' }),
  updatedAt: timestamp('updatedAt', { mode: 'string' }),
})

export const jwks = pgTable('jwks', {
  id: varchar('id').primaryKey(),
  publicKey: varchar('publicKey').notNull(),
  privateKey: varchar('privateKey').notNull(),
  createdAt: timestamp('createdAt', { mode: 'string' }).notNull(),
})
