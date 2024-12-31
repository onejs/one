import { useQuery } from '~/zero'
import { useUserState } from '../user'

export const useCurrentChannel = () => {
  const [userState, { activeChannel }] = useUserState()
  return useQuery((q) =>
    q.server
      .where('id', userState?.activeServer || '')
      .one()
      .related('channels', (q) => q.where('id', activeChannel || '').one())
  )[0]?.channels
}
