/**
 * @agent-rule
 * Mutation params must be inline, flat object types — e.g.
 * `insert(ctx, props: { id: string; userId: string; createdAt: number })`.
 * Never a type reference, imported alias, or Drizzle-inferred type
 * (`typeof x.$inferInsert`): the codegen is a string parser and silently
 * degrades any param it can't read to `v.record(v.unknown())`, dropping all
 * validation. Keep props flat and primitive-typed.
 */
import { ensureLoggedIn, mutations, serverWhere, zql } from 'on-zero'

import { validateImage, validateText } from '~/data/validate'

const permissions = serverWhere('post', (q, auth) => {
  return q.cmp('userId', auth?.id || '')
})

// userId is forced from the logged-in auth context on insert, so a client can
// never write a post under another user's id. commentCount is derived by the
// postCommentCount aggregate, so it is absent from every client prop shape.
export const mutate = mutations(
  'post',
  permissions,
  {
    insert: async (
      ctx,
      post: {
        id: string
        image: string
        imageWidth?: number | null
        imageHeight?: number | null
        caption?: string | null
        createdAt: number
      },
    ) => {
      validateImage(post.image)
      validateText(post.caption, 6000)
      const auth = ensureLoggedIn()
      await ctx.tx.mutate.post.insert({
        ...post,
        createdAt: ctx.environment === 'server' ? Date.now() : post.createdAt,
        commentCount: 0,
        userId: auth.id,
      })
      await ctx.can(permissions, post.id)
    },

    update: async (
      ctx,
      post: {
        id: string
        image?: string
        imageWidth?: number | null
        imageHeight?: number | null
        caption?: string | null
      },
    ) => {
      await ctx.can(permissions, post.id)
      validateImage(post.image)
      validateText(post.caption, 6000)
      await ctx.tx.mutate.post.update(post)
    },

    delete: async (ctx, args: { id: string }) => {
      await ctx.can(permissions, args.id)
      const comments = await ctx.tx.run(zql.comment.where('postId', args.id))
      for (const comment of comments) {
        await ctx.tx.mutate.appNotification.delete({ id: `postComment:${comment.id}` })
        await ctx.tx.mutate.comment.delete({ id: comment.id })
      }
      await ctx.tx.mutate.post.delete({ id: args.id })
    },
  },
  { crud: false },
)
