import { integer, text, sqliteTable, primaryKey } from 'drizzle-orm/sqlite-core'
import { relations, sql } from 'drizzle-orm'

export const users = sqliteTable('users', {
  id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
  username: text('username').notNull().unique(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  bio: text('bio').default(''),
  avatarUrl: text('avatar_url').default(''),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(CURRENT_TIMESTAMP)`),
})

export const posts = sqliteTable('posts', {
  id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
  userId: integer('user_id', { mode: 'number' })
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  content: text('content').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(CURRENT_TIMESTAMP)`),
})

export const follows = sqliteTable('follows', {
  followerId: integer('follower_id', { mode: 'number' })
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  followingId: integer('following_id', { mode: 'number' })
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(CURRENT_TIMESTAMP)`),
})

export const likes = sqliteTable(
  'likes',
  {
    userId: integer('user_id', { mode: 'number' })
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    postId: integer('post_id', { mode: 'number' })
      .references(() => posts.id, { onDelete: 'cascade' })
      .notNull(),
    createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(CURRENT_TIMESTAMP)`),
  },
  (table) => {
    return {
      pk: primaryKey({ columns: [table.userId, table.postId] }),
    }
  }
)

export const reposts = sqliteTable(
  'reposts',
  {
    userId: integer('user_id', { mode: 'number' })
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    postId: integer('post_id', { mode: 'number' })
      .references(() => posts.id, { onDelete: 'cascade' })
      .notNull(),
    createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(CURRENT_TIMESTAMP)`),
  },
  (table) => {
    return {
      pk: primaryKey({ columns: [table.userId, table.postId] }),
    }
  }
)

export const replies = sqliteTable('replies', {
  id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
  userId: integer('user_id', { mode: 'number' })
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  postId: integer('post_id', { mode: 'number' })
    .references(() => posts.id, { onDelete: 'cascade' })
    .notNull(),
  content: text('content').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(CURRENT_TIMESTAMP)`),
})

export const userRelations = relations(users, ({ one, many }) => ({
  posts: many(posts),
  followers: many(follows, { relationName: 'follower' }),
  followings: many(follows, { relationName: 'following' }),
  likes: many(likes),
  reposts: many(reposts),
  replies: many(replies),
}))

export const postRelations = relations(posts, ({ one, many }) => ({
  user: one(users, {
    relationName: 'user',
    fields: [posts.userId],
    references: [users.id],
  }),
  likes: many(likes),
  reposts: many(reposts),
  replies: many(replies),
}))

export const followRelations = relations(follows, ({ one }) => ({
  follower: one(users, {
    relationName: 'follower',
    fields: [follows.followerId],
    references: [users.id],
  }),
  following: one(users, {
    relationName: 'following',
    fields: [follows.followingId],
    references: [users.id],
  }),
}))

export const likeRelations = relations(likes, ({ one }) => ({
  user: one(users, {
    relationName: 'user',
    fields: [likes.userId],
    references: [users.id],
  }),
  post: one(posts, {
    relationName: 'post',
    fields: [likes.postId],
    references: [posts.id],
  }),
}))

export const repostRelations = relations(reposts, ({ one }) => ({
  user: one(users, {
    relationName: 'user',
    fields: [reposts.userId],
    references: [users.id],
  }),
  post: one(posts, {
    relationName: 'post',
    fields: [reposts.postId],
    references: [posts.id],
  }),
}))

export const replyRelations = relations(replies, ({ one }) => ({
  user: one(users, {
    relationName: 'user',
    fields: [replies.userId],
    references: [users.id],
  }),
  post: one(posts, {
    relationName: 'post',
    fields: [replies.postId],
    references: [posts.id],
  }),
}))
