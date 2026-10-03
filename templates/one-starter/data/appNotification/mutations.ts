/**
 * @agent-rule
 * mutation params must be inline, flat object types. for example:
 * `insert(ctx, props: { id: string; userId: string; createdAt: number })`.
 * never a type reference, imported alias, or drizzle-inferred type
 * (`typeof x.$inferInsert`): the codegen is a string parser and silently
 * degrades any param it can't read to `v.record(v.unknown())`, dropping all
 * validation. keep props flat and primitive-typed.
 */
import { mutations, zql } from 'on-zero'
import { appNotificationPermission } from './permissions'

// how many unread rows one mark-all-read call clears. the read mutation stays
// bounded so a user with a long history cannot make it unbounded work.
const MARK_ALL_READ_LIMIT = 200

// rendering, syncing, a dismissed toast, or an operating-system dismissal never
// marks a row read. only opening its destination or choosing mark read does,
// and both land here.
export const mutate = mutations(
  'appNotification',
  appNotificationPermission,
  {
    markRead: async (ctx, props: { id: string; readAt: number }) => {
      await ctx.can(appNotificationPermission, props.id)
      await ctx.tx.mutate.appNotification.update({ id: props.id, readAt: props.readAt })
    },

    markAllRead: async (ctx, props: { readAt: number }) => {
      const unread = await ctx.tx.run(
        zql.appNotification
          .where(appNotificationPermission)
          .where('readAt', 'IS', null)
          .orderBy('createdAt', 'desc')
          .orderBy('id', 'desc')
          .limit(MARK_ALL_READ_LIMIT),
      )
      for (const row of unread) {
        await ctx.tx.mutate.appNotification.update({ id: row.id, readAt: props.readAt })
      }
    },
  },
  { crud: false },
)
