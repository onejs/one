import { useQuery } from '~/zero'
import { useUserState } from '../user'

export const useCurrentServerMembership = () => {
  const [userState, { user }] = useUserState()
  return useQuery((q) =>
    q.serverMember.where('userId', userState?.activeServer || '').where('serverId', user?.id || '')
  )[0][0]
}
