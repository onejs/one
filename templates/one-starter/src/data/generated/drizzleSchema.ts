// auto-generated from the on-zero data layout
import { defineRelations } from 'drizzle-orm'
import * as schema from '../../database/schema'

export { todo, userPublic, userState } from '../../database/schema'
export const relations = defineRelations(schema, (r) => ({
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
