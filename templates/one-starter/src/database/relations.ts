import { defineRelations } from 'drizzle-orm'
import * as schema from './schema'
export const relations = defineRelations(schema, (r) => ({
  // --- private tables ---

  user: {
    accounts: r.many.account({
      from: r.user.id,
      to: r.account.userId,
    }),
    sessions: r.many.session({
      from: r.user.id,
      to: r.session.userId,
    }),
  },
  account: {
    user: r.one.user({
      from: r.account.userId,
      to: r.user.id,
    }),
  },
  session: {
    user: r.one.user({
      from: r.session.userId,
      to: r.user.id,
    }),
  },
  // --- public tables ---

  userPublic: {
    state: r.one.userState({
      from: r.userPublic.id,
      to: r.userState.userId,
    }),
    todos: r.many.todo({
      from: r.userPublic.id,
      to: r.todo.userId,
    }),
  },
  userState: {
    user: r.one.userPublic({
      from: r.userState.userId,
      to: r.userPublic.id,
    }),
  },
  todo: {
    user: r.one.userPublic({
      from: r.todo.userId,
      to: r.userPublic.id,
    }),
  },
}))
