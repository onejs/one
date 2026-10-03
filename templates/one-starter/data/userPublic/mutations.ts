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

// users can only write their own public profile row. the row id IS the user
// id — it is forced from auth on every slot, so it never appears in props.
// insert is skip-if-exists by definition, so no read-guard is needed.
const permissions = serverWhere('userPublic', (q, auth) => {
  return q.cmp('id', auth?.id || '')
})

export const mutate = mutations(
  'userPublic',
  permissions,
  {
    insert: async (
      ctx,
      row: {
        name: string | null
        username: string | null
        image: string | null
        joinedAt: number
      },
    ) => {
      const auth = ensureLoggedIn()
      await ctx.tx.mutate.userPublic.insert({ ...row, id: auth.id })
      await ctx.can(permissions, auth.id)
    },
    upsert: async (
      ctx,
      args: {
        id: string
        joinedAt: number
        name?: string | null
        username?: string | null
        image?: string | null
      },
    ) => {
      const auth = ensureLoggedIn()
      const existing = await ctx.tx.run(zql.userPublic.where('id', auth.id).one())
      if (existing) {
        await ctx.can(permissions, auth.id)
        await ctx.tx.mutate.userPublic.update({
          id: auth.id,
          name: args.name,
          username: args.username,
          image: args.image,
        })
        return
      }

      await ctx.tx.mutate.userPublic.insert({
        id: auth.id,
        name: args.name ?? null,
        username: args.username ?? null,
        image: args.image ?? null,
        joinedAt: args.joinedAt,
      })
      await ctx.can(permissions, auth.id)
    },
    delete: async (ctx) => {
      const auth = ensureLoggedIn()
      await ctx.can(permissions, auth.id)
      await ctx.tx.mutate.userPublic.delete({ id: auth.id })
    },
  },
  { crud: false },
)
