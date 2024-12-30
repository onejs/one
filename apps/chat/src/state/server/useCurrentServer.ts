import { useUserState } from '~/state/user'
import { useQuery } from '~/zero'

export const useCurrentServer = () => {
  const [userState] = useUserState()
  return useQuery((q) => q.server.where('id', userState?.activeServer || ''))[0][0]
}
