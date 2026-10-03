/**
 * @agent-rule
 * mutation params must be inline, flat object types. for example:
 * `insert(ctx, props: { id: string; userId: string; createdAt: number })`.
 * never a type reference, imported alias, or drizzle-inferred type
 * (`typeof x.$inferInsert`): the codegen is a string parser and silently
 * degrades any param it can't read to `v.record(v.unknown())`, dropping all
 * validation. keep props flat and primitive-typed.
 */
import { ensureLoggedIn, mutations, serverWhere, zql } from 'on-zero'
import { validateText } from '~/data/validate'
import { composeNotification } from '~/features/notifications/workflows'

const permissions = serverWhere('comment', (q, auth) => {
  return q.cmp('userId', auth?.id || '')
})

export const mutate = mutations(
  'comment',
  permissions,
  {
    // viewer identity comes from the logged-in auth context, not the client row,
    // so a client can't insert a comment under another user's id.
    insert: async (
      ctx,
      comment: { id: string; postId: string; content: string; createdAt: number },
    ) => {
      const { tx, environment } = ctx
      const auth = ensureLoggedIn()
      validateText(comment.content, 2000)
      if (!comment.content.trim()) throw new Error('comment cannot be empty')
      const post = await tx.run(zql.post.where('id', comment.postId).one())
      if (!post) throw new Error('post does not exist')
      const createdAt = environment === 'server' ? Date.now() : comment.createdAt
      await tx.mutate.comment.insert({ ...comment, createdAt, userId: auth.id })
      await ctx.can(permissions, comment.id)

      // the notification event is written once, by the authoritative run. writing
      // it optimistically too would show the commenter a notification for their
      // own comment and then take it away when the server run replaced it.
      if (environment !== 'server') return

      // nobody is notified about their own comment.
      if (post.userId === auth.id) return

      const commenter = await tx.run(zql.userPublic.where('id', auth.id).one())
      const notificationId = `postComment:${comment.id}`
      const existingNotification = await tx.run(
        zql.appNotification.where('id', notificationId).one(),
      )
      if (existingNotification) return
      await tx.mutate.appNotification.insert({
        // derived from the comment, so a retried mutation writes the same row
        // instead of a second notification for one comment.
        id: notificationId,
        userId: post.userId,
        ...composeNotification({
          workflow: 'postComment',
          commenterName: commenter?.name ?? commenter?.username ?? 'Someone',
          postId: comment.postId,
        }),
        createdAt,
        readAt: null,
      })
    },

    delete: async (ctx, args: { id: string }) => {
      const { tx } = ctx
      const existing = await tx.run(zql.comment.where('id', args.id).one())
      if (!existing) return
      await ctx.can(permissions, args.id)
      await tx.mutate.appNotification.delete({ id: `postComment:${args.id}` })
      await tx.mutate.comment.delete({ id: args.id })
    },
  },
  { crud: false },
)
