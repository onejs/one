import { useQuery } from '~/zero'
import { useUserState } from '../user'

export const useServerChannels = () => {
  const [userState] = useUserState()
  return (
    useQuery((q) =>
      q.server
        .where('id', userState?.activeServer || '')
        .orderBy('createdAt', 'desc')
        .related('channels', (q) => q.orderBy('createdAt', 'asc'))
    )[0][0]?.channels || []
  )
}
