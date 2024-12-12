import { useUserState } from './useUserState'
import { useQuery } from '../zero'

export const useServersQuery = () => useQuery((q) => q.server)

export const useCurrentServer = () => {
  const [userState] = useUserState()
  return useQuery((q) => q.server.where('id', userState?.activeServer || ''))[0][0]
}

export const useCurrentServerMembership = () => {
  const [userState, { user }] = useUserState()
  return useQuery((q) =>
    q.serverMember.where('userId', userState?.activeServer || '').where('serverId', user?.id || '')
  )[0][0]
}

export const useUserServers = () => {
  return (
    useQuery((q) => q.user.limit(1).orderBy('createdAt', 'desc').related('servers'))[0][0]
      ?.servers || []
  )
}

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

export const useCurrentChannel = () => {
  const [userState, derivedUserState] = useUserState()
  return useQuery((q) =>
    q.server
      .where('id', userState?.activeServer || '')
      .orderBy('createdAt', 'desc')
      .related('channels', (q) => q.where('id', derivedUserState?.activeChannel || ''))
  )[0][0]?.channels?.[0]
}

export const useCurrentMessages = () => {
  const [userState, derivedUserState] = useUserState()
  return (
    useQuery((q) =>
      q.server
        .where('id', userState?.activeServer || '')
        .orderBy('createdAt', 'desc')
        .related('channels', (q) =>
          q
            .where('id', derivedUserState?.activeChannel || '')
            .related('messages', (q) =>
              q.orderBy('createdAt', 'asc').related('reactions').related('thread')
            )
        )
    )[0][0]?.channels?.[0]?.messages || []
  )
}
