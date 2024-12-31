import { useQuery } from '~/zero'
import { useUserState } from '../user'

export const useCurrentChannelPermissions = () => {
  const [userState, { activeChannel }] = useUserState()
  return useQuery((q) =>
    q.server
      .where('id', userState?.activeServer || '')
      .one()
      .related('channels', (q) =>
        q
          .where('id', activeChannel || '')
          .one()
          .related('permissions', (q) => q.related('role', (q) => q.one()))
      )
  )[0]?.channels?.permissions
}
