import { useQuery } from '~/features/zero/query'
import { zero } from '~/features/zero/client'

export const useUser = () => {
  // Get a random user
  const userQuery = zero.query.users.limit(1)
  userQuery.materialize()
  const user = useQuery(userQuery)
  return user.length > 0 ? user[0] : null
}
