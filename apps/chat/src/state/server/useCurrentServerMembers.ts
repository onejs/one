import { useQuery } from '~/zero'
import { useUserState } from '../user'

export const useCurrentServerMembers = () => {
  const [userState] = useUserState()
  return (
    useQuery((q) => q.server.where('id', userState?.activeServer || '').related('members'))[0][0]
      ?.members || []
  )
}
