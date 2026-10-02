import { mutations, serverWhere } from 'on-zero'
const permissions = serverWhere('userState', (_, auth) => {
  return _.cmp('userId', auth?.id || '')
})
export const mutate = mutations('userState', permissions)
