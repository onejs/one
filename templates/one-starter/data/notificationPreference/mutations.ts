/**
 * @agent-rule
 * mutation params must be inline, flat object types. for example:
 * `insert(ctx, props: { id: string; userId: string; createdAt: number })`.
 * never a type reference, imported alias, or drizzle-inferred type
 * (`typeof x.$inferInsert`): the codegen is a string parser and silently
 * degrades any param it can't read to `v.record(v.unknown())`, dropping all
 * validation. keep props flat and primitive-typed.
 */
import { ensureLoggedIn, mutations } from 'on-zero'
import { notificationWorkflow } from '~/features/notifications/workflows'
import { notificationPreferencePermission } from './queries'

// preferences change presentation only. the inbox row is written either way, so
// turning a workflow off never erases history.
export const mutate = mutations(
  'notificationPreference',
  notificationPreferencePermission,
  {
    upsert: async (
      ctx,
      props: {
        workflow: string
        foregroundToastEnabled: boolean
        systemPushEnabled: boolean
        updatedAt: number
      },
    ) => {
      const auth = ensureLoggedIn()
      if (!notificationWorkflow(props.workflow)) {
        throw new Error(`unknown notification workflow: ${props.workflow}`)
      }
      await ctx.tx.mutate.notificationPreference.upsert({ ...props, userId: auth.id })
    },
  },
  { crud: false },
)
