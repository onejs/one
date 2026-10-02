import { mutations, serverWhere } from 'on-zero'
const permissions = serverWhere('todo', (_, auth) => {
  return _.cmp('userId', auth?.id || '')
})
export const mutate = mutations('todo', permissions)
