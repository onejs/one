import { serverWhere, zql } from 'on-zero'
const permission = serverWhere('todo', (_, auth) => {
  return _.cmp('userId', auth?.id || '')
})
export const todosByUserId = (props: { userId: string; limit?: number }) => {
  return zql.todo
    .where(permission)
    .where('userId', props.userId)
    .orderBy('createdAt', 'desc')
    .limit(props.limit ?? 100)
}
export const todoById = (props: { todoId: string }) => {
  return zql.todo.where(permission).where('id', props.todoId).one()
}
