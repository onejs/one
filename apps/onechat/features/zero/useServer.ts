import { useUserState } from '../auth/useUserState'
import { useQuery } from './zero'

export const useServersQuery = () => useQuery((q) => q.server)

export const useServer = () => {
  const userState = useUserState()
  return useQuery((q) => q.server.where('id', userState?.activeServer || ''))[0]
}

export const useServerChannels = () => {
  const userState = useUserState()
  return useQuery((q) =>
    q.server
      .where('id', userState?.activeServer || '')
      .related('channels')
      .orderBy('createdAt', 'desc')
  )[0]?.channels
}
