import { text, varchar, doublePrecision, pgTable, primaryKey } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

export const users = pgTable('users', {
  id: text('id').primaryKey(),
  username: varchar('username', { length: 50 }).notNull().unique(),
  email: varchar('email', { length: 100 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  bio: text('bio').default(''),
  avatarUrl: varchar('avatar_url', { length: 255 }).default(''),
  createdAt: doublePrecision('created_at'),
})

export const posts = pgTable('posts', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  content: text('content').notNull(),
  createdAt: doublePrecision('created_at'),
})

export const follows = pgTable('follows', {
  id: text('id').primaryKey(),
  followerId: text('follower_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  followingId: text('following_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  createdAt: doublePrecision('created_at'),
})

export const likes = pgTable('likes', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  postId: text('post_id')
    .references(() => posts.id, { onDelete: 'cascade' })
    .notNull(),
  createdAt: doublePrecision('created_at'),
})

export const reposts = pgTable('reposts', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  postId: text('post_id')
    .references(() => posts.id, { onDelete: 'cascade' })
    .notNull(),
  createdAt: doublePrecision('created_at'),
})

export const replies = pgTable('replies', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  postId: text('post_id')
    .references(() => posts.id, { onDelete: 'cascade' })
    .notNull(),
  content: text('content').notNull(),
  createdAt: doublePrecision('created_at'),
})

const userRelations = relations(users, ({ one, many }) => ({
  posts: many(posts),
  followers: many(follows, { relationName: 'follower' }),
  followings: many(follows, { relationName: 'following' }),
  likes: many(likes),
  reposts: many(reposts),
  replies: many(replies),
}))

const postRelations = relations(posts, ({ one, many }) => ({
  user: one(users, {
    relationName: 'user',
    fields: [posts.userId],
    references: [users.id],
  }),
  likes: many(likes),
  reposts: many(reposts),
  replies: many(replies),
}))

const followRelations = relations(follows, ({ one }) => ({
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

export const tables = {
  users,
  posts,
  follows,
  likes,
  reposts,
  replies,
}

const likeRelations = relations(likes, ({ one }) => ({
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

const repostRelations = relations(reposts, ({ one }) => ({
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

const replyRelations = relations(replies, ({ one }) => ({
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

export const relationships = {
  users: userRelations,
  posts: postRelations,
  follows: followRelations,
  likes: likeRelations,
  reposts: repostRelations,
  replies: replyRelations,
}
