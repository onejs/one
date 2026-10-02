import type { Todo, UserPublic as User, UserState } from './generated/schema'
export type { Todo, UserPublic as User, UserState } from './generated/schema'
export type UserUpdate = Pick<User, 'id'> & Partial<Omit<User, 'id'>>
export type UserWithState = User & {
  state?: UserState
}
export type UserWithRelations = User & {
  state?: UserState
  todos?: readonly Todo[]
}
export type TodoWithUser = Todo & {
  user?: User
}
