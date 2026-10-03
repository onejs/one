/**
 * @agent-rule
 * this file is one defineRelations object with one top-level key per table.
 * add reverse edges inside the existing table block; never add a duplicate
 * `userPublic:` block and never read/spread `schema.relations`.
 */
import { defineRelations } from 'drizzle-orm'
import * as schema from './schema.ts'

export const relations = defineRelations(schema, (r) => ({
  userPublic: {
    posts: r.many.post({
      from: r.userPublic.id,
      to: r.post.userId,
    }),
    comments: r.many.comment({
      from: r.userPublic.id,
      to: r.comment.userId,
    }),
  },

  post: {
    user: r.one.userPublic({
      from: r.post.userId,
      to: r.userPublic.id,
    }),
    comments: r.many.comment({
      from: r.post.id,
      to: r.comment.postId,
    }),
  },

  comment: {
    user: r.one.userPublic({
      from: r.comment.userId,
      to: r.userPublic.id,
    }),
    post: r.one.post({
      from: r.comment.postId,
      to: r.post.id,
    }),
  },
}))
