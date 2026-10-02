import { mutations, serverWhere } from 'on-zero'

const permissions = serverWhere('userPublic', (_, auth) => {
  return _.or(_.cmpLit(auth?.role || '', '=', 'admin'), _.cmp('id', auth?.id || ''))
})

export const mutate = mutations('userPublic', permissions)
