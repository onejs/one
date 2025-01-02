import { useQuery } from '~/zero'
import { useUserState } from '../user'

export const useCurrentServerRoles = () => {
  const [userState] = useUserState()
  return useQuery((q) =>
    q.server
      .where('id', userState?.activeServer || '')
      .related('roles', (r) => r.related('members'))
  )[0][0]?.roles
}
