import { useUserState } from '../auth/useUserState'
import { useQuery } from './zero'

export const useServersQuery = () => useQuery((q) => q.server)

export const useCurrentServer = () => {
  const userState = useUserState()
  return useQuery((q) => q.server.where('id', userState?.activeServer || ''))[0]
}

export const useUserServers = () => {
  return (
    useQuery((q) => q.user.limit(1).orderBy('createdAt', 'desc').related('servers'))[0][0]
      ?.servers || []
  )
}

export const useServerChannels = () => {
  const userState = useUserState()
  return (
    useQuery((q) =>
      q.server
        .where('id', userState?.activeServer || '')
        .orderBy('createdAt', 'desc')
        .related('channels', (q) => q.orderBy('createdAt', 'asc'))
    )[0][0]?.channels || []
  )
}

export const useCurrentChannel = () => {
  const userState = useUserState()
  return useQuery((q) =>
    q.server
      .where('id', userState?.activeServer || '')
      .orderBy('createdAt', 'desc')
      .related('channels', (q) => q.where('id', userState?.activeChannel || ''))
  )[0][0]?.channels?.[0]
}

export const useCurrentMessages = () => {
  const userState = useUserState()
  return (
    useQuery((q) =>
      q.server
        .where('id', userState?.activeServer || '')
        .orderBy('createdAt', 'desc')
        .related('channels', (q) =>
          q
            .where('id', userState?.activeChannel || '')
            .related('chats', (q) => q.orderBy('createdAt', 'asc'))
        )
    )[0][0]?.channels?.[0]?.chats || []
  )
}
